"""Offline regression tests for auth sessions, CSRF and notebook revocation."""
import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from bson import ObjectId
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from backend.api.index import protect_browser_requests
from backend.api.routes import auth, friends, shared_notebooks, calendar_feeds, notifications, leaderboard, workspace
from backend.api.security import _client_address, enforce_limit


SECRET = "non-production-test-secret-" + "a" * 40
USER_ID = "507f1f77bcf86cd799439011"


def request_for(cookie="", origin=None, client_ip="203.0.113.20"):
    headers = [(b"host", b"testserver")]
    if cookie:
        headers.append((b"cookie", ("lifeorbital_auth=" + cookie).encode()))
    if origin:
        headers.append((b"origin", origin.encode()))
    return Request({"type": "http", "method": "POST",
                    "path": "/api/auth/logout", "headers": headers,
                    "client": (client_ip, 1234), "scheme": "http",
                    "server": ("testserver", 80)})


def make_token(version):
    now = datetime.now(timezone.utc)
    claims = {"sub": USER_ID, "ver": version, "iss": "lifeorbital",
              "aud": "lifeorbital-api", "iat": now,
              "exp": now + timedelta(minutes=10)}
    return jwt.encode(claims, SECRET, algorithm="HS256")


class SessionTests(unittest.TestCase):
    def test_valid_and_revoked_version(self):
        with patch.dict(os.environ, {"JWT_SECRET_KEY": SECRET}), \
             patch("backend.api.routes.auth.get_db") as db:
            db.return_value.users.find_one.return_value = {
                "_id": ObjectId(USER_ID), "session_version": 2}
            self.assertEqual(auth.get_current_user(request_for(make_token(2)), None), USER_ID)
            with self.assertRaises(HTTPException) as error:
                auth.get_current_user(request_for(make_token(1)), None)
            self.assertEqual(error.exception.status_code, 401)

    def test_oversized_jwt_is_rejected(self):
        with self.assertRaises(HTTPException) as error:
            auth.get_current_user(request_for("x" * 4097), None)
        self.assertEqual(error.exception.status_code, 401)

    def test_email_change_requires_verification(self):
        with self.assertRaises(HTTPException) as error:
            auth.change_email(auth.EmailChange(email="test@example.org",
                                               password="test-password"),
                              user_id=USER_ID)
        self.assertEqual(error.exception.status_code, 403)

    def test_notebook_access_requires_current_friendship(self):
        notebook_id = "507f1f77bcf86cd799439099"
        owner_id = "507f191e810c19729de860ea"
        from unittest.mock import MagicMock
        db = MagicMock()
        db.shared_notebooks.find_one.return_value = {
            "_id": ObjectId(notebook_id), "owner": owner_id, "members": [USER_ID]}
        db.friendships.find_one.return_value = None
        with self.assertRaises(HTTPException) as denied:
            shared_notebooks.locate(db, notebook_id, USER_ID)
        self.assertEqual(denied.exception.status_code, 404)

    def test_calendar_parser_compatible_with_secured_version(self):
        sample = (b"BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"
                  b"BEGIN:VEVENT\r\nUID:test-event\r\n"
                  b"DTSTART;VALUE=DATE:20261111\r\n"
                  b"SUMMARY:Test calendar event\r\n"
                  b"END:VEVENT\r\nEND:VCALENDAR\r\n")
        # The feed parser must still work after the major iCalendar upgrade.
        with patch("backend.api.routes.calendar_feeds.fetch_calendar_bytes",
                   return_value=sample):
            events = calendar_feeds.fetch_events("https://example.org/test.ics")
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["title"], "Test calendar event")

    def test_malformed_calendar_port_is_rejected(self):
        with self.assertRaises(HTTPException) as error:
            calendar_feeds.validate_url("https://example.org:not-a-port/calendar.ics")
        self.assertEqual(error.exception.status_code, 400)

    def test_notification_history_is_bounded(self):
        with patch("backend.api.routes.notifications.get_db") as db:
            notifications.read_notification(
                notifications.ReadRequest(id="share:507f1f77bcf86cd799439012"),
                user=USER_ID)
            args = db.return_value.notification_state.update_one.call_args
            self.assertEqual(args.args[1]["$push"]["read"]["$slice"], -2000)

    def test_leaderboard_requires_renewed_explicit_consent(self):
        defaults = workspace.Workspace()
        self.assertFalse(defaults.leaderboard_opt_in)
        self.assertFalse(defaults.leaderboard_consent_v1)
        with patch("backend.api.routes.leaderboard.get_db") as db:
            db.return_value.workspaces.find.return_value = []
            db.return_value.workspaces.find_one.return_value = {
                "leaderboard_opt_in": True, "leaderboard_consent_v1": False,
                "challenges": []}
            db.return_value.users.find.return_value = []
            result = leaderboard.ranking(user_id=USER_ID)
            db.return_value.workspaces.find.assert_called_once_with(
                {"leaderboard_opt_in": True, "leaderboard_consent_v1": True},
                {"user_id": 1, "challenges": 1})
            self.assertFalse(result["opted_in"])

    def test_friend_removal_revokes_notebooks(self):
        from_id, to_id = USER_ID, "507f191e810c19729de860ea"
        with patch("backend.api.routes.friends.get_db") as db:
            db.return_value.friendships.find_one.side_effect = [
                {"sender": from_id, "recipient": to_id}, None]
            self.assertEqual(
                friends.reject_or_remove("507f1f77bcf86cd799439012", user=from_id),
                {"removed": True})
            self.assertEqual(db.return_value.shared_notebooks.update_many.call_count, 2)


class BrowserTests(unittest.IsolatedAsyncioTestCase):
    async def invoke(self, origin):
        async def next_response(_request):
            return JSONResponse({"ok": True})
        return await protect_browser_requests(
            request_for(cookie="invalid", origin=origin), next_response)

    async def test_origin_validation(self):
        with patch.dict(os.environ, {"VERCEL": "0"}):
            self.assertEqual((await self.invoke("https://evil.example")).status_code, 403)
            self.assertEqual((await self.invoke(None)).status_code, 403)
            self.assertEqual((await self.invoke("http://testserver")).status_code, 200)

    async def test_oversized_payload_denied(self):
        async def next_response(_request):
            return JSONResponse({"ok": True})
        req = request_for()
        req.scope["headers"].append((b"content-length", b"3000000"))
        self.assertEqual(
            (await protect_browser_requests(req, next_response)).status_code, 413)


class RateLimitTests(unittest.TestCase):
    def test_forwarded_header_is_not_trusted_outside_vercel(self):
        req = request_for()
        req.scope["headers"].append((b"x-vercel-forwarded-for", b"10.0.0.1"))
        with patch.dict(os.environ, {"VERCEL": "0"}):
            self.assertEqual(_client_address(req), "203.0.113.20")

    def test_shared_rate_limit_rejects_over_limit(self):
        counts = {}
        def update(query, update, **kwargs):
            key = query["_id"]
            counts[key] = counts.get(key, 0) + 1
            return {"hits": counts[key]}
        with patch.dict(os.environ, {"JWT_SECRET_KEY": SECRET, "VERCEL": "0"}), \
             patch("backend.api.security.get_db") as db:
            db.return_value.rate_limits.find_one_and_update.side_effect = update
            enforce_limit(request_for(), "test", maximum=1, window_seconds=60)
            with self.assertRaises(HTTPException) as error:
                enforce_limit(request_for(), "test", maximum=1, window_seconds=60)
            self.assertEqual(error.exception.status_code, 429)


if __name__ == "__main__":
    unittest.main()
