# URL Generator

A minimal, single-file static tool with a dark galaxy theme that turns a base URL
into personalized, shareable links — one per recipient.

**Live:** https://url-generator-beige.vercel.app

## What it does

Given a base URL template with `xxxxx` placeholders, e.g.

```
https://hc4ll5gtr2e.typeform.com/to/vt4Atzbj#first_name=xxxxx&email=xxxxx
```

paste a list of recipients and it fills in each `first_name` / `email` placeholder,
producing a ready-to-share link for everyone.

## Input formats

One recipient per line — any of:

```
Ada ada@example.com          # name + email
Grace, grace@example.com     # name, email
alan@example.com             # email only (first name derived from the address)
a@x.com, b@y.com             # several bare emails on one line
```

- **Email** is inserted verbatim (no URL-encoding of `@`).
- **first_name** uses the typed name's first word, or is derived from the email
  when no name is given (toggle in the UI).
- Only placeholders already present in the template are touched — nothing else changes.

## Usage

- Press **Enter** to generate · **Shift+Enter** for a new line.
- Each result has its own **Copy** button, plus **Copy all**.
- A **History** of everything generated is saved locally in your browser
  (`localStorage`) and survives reloads. Remove entries individually or **Clear all**.

## Access (deployed)

The Vercel deployment is gated by **Google sign-in, restricted to `@clickpost.ai`
accounts** (server-enforced). Visiting the site redirects to Google; only a
verified Workspace email is let through, via a signed HTTP-only session cookie.

Auth flow (plain OAuth 2.0 Authorization Code, no framework):

- `api/index.js` — serves the tool **only** to a valid session, else redirects to login.
- `api/login.js` → Google consent screen · `api/callback.js` → verifies + sets cookie · `api/logout.js`.
- `api/_auth.js` — session signing/verification helpers.

Required Vercel environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`SESSION_SECRET`, and optionally `ALLOWED_DOMAIN` (defaults to `clickpost.ai`).

## Tech

Pure HTML/CSS/JS in a single `index.html` — no build step, no dependencies.
Runs entirely client-side; nothing is uploaded.

Open `index.html` directly in a browser for unauthenticated local use.

> The deployed tool is served from `api/_app.json`, a JSON snapshot of `index.html`.
> After editing `index.html`, regenerate it with:
> `node -e 'require("fs").writeFileSync("api/_app.json",JSON.stringify(require("fs").readFileSync("index.html","utf8")))'`
