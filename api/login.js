// GET /api/login -> redirect to Google's OAuth consent screen.
const crypto = require("crypto");
const { STATE_COOKIE, cookieStr, origin, ALLOWED_DOMAIN } = require("./_auth");

module.exports = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(500).send("Auth not configured: GOOGLE_CLIENT_ID is missing.");
    return;
  }
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = origin(req) + "/api/callback";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    hd: ALLOWED_DOMAIN, // hint Google to show only Workspace-domain accounts
    prompt: "select_account",
    access_type: "online",
  });
  res.setHeader("Set-Cookie", cookieStr(STATE_COOKIE, state, { maxAge: 600 }));
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString());
};
