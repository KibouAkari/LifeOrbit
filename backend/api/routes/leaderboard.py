"""Friend rankings are private to accepted friendships; community is opt-in."""
from bson import ObjectId
from fastapi import APIRouter, Depends
from backend.api.database import get_db
from backend.api.routes.auth import get_current_user

router = APIRouter()


def _points(challenges):
    """Defensively validate legacy database records as well as new Pydantic data."""
    score = 0
    if not isinstance(challenges, list):
        return 0
    for challenge in challenges[:100]:
        if not isinstance(challenge, dict):
            continue
        value, target = challenge.get("value"), challenge.get("target")
        if type(value) is not int or type(target) is not int or target < 1:
            continue
        score += min(max(value, 0), min(target, 100000)) * 10
    return score


def _ranking(rows, profiles, user_id, *, friends=frozenset(), limit=100):
    entries = []
    for uid, challenges in rows.items():
        if uid not in profiles:
            continue
        entries.append({
            "id": uid if uid == user_id else None,
            "name": profiles[uid],
            "points": _points(challenges),
            "me": uid == user_id,
            "friend": uid in friends,
        })
    entries.sort(key=lambda item: (-item["points"], item["name"].casefold()))
    for position, entry in enumerate(entries, 1):
        entry["rank"] = position
    if limit is None:
        return entries
    participants = entries[:limit]
    current = next((entry for entry in entries if entry["me"]), None)
    if current is not None and current not in participants:
        participants.append(current)
    return participants


@router.get("")
def ranking(user_id: str = Depends(get_current_user)):
    db = get_db()

    # Only a confirmed, current friendship grants access to non-public scores.
    friend_ids = set()
    relationships = db.friendships.find({
        "status": "accepted",
        "$or": [{"sender": user_id}, {"recipient": user_id}],
    }, {"sender": 1, "recipient": 1}).limit(1000)
    for friendship in relationships:
        other = (friendship.get("recipient") if friendship.get("sender") == user_id
                 else friendship.get("sender") if friendship.get("recipient") == user_id
                 else None)
        if isinstance(other, str) and other != user_id and ObjectId.is_valid(other):
            friend_ids.add(other)

    # Friends can always see each other's scores, even without public opt-in.
    # Include accounts with no workspace yet as zero points.
    private_ids = friend_ids | {user_id}
    private_documents = db.workspaces.find(
        {"user_id": {"$in": list(private_ids)}},
        {"user_id": 1, "challenges": 1},
    )
    private_scores = {uid: [] for uid in private_ids}
    for doc in private_documents:
        uid = doc.get("user_id")
        if uid in private_scores:
            private_scores[uid] = doc.get("challenges", [])

    # Public/community discoverability still requires explicit consent.
    # A bounded query avoids materializing an unbounded number of full workspaces.
    opted_in = db.workspaces.find(
        {"leaderboard_opt_in": True, "leaderboard_consent_v1": True},
        {"user_id": 1, "challenges": 1},
    ).limit(2000)
    community_scores = {}
    for doc in opted_in:
        uid = doc.get("user_id")
        if isinstance(uid, str) and ObjectId.is_valid(uid):
            community_scores[uid] = doc.get("challenges", [])
    community_scores[user_id] = private_scores[user_id]

    all_ids = private_ids | set(community_scores)
    profile_ids = [ObjectId(uid) for uid in all_ids if ObjectId.is_valid(uid)]
    profiles = {
        str(doc["_id"]): str(doc.get("name", "Member"))[:70]
        for doc in db.users.find({"_id": {"$in": profile_ids}}, {"name": 1})
    }
    # The authenticated viewer is included in the private ranking, even when
    # not public. Never return email, workspace bodies or unrelated user IDs.
    friend_ranking = _ranking(private_scores, profiles, user_id,
                             friends=friend_ids, limit=None)
    community = _ranking(community_scores, profiles, user_id,
                         friends=friend_ids, limit=100)
    mine = db.workspaces.find_one(
        {"user_id": user_id},
        {"leaderboard_opt_in": 1, "leaderboard_consent_v1": 1},
    ) or {}
    return {
        "friends": friend_ranking,
        "participants": community,
        "opted_in": bool(mine.get("leaderboard_opt_in", False) and
                         mine.get("leaderboard_consent_v1", False)),
    }
