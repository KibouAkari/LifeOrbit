"""Regression tests for access revocation after unfriending.

The test database deliberately starts with duplicate *accepted* friendship
records, as can happen when the unique MongoDB index was never installed.
"""
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from bson import ObjectId
from fastapi import HTTPException

from backend.api.routes import friends, sharing, shared_notebooks


OWNER = "507f1f77bcf86cd799439011"
FORMER_FRIEND = "507f1f77bcf86cd799439012"
REQUEST_A = ObjectId("507f1f77bcf86cd799439013")
REQUEST_B = ObjectId("507f1f77bcf86cd799439014")
BOOK_ID = ObjectId("507f1f77bcf86cd799439015")


class FakeFriendships:
    def __init__(self):
        key = friends.pair(OWNER, FORMER_FRIEND)
        self.rows = [
            {"_id": REQUEST_A, "pair": key, "sender": OWNER,
             "recipient": FORMER_FRIEND, "status": "accepted"},
            {"_id": REQUEST_B, "pair": key, "sender": FORMER_FRIEND,
             "recipient": OWNER, "status": "accepted"},
        ]

    @staticmethod
    def matches(row, criteria):
        for key, value in criteria.items():
            if key == "$or":
                if not any(FakeFriendships.matches(row, part) for part in value):
                    return False
            elif isinstance(value, dict) and "$in" in value:
                if row.get(key) not in value["$in"]:
                    return False
            elif row.get(key) != value:
                return False
        return True

    def find_one(self, criteria, *args, **kwargs):
        return next((dict(row) for row in self.rows if self.matches(row, criteria)), None)

    def find(self, criteria, *args, **kwargs):
        return [dict(row) for row in self.rows if self.matches(row, criteria)]

    def delete_many(self, criteria):
        old = len(self.rows)
        self.rows = [row for row in self.rows if not self.matches(row, criteria)]
        return SimpleNamespace(deleted_count=old - len(self.rows))


class Cursor:
    def __init__(self, items):
        self.items = items

    def sort(self, *_):
        return self

    def skip(self, n):
        self.items = self.items[n:]
        return self

    def limit(self, n):
        self.items = self.items[:n]
        return self

    def __iter__(self):
        return iter(self.items)


class RevocationTests(unittest.TestCase):
    def setUp(self):
        self.db = MagicMock()
        self.db.friendships = FakeFriendships()
        self.book = {"_id": BOOK_ID, "owner": OWNER, "members": [FORMER_FRIEND],
                     "title": "Private shared notebook",
                     "pages": [{"id": "note-1", "title": "Before",
                                "body": "Private data"}]}
        self.db.shared_notebooks.find_one.return_value = self.book
        self.db.shared_notebooks.find.side_effect = lambda *args, **kwargs: Cursor([self.book])
        self.db.shares.find.return_value = Cursor([
            {"owner": OWNER, "recipient": FORMER_FRIEND, "kind": "note",
             "resource_id": "note-1"}])

    def test_remove_revokes_all_duplicate_friendships_and_shared_documents(self):
        self.assertEqual(len(self.db.friendships.rows), 2)
        with patch.object(friends, "get_db", return_value=self.db):
            self.assertEqual(friends.reject_or_remove(str(REQUEST_A), user=OWNER),
                             {"removed": True})
        self.assertEqual(self.db.friendships.rows, [])
        self.db.shares.delete_many.assert_called_once()
        self.assertEqual(self.db.shared_notebooks.update_many.call_count, 2)

        # Simulate an old share still present in storage. Authorization must
        # remain denied even if cleanup missed a document.
        with patch.object(sharing, "get_db", return_value=self.db):
            self.assertEqual(sharing.shared_notes(user=FORMER_FRIEND), [])

        with patch.object(shared_notebooks, "get_db", return_value=self.db):
            response = shared_notebooks.list_notebooks(
                user=FORMER_FRIEND, offset=0, limit=100)
        self.assertEqual(response["items"], [])

        with self.assertRaises(HTTPException) as exc:
            shared_notebooks.locate(self.db, str(BOOK_ID), FORMER_FRIEND)
        self.assertEqual(exc.exception.status_code, 404)

        # Attempts to write subsequent pages must not touch MongoDB.
        with patch.object(shared_notebooks, "get_db", return_value=self.db):
            with self.assertRaises(HTTPException) as exc:
                shared_notebooks.save_page(
                    str(BOOK_ID), "new-page",
                    shared_notebooks.PageInput(title="After", body="New secrets"),
                    user=FORMER_FRIEND)
        self.assertEqual(exc.exception.status_code, 404)
        self.db.shared_notebooks.update_one.assert_not_called()

    def test_an_unrelated_account_cannot_revoke_the_pair(self):
        other = "507f1f77bcf86cd799439088"
        with patch.object(friends, "get_db", return_value=self.db):
            with self.assertRaises(HTTPException) as exc:
                friends.reject_or_remove(str(REQUEST_A), user=other)
        self.assertEqual(exc.exception.status_code, 404)
        self.assertEqual(len(self.db.friendships.rows), 2)
        self.db.shares.delete_many.assert_not_called()

    def test_old_pair_is_not_reenabled_by_an_unrelated_pending_request(self):
        with patch.object(friends, "get_db", return_value=self.db):
            friends.reject_or_remove(str(REQUEST_B), user=FORMER_FRIEND)
        self.assertEqual(self.db.friendships.rows, [])
        with self.assertRaises(HTTPException) as exc:
            sharing.require_friend(self.db, OWNER, FORMER_FRIEND)
        self.assertEqual(exc.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
