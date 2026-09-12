# DocBrief

A **WedgeWerks™** product (Stripe statement descriptor: `WEDGEWERKS TM`).

Short YouTube documentaries for faceless / solo creators — without an editor or GPU film studio.

Paste a topic or rough script → polished voiceover script + TTS (when configured) + B-roll placeholder stills + **burned-in captions** → downloadable **MP4**. A zip of source assets is a secondary download. Zip-only happens only if ffmpeg is completely unavailable.

## What works

- Landing + pricing: **Free** (1 short render), **Starter $12/mo** (10 credits), **Creator $36/mo** (40 credits)
- Email + bcrypt password auth; httpOnly session cookie (`docbrief_uid`)
- Dashboard of projects
- New project: brief → generate with **cost/credits shown before generate**
- Project result: script preview, **MP4 primary download**, optional asset zip
- Billing + Stripe Checkout (wired; 503 + config notice when keys missing — **no stub free upgrade**)
- Webhook credit sync: `checkout.session.completed` + `invoice.paid` set plan credits (Starter 10 / Creator 40); cancel returns Free (1)
- Generate pipeline:
  1. Polish script with OpenAI if `OPENAI_API_KEY`, else template polish
  2. TTS via OpenAI audio/speech if key, else a **beep + silence** placeholder track (MP4 still succeeds)
  3. 3–5 B-roll placeholder PNGs (gradient + caption via `sharp`)
  4. Captions `.srt` / `.vtt` from script sentences
  5. Mux **MP4** with ffmpeg (`@ffmpeg-installer/ffmpeg`, copied to `/tmp` on Vercel — VecClip pattern): slideshow of stills + audio + **burned-in captions** (libass `subtitles` filter, Liberation Sans; drawtext / sharp-composited stills as fallback)
  6. Zip of assets is **secondary**. Zip-only only if ffmpeg is missing or every mux attempt fails.
  7. Deduct credits; Free users limited

## What we intentionally do not build

- Character-consistent multi-cast GPU video
- Seedance / Kling
- YouTube OAuth publish
- Viducer pixel-clone branding
- Editor marketplace

## Stack

- Next.js App Router + TypeScript + Tailwind CSS v4
- Prisma + Neon Postgres
- Stripe Checkout
- Vercel Blob for durable MP4 / audio / zip
- bcryptjs, sharp, jszip, `@ffmpeg-installer/ffmpeg`
- Bundled Liberation Sans (SIL OFL) for caption burn
- Bun preferred (`npm` / `pnpm` fine)

## Env vars

Copy `.env.example` to `.env` / `.env.local`:

| Var | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | yes | Neon pooled URL in prod |
| `DIRECT_URL` | yes (Prisma migrate) | Neon direct URL |
| `OPENAI_API_KEY` | no | Script polish + TTS; without it, template + beep track + captions still yield an MP4 |
| `BLOB_READ_WRITE_TOKEN` | prod | Durable MP4/audio/zip on Vercel |
| `STRIPE_SECRET_KEY` | for live billing | |
| `STRIPE_PRICE_ID_STARTER` | for live billing | $12/mo Price id |
| `STRIPE_PRICE_ID_CREATOR` | for live billing | $36/mo Price id |
| `STRIPE_WEBHOOK_SECRET` | for webhooks | Endpoint: `/api/billing/webhook` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | optional | |
| `NEXT_PUBLIC_APP_URL` | optional | |

### Postgres / Neon

1. `prisma/schema.prisma` `datasource.db.provider` is `"postgresql"`
2. `directUrl = env("DIRECT_URL")` for migrations
3. Set `DATABASE_URL` (and `DIRECT_URL`) to your Neon/Postgres URLs
4. `bunx prisma migrate deploy` (or `db push` locally)

## Local run

```bash
bun install          # or npm install
cp .env.example .env
bunx prisma migrate deploy
bun run dev
```

Open http://localhost:3000

Smoke path:

1. Sign up (email + password ≥ 8 chars)
2. New project → paste a brief ≥ 20 chars
3. Confirm credit cost shown → Generate
4. Open result → **download MP4** (audio + burned-in captions). Asset zip is optional.
5. Without `OPENAI_API_KEY`, the MP4 still renders with a beep track + captions (honest UI note).
6. Billing shows Stripe config notice until keys are set (Checkout returns **503**)

Local render check (no server):

```bash
bun run smoke:render
```

Writes a real `docbrief.mp4` under `uploads/smoke-local/` and exits non-zero if mux failed.

## Deploy

- Repo: `jaffainit/docbrief`
- Prod: https://docbrief-peach.vercel.app
- Vercel: Neon Postgres, Blob store, Stripe + OpenAI env as configured
- `postinstall` runs `prisma generate`; `build` runs `prisma migrate deploy`
- Serverless: ffmpeg binary is copied to `/tmp` (VecClip pattern); caption font is copied to `/tmp`
- Function bundle includes `@ffmpeg-installer/linux-x64` + `assets/fonts` via `outputFileTracingIncludes`
- Generate route: `maxDuration` 120s

## License

Private / product code for WedgeWerks™ · DocBrief.

Liberation Sans is SIL Open Font License 1.1 — see `assets/fonts/LICENSE`.
