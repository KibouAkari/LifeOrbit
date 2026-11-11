"""Offline authorization and CRDT correctness regression checks."""
import os
import unittest
import asyncio
from contextlib import contextmanager
from unittest.mock import MagicMock, patch

from bson import ObjectId
from fastapi import BackgroundTasks, HTTPException, Request
from pycrdt import Doc, Text

from backend.api import realtime
from backend.api.routes import shared_notebooks

BOOK = "507f1f77bcf86cd799439099"
OWNER = "507f1f77bcf86cd799439011"
OTHER = "507f1f77bcf86cd799439012"


def http_request():
    return Request({"type": "http", "method": "POST", "path": "/api/realtime/authorize",
                    "headers": [], "client": ("127.0.0.1", 1234),
                    "scheme": "http", "server": ("testserver", 80)})


class YjsMigrationTests(unittest.TestCase):
    def test_notebook_room_canonicalizes_object_id_case(self):
        self.assertEqual(realtime.notebook_room(BOOK.upper()),
                         realtime.notebook_room(BOOK.lower()))

    def test_notebook_lock_is_released_with_its_ownership_token(self):
        db = MagicMock()
        db.realtime_locks.find_one_and_update.return_value = {"_id": realtime.notebook_room(BOOK)}
        with realtime.notebook_lock(db, BOOK):
            db.realtime_locks.delete_one.assert_not_called()
        query = db.realtime_locks.delete_one.call_args.args[0]
        self.assertEqual(query["_id"], realtime.notebook_room(BOOK))
        self.assertIn("token", query)

    def test_lost_notebook_lock_blocks_acl_provider_writes(self):
        db = MagicMock()
        db.realtime_locks.find_one_and_update.return_value = {
            "_id": realtime.notebook_room(BOOK)}
        db.realtime_locks.find_one.return_value = None
        with patch.object(realtime, "api", return_value={"usersAccesses": {}}) as provider:
            with realtime.notebook_lock(db, BOOK):
                with self.assertRaises(HTTPException):
                    realtime._update_permissions(
                        realtime.notebook_room(BOOK), {OWNER}, create=False,
                        guard=lambda: realtime._assert_lock(
                            db, realtime.notebook_room(BOOK)))
        self.assertEqual(provider.call_count, 1)
        self.assertEqual(provider.call_args.args[:2],
                         ("GET", "/rooms/" + realtime.encoded(realtime.notebook_room(BOOK))))

    def test_acl_reconciliation_uses_current_database_membership(self):
        db = MagicMock()
        fresh = {"_id": ObjectId(BOOK), "owner": OWNER, "members": []}
        stale = {**fresh, "members": [OTHER]}
        db.shared_notebooks.find_one.return_value = fresh
        db.friendships.find_one.return_value = {"status": "accepted"}
        with patch.object(realtime, "_update_permissions") as update:
            realtime.sync_book_access(db, stale)
        self.assertEqual(update.call_args.args,
                         (realtime.notebook_room(BOOK), {OWNER}))
        self.assertFalse(update.call_args.kwargs["create"])
        self.assertTrue(callable(update.call_args.kwargs["guard"]))

    def test_prepare_rereads_notebook_after_acquiring_lock(self):
        db = MagicMock()
        original = {"_id": ObjectId(BOOK), "owner": OWNER, "pages": []}
        order = []

        @contextmanager
        def lock(_db, _book_id):
            order.append("lock")
            yield

        def locate(_db, _book_id, _user):
            order.append("locate")
            return original if order.count("locate") == 1 else latest

        with patch.object(realtime, "require_enabled"), \
             patch.object(realtime, "enforce_limit"), \
             patch.object(realtime, "get_db", return_value=db), \
             patch.object(realtime, "notebook_lock", side_effect=lock), \
             patch("backend.api.routes.shared_notebooks.locate", side_effect=locate), \
             patch.object(realtime, "_prepare_notebook_locked",
                          return_value={"ready": True}) as migrate:
            result = realtime.prepare_notebook(BOOK, http_request(), user=OWNER)

        self.assertEqual(result, {"ready": True})
        self.assertEqual(order, ["lock", "locate"])
        self.assertIs(migrate.call_args.args[3], original)

    def test_invalidation_is_scheduled_after_response(self):
        background = BackgroundTasks()
        with patch.object(realtime, "configured", return_value=True), \
             patch.object(realtime, "api", return_value={}) as provider:
            realtime.publish_to_users([OWNER], "notes", background)
            provider.assert_not_called()
            asyncio.run(background())
        provider.assert_called_once()

    def test_failed_acl_retry_remains_queued(self):
        db = MagicMock()
        room_id = realtime.notebook_room(BOOK)
        db.realtime_acl_outbox.find.return_value.limit.return_value = [
            {"_id": room_id, "notebook_id": BOOK}
        ]
        db.shared_notebooks.find_one.return_value = {
            "_id": ObjectId(BOOK), "owner": OWNER, "members": [OTHER]
        }
        with patch.object(realtime, "configured", return_value=True), \
             patch.object(realtime, "api", side_effect=HTTPException(503, "provider down")):
            realtime.retry_acl_revocations(db)
        db.realtime_acl_outbox.delete_one.assert_not_called()

    def test_acl_retry_waits_for_realtime_configuration(self):
        db = MagicMock()
        with patch.object(realtime, "configured", return_value=False), \
             patch.object(realtime, "api") as provider:
            realtime.retry_acl_revocations(db)
        provider.assert_not_called()
        db.realtime_acl_outbox.find.assert_not_called()

    def test_migrated_notebook_deletion_fails_closed_without_provider(self):
        db = MagicMock()
        db.realtime_notebooks.find_one.return_value = {"status": "ready"}
        book = {"_id": ObjectId(BOOK)}
        with patch.object(realtime, "get_db", return_value=db), \
             patch.object(realtime, "configured", return_value=False):
            with self.assertRaises(HTTPException) as raised:
                realtime.revoke_book_access(book, locked=True)
        self.assertEqual(raised.exception.status_code, 503)

    def test_snapshot_reads_and_writes_under_notebook_lock(self):
        db = MagicMock()
        book = {"_id": ObjectId(BOOK), "pages": [
            {"id": "page1", "title": "Old title", "body": "Old body"}]}
        order = []

        @contextmanager
        def lock(_db, _book_id):
            order.append("lock")
            yield
            order.append("unlock")

        def locate(_db, _book_id, _user):
            order.append("locate")
            return book

        def provider(*_args, **_kwargs):
            order.append("provider-read")
            return {"page:page1:title": "New title"}

        def update(*args, **kwargs):
            order.append("preview-write")
            self.assertEqual(args[1]["$set"]["pages.$.body"], "")
            self.assertEqual(args[1]["$set"]["pages.$.title"], "New title")

        db.realtime_notebooks.find_one.return_value = {"status": "ready"}
        db.shared_notebooks.update_one.side_effect = update
        with patch.object(realtime, "require_enabled"), \
             patch.object(realtime, "get_db", return_value=db), \
             patch.object(realtime, "notebook_lock", side_effect=lock), \
             patch.object(realtime, "_assert_lock"), \
             patch("backend.api.routes.shared_notebooks.locate", side_effect=locate), \
             patch.object(realtime, "api", side_effect=provider):
            result = realtime.snapshot_notebook(BOOK, user=OWNER)

        self.assertEqual(result, {"snapshotted": 1})
        self.assertEqual(order, [
            "lock", "locate", "provider-read", "preview-write", "unlock"])

    def test_empty_yjs_text_roots_are_optional_on_migration_retry(self):
        db = MagicMock()
        db.realtime_notebooks.find_one.return_value = None
        book = {"_id": ObjectId(BOOK), "owner": OWNER, "members": [],
                "pages": [{"id": "empty-body", "title": "Existing title", "body": ""}]}

        def provider(method, endpoint, **_kwargs):
            if method == "GET" and endpoint.endswith("/ydoc"):
                return {"page:empty-body:title": "Existing title"}
            if method == "GET":
                return {"usersAccesses": {}}
            return {}

        with patch.object(realtime, "require_enabled"), \
             patch.object(realtime, "enforce_limit"), \
             patch.object(realtime, "get_db", return_value=db), \
             patch("backend.api.routes.shared_notebooks.locate", return_value=book), \
             patch.object(realtime, "sync_book_access") as grant, \
             patch.object(realtime, "api", side_effect=provider) as provider_call:
            result = realtime.prepare_notebook(BOOK, http_request(), user=OWNER)

        self.assertTrue(result["ready"])
        self.assertFalse(any(call.args[0] == "PUT"
                             for call in provider_call.call_args_list))
        grant.assert_called_once()

    def test_python_yjs_update_preserves_legacy_page(self):
        book = {"pages": [{"id": "page1", "title": "My title",
                           "body": "Original text"}]}
        doc = Doc()
        for page in book["pages"]:
            doc["page:" + page["id"] + ":title"] = Text(page["title"])
            doc["page:" + page["id"] + ":body"] = Text(page["body"])
        other = Doc()
        other.apply_update(doc.get_update())
        self.assertEqual(str(other.get("page:page1:body", type=Text)), "Original text")
        self.assertEqual(str(other.get("page:page1:title", type=Text)), "My title")

    def test_concurrent_edits_merge_deterministically(self):
        a = Doc()
        a["body"] = Text("Hello")
        b = Doc()
        b.apply_update(a.get_update())
        b.get("body", type=Text)
        a_text = a.get("body", type=Text)
        b_text = b.get("body", type=Text)
        a_text += " A"
        b_text += " B"
        update_a, update_b = a.get_update(), b.get_update()
        a.apply_update(update_b)
        b.apply_update(update_a)
        self.assertEqual(str(a.get("body", type=Text)),
                         str(b.get("body", type=Text)))
        self.assertIn(" A", str(a.get("body", type=Text)))
        self.assertIn(" B", str(a.get("body", type=Text)))

    def test_authorize_rejects_arbitrary_room(self):
        with patch.object(realtime, "require_enabled"), \
             patch.object(realtime, "enforce_limit"), \
             patch.object(realtime, "get_db"):
            with self.assertRaises(HTTPException) as raised:
                realtime.authorize(realtime.RoomAuth(room="lo:notebook:unverified"),
                                   http_request(), user=OWNER)
            self.assertEqual(raised.exception.status_code, 403)

    def test_acl_revokes_old_members(self):
        calls = []
        def provider(method, path, **kw):
            calls.append((method, path, kw))
            if method == "GET":
                return {"usersAccesses": {
                    OWNER: ["*:write"], OTHER: ["*:write"]}}
            return {}
        with patch.object(realtime, "api", side_effect=provider):
            realtime._update_permissions(realtime.notebook_room(BOOK),
                                         {OWNER}, create=False)
        mutations = [kw["data"] for method, _, kw in calls if method == "POST"]
        self.assertTrue(mutations)
        self.assertIsNone(mutations[0]["usersAccesses"][OTHER])
        self.assertEqual(mutations[0]["defaultAccesses"], [])

    def test_invalidation_never_carries_document_data(self):
        with patch.object(realtime, "configured", return_value=True), \
             patch.object(realtime, "api", return_value={}) as provider:
            realtime.publish_to_users([OWNER], "notes")
        sent = provider.call_args.kwargs["data"]
        self.assertEqual(sent, {"type": "INVALIDATE", "kind": "notes"})
        self.assertNotIn("body", sent)

    def test_prepare_seeds_before_granting_acl(self):
        db = MagicMock()
        db.realtime_notebooks.find_one.return_value = None
        book = {"_id": ObjectId(BOOK), "owner": OWNER, "members": [],
                "pages": [{"id": "note-1", "title": "Hello", "body": "Keep me"}]}
        actions = []
        def provider(method, endpoint, **kwargs):
            actions.append((method, endpoint, kwargs))
            if method == "GET":
                return None if not endpoint.endswith("/ydoc") else {}
            return {}
        with patch.object(realtime, "require_enabled"), \
             patch.object(realtime, "enforce_limit"), \
             patch.object(realtime, "get_db", return_value=db), \
             patch("backend.api.routes.shared_notebooks.locate", return_value=book), \
             patch.object(realtime, "sync_book_access") as grant, \
             patch.object(realtime, "api", side_effect=provider):
            result = realtime.prepare_notebook(BOOK, http_request(), user=OWNER)
            self.assertTrue(result["ready"])
            self.assertTrue(any(method == "PUT" and
                                isinstance(kwargs.get("binary"), bytes)
                                for method, _, kwargs in actions))
            grant.assert_called_once()

    def test_incomplete_existing_ydoc_does_not_replace_old_notes(self):
        db = MagicMock()
        db.realtime_notebooks.find_one.return_value = None
        book = {"_id": ObjectId(BOOK), "owner": OWNER, "members": [],
                "pages": [{"id": "note-1", "title": "Important", "body": "Do not lose"}]}
        def partial_provider(method, endpoint, **kwargs):
            if method == "GET" and endpoint.endswith("/ydoc"):
                return {"page:note-1:title": "Important"}  # body is missing
            if method == "GET":
                return {"usersAccesses": {}}
            return {}
        with patch.object(realtime, "require_enabled"), \
             patch.object(realtime, "enforce_limit"), \
             patch.object(realtime, "get_db", return_value=db), \
             patch("backend.api.routes.shared_notebooks.locate", return_value=book), \
             patch.object(realtime, "sync_book_access") as grant, \
             patch.object(realtime, "api", side_effect=partial_provider) as provider:
            with self.assertRaises(HTTPException) as error:
                realtime.prepare_notebook(BOOK, http_request(), user=OWNER)
            self.assertEqual(error.exception.status_code, 409)
            grant.assert_not_called()
            self.assertFalse(any(call.args[0] == "PUT"
                                 for call in provider.call_args_list))

    def test_legacy_full_document_save_is_blocked_while_migrating(self):
        db = MagicMock()
        db.realtime_notebooks.find_one.return_value = {"status": "initializing"}
        book = {"_id": ObjectId(BOOK), "owner": OWNER, "members": []}
        with patch("backend.api.routes.shared_notebooks.get_db",
                   return_value=db), \
             patch("backend.api.routes.shared_notebooks.locate",
                   return_value=book):
            with self.assertRaises(HTTPException) as raised:
                shared_notebooks.save_page(
                    BOOK, "page1",
                    shared_notebooks.PageInput(title="Unsafe overwrite", body="data"),
                    user=OWNER)
            self.assertEqual(raised.exception.status_code, 409)


if __name__ == "__main__":
    unittest.main()
