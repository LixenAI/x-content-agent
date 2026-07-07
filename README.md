# BrandBlast Clone — AI Social Content Engine

A functional clone of [BrandBlast](https://www.brandblast.com/) (via [Futurepedia](https://www.futurepedia.io/tool/brandblast)): an AI-powered social media content automation platform for brands and agencies.

## What it does

- **Website Learning** — paste a brand's website URL and the AI extracts a full brand profile: voice, audience, content topics, and colors. Add "deep knowledge" (products, offers, FAQs) to sharpen the output.
- **Campaign automation** — pick topics, platforms, cadence, and duration; the AI writes an entire campaign of on-brand posts (up to a month of content) in one shot and generates matching images.
- **Social Planner** — calendar and list views of every post; edit captions, rewrite with AI, regenerate images, approve drafts individually or all at once.
- **Multi-brand dashboard** — agency-style overview across all brands with upcoming posts and quick actions.
- **Integrations & white label** — simulated connect flows for Instagram, Facebook, TikTok, LinkedIn, and GoHighLevel; rebrand the whole app (name, logo, accent color) from Settings.

## Stack

React 19 + Vite + Tailwind 4 frontend, Express server proxying Google Gemini (text, image), localStorage persistence. No auth, no database, no real social posting — demo-quality clone.

## Run locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. (Optional) Set `GEMINI_API_KEY` in `.env.local` for real AI generation
3. Run the app: `npm run dev` → http://localhost:3000

Without an API key the app runs in **demo mode**: brand analysis, campaign posts, and images fall back to realistic sample output so every flow is still usable.
