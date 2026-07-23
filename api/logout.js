// GET /api/logout -> clear session and return to sign-in.
const { COOKIE, cookieStr } = require("./_auth");

module.exports = (req, res) => {
  res.setHeader("Set-Cookie", cookieStr(COOKIE, "", { maxAge: 0 }));
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, "/api/login");
};
