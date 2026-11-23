"""New-account welcome message: content, safe delivery, and triggers."""
import unittest
from unittest.mock import MagicMock, patch

from bson import ObjectId
from fastapi import BackgroundTasks, HTTPException, Response

from backend.api import welcome_email
from backend.api.routes import auth


class WelcomeTemplateTests(unittest.TestCase):
    def test_html_matches_site_and_has_text_alternative(self):
        html, text = welcome_email.build_welcome_email(
            "Ada", "https://www.lifeorbit.dev")
        self.assertIn("Hi Ada,", html)
        self.assertIn("Hi Ada,", text)
        self.assertIn("Welcome to your", html)
        self.assertIn("#7263D5", html)
        self.assertIn("#F8F8FA", html)
        self.assertIn('src="https://www.lifeorbit.dev/assets/email-logo.png"', html)
        self.assertIn('href="https://www.lifeorbit.dev/#/dashboard"', html)
        self.assertIn("https://www.lifeorbit.dev/#/dashboard", text)
        self.assertIn("Plan your days", html)
        self.assertIn("Make space for ideas", html)
        self.assertIn("Share the good things", html)

    def test_user_name_is_escaped_in_html_not_executed(self):
        injected = '<script>alert("unsafe")</script>'
        html, _ = welcome_email.build_welcome_email(
            injected, "https://www.lifeorbit.dev")
        self.assertNotIn(injected, html)
        self.assertIn("&lt;script&gt;", html)
        self.assertIn("&quot;unsafe&quot;", html)
        self.assertNotIn("<script>", html)
        self.assertNotIn("password reset", html.lower())

    def test_unicode_names_and_missing_names_are_supported(self):
        html, text = welcome_email.build_welcome_email(
            "Jérôme & 雪", "https://www.lifeorbit.dev")
        self.assertIn("Jérôme &amp; 雪", html)
        self.assertIn("Jérôme & 雪", text)
        fallback, _ = welcome_email.build_welcome_email(
            "", "https://www.lifeorbit.dev")
        self.assertIn("Hi there", fallback)

    def test_resend_receives_consistent_html_and_text_without_credentials_in_markup(self):
        response = MagicMock(status_code=201)
        with patch.object(welcome_email, "_delivery_settings", return_value=(
            "re_private_test_key", "LifeOrbit <security@lifeorbit.dev>",
            "https://www.lifeorbit.dev",
        )), patch.object(welcome_email.requests, "post", return_value=response) as send:
            self.assertTrue(welcome_email.send_welcome_email(
                "new@example.org", "New User"))
        args, kwargs = send.call_args
        self.assertEqual(args[0], "https://api.resend.com/emails")
        self.assertEqual(kwargs["json"]["to"], ["new@example.org"])
        self.assertEqual(kwargs["json"]["from"], "LifeOrbit <security@lifeorbit.dev>")
        self.assertEqual(kwargs["json"]["subject"], welcome_email.SUBJECT)
        self.assertIn("New User", kwargs["json"]["html"])
        self.assertIn("New User", kwargs["json"]["text"])
        self.assertNotIn("re_private_test_key", kwargs["json"]["html"])
        self.assertEqual(kwargs["timeout"], (3, 7))
        self.assertFalse(kwargs["allow_redirects"])

    def test_provider_unavailable_cannot_leak_user_data_or_throw(self):
        with patch.object(welcome_email, "_delivery_settings", return_value=(
            "re_test_secret", "LifeOrbit <security@lifeorbit.dev>",
            "https://www.lifeorbit.dev",
        )), patch.object(welcome_email.requests, "post",
                         side_effect=welcome_email.requests.RequestException("network")):
            with self.assertLogs(welcome_email.logger, level="WARNING") as logs:
                result = welcome_email.send_welcome_email(
                    "private@example.org", "Private Person")
        self.assertFalse(result)
        self.assertNotIn("private@example.org", str(logs.output))
        self.assertNotIn("Private Person", str(logs.output))
        self.assertNotIn("re_test_secret", str(logs.output))

    def test_missing_email_configuration_skips_delivery(self):
        with patch.object(welcome_email, "_delivery_settings",
                          side_effect=HTTPException(503, "not configured")), \
             patch.object(welcome_email.requests, "post") as send:
            self.assertFalse(welcome_email.send_welcome_email(
                "someone@example.org", "Person"))
        send.assert_not_called()


