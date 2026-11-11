"""Offline authorization and CRDT correctness regression checks."""
import os
import unittest
from unittest.mock import MagicMock, patch

from bson import ObjectId
from fastapi import HTTPException, Request
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
