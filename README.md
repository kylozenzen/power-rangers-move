# MOVED

MOVED is the anti-fitness workout tracker: strength, cardio, and movement tracking without streak pressure, account friction, or motivational guilt trips.

## Project structure

```text
/
├── index.html              # Tracker shell; kept at root for existing PWA installs
├── manifest.json           # PWA manifest
├── sw.js                   # Root-scoped service worker
├── _redirects              # Public routes + compatibility aliases
├── _headers                # Netlify cache rules
├── app/
│   ├── data/               # Exercise library, tiers, workout templates
│   ├── scripts/
│   │   ├── active/         # Active-workout modules
│   │   ├── beta/           # Backup, recovery, offline diagnostics
│   │   ├── analytics-hooks.js
│   │   └── app.js
│   └── styles/             # Tracker, active-workout, and beta styles
├── site/
│   ├── landing.html        # Public MOVED landing page
│   ├── privacy.html        # Privacy policy
│   ├── scripts/            # Landing-page behavior
│   └── styles/             # Landing and privacy styles
├── assets/
│   └── icons/              # PWA and brand icons
└── netlify/
    └── functions/          # Consent-gated analytics loader
```

The browser-facing asset URLs intentionally remain stable through Netlify rewrites. This lets older installed copies and cached pages continue requesting paths such as `/app.css`, `/icons/...`, and `/landing.css` even though the physical repository files now live in organized folders.

## Product principles

- Strength, cardio, and mixed workouts
- Fast in-session set logging and editing
- Active-session recovery across app closes
- Real offline PWA use
- Local-first workout history with backup and restore
- No account required
- No streak punishment or shame-based nudges
- Optional consent-gated product analytics that never includes workout content

## Public routes

- `/` — marketing / beta landing page
- `/app` — workout tracker
- `/privacy` — privacy policy

## Deployment

The site is deployed on Netlify. Keep `_redirects`, `_headers`, `manifest.json`, `index.html`, and `sw.js` at repository root unless the routing/PWA architecture is intentionally being changed.

When app-shell paths change, bump the cache name in `sw.js` so installed copies receive the new shell.
