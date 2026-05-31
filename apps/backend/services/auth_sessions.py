import base64
import hashlib
import hmac
import json
import os
import time

import httpx
from fastapi import HTTPException

SESSION_COOKIE_NAME = "trainyard_auth_session"
STATE_TTL_SECONDS = 600
SESSION_TTL_SECONDS = int(os.getenv("AUTH_SESSION_TTL_SECONDS", "604800"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
SESSION_SECRET = os.getenv("AUTH_SESSION_SECRET", "")
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def build_state(nonce: str, return_to: str) -> str:
  return sign({"nonce": nonce, "return_to": return_to, "purpose": "google_login"}, STATE_TTL_SECONDS)


def parse_state(token: str) -> dict:
  payload = unsign(token)
  if payload.get("purpose") != "google_login":
    raise HTTPException(status_code=400, detail="Invalid login state.")
  return payload


async def exchange_google_code(code: str, redirect_uri: str) -> str:
  if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
    raise HTTPException(status_code=500, detail="Google OAuth server credentials are not configured.")

  data = {
    "code": code,
    "client_id": GOOGLE_CLIENT_ID,
    "client_secret": GOOGLE_CLIENT_SECRET,
    "redirect_uri": redirect_uri,
    "grant_type": "authorization_code",
  }
  async with httpx.AsyncClient(timeout=15.0) as client:
    response = await client.post(GOOGLE_TOKEN_ENDPOINT, data=data)
    response.raise_for_status()
    token = response.json().get("id_token")
  if not token:
    raise HTTPException(status_code=400, detail="Google did not return an identity token.")
  return token


async def verify_google_id_token(id_token: str, expected_nonce: str) -> dict:
  async with httpx.AsyncClient(timeout=15.0) as client:
    response = await client.get(GOOGLE_TOKENINFO_URL, params={"id_token": id_token})
    response.raise_for_status()
    claims = response.json()
  if claims.get("aud") != GOOGLE_CLIENT_ID:
    raise HTTPException(status_code=401, detail="Google client ID mismatch.")
  if claims.get("iss") not in GOOGLE_ISSUERS:
    raise HTTPException(status_code=401, detail="Unexpected Google issuer.")
  if claims.get("nonce") != expected_nonce:
    raise HTTPException(status_code=401, detail="OAuth nonce mismatch.")
  if int(claims.get("exp", "0")) <= int(time.time()):
    raise HTTPException(status_code=401, detail="Google login expired.")
  return claims


def build_session(id_token: str, claims: dict) -> str:
  return sign(
    {
      "id_token": id_token,
      "sub": claims.get("sub", ""),
      "email": claims.get("email", ""),
      "name": claims.get("name", ""),
      "picture": claims.get("picture", ""),
      "iss": claims.get("iss", ""),
      "aud": claims.get("aud", ""),
      "nonce": claims.get("nonce", ""),
    },
    SESSION_TTL_SECONDS,
  )


def read_session(token: str | None) -> dict | None:
  if not token:
    return None
  return unsign(token)


def sign(payload: dict, ttl_seconds: int) -> str:
  if not SESSION_SECRET:
    raise HTTPException(status_code=500, detail="AUTH_SESSION_SECRET is not configured.")
  now = int(time.time())
  data = dict(payload)
  data.update({"iat": now, "exp": now + ttl_seconds})
  raw = json.dumps(data, separators=(",", ":"), sort_keys=True).encode()
  sig = hmac.new(SESSION_SECRET.encode(), raw, hashlib.sha256).digest()
  return f"{_b64(raw)}.{_b64(sig)}"


def unsign(token: str) -> dict:
  if not SESSION_SECRET:
    raise HTTPException(status_code=500, detail="AUTH_SESSION_SECRET is not configured.")
  try:
    raw_b64, sig_b64 = token.split(".", 1)
    raw = _unb64(raw_b64)
    expected = hmac.new(SESSION_SECRET.encode(), raw, hashlib.sha256).digest()
    if not hmac.compare_digest(expected, _unb64(sig_b64)):
      raise HTTPException(status_code=401, detail="Invalid authentication session.")
    payload = json.loads(raw.decode())
    if int(payload.get("exp", 0)) < int(time.time()):
      raise HTTPException(status_code=401, detail="Authentication session expired.")
    return payload
  except HTTPException:
    raise
  except Exception:
    raise HTTPException(status_code=401, detail="Invalid authentication session.")


def _b64(data: bytes) -> str:
  return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(data: str) -> bytes:
  padding = "=" * (-len(data) % 4)
  return base64.urlsafe_b64decode(data + padding)
