"""New-account welcome message: content, safe delivery, and triggers."""
import re
import unittest
from unittest.mock import MagicMock, patch

from bson import ObjectId
from fastapi import HTTPException, Response

from backend.api import welcome_email
from backend.api.routes import auth


class WelcomeTemplateTests(unittest.TestCase):
    def test_logging_configuration_enables_info_on_logger_and_handler(self):
        with patch.object(welcome_email.logger, "handlers", []), \
             patch.object(welcome_email.logger, "level", 0), \
             patch.object(welcome_email.logger, "propagate", True):
            welcome_email.configure_logging()
            welcome_email.configure_logging()

            self.assertEqual(welcome_email.logger.level, welcome_email.logging.INFO)
            self.assertEqual(len(welcome_email.logger.handlers), 1)
            self.assertEqual(welcome_email.logger.handlers[0].level,
                             welcome_email.logging.INFO)
            self.assertFalse(welcome_email.logger.propagate)

    def test_html_matches_site_and_has_text_alternative(self):
        html, text = welcome_email.build_welcome_email(
            "Ada", "https://www.lifeorbit.dev")
        self.assertIn("Hi Ada,", html)
        self.assertIn("Hi Ada,", text)
        self.assertIn('alt="LifeOrbit"', html)
        self.assertIn("font-size:21px", html)
        self.assertIn("Welcome to LifeOrbit", html)
        self.assertIn("#6254BC", html)
        self.assertIn("#F8F8FA", html)
        self.assertIn('src="https://www.lifeorbit.dev/assets/email-icon.png"', html)
        self.assertIn('href="https://www.lifeorbit.dev/#/dashboard"', html)
        self.assertIn("https://www.lifeorbit.dev/#/dashboard", text)
        self.assertIn("Thanks for joining LifeOrbit", html)
        self.assertIn("Make the space your own", html)
        self.assertIn("The LifeOrbit team", html)

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

    def test_short_human_copy_and_simple_accessible_layout(self):
        html, text = welcome_email.build_welcome_email(
            "Ada", "https://www.lifeorbit.dev")
        self.assertIn("Thanks for joining LifeOrbit", html)
        self.assertIn("Hi Ada,", text)
        self.assertIn("If that wasn't you", text)
        self.assertNotIn("YOUR SPACE IS READY", html)
        self.assertNotIn("better orbit", html)
        self.assertNotIn("linear-gradient", html)
        self.assertNotIn("<svg", html.lower())
        self.assertIn('alt="LifeOrbit"', html)
        self.assertIn("LifeOrbit</td>", html)
        self.assertEqual(html.count("<img "), 1)
        self.assertIn("font-size:12px;line-height:1.6;color:#606071", html)

    def test_resend_receives_consistent_html_and_text_without_credentials_in_markup(self):
        response = MagicMock(status_code=201)
        with patch.object(welcome_email, "_delivery_settings", return_value=(
            "re_private_test_key", "LifeOrbit <security@lifeorbit.dev>",
            "https://www.lifeorbit.dev",
        )), patch.object(welcome_email.requests, "post", return_value=response) as send:
            self.assertTrue(welcome_email.send_welcome_email(
                "new@example.org", "New User", "signup/test-user"))
        args, kwargs = send.call_args
        self.assertEqual(args[0], "https://api.resend.com/emails")
        self.assertEqual(kwargs["json"]["to"], ["new@example.org"])
        self.assertEqual(kwargs["json"]["from"], "LifeOrbit <security@lifeorbit.dev>")
        self.assertEqual(kwargs["json"]["subject"], welcome_email.SUBJECT)
        self.assertIn("New User", kwargs["json"]["html"])
        self.assertIn("New User", kwargs["json"]["text"])
        self.assertNotIn("re_private_test_key", kwargs["json"]["html"])
        self.assertEqual(kwargs["timeout"], (2, 4))
        self.assertTrue(kwargs["headers"]["Idempotency-Key"].startswith("lifeorbit-welcome-"))
        self.assertNotIn("test-user", kwargs["headers"]["Idempotency-Key"])
        self.assertFalse(kwargs["allow_redirects"])

    def test_embedded_logo_uses_cid_when_png_is_available(self):
        response = MagicMock(status_code=200)
        with patch.object(welcome_email, "_delivery_settings", return_value=(
            "re_test", "LifeOrbit <hello@lifeorbit.dev>", "https://www.lifeorbit.dev",
        )), patch.object(welcome_email.requests, "post", return_value=response) as send:
            self.assertTrue(welcome_email.send_welcome_email(
                "customer@example.org", "Customer", "signup/logo-test"))
        payload = send.call_args.kwargs["json"]
        self.assertEqual(len(payload.get("attachments", [])), 1)
        attachment = payload["attachments"][0]
        self.assertEqual(attachment["content_id"], "lifeorbit-logo")
        self.assertEqual(attachment["content_type"], "image/png")
        self.assertIn('src="cid:lifeorbit-logo"', payload["html"])
        self.assertNotIn('src="https://www.lifeorbit.dev/assets/email-icon.png"', payload["html"])
        self.assertTrue(attachment["content"])

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
             patch.object(welcome_email.requests, "post") as send, \
             self.assertLogs(welcome_email.logger, level="WARNING") as logs:
            self.assertFalse(welcome_email.send_welcome_email(
                "someone@example.org", "Person"))
        send.assert_not_called()
        self.assertEqual(logs.output, [
            "WARNING:backend.api.welcome_email:Welcome email skipped: provider configuration unavailable"])

    def test_unexpected_settings_and_template_errors_are_sanitized(self):
        settings = ("test-key", "LifeOrbit <security@lifeorbit.dev>",
                    "https://www.lifeorbit.dev")
        for failing_function in ("_delivery_settings", "build_welcome_email"):
            with self.subTest(failing_function=failing_function), \
                 patch.object(welcome_email, "_delivery_settings", return_value=settings), \
                 patch.object(welcome_email, failing_function,
                              side_effect=ValueError("private@example.org test-key")), \
                 patch.object(welcome_email.requests, "post") as send, \
                 self.assertLogs(welcome_email.logger, level="WARNING") as logs:
                self.assertFalse(welcome_email.send_welcome_email(
                    "private@example.org", "Private Person"))
                send.assert_not_called()
                self.assertEqual(logs.output, [
                    "WARNING:backend.api.welcome_email:Welcome email delivery is unavailable"])

    def test_non_latin1_key_cannot_escape_delivery(self):
        def encode_headers(request, **kwargs):
            request.headers["Authorization"].encode("latin-1")

        with patch.object(welcome_email, "_delivery_settings", return_value=(
            "key-雪", "LifeOrbit <security@lifeorbit.dev>", "https://www.lifeorbit.dev",
        )), patch.object(welcome_email.requests.Session, "send", side_effect=encode_headers), \
             self.assertLogs(welcome_email.logger, level="WARNING") as logs:
            self.assertFalse(welcome_email.send_welcome_email(
                "private@example.org", "Private Person"))
        self.assertEqual(logs.output, [
            "WARNING:backend.api.welcome_email:Welcome email delivery is unavailable"])


