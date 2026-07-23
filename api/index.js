// GET / (via rewrite) -> serve the tool only to an authenticated session.
const { COOKIE, parseCookies, verifySession, requireSecret } = require("./_auth");
const APP_HTML = require("./_app.json");

module.exports = (req, res) => {
  let secret;
  try {
    secret = requireSecret();
  } catch (e) {
    res.status(500).send("Auth not configured: SESSION_SECRET is missing.");
    return;
  }

  const cookies = parseCookies(req);
  const session = verifySession(cookies[COOKIE], secret);
  if (!session) {
    res.setHeader("Cache-Control", "no-store");
    res.redirect(302, "/api/login");
    return;
  }

  const chip = `<div style="position:fixed;top:14px;right:16px;z-index:40;display:flex;align-items:center;gap:10px;font:500 12px/1.4 'Sora',system-ui,sans-serif;color:#9aa0d0;background:rgba(10,12,30,.6);backdrop-filter:blur(10px);border:1px solid rgba(140,150,255,.18);padding:6px 8px 6px 14px;border-radius:999px">
<span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(session.email)}</span>
<a href="/api/logout" style="color:#e8eaff;text-decoration:none;background:rgba(139,141,255,.18);border:1px solid rgba(140,150,255,.28);padding:5px 12px;border-radius:999px">Sign out</a>
</div>`;

  const html = APP_HTML.replace("</body>", chip + "</body>");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(html);
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
