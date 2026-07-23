// GET /api/callback -> exchange code, verify domain, set session cookie.
const {
  STATE_COOKIE,
  COOKIE,
  SESSION_TTL_S,
  ALLOWED_DOMAIN,
  cookieStr,
  parseCookies,
  origin,
  createSession,
  decodeIdToken,
  requireSecret,
} = require("./_auth");

module.exports = async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const secret = requireSecret();
    if (!clientId || !clientSecret) {
      res.status(500).send("Auth not configured: Google client credentials are missing.");
      return;
    }

    const url = new URL(req.url, origin(req));
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthErr = url.searchParams.get("error");
    if (oauthErr) {
      res.status(403).send(page("Sign-in cancelled", "You cancelled the Google sign-in.", true));
      return;
    }

    const cookies = parseCookies(req);
    if (!code || !state || state !== cookies[STATE_COOKIE]) {
      res.status(403).send(page("Session expired", "Your sign-in request expired or was invalid. Please try again.", true));
      return;
    }

    const redirectUri = origin(req) + "/api/callback";
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    const tok = await tokenRes.json();
    if (!tokenRes.ok || !tok.id_token) {
      res.status(403).send(page("Sign-in failed", "Could not complete sign-in with Google. Please try again.", true));
      return;
    }

    const claims = decodeIdToken(tok.id_token);
    const email = (claims && claims.email ? claims.email : "").toLowerCase();
    const allowed =
      claims &&
      claims.email_verified &&
      email.endsWith("@" + ALLOWED_DOMAIN) &&
      (!claims.hd || String(claims.hd).toLowerCase() === ALLOWED_DOMAIN);

    if (!allowed) {
      res.setHeader("Set-Cookie", cookieStr(STATE_COOKIE, "", { maxAge: 0 }));
      res
        .status(403)
        .send(
          page(
            "Access restricted",
            `This tool is limited to <b>@${ALLOWED_DOMAIN}</b> accounts.` +
              (email ? ` You signed in as <b>${escapeHtml(email)}</b>.` : ""),
            true
          )
        );
      return;
    }

    const session = createSession(
      { email: claims.email, name: claims.name, picture: claims.picture },
      secret
    );
    res.setHeader("Set-Cookie", [
      cookieStr(COOKIE, session, { maxAge: SESSION_TTL_S }),
      cookieStr(STATE_COOKIE, "", { maxAge: 0 }),
    ]);
    res.redirect(302, "/");
  } catch (e) {
    res.status(500).send(page("Something went wrong", escapeHtml(e && e.message ? e.message : "Unknown error"), false));
  }
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function page(title, msg, showSignin) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>
html,body{height:100%;margin:0}
body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:radial-gradient(1000px 700px at 20% -10%,#231a4d,transparent 60%),radial-gradient(900px 600px at 100% 20%,#0f2a5c,transparent 55%),#05060f;color:#e8eaff;display:grid;place-items:center;text-align:center;padding:24px}
.box{max-width:420px}
h1{font-size:26px;margin:0 0 12px;font-weight:700}
p{color:#9aa0d0;line-height:1.6;margin:0 0 22px}
a.btn{display:inline-block;background:linear-gradient(135deg,#52e5ff,#8b8dff);color:#08091a;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:12px}
</style></head><body><div class="box"><h1>${escapeHtml(title)}</h1><p>${msg}</p>
${showSignin ? '<a class="btn" href="/api/login">Try again</a>' : ""}
</div></body></html>`;
}