class RegistrationTriggerTests(unittest.TestCase):
    def setUp(self):
        self.db = MagicMock()
        self.db.users.find_one.return_value = None
        self.db.users.insert_one.return_value = MagicMock(inserted_id=ObjectId())
        self.response = Response()
        self.request = MagicMock()

    def test_email_password_registration_sends_one_welcome_after_success(self):
        with patch.object(auth, "secret_key", return_value="test-secret"), \
             patch.object(auth, "enforce_limit"), \
             patch.object(auth, "get_db", return_value=self.db), \
             patch.object(auth.passwords, "hash", return_value="secure-hash"), \
             patch.object(auth, "issue_token", return_value={"ok": True}) as issue, \
             patch.object(auth, "send_welcome_email", return_value=True) as send:
            result = auth.register(
                auth.RegisterRequest(name="New Person", email="New@Example.org",
                                     password="safe-password-123"),
                self.response, self.request)
        self.assertEqual(result, {"ok": True})
        issue.assert_called_once()
        send.assert_called_once()
        self.assertEqual(send.call_args.args[:2], ("new@example.org", "New Person"))
        self.assertTrue(send.call_args.args[2].startswith("signup/"))

    def test_duplicate_email_does_not_queue_message(self):
        self.db.users.find_one.return_value = {"email": "existing@example.org"}
        with patch.object(auth, "secret_key", return_value="test-secret"), \
             patch.object(auth, "enforce_limit"), \
             patch.object(auth, "get_db", return_value=self.db):
            with patch.object(auth, "send_welcome_email") as send, \
                 self.assertRaises(HTTPException) as caught:
                auth.register(
                    auth.RegisterRequest(name="A User", email="existing@example.org",
                                         password="safe-password-123"),
                    self.response, self.request)
        self.assertEqual(caught.exception.status_code, 409)
        send.assert_not_called()

    def test_verified_first_google_registration_queues_one_welcome(self):
        self.db.users.find_one.side_effect = [None, None]
        info = {"iss": "https://accounts.google.com", "email_verified": True,
                "sub": "google-id", "email": "Google@Example.org",
                "name": "Google Newcomer"}
        with patch.dict("os.environ", {"GOOGLE_CLIENT_ID": "approved-client"}), \
             patch.object(auth, "enforce_limit"), \
             patch.object(auth.id_token, "verify_oauth2_token", return_value=info), \
             patch.object(auth, "get_db", return_value=self.db), \
             patch.object(auth, "issue_token", return_value={"ok": True}), \
             patch.object(auth, "send_welcome_email", return_value=True) as send:
            result = auth.google_login(
                auth.GoogleAuthRequest(token="token-is-valid-in-test-12345"),
                self.response, self.request)
        self.assertEqual(result, {"ok": True})
        send.assert_called_once()
        self.assertEqual(send.call_args.args[:2], ("google@example.org", "Google Newcomer"))
        self.assertTrue(send.call_args.args[2].startswith("signup/"))

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
             patch.object(auth, "issue_token", return_value={"ok": True}), \
             patch.object(auth, "send_welcome_email") as send:
            result = auth.google_login(
                auth.GoogleAuthRequest(token="token-is-valid-in-test-12345"),
                self.response, self.request)
        self.assertEqual(result, {"ok": True})
        send.assert_not_called()

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
                    self.response, self.request)
        self.assertEqual(error.exception.status_code, 401)


    def test_missing_resend_does_not_prevent_new_registration(self):
        with patch.object(auth, "secret_key", return_value="test-secret"), \
             patch.object(auth, "enforce_limit"), \
             patch.object(auth, "get_db", return_value=self.db), \
             patch.object(auth.passwords, "hash", return_value="secure-hash"), \
             patch.object(auth, "issue_token", return_value={"ok": True}), \
             patch.object(auth, "send_welcome_email", return_value=False) as send:
            result = auth.register(
                auth.RegisterRequest(name="New Person", email="new@example.org",
                                     password="safe-password-123"),
                self.response, self.request)
        self.assertEqual(result, {"ok": True})
        send.assert_called_once()

    def test_authenticated_self_resend_is_rate_limited_and_only_sends_to_owner(self):
        uid = str(ObjectId())
        user = {"_id": ObjectId(uid), "name": "Owner", "email": "owner@example.org"}
        with patch.object(auth, "enforce_limit") as limit, \
             patch.object(auth, "find_user", return_value=user), \
             patch.object(auth, "send_welcome_email", return_value=True) as send:
            result = auth.resend_welcome(self.request, uid)
        self.assertEqual(result, {"accepted": True, "delivered": False})
        self.assertEqual(send.call_args.args[:2], ("owner@example.org", "Owner"))
        self.assertIn(uid, send.call_args.args[2])
        self.assertEqual(limit.call_args.kwargs["account_maximum"], 1)

    def test_resend_failure_does_not_report_accepted(self):
        with patch.object(auth, "enforce_limit"), \
             patch.object(auth, "find_user", return_value={
                 "name": "Owner", "email": "owner@example.org"
             }), \
             patch.object(auth, "send_welcome_email", return_value=False), \
             self.assertRaises(HTTPException) as err:
            auth.resend_welcome(self.request, str(ObjectId()))
        self.assertEqual(err.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
