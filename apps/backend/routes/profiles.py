import logging, re, base64
from fastapi import APIRouter, HTTPException, Request, Query, UploadFile, File
from pydantic import BaseModel, field_validator
from ..database import get_db
from ..services.auth_sessions import read_session, SESSION_COOKIE_NAME

logger = logging.getLogger("profiles"); router = APIRouter()
class ProfileUpdate(BaseModel):
    username: str; display_name: str = ""; bio: str = ""; avatar_url: str = ""
    @field_validator("username")
    @classmethod
    def val_username(cls, v):
        if not v or len(v) < 3 or len(v) > 30:
            raise ValueError("Username must be 3-30 characters")
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")
        return v

def _session(request):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token: raise HTTPException(status_code=401, detail="Not authenticated")
    s = read_session(token)
    if not s or not s.get("sub"): raise HTTPException(status_code=401, detail="Invalid session")
    return s

def _target_sub(client, username):
    r = client.table("profiles").select("google_sub").eq("username", username).execute()
    if not r.data: raise HTTPException(status_code=404, detail="Profile not found")
    return r.data[0]["google_sub"]
def _safe(call, fallback=None):
    try: return call()
    except Exception as e:
        logger.warning(f"DB error: {e}")
        if fallback is not None: return fallback
        raise

@router.post("/me")
async def update_my_profile(request: Request, body: ProfileUpdate):
    s = _session(request); client = get_db()
    existing = _safe(lambda: client.table("profiles").select("google_sub").eq("username", body.username).execute(), {"data": []})
    if existing.data and existing.data[0]["google_sub"] != s["sub"]:
        raise HTTPException(status_code=409, detail="Username already taken")
    p = {"google_sub": s["sub"], "username": body.username, "display_name": body.display_name, "bio": body.bio, "avatar_url": body.avatar_url}
    client.table("profiles").upsert(p).execute()
    return {"success": True, "profile": p}

@router.get("/me")
async def get_my_profile(request: Request):
    s = _session(request)
    p = _with_counts(get_db(), s["sub"])
    return {"profile": p, "account": {"email": s.get("email",""), "picture": s.get("picture",""), "name": s.get("name","")}}

@router.get("/search")
async def search_profiles(q: str = Query("", min_length=1)):
    try:
        r = get_db().table("profiles").select("*").or_(f"username.ilike.%{q}%,display_name.ilike.%{q}%").limit(20).execute()
        return {"profiles": r.data}
    except: return {"profiles": []}

@router.post("/avatar")
async def upload_avatar(request: Request, file: UploadFile = File(...)):
    s = _session(request); client = get_db()
    data = await file.read()
    b64 = base64.b64encode(data).decode()
    url = f"data:{file.content_type or 'image/jpeg'};base64,{b64}"
    client.table("profiles").update({"avatar_url": url}).eq("google_sub", s["sub"]).execute()
    return {"url": url}

def _with_counts(client, sub, viewer=""):
    try:
        r = client.table("profiles").select("*").eq("google_sub", sub).execute()
        if not r.data: return None
        p = r.data[0]
    except: return None
    p["follower_count"] = 0; p["following_count"] = 0; p["is_following"] = False
    try: flw = client.table("follows").select("follower_sub", count="exact").eq("following_sub", sub).execute(); p["follower_count"] = flw.count or 0
    except: pass
    try: flg = client.table("follows").select("following_sub", count="exact").eq("follower_sub", sub).execute(); p["following_count"] = flg.count or 0
    except: pass
    if viewer:
        try: fr = client.table("follows").select("*").eq("follower_sub", viewer).eq("following_sub", sub).execute(); p["is_following"] = len(fr.data) > 0
        except: pass
    return p

@router.get("/{username}")
async def get_profile(username: str, request: Request):
    client = get_db(); sub = _safe(lambda: _target_sub(client, username))
    viewer = ""
    try: viewer = _session(request)["sub"]
    except: pass
    p = _with_counts(client, sub, viewer)
    if not p: raise HTTPException(status_code=404, detail="Profile not found")
    return {"profile": p}

@router.get("/{username}/datasets")
async def get_profile_datasets(username: str):
    try:
        client = get_db(); sub = _target_sub(client, username)
        r = client.table("datasets").select("*").eq("seller_sub", sub).order("created_at", desc=True).execute()
        return {"datasets": r.data}
    except HTTPException: raise
    except: return {"datasets": []}

@router.post("/{username}/follow")
async def follow_profile(username: str, request: Request):
    s = _session(request); client = get_db()
    target = _target_sub(client, username)
    if s["sub"] == target: raise HTTPException(status_code=400, detail="Cannot follow yourself")
    existing = client.table("follows").select("*").eq("follower_sub", s["sub"]).eq("following_sub", target).execute()
    if not existing.data:
        client.table("follows").insert({"follower_sub": s["sub"], "following_sub": target}).execute()
    return {"success": True}

@router.post("/{username}/unfollow")
async def unfollow_profile(username: str, request: Request):
    s = _session(request); client = get_db()
    try: target = _target_sub(client, username)
    except HTTPException: raise
    except: raise HTTPException(status_code=404, detail="Profile not found")
    client.table("follows").delete().eq("follower_sub", s["sub"]).eq("following_sub", target).execute()
    return {"success": True}

def _list_relation(username, col, viewer=""):
    try:
        client = get_db(); sub = _target_sub(client, username)
        r = client.table("follows").select(col).eq("following_sub" if col == "follower_sub" else "follower_sub", sub).execute()
        subs = [x[col] for x in r.data]
        if not subs: return []
        pr = client.table("profiles").select("*").in_("google_sub", subs).execute()
        if viewer:
            for p in pr.data:
                try:
                    f = client.table("follows").select("*").eq("follower_sub", viewer).eq("following_sub", p["google_sub"]).execute()
                    p["is_following"] = len(f.data) > 0
                except:
                    p["is_following"] = False
        return pr.data
    except: return []

@router.get("/{username}/followers")
async def get_followers(username: str, request: Request):
    try: viewer = _session(request)["sub"]
    except: viewer = ""
    return {"followers": _list_relation(username, "follower_sub", viewer)}

@router.get("/{username}/following")
async def get_following(username: str, request: Request):
    try: viewer = _session(request)["sub"]
    except: viewer = ""
    return {"following": _list_relation(username, "following_sub", viewer)}
