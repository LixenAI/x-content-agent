# Content Pro Agent — AI Content Studio

An AI-powered multi-format content studio for brands and agencies: learn a brand from its website, then generate entire campaigns of **posts, carousels, and AI videos** built on proven creative frameworks — with virality prediction, A/B variants, and a multi-provider media pipeline.

## What it does

- **Website Learning** — paste a brand URL and the AI extracts voice, audience, content topics, and colors into an editable profile. Multi-brand with a sidebar switcher.
- **Campaign automation** — choose topics, platforms, cadence, duration, and a **content mix** (posts / carousels / videos); one AI call writes the whole campaign in the brand voice.
- **Creative frameworks baked in** — every caption opens with a proven hook formula (Pattern Interrupt, Question, Bold Claim, POV, Stat/Authority); scripts follow frameworks like Problem-Agitate-Solve and Before/After; videos use cinematic style archetypes (UGC testimonial, product demo, faceless, luxury, SaaS launch) and categorized b-roll scene plans (pain → failed → desired → product).
- **Carousels** — 5–7 slide educational carousels (hook → value → CTA) with per-slide AI images, slide-by-slide editing, image downloads, and an **Open in Canva** handoff for final polish.
- **AI video** — two-step pipeline: generate a keyframe image, then animate it via a provider cascade: **Kling → Higgsfield → Google Veo**, whichever has API keys configured. Aspect ratios follow each platform (9:16 TikTok/IG, 16:9 LinkedIn).
- **Virality Predictor** — score any post 0–100 with hook-strength and platform-fit analysis plus concrete suggestions before you approve it.
- **A/B Variants** — regenerate any caption 3 ways, each with a different hook formula, and apply with one click.
- **Social Planner** — calendar + list views, format badges, post editor, approve-all-drafts.
- **Integrations & white label** — simulated social connects; creative-engine cards show live API-key status; rebrand the app from Settings.

## Media provider cascade

| Media | Order | Keys needed |
|---|---|---|
| Images | Gemini → **Pollinations (free, keyless)** | none required |
| Video | Kling → Higgsfield → Veo | any one of the three |

Images generate for free even with zero configuration. Video falls back to an animated preview in demo mode.

## Stack

React 19 + Vite + Tailwind 4 frontend, Express server proxying the AI providers, localStorage persistence. No auth, no database, no real social posting — demo-quality build.

## Real Instagram publishing (one Meta connection)

The app can publish Instagram posts for real — one agency-level Meta login unlocks every Facebook Page + Instagram Business account you admin, and you assign each one to a brand.

**Setup (Meta Developer Portal, ~10 minutes):**

1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App → type **Business**.
2. Add products: **Facebook Login for Business** and **Instagram Graph API**.
3. Facebook Login → Settings → *Valid OAuth Redirect URIs*: add `{APP_URL}/api/meta/callback` (e.g. `https://your-app.onrender.com/api/meta/callback`; `http://localhost:3000/api/meta/callback` also works while the app is in Development mode).
4. Make sure your Instagram account is **Business or Creator** and linked to a Facebook Page you admin (Instagram app → Settings → Business tools).
5. Copy the **App ID** and **App Secret** into `.env.local` as `META_APP_ID` / `META_APP_SECRET`, and set `APP_URL` to your public origin.
6. Leave the Meta app in **Development mode** — as the app admin you get `instagram_basic`, `instagram_content_publish`, `pages_show_list`, and `pages_read_engagement` without app review.

**Usage:** Integrations → *Connect Meta account* → complete the Facebook login → open the Instagram card for a brand → *Assign* one of your real accounts. Assigned accounts show a green **Live** chip (hand-typed handles stay **Simulated**).

**How auto-publish works:** a worker runs every 60 seconds and publishes any post that is `scheduled`, past its time, and on a brand with a Live Instagram account — images and carousels immediately, videos as Reels (only when hosted at a public URL, e.g. generated via Kling/Higgsfield). Failures retry up to 3 times, then show a red dot in the Planner with the error. There's also a *Publish now* button in the post editor.

**Important:** Meta fetches your post images from `{APP_URL}/media/:key`, so real publishing only works when the app is deployed at a public https URL (Render works great) — on localhost, publish attempts fail with a clear message.

## Deploy to Render

The included `render.yaml` blueprint provisions a Web Service on the Starter plan with a 1 GB persistent disk mounted at `/data`, so SQLite (brands, campaigns, posts, Meta tokens) survives redeploys.

1. Push to GitHub, then Render → **New → Blueprint** → point at the repo. Render reads `render.yaml` and creates the service.
2. First deploy boots with empty secrets. Grab the service URL (`https://<name>.onrender.com`), then Render dashboard → **Environment** and fill in:
   - `APP_URL` = the service URL (no trailing slash) — used for OAuth callbacks and the `/media/:key` links Meta fetches.
   - `GEMINI_API_KEY`, `KLING_ACCESS_KEY`, `KLING_SECRET_KEY`, `HIGGSFIELD_API_KEY` (optional but recommended)
   - `META_APP_ID`, `META_APP_SECRET` (for real Instagram publishing)
3. In your Meta Developer Portal app, add `{APP_URL}/api/meta/callback` to the OAuth Redirect URIs.
4. Save env vars → Render redeploys automatically → open the URL → Integrations → **Connect Meta account**.

**Cost:** Starter is $7/mo; the 1 GB disk is $0.25/mo — about **$7.25/mo total**. The free tier can't be used because it has no persistent disk and spins the service down after 15 min (both would break the SQLite state and the 60-second auto-publish worker).

## Run locally

**Prerequisites:** Node.js

1. `npm install`
2. (Optional) copy `.env.example` → `.env.local` and add keys: `GEMINI_API_KEY`, `KLING_ACCESS_KEY`/`KLING_SECRET_KEY`, `HIGGSFIELD_API_KEY`, `CANVA_TEMPLATE_URL`
3. `npm run dev` → http://localhost:3000

Without keys the app runs in **demo mode**: content falls back to realistic samples, images still generate free via Pollinations, and videos show animated previews.
