# Braingency — braingency.eu

Marketing site for **Braingency** (SIA BATWATEX), a Riga-based software company
building lending ERP/CRM platforms and machine learning systems.

The site exists primarily to support the company's **EIC Accelerator (Horizon
Europe)** application: evaluators visit it to verify the company is real and to
find the published Gender Equality Plan.

```
Rails 7.2 · Propshaft · esbuild · Tailwind v4 · no database · Heroku
```

---

## Running locally

```bash
bundle install
yarn install
bin/dev          # Rails + esbuild --watch + tailwind --watch on :3000
```

`bin/build-assets` does a one-shot rebuild of both bundles if you are not
running the watchers.

---

## How it is put together

There is **no database, no CMS and no forms**. Every page is a static render.

| Concern | Where |
|---|---|
| Site structure, legal facts, people, GEP metadata | `config/site.rb` |
| All copy, both languages | `config/locales/{en,lv}.yml` |
| Design tokens, components, animation base states | `app/frontend/styles/application.css` |
| Animations (one module per behaviour) | `app/javascript/lib/` |
| Page templates | `app/views/pages/` |
| Shared partials (nav, hero, footer, logo, icons) | `app/views/shared/` |

**`config/site.rb` is the single source of truth.** Navigation, the sitemap,
hreflang alternates and the JSON-LD block are all derived from it — adding a
page means editing that file plus the two locale files, nothing else.

### Editing content

All text lives in `config/locales/en.yml` and `config/locales/lv.yml`, which
mirror each other key for key. Missing Latvian keys fall back to English
automatically, so a partial translation never shows "translation missing" to a
visitor.

### Languages

URLs carry the locale: `/en/...` and `/lv/...`. `/` sniffs `Accept-Language`
and redirects. The switcher keeps the visitor on the same page.

---

## Gender Equality Plan

The plan is served from `public/documents/` rather than the asset pipeline, on
purpose: the URL is quoted in an EU funding application and must never change.

```
https://braingency.eu/gender-equality-plan     ← language-agnostic permalink
https://braingency.eu/documents/braingency-gender-equality-plan-v1.0-2026-01-12.pdf
```

The full text is also rendered as HTML on the page so an evaluator can read it
without downloading anything. On the Latvian page the plan text stays in
English — the signed document's language — with a note explaining why.

**To publish a new version:** drop the PDF into `public/documents/`, update
`Site::GEP` in `config/site.rb`, and add the superseded version to the archive
list in `app/views/pages/gender_equality_plan.html.erb`. Never delete an old
PDF; the archive must keep resolving.

---

## Brand assets

`public/icon.svg` is the source of truth for the mark. After changing it (or any
page title), regenerate the derived files:

```bash
bin/build-brand    # favicon.ico, icon-*.png, apple-touch-icon.png, public/og/*.png
```

Requires Chrome and ImageMagick locally. Outputs are committed, so deploys never
need either.

The logo mark has three candidate designs. Compare them at **`/dev/brand`**
(development only) and switch by changing `Site::MARK` in `config/site.rb`.

---

## Animation

Every module in `app/javascript/lib/` guards its own preconditions and fails
independently — one throwing cannot take the page down.

The hero WebGL field (`hero_shader.js`) does **not** run when:
`prefers-reduced-motion: reduce`, viewport under 768px, no WebGL context, the
hero is scrolled out of view, or the tab is hidden. A CSS gradient field stands
in, and the canvas only fades in once the shader confirms it is running.

Scroll-reveal is defined in CSS with the visible state as the default, so
content is fully readable with JavaScript disabled.

---

## Deploying to Heroku

One-time setup:

```bash
heroku create braingency --stack heroku-24
heroku buildpacks:add heroku/nodejs      # order matters — Node first
heroku buildpacks:add heroku/ruby

heroku config:set RAILS_ENV=production \
                  RACK_ENV=production \
                  SECRET_KEY_BASE="$(bin/rails secret)" \
                  RAILS_LOG_TO_STDOUT=true

heroku domains:add braingency.eu
heroku domains:add www.braingency.eu
heroku certs:auto:enable
```

Then point DNS at the targets `heroku domains` prints (ALIAS/ANAME for the
apex, CNAME for `www`) and deploy:

```bash
git push heroku main
```

No database and no add-ons are required. `RAILS_SERVE_STATIC_FILES` is not
needed — `config.public_file_server.enabled` is set explicitly in
`config/environments/production.rb`.

### What production does differently

- Forces HTTPS (`/up` excluded so uptime monitors get a plain 200).
- 301s `www.braingency.eu` → `braingency.eu`.
- Restricts `Host` to the two domains plus `*.herokuapp.com`.
- Emits canonical URLs against `Site::HOST`, not the request host.

---

## Verifying a deploy

```bash
curl -sI https://braingency.eu/en | head -1                    # 200
curl -sI http://braingency.eu/en | grep -i location            # → https
curl -sI https://www.braingency.eu/en | grep -i location       # → apex
curl -sI https://braingency.eu/gender-equality-plan            # 302 → /en/...
curl -sI https://braingency.eu/documents/braingency-gender-equality-plan-v1.0-2026-01-12.pdf
curl -s  https://braingency.eu/sitemap.xml | grep -c '<loc>'   # 20
```

Lighthouse (desktop and mobile) should stay at 100/100/100/100; the last run
scored 100 across the board on desktop and 99 on mobile performance.
