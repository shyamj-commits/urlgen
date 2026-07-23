// Shared auth helpers (CommonJS, Node runtime). Not routable: leading underscore.
const crypto = require("crypto");

const ALLOWED_DOMAIN = (process.env.ALLOWED_DOMAIN || "clickpost.ai").toLowerCase();
const SESSION_TTL_S = 60 * 60 * 8; // 8 hours
const COOKIE = "ug_session";
const STATE_COOKIE = "ug_oauth_state";

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function fromB64url(str) {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function sign(data, secret) {
  return b64url(crypto.createHmac("sha256", secret).update(data).digest());
}

function createSession(user, secret) {
  const payload = {
    email: user.email,
    name: user.name || "",
    picture: user.picture || "",
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S,
  };
  const p = b64url(JSON.stringify(payload));
  return p + "." + sign(p, secret);
}

function verifySession(token, secret) {
  if (!token || token.indexOf(".") === -1) return null;
  const [p, s] = token.split(".");
  if (!p || !s) return null;
  const expected = sign(p, secret);
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(fromB64url(p).toString("utf8"));
  } catch (e) {
    return null;
  }
  if (!payload || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// Decode a JWT payload WITHOUT signature verification. Safe here because the
// id_token is received directly from Google's token endpoint over TLS
// (authenticated with our client secret), per Google's OIDC guidance.
function decodeIdToken(idToken) {
  const parts = String(idToken).split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(fromB64url(parts[1]).toString("utf8"));
  } catch (e) {
    return null;
  }
}

function parseCookies(req) {
  const h = req.headers.cookie || "";
  const out = {};
  h.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function cookieStr(name, value, opts) {
  opts = opts || {};
  let s = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  if (typeof opts.maxAge === "number") s += `; Max-Age=${opts.maxAge}`;
  return s;
}

function origin(req) {
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function requireSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

module.exports = {
  ALLOWED_DOMAIN,
  SESSION_TTL_S,
  COOKIE,
  STATE_COOKIE,
  createSession,
  verifySession,
  decodeIdToken,
  parseCookies,
  cookieStr,
  origin,
  requireSecret,
};
