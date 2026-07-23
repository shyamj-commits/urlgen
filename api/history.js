// Shared, team-wide history stored in Redis (Upstash KV via Vercel).
// GET -> list · POST {links:[...]} -> append (dedup by url) · DELETE [?url=] -> remove one / clear all.
// Requires an authenticated @clickpost.ai session.
const { COOKIE, parseCookies, verifySession, requireSecret } = require("./_auth");

const KEY = "ug:history";
const MAX = 500;

function kvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(cmd) {
  const cfg = kvConfig();
  const r = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: "Bearer " + cfg.token, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error("KV error " + r.status);
  const d = await r.json();
  return d.result;
}

async function readAll() {
  const raw = await redis(["GET", KEY]);
  if (!raw) return [];
  try {
    return JSON.parse(raw) || [];
  } catch (e) {
    return [];
  }
}
async function writeAll(items) {
  await redis(["SET", KEY, JSON.stringify(items)]);
}

function getBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try {
        return Promise.resolve(JSON.parse(req.body));
      } catch (e) {
        return Promise.resolve({});
      }
    }
    return Promise.resolve(req.body);
  }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

module.exports = async (req, res) => {
  let secret;
  try {
    secret = requireSecret();
  } catch (e) {
    res.status(500).json({ error: "SESSION_SECRET missing" });
    return;
  }
  const session = verifySession(parseCookies(req)[COOKIE], secret);
  if (!session) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  if (!kvConfig()) {
    res.status(503).json({ error: "storage_not_configured" });
    return;
  }

  try {
    if (req.method === "GET") {
      res.status(200).json({ items: await readAll() });
      return;
    }
    if (req.method === "POST") {
      const body = await getBody(req);
      const links = Array.isArray(body.links) ? body.links : [];
      let items = await readAll();
      const now = Date.now();
      links.forEach((l) => {
        if (!l || !l.url) return;
        const i = items.findIndex((h) => h.url === l.url);
        if (i !== -1) items.splice(i, 1); // de-dup: bump to the top
        items.unshift({ name: l.name || "", email: l.email || "", url: l.url, ts: now, by: session.email });
      });
      if (items.length > MAX) items = items.slice(0, MAX);
      await writeAll(items);
      res.status(200).json({ items });
      return;
    }
    if (req.method === "DELETE") {
      const target = new URL(req.url, "http://x").searchParams.get("url");
      let items = await readAll();
      items = target ? items.filter((h) => h.url !== target) : [];
      await writeAll(items);
      res.status(200).json({ items });
      return;
    }
    res.status(405).json({ error: "method_not_allowed" });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
