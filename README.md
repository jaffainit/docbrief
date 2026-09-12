# DocBrief

A **WedgeWerks™** product.

Short YouTube documentaries for faceless / solo creators — without an editor or GPU film studio.

Paste a topic or rough script → polished voiceover script + TTS (when configured) + B-roll placeholder stills + captions → downloadable **MP4** or an honest **zip of assets** if render is blocked.

## What works

- Landing + pricing: **Free** (1 short render), **Starter $12/mo** (10 credits), **Creator $36/mo** (40 credits)
- Email + bcrypt password auth; httpOnly session cookie (`docbrief_uid`)
- Dashboard of projects
- New project: brief → generate with **cost/credits shown before generate**
- Project result: script preview, MP4 and/or zip download
- Billing + Stripe Checkout (wired; 503 + config notice when keys missing — **no stub free upgrade**)
- Generate pipeline:
  1. Polish script with OpenAI if `OPENAI_API_KEY`, else template polish
  2. TTS via OpenAI audio/speech if key, else silent placeholder WAV noted in zip
  3. 3–5 B-roll placeholder PNGs (gradient + caption via `sharp`)
  4. Captions `.srt` / `.vtt` from script sentences
  5. Mux MP4 with ffmpeg (`@ffmpeg-installer/ffmpeg`) when available; else zip assets + honesty note in UI/README
  6. Deduct credits; Free users limited

## What we intentionally do not build

- Character-consistent multi-cast GPU video
- Seedance / Kling
- YouTube OAuth publish
- Viducer pixel-clone branding
- Editor marketplace

## Stack

- Next.js App Router + TypeScript + Tailwind CSS v4
- Prisma (SQLite locally; schema is Postgres-ready — switch `provider` + `DATABASE_URL`)
- Stripe Checkout
- bcryptjs, sharp, jszip, `@ffmpeg-installer/ffmpeg`
- Bun preferred (`npm` / `pnpm` fine)

## Env vars

Copy `.env.example` to `.env` / `.env.local`:

| Var | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | yes | Local default: `file:./dev.db` |
| `OPENAI_API_KEY` | no | Script polish + TTS; without it, template + silent WAV |
| `STRIPE_SECRET_KEY` | for live billing | |
| `STRIPE_PRICE_ID_STARTER` | for live billing | $12/mo Price id |
| `STRIPE_PRICE_ID_CREATOR` | for live billing | $36/mo Price id |
| `STRIPE_WEBHOOK_SECRET` | for webhooks | Endpoint: `/api/billing/webhook` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | optional | |
| `NEXT_PUBLIC_APP_URL` | optional | |

### Postgres / Neon

1. Change `prisma/schema.prisma` `datasource.db.provider` to `"postgresql"`
2. Optionally add `directUrl = env("DIRECT_URL")` for migrations
3. Set `DATABASE_URL` (and `DIRECT_URL`) to your Neon/Postgres URLs
4. `bunx prisma db push`

## Local run

```bash
bun install          # or npm install
cp .env.example .env # DATABASE_URL=file:./dev.db already fine
bunx prisma db push
bun run dev
```

Open http://localhost:3000

Smoke path:

1. Sign up (email + password ≥ 8 chars)
2. New project → paste a brief ≥ 20 chars
3. Confirm credit cost shown → Generate
4. Open result → download MP4 (if ffmpeg) and/or asset zip
5. Billing shows Stripe config notice until keys are set (Checkout returns **503**)

## Deploy notes (do not auto-deploy)

- Push this repo to GitHub (`jaffainit/docbrief`)
- On Vercel (when you choose): set env vars, use Neon Postgres (switch Prisma provider), link Blob only if you later move uploads off local disk
- Point Stripe webhook to `https://YOUR_HOST/api/billing/webhook`
- Create two Stripe Prices: Starter $12/mo recurring, Creator $36/mo recurring
- `postinstall` runs `prisma generate`
- Serverless: ffmpeg binary is copied to `/tmp` when needed (VecClip pattern)

**This MVP was built for local run. No Vercel deploy, no custom domain, no spend from this build.**

## Ready-for-deploy ask (suggested wording)

> DocBrief MVP is on GitHub and runs locally. When you want production: create Neon Postgres + Stripe Prices (Starter $12, Creator $36), set env on Vercel, switch Prisma to postgresql, deploy — I will not spend or attach a custom domain unless you say so.

## License

Private / product code for WedgeWerks™ · DocBrief.
