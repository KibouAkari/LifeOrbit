"""Offline regression coverage for native collaborative editing and recovery."""
import base64
import re
import unittest
from contextlib import nullcontext
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from bson import Binary, ObjectId
from fastapi import HTTPException, Request
from pycrdt import Doc, Text

from backend.api import native_collab, password_reset
from backend.api.routes import leaderboard


OWNER = "507f1f77bcf86cd799439011"
FRIEND = "507f1f77bcf86cd799439012"
STRANGER = "507f1f77bcf86cd799439013"
BOOK = "507f1f77bcf86cd799439099"
SECRET = "non-production-test-secret-" + "a" * 40


def fake_request():
    return Request({
        "type": "http", "method": "POST",
        "path": "/api/shared-notebooks/" + BOOK + "/sync",
        "headers": [], "client": ("203.0.113.1", 1234),
        "scheme": "http", "server": ("localhost", 80),
    })


def doc_with_text(body):
    doc = Doc()
    doc["page:page1:title"] = Text("Important")
    doc["page:page1:body"] = Text(body)
    return doc


class NativeCollaborationTests(unittest.TestCase):
    def test_first_sync_migrates_existing_notes_without_removing_source(self):
        db = MagicMock()
        db.notebook_crdts.find_one.return_value = None
        db.realtime_notebooks.find_one.return_value = None
        db.shared_notebooks.find_one.return_value = {"owner": OWNER}
        book = {"_id": ObjectId(BOOK), "owner": OWNER, "members": [],
                "pages": [{"id": "page1", "title": "Important", "body": "Preserve me"}]}
        with patch.object(native_collab, "get_db", return_value=db), \
             patch.object(native_collab, "notebook_lock", side_effect=lambda *_: nullcontext()), \
             patch("backend.api.routes.shared_notebooks.locate", return_value=book):
            response = native_collab.read_sync(BOOK, since=-1, user=OWNER)
        self.assertEqual(response["version"], 0)
        migrated = Doc()
        migrated.apply_update(base64.b64decode(response["update"]))
        self.assertEqual(str(migrated.get("page:page1:body", type=Text)), "Preserve me")
        db.notebook_crdts.insert_one.assert_called_once()
        db.shared_notebooks.delete_one.assert_not_called()

    def test_conflicting_characters_from_two_editors_are_merged(self):
        first = doc_with_text("Seed")
        state = {"_id": BOOK, "state": Binary(first.get_update()), "version": 0}
        book = {"_id": ObjectId(BOOK), "owner": OWNER, "members": [],
                "pages": [{"id": "page1", "title": "Important", "body": "Seed"}]}
        left = Doc(); left.apply_update(bytes(state["state"]))
        right = Doc(); right.apply_update(bytes(state["state"]))
        left.get("page:page1:body", type=Text).__iadd__(" A")
        right.get("page:page1:body", type=Text).__iadd__(" B")
        db = MagicMock()
        db.realtime_notebooks.find_one.return_value = None
        db.notebook_crdts.find_one.side_effect = lambda *_: dict(state)
        db.shared_notebooks.find_one.return_value = {"owner": OWNER}
        def write_state(query, operation):
            self.assertEqual(query["version"], state["version"])
            state["version"] += operation["$inc"]["version"]
            state["state"] = operation["$set"]["state"]
            return MagicMock(matched_count=1)
        db.notebook_crdts.update_one.side_effect = write_state
        with patch.object(native_collab, "get_db", return_value=db), \
             patch.object(native_collab, "notebook_lock", side_effect=lambda *_: nullcontext()), \
             patch.object(native_collab, "_assert_lock"), \
             patch.object(native_collab, "enforce_limit"), \
             patch.object(native_collab, "publish_to_users"), \
             patch("backend.api.routes.shared_notebooks.locate", return_value=book):
            for editor in (left, right):
                native_collab.write_sync(
                    BOOK,
                    native_collab.SyncUpdate(
                        update=base64.b64encode(editor.get_update()).decode()),
                    fake_request(), MagicMock(), user=OWNER)
        converged = Doc()
        converged.apply_update(bytes(state["state"]))
        self.assertEqual(state["version"], 2)
        value = str(converged.get("page:page1:body", type=Text))
        self.assertIn(" A", value)
        self.assertIn(" B", value)
        self.assertIn("Seed", value)

    def test_password_hash_round_trip_works_with_installed_bcrypt(self):
        from backend.api.routes.auth import passwords
        phrase = "a-valid-testing-password-123"
        hashed = passwords.hash(phrase)
        self.assertTrue(passwords.verify(phrase, hashed))
        self.assertFalse(passwords.verify("wrong-test-password", hashed))

    def test_revoked_member_cannot_fetch_native_document(self):
        db = MagicMock()
        db.shared_notebooks.find_one.return_value = {"owner": OWNER}
        with patch.object(native_collab, "get_db", return_value=db), \
             patch.object(native_collab, "notebook_lock", side_effect=lambda *_: nullcontext()), \
             patch("backend.api.routes.shared_notebooks.locate",
                   side_effect=HTTPException(404, "Notebook not found")):
            with self.assertRaises(HTTPException) as denied:
                native_collab.read_sync(BOOK, since=-1, user=FRIEND)
        self.assertEqual(denied.exception.status_code, 404)
        db.notebook_crdts.find_one.assert_not_called()

    def test_hosted_provider_documents_cannot_be_overwritten_by_native(self):
        db = MagicMock()
        db.realtime_notebooks.find_one.return_value = {"status": "ready"}
        book = {"_id": ObjectId(BOOK), "owner": OWNER, "pages": []}
        db.shared_notebooks.find_one.return_value = {"owner": OWNER}
        with patch.object(native_collab, "get_db", return_value=db), \
             patch.object(native_collab, "notebook_lock", side_effect=lambda *_: nullcontext()), \
             patch("backend.api.routes.shared_notebooks.locate", return_value=book):
            with self.assertRaises(HTTPException) as blocked:
                native_collab.read_sync(BOOK, since=-1, user=OWNER)
        self.assertEqual(blocked.exception.status_code, 409)
        db.notebook_crdts.insert_one.assert_not_called()


