"""One-time, transactional welcome email for newly created LifeOrbit accounts.

The template is deliberately table-based with inline CSS for major email
clients, hosted first-party PNG artwork and a text alternative.
Failures are logged without addresses or message bodies and cannot undo signup.
"""
import base64
import logging
from pathlib import Path
from html import escape

import requests
from fastapi import HTTPException

def _delivery_settings():
    # Import lazily: auth imports this module, while password_reset imports
    # auth for password hashing. A module-level import would create a cycle.
    from backend.api.password_reset import _delivery_settings as shared_settings
    return shared_settings()

logger = logging.getLogger(__name__)


def configure_logging() -> None:
    """Make sanitized provider outcomes visible in the ASGI runtime logs."""
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        logger.addHandler(logging.StreamHandler())
    for handler in logger.handlers:
        handler.setLevel(logging.INFO)
    logger.propagate = False


SUBJECT = "Welcome to LifeOrbit"


def build_welcome_email(name: str, origin: str, logo_src: str | None = None) -> tuple[str, str]:
    """A short, personal email with a first-party logo and plain-text fallback."""
    display = (name or "").strip()[:70] or "there"
    safe_name = escape(display, quote=True)
    app_url = origin.rstrip("/") + "/#/dashboard"
    # The canonical Vite public asset is a PNG export of public/assets/icon.svg.
    # Keep the brand name visible because many mail clients block remote images.
    logo_url = logo_src or (origin.rstrip("/") + "/assets/email-icon.png")
    safe_app_url = escape(app_url, quote=True)
    safe_logo_url = escape(logo_url, quote=True)

    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Welcome to LifeOrbit</title>
</head>
<body style="margin:0;padding:0;background:#F8F8FA;font-family:Arial,Helvetica,sans-serif;color:#29273A;">
  <div style="display:none!important;max-height:0;opacity:0;overflow:hidden;">
    A quick hello from LifeOrbit.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#F8F8FA;">
    <tr><td align="center" style="padding:28px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;border-collapse:collapse;background:#FFFFFF;border:1px solid #E9E7F1;">
        <tr><td style="padding:28px 30px 18px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle" style="padding-right:12px;">
              <img src="{safe_logo_url}" alt="LifeOrbit" width="50" height="40" style="display:block;width:50px;height:40px;border:0;outline:none;text-decoration:none;" />
            </td>
            <td valign="middle" style="font-size:21px;font-weight:700;color:#29273A;line-height:26px;">LifeOrbit</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:10px 30px 28px;">
          <h1 style="margin:0 0 20px;font-size:25px;line-height:1.3;font-weight:700;color:#29273A;">Welcome to LifeOrbit</h1>
          <p style="margin:0 0 15px;font-size:15px;line-height:1.7;color:#343243;">Hi {safe_name},</p>
          <p style="margin:0 0 15px;font-size:15px;line-height:1.7;color:#343243;">Thanks for joining LifeOrbit. I'm glad you're here.</p>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#343243;">You can start with something small: add a task, make a note, or put an upcoming event in your calendar. Make the space your own, at your own pace.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td bgcolor="#6254BC" style="background:#6254BC;">
              <a href="{safe_app_url}" style="display:inline-block;padding:12px 19px;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;">Open LifeOrbit</a>
            </td>
          </tr></table>
          <p style="margin:24px 0 0;font-size:15px;line-height:1.7;color:#343243;">See you there,<br>The LifeOrbit team</p>
        </td></tr>
        <tr><td style="padding:17px 30px;border-top:1px solid #E9E7F1;font-size:12px;line-height:1.6;color:#606071;">
          You're receiving this because a LifeOrbit account was created with this address.
          If that wasn't you, you can ignore this email.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    text = (
        f"Hi {display},\n\n"
        "Thanks for joining LifeOrbit. I'm glad you're here.\n\n"
        "You can start with something small: add a task, make a note, or put "
        "an upcoming event in your calendar. Make the space your own, at your own pace.\n\n"
        f"Open LifeOrbit: {app_url}\n\n"
        "See you there,\nThe LifeOrbit team\n\n"
        "You're receiving this because a LifeOrbit account was created with this address.\n"
        "If that wasn't you, you can ignore this email.\n"
    )
    return html, text


def send_welcome_email(email: str, name: str, event_key: str = "") -> bool:
    """Bounded, observable provider attempt; never log addresses or tokens.

    An optional stable event key makes Resend suppress accidental duplicate
    submissions within its idempotency window. Provider acceptance is not
    the same as delivery into a mailbox.
    """
    try:
        try:
            key, sender, origin = _delivery_settings()
        except HTTPException:
            logger.warning("Welcome email skipped: provider configuration unavailable")
            return False

        # Inline CID images work in many clients even when remote image loading
        # is disabled. Fall back to the canonical public PNG if it is not bundled.
        image_path = Path(__file__).resolve().parents[2] / "public/assets/email-icon.png"
        attachments = []
        logo_src = None
        try:
            image_bytes = image_path.read_bytes()
            if image_bytes.startswith(b"\x89PNG\r\n\x1a\n") and len(image_bytes) <= 50000:
                logo_src = "cid:lifeorbit-logo"
                attachments = [{
                    "filename": "lifeorbit-logo.png",
                    "content_type": "image/png",
                    "content_id": "lifeorbit-logo",
                    "content": base64.b64encode(image_bytes).decode("ascii"),
                }]
        except OSError:
            logger.info("Welcome logo attachment unavailable; using first-party URL")
        html, text = build_welcome_email(name, origin, logo_src=logo_src)
        headers = {"Authorization": "Bearer " + key,
                   "Content-Type": "application/json"}
        if event_key:
            # Hash account-specific material before sending it as metadata.
            import hashlib
            headers["Idempotency-Key"] = ("lifeorbit-welcome-" +
                                         hashlib.sha256(event_key.encode()).hexdigest())
        payload = {"from": sender, "to": [email], "subject": SUBJECT,
                   "html": html, "text": text}
        if attachments:
            payload["attachments"] = attachments
        response = requests.post(
            "https://api.resend.com/emails",
            headers=headers,
            json=payload,
            timeout=(2, 4), allow_redirects=False,
        )
        if response.status_code not in (200, 201, 202):
            logger.warning("Welcome email provider returned HTTP %s",
                           response.status_code)
            return False
        logger.info("Welcome email accepted by provider (HTTP %s)",
                    response.status_code)
        return True
    except Exception:
        logger.warning("Welcome email delivery is unavailable")
        return False
