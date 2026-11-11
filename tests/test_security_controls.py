"""Offline regression tests for auth sessions, CSRF and notebook revocation."""
import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from pydantic import ValidationError
import re

import jwt
from bson import ObjectId
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from backend.api.index import protect_browser_requests
from backend.api.routes import auth, friends, shared_notebooks, sharing, calendar_feeds, notifications, leaderboard, workspace
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

    def test_notebook_notifications_batch_current_friendship_checks(self):
        friend = "507f191e810c19729de860ea"
        removed = "507f1f77bcf86cd799439013"
        accepted_book = {"_id": ObjectId("507f1f77bcf86cd799439014"),
                         "owner": friend, "title": "Current"}
        removed_book = {"_id": ObjectId("507f1f77bcf86cd799439015"),
                        "owner": removed, "title": "Private"}
        db = MagicMock()
        db.notification_state.find_one.return_value = {"read": []}
        db.shares.find.return_value.sort.return_value.batch_size.return_value = []
        db.shared_notebooks.find.return_value.limit.return_value = [
            accepted_book, removed_book]
        db.friendships.find.return_value = [{"pair": "-".join(sorted((friend, USER_ID)))}]
        db.users.find.return_value = [{"_id": ObjectId(friend), "name": "Friend"}]
        db.tasks.find.return_value.batch_size.return_value = []
        with patch("backend.api.routes.notifications.get_db", return_value=db):
            result = notifications.list_notifications(user=USER_ID)
        db.friendships.find.assert_called_once()
        self.assertEqual([item["title"] for item in result["items"]],
                         ["Friend invited you to Current"])
        self.assertNotIn("Private", str(result))

    def test_friends_always_see_each_other_even_without_public_opt_in(self):
        friend = "507f191e810c19729de860ea"
        stranger = "507f1f77bcf86cd799439013"
        db = MagicMock()
        db.friendships.find.return_value = [
            {"sender": friend, "recipient": USER_ID, "status": "accepted"}
        ]
        private = [
            {"user_id": USER_ID, "challenges": []},
            {"user_id": friend, "challenges": [{"value": 3, "target": 5}]},
        ]
        public = [
            {"user_id": stranger, "challenges": [{"value": 10, "target": 10}]}
        ]
        db.workspaces.find.side_effect = [
            private, db.workspaces.find.return_value,  # replaced below
        ]
        public_cursor = MagicMock()
        public_cursor.limit.return_value = public
        db.workspaces.find.side_effect = [private, public_cursor]
        db.workspaces.find_one.return_value = {
            "leaderboard_opt_in": False, "leaderboard_consent_v1": False}
        db.users.find.return_value = [
            {"_id": ObjectId(USER_ID), "name": "Me"},
            {"_id": ObjectId(friend), "name": "Friend"},
            {"_id": ObjectId(stranger), "name": "Opted in"},
        ]
        with patch("backend.api.routes.leaderboard.get_db", return_value=db):
            result = leaderboard.ranking(user_id=USER_ID)
        self.assertFalse(result["opted_in"])
        self.assertEqual({entry["name"] for entry in result["friends"]},
                         {"Me", "Friend"})
        self.assertEqual({entry["name"] for entry in result["participants"]},
                         {"Me", "Opted in"})
        self.assertTrue(next(row for row in result["friends"]
                             if row["name"] == "Friend")["friend"])
        self.assertIsNone(next(row for row in result["friends"]
                               if row["name"] == "Friend")["id"])
        community_query = db.workspaces.find.call_args_list[1].args[0]
        self.assertEqual(community_query, {
            "leaderboard_opt_in": True, "leaderboard_consent_v1": True})
        self.assertEqual(result["friends"][0]["rank"], 1)

    def test_pending_or_removed_friendship_grants_no_private_scores(self):
        friend = "507f191e810c19729de860ea"
        for relationship in ([], [{"sender": USER_ID, "recipient": friend,
                                  "status": "pending"}]):
            with self.subTest(relationship=relationship):
                db = MagicMock()
                db.friendships.find.return_value = relationship
                db.workspaces.find.side_effect = [[], MagicMock(limit=MagicMock(return_value=[]))]
                db.workspaces.find_one.return_value = {}
                db.users.find.return_value = [{"_id": ObjectId(USER_ID), "name": "Me"}]
                with patch("backend.api.routes.leaderboard.get_db", return_value=db):
                    result = leaderboard.ranking(user_id=USER_ID)
                self.assertEqual([row["name"] for row in result["friends"]], ["Me"])
                query = db.friendships.find.call_args.args[0]
                self.assertEqual(query["status"], "accepted")

    def test_friend_ranking_includes_more_than_1000_accepted_friendships(self):
        friends = [f"{i:024x}" for i in range(1001)]
        relationships = [
            {"sender": USER_ID, "recipient": friend, "status": "accepted"}
            for friend in friends
        ]
        db = MagicMock()
        db.friendships.find.return_value = relationships
        public_cursor = MagicMock()
        public_cursor.limit.return_value = []
        db.workspaces.find.side_effect = [[], public_cursor]
        db.workspaces.find_one.return_value = {}
        db.users.find.return_value = [
            {"_id": ObjectId(USER_ID), "name": "Me"},
            *({"_id": ObjectId(friend), "name": f"Friend {i}"}
              for i, friend in enumerate(friends)),
        ]
        with patch("backend.api.routes.leaderboard.get_db", return_value=db):
            result = leaderboard.ranking(user_id=USER_ID)
        self.assertEqual(sum(row["friend"] for row in result["friends"]), 1001)
        self.assertEqual(len(result["friends"]), 1002)

    def test_legacy_challenge_values_cannot_break_or_inflate_ranking(self):
        self.assertEqual(leaderboard._points([
            {"value": "1000000", "target": "1"},
            {"value": -3, "target": 10},
            {"value": 5, "target": 2},
            {"value": 1, "target": 3},
            {"value": True, "target": 3},
            {"value": 1000000000, "target": 1000000000},
        ]), 1000030)

    def test_unfriend_removes_all_duplicate_relationships_and_shares(self):
        owner, former = USER_ID, "507f191e810c19729de860ea"
        db = MagicMock()
        db.friendships.find_one.side_effect = [
            {"sender": owner, "recipient": former},
            None,  # no accepted relationship after delete_many
        ]
        with patch("backend.api.routes.friends.get_db", return_value=db):
            result = friends.reject_or_remove(
                "507f1f77bcf86cd799439012", user=owner)
        self.assertEqual(result, {"removed": True})
        db.friendships.delete_many.assert_called_once()
        query = db.friendships.delete_many.call_args.args[0]
        self.assertIn({"sender": former, "recipient": owner}, query["$or"])
        self.assertIn({"sender": owner, "recipient": former}, query["$or"])
        self.assertEqual(db.shares.delete_many.call_count, 1)
        self.assertEqual(db.shared_notebooks.update_many.call_count, 2)

    def test_unfriend_fails_closed_if_accepted_record_survives(self):
        db = MagicMock()
        db.friendships.find_one.side_effect = [
            {"sender": USER_ID, "recipient": "507f191e810c19729de860ea"},
            {"status": "accepted"},
        ]
        with patch("backend.api.routes.friends.get_db", return_value=db):
            with self.assertRaises(HTTPException) as error:
                friends.reject_or_remove("507f1f77bcf86cd799439012", user=USER_ID)
        self.assertEqual(error.exception.status_code, 503)

    def test_stale_note_share_does_not_expose_new_edits(self):
        owner, former = USER_ID, "507f191e810c19729de860ea"
        db = MagicMock()
        db.shares.find.return_value.limit.return_value = [
            {"owner": owner, "recipient": former, "kind": "note",
             "resource_id": "note1"},
        ]
        db.friendships.find.return_value = []
        with patch("backend.api.routes.sharing.get_db", return_value=db):
            self.assertEqual(sharing.shared_notes(user=former), [])
        db.workspaces.find.assert_not_called()

    def test_stale_notebook_member_cannot_list_or_edit_after_unfriend(self):
        owner, former = USER_ID, "507f191e810c19729de860ea"
        book_id = ObjectId("507f1f77bcf86cd799439099")
        book = {"_id": book_id, "owner": owner,
                "members": [former], "pages": [{"id": "note", "body": "secret"}]}
        db = MagicMock()
        db.shared_notebooks.find.return_value.sort.return_value.skip.return_value.limit.return_value = [book]
        db.shared_notebooks.find_one.return_value = book
        db.friendships.find_one.return_value = None
        with patch("backend.api.routes.shared_notebooks.get_db", return_value=db):
            items = shared_notebooks.list_notebooks(user=former, offset=0, limit=100)
            self.assertEqual(items["items"], [])
            with self.assertRaises(HTTPException) as error:
                shared_notebooks.save_page(str(book_id), "note",
                                           shared_notebooks.PageInput(title="Changed",body="leaked"),
                                           user=former)
        self.assertEqual(error.exception.status_code, 404)
        db.shared_notebooks.update_one.assert_not_called()



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

    def test_rate_limit_counts_both_account_and_ip_buckets(self):
        counts = {}
        def update(query, operation, **kwargs):
            key = query["_id"]
            counts[key] = counts.get(key, 0) + 1
            return {"hits": counts[key]}
        with patch.dict(os.environ, {"JWT_SECRET_KEY": SECRET, "VERCEL": "0"}), \
             patch("backend.api.security.get_db") as db:
            db.return_value.rate_limits.find_one_and_update.side_effect = update
            enforce_limit(request_for(), "password-login", maximum=50,
                          window_seconds=900, identity="test@example.org",
                          account_maximum=1)
            with self.assertRaises(HTTPException) as error:
                enforce_limit(request_for(), "password-login", maximum=50,
                              window_seconds=900, identity="TEST@example.org",
                              account_maximum=1)
        self.assertEqual(error.exception.status_code, 429)
        self.assertEqual(len(counts), 2)
        self.assertEqual(sorted(counts.values()), [2, 2])
        self.assertIn("Retry-After", error.exception.headers)

    def test_rate_limit_missing_database_confirmation_fails_closed(self):
        with patch.dict(os.environ, {"JWT_SECRET_KEY": SECRET, "VERCEL": "0"}), \
             patch("backend.api.security.get_db") as db:
            db.return_value.rate_limits.find_one_and_update.return_value = None
            with self.assertRaises(HTTPException) as error:
                enforce_limit(request_for(), "test", maximum=10, window_seconds=60)
        self.assertEqual(error.exception.status_code, 503)

    def test_ip_limit_rejects_before_charging_named_account(self):
        calls = []
        def update(query, operation, **kwargs):
            calls.append(query["_id"])
            return {"hits": 2}
        with patch.dict(os.environ, {"JWT_SECRET_KEY": SECRET, "VERCEL": "0"}), \
             patch("backend.api.security.get_db") as db:
            db.return_value.rate_limits.find_one_and_update.side_effect = update
            with self.assertRaises(HTTPException) as error:
                enforce_limit(request_for(), "password-login", maximum=1,
                              window_seconds=900, identity="arbitrary@example.org",
                              account_maximum=20)
        self.assertEqual(error.exception.status_code, 429)
        self.assertEqual(len(calls), 1)

    def test_bad_platform_ip_falls_back_to_socket_peer(self):
        req=request_for()
        req.scope["headers"].append((b"x-vercel-forwarded-for", b"not-an-ip,also-bad"))
        with patch.dict(os.environ, {"VERCEL": "1"}):
            self.assertEqual(_client_address(req), "203.0.113.20")

    def test_no_sql_operator_injection_is_rejected_by_request_models(self):
        with self.assertRaises(ValidationError):
            auth.LoginRequest.model_validate(
                {"email": {"$ne": None}, "password": "anything"})
        with self.assertRaises(ValidationError):
            auth.LoginRequest.model_validate(
                {"email": "someone@example.org", "password": {"$gt": ""}})
        with self.assertRaises(ValidationError):
            friends.FriendRequest.model_validate({"user_id": {"$ne": ""}})
        with self.assertRaises(ValidationError):
            sharing.ShareRequest.model_validate({
                "recipient_id": {"$ne": ""}, "resource_id": "abc"})

    def test_friend_search_escapes_regex_metacharacters(self):
        db=MagicMock()
        db.users.find.return_value.limit.return_value=[]
        with patch("backend.api.routes.friends.get_db",return_value=db), \
             patch("backend.api.routes.friends.enforce_limit"):
            friends.find_people(request_for(), q=".*", user=USER_ID)
        q=db.users.find.call_args.args[0]
        self.assertEqual(q["name"]["$regex"], re.escape(".*"))
        self.assertEqual(q["name"]["$options"], "i")

    def test_login_uses_dummy_hash_for_nonexistent_account(self):
        db=MagicMock()
        db.users.find_one.return_value=None
        response=MagicMock()
        with patch("backend.api.routes.auth.enforce_limit"), \
             patch("backend.api.routes.auth.get_db",return_value=db), \
             patch("backend.api.routes.auth._dummy_password_hash",
                   return_value="hashed-fake"), \
             patch("backend.api.routes.auth.passwords.verify",
                   return_value=False) as verify:
            with self.assertRaises(HTTPException) as error:
                auth.password_login(auth.LoginRequest(
                    email="missing@example.org",password="test"),
                    response=response,request=request_for())
        self.assertEqual(error.exception.status_code,401)
        verify.assert_called_once_with("test", "hashed-fake")

    def test_password_change_is_rate_limited_before_password_verification(self):
        with patch("backend.api.routes.auth.enforce_limit",
                   side_effect=HTTPException(429,"Too many attempts")):
            with self.assertRaises(HTTPException) as error:
                auth.change_password(auth.PasswordChange(
                    current_password="a",new_password="long-password-secret"),
                    response=MagicMock(), request=request_for(),
                    user_id=USER_ID)
        self.assertEqual(error.exception.status_code,429)

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