class RecoveryTests(unittest.TestCase):
    def test_email_reset_does_not_disclose_unrecognized_address(self):
        db = MagicMock()
        db.users.find_one.return_value = None
        with patch.object(password_reset, "get_db", return_value=db), \
             patch.object(password_reset, "_delivery_settings",
                          return_value=("key", "no-reply@lifeorbit.dev", "https://lifeorbit.dev")), \
             patch.object(password_reset, "enforce_limit"), \
             patch.object(password_reset, "_send_reset_email") as sender:
            result = password_reset.forgot_password(
                password_reset.ForgotPassword(email="nonexistent@example.org"),
                fake_request())
        self.assertEqual(result["message"], password_reset.GENERIC_REPLY)
        sender.assert_not_called()

    def test_password_reset_email_stores_only_hashed_single_use_token(self):
        db = MagicMock()
        db.users.find_one.return_value = {
            "_id": ObjectId(OWNER), "email": "owner@example.org",
            "password_hash": "pretend-hash"}
        seen = {}
        def deliver(_to, url):
            seen["url"] = url
            return True
        with patch.dict("os.environ", {"JWT_SECRET_KEY": SECRET}), \
             patch.object(password_reset, "get_db", return_value=db), \
             patch.object(password_reset, "_delivery_settings",
                          return_value=("key", "no-reply@lifeorbit.dev", "https://lifeorbit.dev")), \
             patch.object(password_reset, "enforce_limit"), \
             patch.object(password_reset, "_send_reset_email", side_effect=deliver):
            result = password_reset.forgot_password(
                password_reset.ForgotPassword(email="owner@example.org"),
                fake_request())
            record = db.password_reset_tokens.insert_one.call_args.args[0]
            raw = seen["url"].split("token=", 1)[1]
            self.assertEqual(record["_id"], password_reset._token_digest(raw))
        self.assertNotIn(raw, str(record))
        self.assertIn("/#/reset-password?token=", seen["url"])
        self.assertEqual(result["message"], password_reset.GENERIC_REPLY)

    def test_token_is_single_use_and_revokes_prior_sessions(self):
        db = MagicMock()
        now = datetime.now(timezone.utc)
        entry = {"user_id": OWNER, "email": "owner@example.org",
                 "expires_at": now + timedelta(minutes=30)}
        db.password_reset_tokens.find_one_and_delete.side_effect = [entry, None]
        db.users.find_one.return_value = {"_id": ObjectId(OWNER),
                                          "password_hash": "pretend-hash"}
        db.users.update_one.return_value = MagicMock(matched_count=1)
        data = password_reset.ResetPassword(
            token="a" * 43, new_password="very-long-valid-password")
        with patch.dict("os.environ", {"JWT_SECRET_KEY": SECRET}), \
             patch.object(password_reset, "get_db", return_value=db), \
             patch.object(password_reset, "enforce_limit"), \
             patch.object(password_reset.passwords, "hash", return_value="new-hash"):
            self.assertEqual(password_reset.reset_password(
                data, fake_request()), {"updated": True})
            with self.assertRaises(HTTPException) as replay:
                password_reset.reset_password(data, fake_request())
        self.assertEqual(replay.exception.status_code, 400)
        update = db.users.update_one.call_args.args[1]
        self.assertEqual(update["$inc"]["session_version"], 1)
        self.assertEqual(update["$set"]["password_hash"], "new-hash")

    def test_reset_models_refuse_nosql_operator_objects(self):
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            password_reset.ForgotPassword.model_validate({"email":{"$ne":None}})
        with self.assertRaises(ValidationError):
            password_reset.ResetPassword.model_validate({
                "token":{"$gt":""},"new_password":"long-test-password"})


