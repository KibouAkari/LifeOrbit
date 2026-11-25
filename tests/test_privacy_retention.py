"""Privacy retention and account lifecycle regression checks (no production data)."""
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from bson import ObjectId
from fastapi import HTTPException, Response

from backend.api.routes import privacy


class PrivacyRetentionTests(unittest.TestCase):
    def test_legacy_accounts_do_not_automatically_purge(self):
        self.assertIsNone(privacy.retention_days({}))
        self.assertEqual(privacy.retention_days({"retention_days": 30}), 30)
        self.assertEqual(privacy.retention_days({"retention_days": 15}), 15)
        self.assertEqual(privacy.retention_days({"retention_days": 5}), 5)
        self.assertIsNone(privacy.retention_days({"retention_days": 0}))
        self.assertIsNone(privacy.retention_days({"retention_days": "5"}))

    def test_only_completed_timestamped_tasks_and_old_events_are_deleted(self):
        db = MagicMock()
        uid = str(ObjectId())
        db.users.find.return_value.sort.return_value.limit.return_value = [
            {"_id": ObjectId(uid), "retention_days": 5}]
        db.tasks.delete_many.return_value.deleted_count = 2
        db.events.find.return_value.limit.return_value = []
        now = datetime(2026, 11, 25, 12, tzinfo=timezone.utc)
        result = privacy.purge_expired_items(db, now)
        self.assertEqual(result["tasks"], 2)
        query = db.tasks.delete_many.call_args.args[0]
        self.assertEqual(query["user_id"], uid)
        self.assertTrue(query["done"])
        self.assertEqual(query["completed_at"]["$lte"], now - timedelta(days=5))
        event_query = db.events.find.call_args.args[0]
        self.assertEqual(event_query["date"]["$lt"], "2026-11-20")

    def test_legacy_account_is_not_processed(self):
        db = MagicMock()
        db.users.find.return_value.sort.return_value.limit.return_value = [{"_id": ObjectId()}]
        result = privacy.purge_expired_items(db, datetime.now(timezone.utc))
        self.assertEqual(result["tasks"], 0)
        db.tasks.delete_many.assert_not_called()
        db.events.delete_many.assert_not_called()

    def test_account_request_requires_password_confirmation(self):
        db = MagicMock()
        user = {"_id": ObjectId(), "password_hash": "stored"}
        request = MagicMock()
        with patch.object(privacy, "get_db", return_value=db), \
             patch.object(privacy, "find_user", return_value=user), \
             patch.object(privacy, "enforce_limit"), \
             patch.object(privacy.passwords, "verify", return_value=False):
            with self.assertRaises(HTTPException) as caught:
                privacy.request_account_deletion(
                    privacy.AccountDeletionRequest(confirmation="DELETE", current_password="wrong"),
                    Response(), request, str(user["_id"]))
        self.assertEqual(caught.exception.status_code, 403)
        db.users.update_one.assert_not_called()

    def test_account_request_revokes_session_and_sets_30_day_due_date(self):
        db = MagicMock()
        db.users.update_one.return_value.modified_count = 1
        user = {"_id": ObjectId(), "password_hash": "stored"}
        now = datetime(2026, 11, 25, tzinfo=timezone.utc)
        response = Response()
        with patch.object(privacy, "get_db", return_value=db), \
             patch.object(privacy, "find_user", return_value=user), \
             patch.object(privacy, "enforce_limit"), \
             patch.object(privacy.passwords, "verify", return_value=True), \
             patch.object(privacy, "now_utc", return_value=now):
            result = privacy.request_account_deletion(
                privacy.AccountDeletionRequest(confirmation="DELETE", current_password="correct"),
                response, MagicMock(), str(user["_id"]))
        self.assertTrue(result["scheduled"])
        self.assertEqual(result["due_at"], (now + timedelta(days=30)).isoformat())
        self.assertEqual(db.users.update_one.call_args.args[1]["$inc"], {"session_version": 1})
        self.assertIn("lifeorbital_auth=", response.headers.get("set-cookie", ""))

    def test_cleanup_stops_before_user_delete_when_hosted_room_exists(self):
        db = MagicMock()
        user = {"_id": ObjectId(), "deletion_due_at": datetime.now(timezone.utc)}
        book_id = ObjectId()
        db.shared_notebooks.find.return_value.limit.return_value = [{"_id": book_id}]
        db.realtime_notebooks.find_one.return_value = {"status": "ready"}
        self.assertFalse(privacy.purge_account(db, user))
        db.users.delete_one.assert_not_called()
        db.shared_notebooks.delete_many.assert_not_called()

    def test_cleanup_removes_known_data_before_user_record(self):
        db = MagicMock()
        user = {"_id": ObjectId(), "deletion_due_at": datetime.now(timezone.utc)}
        db.shared_notebooks.find.return_value.limit.return_value = []
        db.shared_notebooks.find.return_value.__iter__.return_value = []
        db.realtime_notebooks.find_one.return_value = None
        db.users.delete_one.return_value.deleted_count = 1
        was_deleted = privacy.purge_account(db, user)
        self.assertTrue(was_deleted)
        # PyMongo supports db["tasks"]; MagicMock makes indexed collection
        # access distinct from the db.tasks attribute.
        indexed = [call.args[0] for call in db.__getitem__.call_args_list]
        self.assertIn("tasks", indexed)
        self.assertIn("events", indexed)
        self.assertIn("workspaces", indexed)
        self.assertIn("calendar_feeds", indexed)
        self.assertIn("notification_state", indexed)
        self.assertEqual(db.friendships.delete_many.call_count, 1)
        db.users.delete_one.assert_called_once()


if __name__ == "__main__":
    unittest.main()
