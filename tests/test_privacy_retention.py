"""Privacy retention and account lifecycle regression checks (no production data)."""
import unittest
from contextlib import contextmanager, nullcontext
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from bson import ObjectId
from fastapi import HTTPException, Response
from pymongo.errors import ExecutionTimeout

from backend.api.routes import calendar, calendar_feeds, privacy
from backend.api.routes import auth
from backend.api.routes import sharing, shared_notebooks


class Cursor(list):
    def sort(self, *_args, **_kwargs):
        return self

    def limit(self, count):
        return Cursor(self[:count])


class PrivacyRetentionTests(unittest.TestCase):
    def setUp(self):
        self.lock_assertion_patches = [
            patch.object(privacy, "assert_privacy_user_lock"),
            patch.object(privacy, "assert_event_lock"),
            patch.object(sharing, "assert_privacy_user_lock"),
            patch.object(sharing, "assert_event_lock"),
            patch.object(calendar_feeds, "assert_event_lock"),
            patch.object(calendar_feeds, "assert_privacy_user_lock"),
            patch.object(calendar_feeds, "privacy_user_lock", return_value=nullcontext()),
        ]
        for lock_patch in self.lock_assertion_patches:
            lock_patch.start()

    def tearDown(self):
        for lock_patch in self.lock_assertion_patches:
            lock_patch.stop()

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
        db.privacy_jobs.find_one.return_value = {}
        db.users.find_one.return_value = {"retention_days": 5}
        db.users.find.return_value.sort.return_value.limit.return_value = [
            {"_id": ObjectId(uid), "retention_days": 5}]
        db.tasks.delete_many.return_value.deleted_count = 2
        db.events.find.return_value.sort.return_value.limit.return_value = []
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
        db.privacy_jobs.find_one.return_value = {}
        db.users.find_one.return_value = {}
        db.users.find.return_value.sort.return_value.limit.return_value = [{"_id": ObjectId()}]
        result = privacy.purge_expired_items(db, datetime.now(timezone.utc))
        self.assertEqual(result["tasks"], 0)
        db.tasks.delete_many.assert_not_called()
        db.events.delete_many.assert_not_called()

    def test_retention_rechecks_preference_under_user_lock(self):
        db = MagicMock()
        user = {"_id": ObjectId(), "retention_days": 5}
        db.privacy_jobs.find_one.return_value = {}
        db.users.find.return_value.sort.return_value.limit.return_value = [user]
        db.users.find_one.return_value = {"retention_days": None}
        with patch.object(privacy, "privacy_user_lock", return_value=nullcontext()):
            result = privacy.purge_expired_items(db, datetime.now(timezone.utc))
        self.assertEqual(result["tasks"], 0)
        db.tasks.delete_many.assert_not_called()
        db.events.find.assert_not_called()

    def test_retention_event_budget_resumes_from_checkpoint(self):
        db = MagicMock()
        user_id = ObjectId()
        user = {"_id": user_id, "retention_days": 5}
        event_rows = [{"_id": ObjectId(), "user_id": str(user_id), "date": "2000-01-01"}
                      for _ in range(3)]
        checkpoint = {}
        db.privacy_jobs.find_one.return_value = checkpoint

        def update_checkpoint(_query, update, **_kwargs):
            checkpoint.update(update.get("$set", {}))
            for key in update.get("$unset", {}):
                checkpoint.pop(key, None)

        def find_users(query, _projection):
            cursor = query.get("_id", {}).get("$gt")
            return Cursor([user] if cursor is None or user_id > cursor else [])

        def find_events(query, _projection):
            after = query.get("_id", {}).get("$gt")
            return Cursor([row for row in event_rows if
                           row["date"] < query["date"]["$lt"] and
                           (after is None or row["_id"] > after)])

        def find_one_event(query, _projection=None):
            return next(iter(find_events(query, None)), None)

        def delete_event(query, **_kwargs):
            row = next((item for item in event_rows if item["_id"] == query["_id"] and
                        item["date"] < query["date"]["$lt"]), None)
            if row:
                event_rows.remove(row)
            return row

        db.privacy_jobs.update_one.side_effect = update_checkpoint
        def find_user(query, _projection=None):
            user_filter = query.get("_id")
            if user_filter == user_id:
                return {"_id": user_id, "retention_days": 5}
            if isinstance(user_filter, dict):
                return None
            return {"retention_days": 5}

        db.users.find_one.side_effect = find_user
        db.users.find.side_effect = find_users
        db.events.find.side_effect = find_events
        db.events.find_one.side_effect = find_one_event
        db.events.find_one_and_delete.side_effect = delete_event
        with patch.object(privacy, "privacy_user_lock", return_value=nullcontext()), \
             patch.object(privacy, "event_lock", return_value=nullcontext()):
            first = privacy.purge_expired_items(
                db, datetime(2026, 11, 25, tzinfo=timezone.utc), max_users=1, max_events=2)
            saved_user = checkpoint.get("partial_user")
            saved_cursor = checkpoint.get("event_cursor")
            second = privacy.purge_expired_items(
                db, datetime(2026, 11, 25, tzinfo=timezone.utc), max_users=1, max_events=2)
        self.assertEqual(first["events"], 2)
        self.assertEqual(second["events"], 1)
        self.assertEqual(saved_user, user_id)
        self.assertIsNotNone(saved_cursor)
        self.assertEqual(event_rows, [])
        self.assertNotIn("partial_user", checkpoint)

    def test_rescheduled_event_and_its_invitations_are_preserved(self):
        db = MagicMock()
        user_id = ObjectId()
        event_id = ObjectId()
        db.privacy_jobs.find_one.return_value = {}
        db.users.find_one.return_value = {"retention_days": 5}
        db.users.find.return_value.sort.return_value.limit.return_value = [
            {"_id": user_id, "retention_days": 5}]
        db.events.find.side_effect = [Cursor([{"_id": event_id}]), Cursor([])]
        db.events.find_one_and_delete.return_value = None
        db.events.find_one.return_value = None
        with patch.object(privacy, "privacy_user_lock", return_value=nullcontext()), \
             patch.object(privacy, "event_lock", return_value=nullcontext()):
            result = privacy.purge_expired_items(db, datetime(2026, 11, 25, tzinfo=timezone.utc))
        self.assertEqual(result["events"], 0)
        self.assertEqual(db.events.find_one_and_delete.call_args.args[0]["date"],
                         {"$lt": "2026-11-20"})
        db.shares.delete_many.assert_not_called()

    def test_deleted_event_removes_its_invitations(self):
        db = MagicMock()
        user_id = ObjectId()
        event_id = ObjectId()
        db.privacy_jobs.find_one.return_value = {}
        db.users.find_one.return_value = {"retention_days": 5}
        db.users.find.return_value.sort.return_value.limit.return_value = [
            {"_id": user_id, "retention_days": 5}]
        db.events.find.side_effect = [Cursor([{"_id": event_id}]), Cursor([])]
        db.events.find_one_and_delete.return_value = {"_id": event_id}
        db.events.find_one.return_value = None
        with patch.object(privacy, "privacy_user_lock", return_value=nullcontext()), \
             patch.object(privacy, "event_lock", return_value=nullcontext()):
            result = privacy.purge_expired_items(db, datetime(2026, 11, 25, tzinfo=timezone.utc))
        self.assertEqual(result["events"], 1)
        db.shares.delete_many.assert_called_once_with(
            {"owner": str(user_id), "kind": "event", "resource_id": str(event_id)},
            session=db.client.start_session.return_value.__enter__.return_value)

    def test_feed_reconciliation_removes_invitations_for_deleted_events(self):
        db = MagicMock()
        user_id = str(ObjectId())
        event_id = ObjectId()
        db.users.find_one.return_value = {"retention_days": 5}
        db.events.find_one_and_delete.side_effect = [{"_id": event_id}, None]
        db.events.find.side_effect = [
            Cursor([{"_id": event_id}]), Cursor([])]
        feed = {"_id": ObjectId(), "name": "Calendar"}
        with patch.object(calendar_feeds, "event_lock", return_value=nullcontext()):
            calendar_feeds.apply_events(db, user_id, feed, [
                {"date": "2000-01-01", "source_key": "old"},
                {"date": "2099-01-01", "source_key": "future"}])
        self.assertEqual(db.events.find_one_and_delete.call_args.args[0]["source_key"],
                         {"$nin": ["future"]})
        self.assertEqual(db.shares.delete_many.call_args.args[0],
                         {"owner": user_id, "kind": "event",
                          "resource_id": {"$in": [str(event_id)]}})
        self.assertIs(db.events.find_one_and_delete.call_args.kwargs["session"],
                      db.shares.delete_many.call_args.kwargs["session"])
        self.assertEqual(db.client.start_session.call_count, 1)
        self.assertEqual(feed["count"], 1)

    def test_import_reads_preference_and_writes_under_user_lock(self):
        db = MagicMock()
        user = str(ObjectId())
        locked = False

        @contextmanager
        def lock(*_):
            nonlocal locked
            locked = True
            try:
                yield
            finally:
                locked = False

        def read_user(*_args):
            self.assertTrue(locked)
            return {"retention_days": 5}

        def write_event(*_args, **_kwargs):
            self.assertTrue(locked)
            return MagicMock(upserted_id=ObjectId())

        db.users.find_one.side_effect = read_user
        db.events.update_one.side_effect = write_event
        payload = calendar.IcalImport(content=(
            "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\n"
            "UID:future\r\nDTSTART;VALUE=DATE:20990101\r\nEND:VEVENT\r\n"
            "BEGIN:VEVENT\r\nUID:old\r\nDTSTART;VALUE=DATE:20000101\r\n"
            "END:VEVENT\r\nEND:VCALENDAR\r\n"))
        with patch.object(calendar, "get_db", return_value=db), \
             patch.object(calendar, "privacy_user_lock", side_effect=lock), \
             patch.object(calendar, "assert_privacy_user_lock",
                          side_effect=lambda *_: self.assertTrue(locked)):
            self.assertEqual(calendar.import_ical(payload, user), {"imported": 1, "total": 1})
        db.events.update_one.assert_called_once()

    def test_feed_reads_preference_and_reconciles_under_user_lock(self):
        db = MagicMock()
        user = str(ObjectId())
        event_id = ObjectId()
        locked = False

        @contextmanager
        def lock(*_):
            nonlocal locked
            locked = True
            try:
                yield
            finally:
                locked = False

        def read_user(*_args):
            self.assertTrue(locked)
            return {"retention_days": None}

        @contextmanager
        def event_lock(*_):
            self.assertTrue(locked)
            yield

        db.users.find_one.side_effect = read_user
        db.events.find.side_effect = [Cursor([{"_id": event_id}]), Cursor([])]
        db.events.find_one_and_delete.return_value = {"_id": event_id}
        with patch.object(calendar_feeds, "privacy_user_lock", side_effect=lock), \
             patch.object(calendar_feeds, "event_lock", side_effect=event_lock), \
             patch.object(calendar_feeds, "assert_privacy_user_lock",
                          side_effect=lambda *_: self.assertTrue(locked)):
            calendar_feeds.apply_events(db, user, {"_id": ObjectId(), "name": "Feed"},
                                        [{"date": "2000-01-01", "source_key": "old"}])
        self.assertEqual(db.events.update_one.call_count, 1)
        self.assertEqual(db.shares.delete_many.call_count, 1)

    def test_calendar_reconciliation_rejects_missing_or_pending_account(self):
        db = MagicMock()
        db.users.find_one.return_value = None
        user = str(ObjectId())
        payload = calendar.IcalImport(content="BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n")
        with patch.object(calendar, "get_db", return_value=db), \
             patch.object(calendar, "privacy_user_lock", return_value=nullcontext()):
            with self.assertRaises(HTTPException) as caught:
                calendar.import_ical(payload, user)
        self.assertEqual(caught.exception.status_code, 409)
        with self.assertRaises(HTTPException) as caught:
            calendar_feeds.apply_events(db, user, {"_id": ObjectId(), "name": "Feed"}, [])
        self.assertEqual(caught.exception.status_code, 409)
        db.events.update_one.assert_not_called()
        db.events.find_one_and_delete.assert_not_called()

    def test_calendar_reconciliation_stops_on_lost_user_lease(self):
        db = MagicMock()
        db.users.find_one.return_value = {"retention_days": None}
        user = str(ObjectId())
        payload = calendar.IcalImport(content=(
            "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:future\r\n"
            "DTSTART;VALUE=DATE:20990101\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n"))
        lost = HTTPException(409, "lock lost")
        with patch.object(calendar, "get_db", return_value=db), \
             patch.object(calendar, "privacy_user_lock", return_value=nullcontext()), \
             patch.object(calendar, "assert_privacy_user_lock", side_effect=lost):
            with self.assertRaises(HTTPException):
                calendar.import_ical(payload, user)
        with patch.object(calendar_feeds, "assert_privacy_user_lock", side_effect=lost):
            with self.assertRaises(HTTPException):
                calendar_feeds.apply_events(
                    db, user, {"_id": ObjectId(), "name": "Feed"},
                    [{"date": "2099-01-01", "source_key": "future"}])
        db.events.update_one.assert_not_called()

    def test_feed_cleanup_batches_event_and_share_deletion(self):
        db = MagicMock()
        user_id = str(ObjectId())
        event_rows = [{"_id": ObjectId(), "source_key": "stale"} for _ in range(205)]
        db.users.find_one.return_value = {"retention_days": None}

        def find_stale(*_args, **_kwargs):
            return Cursor(event_rows)

        def delete_stale(query, **_kwargs):
            event = next((row for row in event_rows if row["_id"] == query["_id"]), None)
            if event:
                event_rows.remove(event)
            return event

        db.events.find.side_effect = find_stale
        db.events.find_one_and_delete.side_effect = delete_stale
        with patch.object(calendar_feeds, "event_lock", return_value=nullcontext()):
            calendar_feeds.apply_events(
                db, user_id, {"_id": ObjectId(), "name": "Feed"}, [])
        self.assertEqual(event_rows, [])
        self.assertEqual(db.client.start_session.call_count, 3)
        self.assertEqual(db.shares.delete_many.call_count, 3)

    def test_scheduler_is_required_before_accepting_deletion(self):
        with patch.dict("os.environ", {"CRON_SECRET": ""}):
            with self.assertRaises(HTTPException) as caught:
                privacy.require_cleanup_scheduler()
        self.assertEqual(caught.exception.status_code, 503)

    def test_account_request_requires_password_confirmation(self):
        db = MagicMock()
        user = {"_id": ObjectId(), "password_hash": "stored"}
        request = MagicMock()
        with patch.object(privacy, "get_db", return_value=db), \
             patch.object(privacy, "require_cleanup_scheduler"), \
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
             patch.object(privacy, "require_cleanup_scheduler"), \
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
        with patch.object(privacy, "notebook_lock", return_value=nullcontext()):
            self.assertFalse(privacy.purge_account(db, user))
        db.users.delete_one.assert_not_called()
        db.shared_notebooks.delete_many.assert_not_called()

    def test_account_purge_blocks_on_orphaned_hosted_room_tombstone(self):
        db = MagicMock()
        user = {"_id": ObjectId()}
        db.shared_notebooks.find.return_value.limit.return_value = []
        db.shared_notebooks.find_one.return_value = None
        db.friendships.find.return_value.limit.return_value = []
        db.friendships.find_one.return_value = None
        db.realtime_notebooks.find_one.return_value = {"owner": str(user["_id"])}
        with patch.object(privacy, "privacy_user_lock", return_value=nullcontext()):
            self.assertFalse(privacy.purge_account(db, user))
        db.users.delete_one.assert_not_called()

    def test_pending_account_sessions_return_401(self):
        user_id = str(ObjectId())
        db = MagicMock()
        db.users.find_one.return_value = {"_id": ObjectId(user_id),
                                          "deletion_due_at": datetime.now(timezone.utc)}
        with patch.object(auth, "get_db", return_value=db):
            with self.assertRaises(HTTPException) as caught:
                auth.find_user(user_id)
        self.assertEqual(caught.exception.status_code, 401)

    def test_cleanup_removes_known_data_before_user_record(self):
        db = MagicMock()
        db.__getitem__.side_effect = lambda name: getattr(db, name)
        user = {"_id": ObjectId(), "deletion_due_at": datetime.now(timezone.utc)}
        db.shared_notebooks.find.return_value.limit.return_value = []
        db.shared_notebooks.find.return_value.__iter__.return_value = []
        db.shared_notebooks.find_one.return_value = None
        db.realtime_notebooks.find_one.return_value = None
        db.friendships.find_one.return_value = None
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
        db.friendships.delete_many.assert_not_called()
        db.users.delete_one.assert_called_once()

    def test_purge_serializes_membership_cleanup_with_invitation_pair(self):
        db = MagicMock()
        db.__getitem__.side_effect = lambda name: getattr(db, name)
        user_id, friend_id, book_id = str(ObjectId()), str(ObjectId()), ObjectId()
        user = {"_id": ObjectId(user_id)}
        active = {"sender": user_id, "recipient": friend_id}
        pair_locked = False

        def cursor(items):
            result = MagicMock()
            result.limit.return_value = items
            return result

        def find_notebooks(criteria, projection=None):
            if criteria == {"owner": user_id}:
                return cursor([])
            if criteria == {"members": user_id}:
                return cursor([{"owner": friend_id}])
            if criteria == {"owner": friend_id, "members": user_id}:
                self.assertTrue(pair_locked)
                return cursor([{"_id": book_id}])
            return cursor([])

        @contextmanager
        def pair_lock(*_):
            nonlocal pair_locked
            self.assertFalse(pair_locked)
            pair_locked = True
            try:
                yield
            finally:
                pair_locked = False

        db.shared_notebooks.find.side_effect = find_notebooks
        db.shared_notebooks.find_one.return_value = None
        db.friendships.find.return_value.limit.return_value = [active]
        db.friendships.find_one.return_value = None
        db.realtime_notebooks.find_one.return_value = None
        db.users.delete_one.return_value.deleted_count = 1
        db.shared_notebooks.update_one.side_effect = (
            lambda *_: self.assertTrue(pair_locked))
        db.friendships.delete_many.side_effect = (
            lambda *_: self.assertTrue(pair_locked))
        with patch.object(privacy, "realtime_access_lock", side_effect=pair_lock), \
             patch.object(privacy, "assert_realtime_access_lock",
                          side_effect=lambda *_: self.assertTrue(pair_locked)), \
             patch.object(privacy, "notebook_lock", return_value=nullcontext()):
            self.assertTrue(privacy.purge_account(db, user))
        db.friendships.delete_many.assert_called_once()
        db.shared_notebooks.update_one.assert_called_once()
        db.users.delete_one.assert_called_once()

    def test_notebook_invitation_rejects_missing_or_pending_target(self):
        db = MagicMock()
        user_id, target_id, book_id = str(ObjectId()), str(ObjectId()), str(ObjectId())
        db.shared_notebooks.find_one.return_value = {
            "_id": ObjectId(book_id), "owner": user_id, "members": []}
        db.users.find_one.return_value = None
        with patch.object(shared_notebooks, "get_db", return_value=db), \
             patch.object(shared_notebooks, "realtime_access_lock",
                          return_value=nullcontext()), \
             patch.object(shared_notebooks, "notebook_lock",
                          return_value=nullcontext()):
            with self.assertRaises(HTTPException) as caught:
                shared_notebooks.invite_member(
                    book_id, shared_notebooks.MemberInput(user_id=target_id), user=user_id)
        self.assertEqual(caught.exception.status_code, 403)
        self.assertEqual(db.users.find_one.call_args.args[0], {
            "_id": ObjectId(target_id), "deletion_due_at": {"$exists": False}})
        db.shared_notebooks.update_one.assert_not_called()

    def test_share_creation_is_serialized_with_account_cleanup(self):
        db = MagicMock()
        owner, recipient = str(ObjectId()), str(ObjectId())
        locked = False

        @contextmanager
        def user_locks(*_users):
            nonlocal locked
            locked = True
            try:
                yield
            finally:
                locked = False

        db.users.find_one.return_value = {"_id": ObjectId()}
        db.friendships.find_one.return_value = {"status": "accepted"}
        db.workspaces.find_one.return_value = {"notes": [{"id": "note"}]}
        db.shares.update_one.side_effect = lambda *_args, **_kwargs: self.assertTrue(locked)
        with patch.object(sharing, "get_db", return_value=db), \
             patch.object(sharing, "privacy_users_lock", side_effect=user_locks), \
             patch.object(sharing, "publish_to_users"):
            result = sharing.share_note(
                sharing.ShareRequest(recipient_id=recipient, resource_id="note"), user=owner)
        self.assertTrue(result["shared"])
        db.shares.update_one.assert_called_once()

    def test_event_invitation_and_cleanup_share_the_event_lock(self):
        db = MagicMock()
        owner, recipient, event_id = str(ObjectId()), str(ObjectId()), str(ObjectId())
        event_locked = False
        users_locked = False

        @contextmanager
        def event_lock(*_):
            nonlocal event_locked
            event_locked = True
            try:
                yield
            finally:
                event_locked = False

        @contextmanager
        def user_locks(*_):
            nonlocal users_locked
            users_locked = True
            try:
                yield
            finally:
                users_locked = False

        db.users.find_one.return_value = {"_id": ObjectId()}
        db.friendships.find_one.return_value = {"status": "accepted"}
        db.events.find_one.return_value = {"_id": ObjectId(event_id), "user_id": owner}
        db.shares.update_one.side_effect = (
            lambda *_args, **_kwargs: self.assertTrue(event_locked and users_locked))
        with patch.object(sharing, "get_db", return_value=db), \
             patch.object(sharing, "privacy_users_lock", side_effect=user_locks), \
             patch.object(sharing, "event_lock", side_effect=event_lock), \
             patch.object(sharing, "publish_to_users"):
            result = sharing.invite_event(
                sharing.ShareRequest(recipient_id=recipient, resource_id=event_id), user=owner)
        self.assertTrue(result["invited"])
        db.shares.update_one.assert_called_once()

    def test_notebook_deletion_records_owner_for_hosted_room_tombstone(self):
        db = MagicMock()
        user_id, book_id = str(ObjectId()), str(ObjectId())
        book = {"_id": ObjectId(book_id), "owner": user_id, "members": []}
        db.realtime_notebooks.find_one.return_value = {"_id": f"lo:notebook:{book_id}"}
        with patch.object(shared_notebooks, "get_db", return_value=db), \
             patch.object(shared_notebooks, "locate", return_value=book), \
             patch.object(shared_notebooks, "notebook_lock", return_value=nullcontext()), \
             patch.object(shared_notebooks, "revoke_book_access"), \
             patch.object(shared_notebooks, "publish_to_users"):
            result = shared_notebooks.delete_notebook(book_id, user=user_id)
        self.assertTrue(result["removed"])
        self.assertEqual(db.realtime_notebooks.update_one.call_args.args[1]["$set"]["owner"],
                         user_id)
        db.shared_notebooks.delete_one.assert_called_once()

    def test_cleanup_defers_account_until_every_owned_notebook_is_processed(self):
        db = MagicMock()
        user = {"_id": ObjectId()}
        owned = [{"_id": ObjectId()} for _ in range(1000)]
        db.shared_notebooks.find.return_value = Cursor(owned)
        db.shared_notebooks.find_one.return_value = {"_id": ObjectId()}
        db.realtime_notebooks.find_one.return_value = None
        with patch.object(privacy, "notebook_lock", return_value=nullcontext()) as lock:
            self.assertFalse(privacy.purge_account(db, user))
        self.assertEqual(lock.call_count, privacy.ACCOUNT_RESOURCE_BATCH)
        self.assertEqual(db.shared_notebooks.delete_one.call_count, privacy.ACCOUNT_RESOURCE_BATCH)
        self.assertEqual(db.notebook_crdts.delete_one.call_count, privacy.ACCOUNT_RESOURCE_BATCH)
        db.users.delete_one.assert_not_called()

    def test_account_cleanup_yields_and_resumes_after_deadline(self):
        db = MagicMock()
        db.__getitem__.side_effect = lambda name: getattr(db, name)
        user = {"_id": ObjectId()}
        owned = [{"_id": ObjectId()}, {"_id": ObjectId()}]
        db.shared_notebooks.find.side_effect = lambda query, *_: Cursor(
            list(owned) if query == {"owner": str(user["_id"])} else [])
        db.shared_notebooks.find_one.side_effect = lambda query, *_: (
            owned[0] if query == {"owner": str(user["_id"])} and owned else None)
        db.shared_notebooks.delete_one.side_effect = lambda query: owned.remove(
            next(book for book in owned if book["_id"] == query["_id"]))
        db.friendships.find.return_value = Cursor([])
        db.friendships.find_one.return_value = None
        db.realtime_notebooks.find_one.return_value = None
        db.users.delete_one.return_value.deleted_count = 1
        clock = [0]
        def finish_first_book(_query):
            clock[0] = 2
        db.notebook_crdts.delete_one.side_effect = finish_first_book
        with patch.object(privacy.time, "monotonic", side_effect=lambda: clock[0]), \
             patch.object(privacy, "privacy_user_lock", return_value=nullcontext()), \
             patch.object(privacy, "notebook_lock", return_value=nullcontext()):
            with self.assertRaises(privacy.CleanupDeadline):
                privacy.purge_account(db, user, deadline=1)
            self.assertEqual(len(owned), 1)
            db.users.delete_one.assert_not_called()
            clock[0] = 0
            db.notebook_crdts.delete_one.side_effect = None
            self.assertTrue(privacy.purge_account(db, user, deadline=1))
        self.assertEqual(owned, [])
        db.users.delete_one.assert_called_once()

    def test_membership_batches_preserve_friendship_until_all_are_cleaned(self):
        db = MagicMock()
        db.__getitem__.side_effect = lambda name: getattr(db, name)
        user, owner = str(ObjectId()), str(ObjectId())
        books = [{"_id": ObjectId()} for _ in range(privacy.ACCOUNT_RESOURCE_BATCH + 1)]
        friendship = [{"sender": owner, "recipient": user}]
        def find_books(query, *_):
            if query == {"owner": user}:
                return Cursor([])
            if query == {"members": user}:
                return Cursor([{"owner": owner}] if books else [])
            return Cursor(list(books))
        def find_one_book(query, *_):
            return books[0] if books and query.get("members") == user else None
        def remove_member(query, *_):
            books.remove(next(book for book in books if book["_id"] == query["_id"]))
        db.shared_notebooks.find.side_effect = find_books
        db.shared_notebooks.find_one.side_effect = find_one_book
        db.shared_notebooks.update_one.side_effect = remove_member
        db.friendships.find.side_effect = lambda *_: Cursor(list(friendship))
        db.friendships.find_one.side_effect = lambda *_: friendship[0] if friendship else None
        db.friendships.delete_many.side_effect = lambda *_: friendship.clear()
        db.realtime_notebooks.find_one.return_value = None
        db.users.delete_one.return_value.deleted_count = 1
        with patch.object(privacy, "privacy_user_lock", return_value=nullcontext()), \
             patch.object(privacy, "realtime_access_lock", return_value=nullcontext()), \
             patch.object(privacy, "assert_realtime_access_lock"), \
             patch.object(privacy, "notebook_lock", return_value=nullcontext()):
            self.assertFalse(privacy.purge_account(db, {"_id": ObjectId(user)}))
            self.assertEqual(len(books), 1)
            self.assertEqual(len(friendship), 1)
            db.users.delete_one.assert_not_called()
            self.assertTrue(privacy.purge_account(db, {"_id": ObjectId(user)}))
        self.assertEqual(books, [])
        self.assertEqual(friendship, [])

    def test_cron_reserves_time_for_retention_after_account_deadline(self):
        request = MagicMock()
        request.headers = {"authorization": "Bearer " + "test-secret"}
        now = datetime.now(timezone.utc)
        with patch.dict("os.environ", {"CRON_SECRET": "test-secret"}), \
             patch.object(privacy, "get_db"), \
             patch.object(privacy, "now_utc", return_value=now), \
             patch.object(privacy.time, "monotonic", side_effect=[100, 108]), \
             patch.object(privacy, "mongo_timeout", return_value=nullcontext()), \
             patch.object(privacy, "purge_due_accounts", return_value={}) as accounts, \
             patch.object(privacy, "purge_expired_items", return_value={}) as items:
            privacy.retention_cron(request)
        self.assertEqual(accounts.call_args.kwargs["deadline"], 108)
        self.assertEqual(items.call_args.kwargs["time_budget"], 8)

    def test_due_accounts_stop_on_deadline_without_removing_user(self):
        db = MagicMock()
        db.users.find.return_value.sort.return_value.limit.return_value = [{"_id": ObjectId()}]
        with patch.object(privacy.time, "monotonic", return_value=0), \
             patch.object(privacy, "purge_account", side_effect=privacy.CleanupDeadline):
            result = privacy.purge_due_accounts(db, datetime.now(timezone.utc), deadline=1)
        self.assertEqual(result, {"deleted": 0, "blocked": 1})
        db.users.update_one.assert_not_called()
        db.users.delete_one.assert_not_called()

    def test_account_database_timeout_still_runs_retention(self):
        request = MagicMock()
        request.headers = {"authorization": "Bearer " + "test-secret"}
        with patch.dict("os.environ", {"CRON_SECRET": "test-secret"}), \
             patch.object(privacy, "get_db"), \
             patch.object(privacy, "mongo_timeout", return_value=nullcontext()), \
             patch.object(privacy, "purge_due_accounts", side_effect=ExecutionTimeout("timeout")), \
             patch.object(privacy, "purge_expired_items", return_value={}) as items, \
             patch.object(privacy, "database_error", side_effect=HTTPException(503, "database")):
            with self.assertRaises(HTTPException):
                privacy.retention_cron(request)
        items.assert_called_once()

    def test_partial_account_batch_is_eligible_for_next_run(self):
        db = MagicMock()
        account = {"_id": ObjectId()}
        db.users.find.return_value.sort.return_value.limit.return_value = [account]
        now = datetime.now(timezone.utc)
        with patch.object(privacy, "purge_account", return_value=None):
            privacy.purge_due_accounts(db, now)
        db.users.update_one.assert_called_once_with(
            {"_id": account["_id"]}, {"$set": {"deletion_retry_after": now}})

    def test_feed_creation_does_not_insert_if_user_lock_fails(self):
        db = MagicMock()
        db.calendar_feeds.count_documents.return_value = 0
        data = calendar_feeds.FeedInput(name="Feed", url="https://example.com/feed")
        with patch.object(calendar_feeds, "get_db", return_value=db), \
             patch.object(calendar_feeds, "enforce_limit"), \
             patch.object(calendar_feeds, "validate_url", return_value=(data.url,)), \
             patch.object(calendar_feeds, "fetch_events", return_value=[]), \
             patch.object(calendar_feeds, "cipher"), \
             patch.object(calendar_feeds, "privacy_user_lock",
                          side_effect=HTTPException(409, "busy")):
            with self.assertRaises(HTTPException):
                calendar_feeds.create_feed(data, MagicMock(), str(ObjectId()))
        db.calendar_feeds.insert_one.assert_not_called()

    def test_hosted_room_found_under_notebook_lock_blocks_purge(self):
        db = MagicMock()
        user = {"_id": ObjectId()}
        book_id = ObjectId()
        db.shared_notebooks.find.return_value.limit.return_value = [{"_id": book_id}]
        def lock(_db, _id):
            db.realtime_notebooks.find_one.return_value = {"status": "initializing"}
            return nullcontext()
        with patch.object(privacy, "notebook_lock", side_effect=lock):
            self.assertFalse(privacy.purge_account(db, user))
        db.notebook_crdts.delete_one.assert_not_called()
        db.shared_notebooks.delete_one.assert_not_called()

    def test_cleanup_rechecks_remaining_memberships_before_user_deletion(self):
        db = MagicMock()
        user = {"_id": ObjectId()}
        db.shared_notebooks.find.return_value.limit.return_value = []
        db.shared_notebooks.find.return_value.__iter__.return_value = []
        db.shared_notebooks.find_one.side_effect = [
            None, {"_id": ObjectId(), "members": [str(user["_id"])]}]
        self.assertFalse(privacy.purge_account(db, user))
        db.users.delete_one.assert_not_called()


if __name__ == "__main__":
    unittest.main()