class FriendRankingTests(unittest.TestCase):
    def test_friends_always_appear_even_without_public_opt_in(self):
        db = MagicMock()
        db.friendships.find.return_value = [
            {"sender": OWNER, "recipient": FRIEND}]
        private_docs = [
            {"user_id":OWNER,"challenges":[]},
            {"user_id":FRIEND,"challenges":[{"value":3,"target":5}]},
        ]
        public_docs = [{"user_id":STRANGER,
                        "challenges":[{"value":4,"target":5}]}]
        db.workspaces.find.side_effect = [
            private_docs,
            MagicMock(limit=MagicMock(return_value=public_docs)),
        ]
        db.workspaces.find_one.return_value = {
            "leaderboard_opt_in":False,"leaderboard_consent_v1":False}
        db.users.find.return_value = [
            {"_id":ObjectId(OWNER),"name":"Owner"},
            {"_id":ObjectId(FRIEND),"name":"Friend"},
            {"_id":ObjectId(STRANGER),"name":"Public"},
        ]
        with patch.object(leaderboard,"get_db",return_value=db):
            result = leaderboard.ranking(user_id=OWNER)
        self.assertEqual({row["name"] for row in result["friends"]},
                         {"Owner","Friend"})
        self.assertEqual({row["name"] for row in result["participants"]},
                         {"Owner","Public"})
        self.assertFalse(result["opted_in"])
        self.assertTrue(next(row for row in result["friends"]
                             if row["name"]=="Friend")["friend"])
        self.assertIsNone(next(row for row in result["friends"]
                               if row["name"]=="Friend")["id"])

    def test_no_accepted_friendship_means_no_private_score(self):
        db=MagicMock()
        db.friendships.find.return_value=[]
        db.workspaces.find.side_effect=[
            [], MagicMock(limit=MagicMock(return_value=[]))]
        db.workspaces.find_one.return_value={}
        db.users.find.return_value=[
            {"_id":ObjectId(OWNER),"name":"Owner"}]
        with patch.object(leaderboard,"get_db",return_value=db):
            result=leaderboard.ranking(user_id=OWNER)
        self.assertEqual([entry["name"] for entry in result["friends"]],
                         ["Owner"])


if __name__ == "__main__":
    unittest.main()
