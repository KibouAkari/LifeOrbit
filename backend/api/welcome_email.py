"""One-time, transactional welcome email for newly created LifeOrbit accounts.

The template is deliberately table-based with inline CSS for major email
clients, hosted first-party PNG artwork and a text alternative.
Failures are logged without addresses or message bodies and cannot undo signup.
"""
import logging
from html import escape

import requests
from fastapi import HTTPException

def _delivery_settings():
    # Import lazily: auth imports this module, while password_reset imports
    # auth for password hashing. A module-level import would create a cycle.
    from backend.api.password_reset import _delivery_settings as shared_settings
    return shared_settings()

logger = logging.getLogger(__name__)

SUBJECT = "Welcome to LifeOrbit ✨"


def build_welcome_email(name: str, origin: str) -> tuple[str, str]:
    """Return a safe HTML message and equivalent plain-text version."""
    display = (name or "").strip()[:70] or "there"
    safe_name = escape(display, quote=True)
    app_url = origin.rstrip("/") + "/#/dashboard"
    logo_url = origin.rstrip("/") + "/assets/email-icon.png"
    safe_app_url = escape(app_url, quote=True)
    safe_logo_url = escape(logo_url, quote=True)

    # A system font stack and email-safe inline styles mirror the real website:
    # #7263D5 accent, #F8F8FA canvas, #29273A text, lavender surfaces.
    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Welcome to LifeOrbit</title>
</head>
<body style="margin:0;padding:0;background:#F8F8FA;color:#29273A;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;font-size:1px;color:#F8F8FA;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    A little more room for life. Your LifeOrbit space is ready.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;background:#F8F8FA;">
    <tr><td align="center" style="padding:32px 16px 42px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;background:#FFFFFF;border:1px solid #E9E7F1;border-radius:22px;">
        <tr><td style="padding:30px 34px 18px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:middle;padding:0 10px 0 0;">
              <img src="{safe_logo_url}" alt="LifeOrbit planet logo" width="60" height="48" style="display:block;width:60px;height:48px;border:0;outline:none;text-decoration:none;" />
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:26px;line-height:32px;letter-spacing:-0.8px;color:#29273A;font-weight:700;">LifeOrbit</span>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:16px 34px 8px;">
          <span style="display:inline-block;background:#F0EEFF;border-radius:100px;padding:8px 12px;color:#6254BC;font-size:11px;line-height:14px;font-weight:700;letter-spacing:1.2px;">YOUR SPACE IS READY</span>
        </td></tr>
        <tr><td style="padding:12px 34px 4px;">
          <h1 style="margin:0;color:#29273A;font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:1.19;letter-spacing:-1px;font-weight:700;">Welcome to your<br>better orbit.</h1>
        </td></tr>
        <tr><td style="padding:13px 34px 18px;">
          <p style="margin:0 0 12px;font-size:16px;line-height:1.7;color:#4D4C5B;">Hi {safe_name},</p>
          <p style="margin:0;font-size:15px;line-height:1.8;color:#606071;">We're happy you're here. LifeOrbit brings your plans, notes and little wins into one calm space, so there's more room for what matters.</p>
        </td></tr>
        <tr><td align="left" style="padding:6px 34px 26px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#7263D5" style="border-radius:12px;background:#7263D5;">
            <a href="{safe_app_url}" style="display:inline-block;padding:16px 23px;border:1px solid #7263D5;border-radius:12px;color:#FFFFFF;text-decoration:none;font-size:14px;line-height:18px;font-weight:700;">Open my LifeOrbit&nbsp; &rarr;</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:0 34px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#F8F7FD;border:1px solid #EEECF9;border-radius:16px;">
            <tr><td style="padding:22px 22px 8px;">
              <p style="margin:0;color:#6254BC;font-size:11px;line-height:15px;letter-spacing:1.1px;font-weight:700;">A GOOD PLACE TO START</p>
            </td></tr>
            <tr><td style="padding:11px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td valign="top" width="37" style="color:#7263D5;font-size:12px;font-weight:700;line-height:21px;">01</td><td>
                  <p style="margin:0 0 4px;color:#29273A;font-size:14px;font-weight:700;">Plan your days</p>
                  <p style="margin:0;color:#6E6B7D;font-size:13px;line-height:1.6;">See your tasks and events together in your calendar.</p>
                </td></tr>
              </table>
            </td></tr>
            <tr><td style="padding:10px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td valign="top" width="37" style="color:#7263D5;font-size:12px;font-weight:700;line-height:21px;">02</td><td>
                  <p style="margin:0 0 4px;color:#29273A;font-size:14px;font-weight:700;">Make space for ideas</p>
                  <p style="margin:0;color:#6E6B7D;font-size:13px;line-height:1.6;">Keep your notes organized and easy to find.</p>
                </td></tr>
              </table>
            </td></tr>
            <tr><td style="padding:10px 22px 23px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td valign="top" width="37" style="color:#7263D5;font-size:12px;font-weight:700;line-height:21px;">03</td><td>
                  <p style="margin:0 0 4px;color:#29273A;font-size:14px;font-weight:700;">Share the good things</p>
                  <p style="margin:0;color:#6E6B7D;font-size:13px;line-height:1.6;">Connect with friends, plan together and celebrate progress.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 34px 32px;">
          <p style="margin:0;color:#7263D5;font-size:14px;font-weight:700;">Less organising. More living.</p>
          <p style="margin:7px 0 0;color:#737181;font-size:13px;line-height:1.6;">We're glad to have you in orbit.</p>
        </td></tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:600px;">
        <tr><td align="center" style="padding:21px 25px 0;color:#606071;font-size:12px;line-height:1.8;">
          This one-time message was sent because a LifeOrbit account was created with this email address.<br>
          <a href="{safe_app_url}" style="color:#7263D5;text-decoration:underline;">Visit LifeOrbit</a>
          &nbsp;&middot;&nbsp; &copy; 2026 LifeOrbit
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    text = (
        f"Hi {display},\n\n"
        "Welcome to your better orbit.\n\n"
        "We're happy you're here. LifeOrbit brings your plans, notes and "
        "little wins into one calm space.\n\n"
        "A good place to start:\n"
        "1. Plan your days with tasks and calendar events.\n"
        "2. Keep your ideas together in organized notes.\n"
        "3. Connect with friends to plan and share progress.\n\n"
        f"Open LifeOrbit: {app_url}\n\n"
        "Less organising. More living.\n"
        "This one-time email was sent because an account was created "
        "with this email address.\n"
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

        html, text = build_welcome_email(name, origin)
        headers = {"Authorization": "Bearer " + key,
                   "Content-Type": "application/json"}
        if event_key:
            # Hash account-specific material before sending it as metadata.
            import hashlib
            headers["Idempotency-Key"] = ("lifeorbit-welcome-" +
                                         hashlib.sha256(event_key.encode()).hexdigest())
        response = requests.post(
            "https://api.resend.com/emails",
            headers=headers,
            json={"from": sender, "to": [email], "subject": SUBJECT,
                  "html": html, "text": text},
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
