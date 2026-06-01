import logging
import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, field_validator

from ..database import get_db
from ..services.auth_config import auth_cookie_secure, get_primary_frontend_origin
from ..services.auth_sessions import (
    SESSION_COOKIE_NAME,
    build_session,
    build_state,
    exchange_google_code,
    parse_state,
    read_session,
    verify_google_id_token,
)

logger = logging.getLogger("auth_router")
router = APIRouter()


class GoogleStartRequest(BaseModel):
    nonce: str
    return_to: str = "/"

    @field_validator("return_to")
    @classmethod
    def validate_return_to(cls, value: str) -> str:
        if not value.startswith("/") or value.startswith("//"):
            raise ValueError("return_to must be a relative path.")
        return value


@router.post("/google/start")
async def google_start(payload: GoogleStartRequest, request: Request):
    client_id = request.app.state.google_client_id
    if not client_id:
        raise HTTPException(status_code=500, detail="Google client ID is not configured.")
    state = build_state(payload.nonce, payload.return_to)
    redirect_uri = str(request.url_for("google_callback"))
    params = urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "nonce": payload.nonce,
            "state": state,
            "prompt": "select_account",
        }
    )
    return JSONResponse({"authorization_url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"})


@router.get("/google/callback", name="google_callback")
async def google_callback(request: Request, code: str, state: str):
    try:
        state_payload = parse_state(state)
        redirect_uri = str(request.url_for("google_callback"))
        id_token = await exchange_google_code(code, redirect_uri)
        claims = await verify_google_id_token(id_token, state_payload["nonce"])

        sub = claims.get("sub", "")
        client = get_db()
        salt_response = client.table("salts").select("salt").eq("google_sub", sub).execute()
        if salt_response.data:
            salt = salt_response.data[0]["salt"]
        else:
            salt = secrets.token_hex(32)
            client.table("salts").insert({"google_sub": sub, "salt": salt}).execute()

        session = build_session(id_token, claims, salt)
        response = RedirectResponse(url=f"{get_primary_frontend_origin()}{state_payload['return_to']}", status_code=302)
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session,
            httponly=True,
            secure=auth_cookie_secure(),
            samesite="lax",
            path="/",
            max_age=60 * 60 * 24 * 7,
        )
        return response
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Google callback failed: %s", error)
        return RedirectResponse(url=f"{get_primary_frontend_origin()}/?auth_error=google_login_failed", status_code=302)


@router.get("/me")
async def me(request: Request):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return {"authenticated": False, "account": None}
    session = read_session(token)
    return {
        "authenticated": True,
        "id_token": session["id_token"],
        "salt": session.get("salt", ""),
        "account": {
            "sub": session.get("sub", ""),
            "email": session.get("email", ""),
            "name": session.get("name", ""),
            "picture": session.get("picture", ""),
        },
    }


@router.post("/logout")
async def logout():
    response = JSONResponse({"success": True})
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return response
