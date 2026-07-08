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

## Run locally

**Prerequisites:** Node.js

1. `npm install`
2. (Optional) copy `.env.example` → `.env.local` and add keys: `GEMINI_API_KEY`, `KLING_ACCESS_KEY`/`KLING_SECRET_KEY`, `HIGGSFIELD_API_KEY`, `CANVA_TEMPLATE_URL`
3. `npm run dev` → http://localhost:3000

Without keys the app runs in **demo mode**: content falls back to realistic samples, images still generate free via Pollinations, and videos show animated previews.