class RegistrationTriggerTests(unittest.TestCase):
    def setUp(self):
        self.db = MagicMock()
        self.db.users.find_one.return_value = None
        self.db.users.insert_one.return_value = MagicMock(inserted_id=ObjectId())
        self.response = Response()
        self.background = BackgroundTasks()

    def test_email_password_registration_queues_one_welcome_after_success(self):
        with patch.object(auth, "secret_key", return_value="test-secret"), \
             patch.object(auth, "enforce_limit"), \
             patch.object(auth, "get_db", return_value=self.db), \
             patch.object(auth.passwords, "hash", return_value="secure-hash"), \
             patch.object(auth, "issue_token", return_value={"ok": True}) as issue:
            result = auth.register(
                auth.RegisterRequest(name="New Person", email="New@Example.org",
                                     password="safe-password-123"),
                self.response, MagicMock(), self.background)
        self.assertEqual(result, {"ok": True})
        issue.assert_called_once()
        self.assertEqual(len(self.background.tasks), 1)
        task = self.background.tasks[0]
        self.assertEqual(task.func, welcome_email.send_welcome_email)
        self.assertEqual(task.args, ("new@example.org", "New Person"))

    def test_duplicate_email_does_not_queue_message(self):
        self.db.users.find_one.return_value = {"email": "existing@example.org"}
        with patch.object(auth, "secret_key", return_value="test-secret"), \
             patch.object(auth, "enforce_limit"), \
             patch.object(auth, "get_db", return_value=self.db):
            with self.assertRaises(HTTPException) as caught:
                auth.register(
                    auth.RegisterRequest(name="A User", email="existing@example.org",
                                         password="safe-password-123"),
                    self.response, MagicMock(), self.background)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(len(self.background.tasks), 0)

    def test_verified_first_google_registration_queues_one_welcome(self):
        self.db.users.find_one.side_effect = [None, None]
        info = {"iss": "https://accounts.google.com", "email_verified": True,
                "sub": "google-id", "email": "Google@Example.org",
                "name": "Google Newcomer"}
        with patch.dict("os.environ", {"GOOGLE_CLIENT_ID": "approved-client"}), \
             patch.object(auth, "enforce_limit"), \
             patch.object(auth.id_token, "verify_oauth2_token", return_value=info), \
             patch.object(auth, "get_db", return_value=self.db), \
             patch.object(auth, "issue_token", return_value={"ok": True}):
            result = auth.google_login(
                auth.GoogleAuthRequest(token="token-is-valid-in-test-12345"),
                self.response, MagicMock(), self.background)
        self.assertEqual(result, {"ok": True})
        self.assertEqual(len(self.background.tasks), 1)
        self.assertEqual(
            self.background.tasks[0].args,
            ("google@example.org", "Google Newcomer"))

    def test_returning_google_account_has_no_duplicate_welcome(self):
        current = {"_id": ObjectId(), "google_id": "google-id",
                   "email": "google@example.org", "name": "Returning"}
        self.db.users.find_one.side_effect = [current, None]
        info = {"iss": "https://accounts.google.com", "email_verified": True,
                "sub": "google-id", "email": "google@example.org",
                "name": "Returning"}
        with patch.dict("os.environ", {"GOOGLE_CLIENT_ID": "approved-client"}), \
             patch.object(auth, "enforce_limit"), \
             patch.object(auth.id_token, "verify_oauth2_token", return_value=info), \
             patch.object(auth, "get_db", return_value=self.db), \
             patch.object(auth, "issue_token", return_value={"ok": True}):
            result = auth.google_login(
                auth.GoogleAuthRequest(token="token-is-valid-in-test-12345"),
                self.response, MagicMock(), self.background)
        self.assertEqual(result, {"ok": True})
        self.assertEqual(len(self.background.tasks), 0)

    def test_unverified_google_identity_never_sends_mail(self):
        info = {"iss": "https://accounts.google.com",
                "email_verified": False, "sub": "google-id",
                "email": "unverified@example.org"}
        with patch.dict("os.environ", {"GOOGLE_CLIENT_ID": "approved-client"}), \
             patch.object(auth, "enforce_limit"), \
             patch.object(auth.id_token, "verify_oauth2_token", return_value=info):
            with self.assertRaises(HTTPException) as error:
                auth.google_login(
                    auth.GoogleAuthRequest(token="token-is-valid-in-test-12345"),
                    self.response, MagicMock(), self.background)
        self.assertEqual(error.exception.status_code, 401)
        self.assertEqual(len(self.background.tasks), 0)


if __name__ == "__main__":
    unittest.main()
