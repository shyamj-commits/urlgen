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

## Tech

Pure HTML/CSS/JS in a single `index.html` — no build step, no dependencies.
Runs entirely client-side; nothing is uploaded.

Just open `index.html` in a browser, or deploy the folder as a static site.
