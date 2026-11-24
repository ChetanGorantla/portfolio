# Build prompt: `chetan-prod` portfolio

> Paste this whole file into Claude (or give it to Claude Code) and ask it to build the site.
> Sections marked **TODO (Chetan)** need my own words. Leave them as visible placeholders. Don't invent them.

---

## 1. What we're building

A personal portfolio for software engineering internship recruiting, designed as the **status dashboard of a well-run production service called `chetan-prod`**. The service is me.

- **Layer 1, the dashboard:** calm, factual, easy to skim in 30 seconds. Status tags, one metric or outcome per card, one plain sentence.
- **Layer 2, incident reports:** each card opens a first-person write-up in a postmortem format. Personal, business casual, a little humor. This is where my voice and judgment come through.

The theme lives in the **structure and wording**, not in heavy decoration. No fake terminals, no scrolling logs, no gimmicks a reader has to decode. A hiring manager should find every fact instantly.

**Positioning:** a backend / distributed systems engineer who builds reliable services in cloud environments and enjoys teaching other engineers. **Do not mention any specific company I'm applying to.** The site is used for multiple companies.

---

## 2. Stack

- **Next.js (App Router) + TypeScript + Tailwind CSS**
- **Content in MDX files** under `/content`, parsed with `gray-matter` and rendered with `next-mdx-remote/rsc` (or an equivalent simple setup). No CMS, no database, no backend.
- **Fonts via `next/font`:** Inter (body), JetBrains Mono (labels, metrics, status text)
- **Hosting:** Vercel, at `chetan-prod.vercel.app` (or the closest available subdomain)
- Fully static where possible

---

## 3. Visual system: "warm paper" light mode

Light, but not white. Warm, quiet, and readable, like a well-designed ops console printed on good paper. The warmth sets it apart from generic SaaS templates and suits the personal voice. The status colors stay cool and precise, so it still reads as an engineering dashboard.

Define everything as CSS variables / Tailwind theme tokens so the palette can be swapped in one place.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F5F2EB` | page background (warm stone) |
| `--surface` | `#FBF9F4` | cards, drawer |
| `--surface-sunken` | `#EEEAE0` | tag backgrounds, code, hover |
| `--border` | `#E2DDD1` | 1px card borders |
| `--ink` | `#1D1C1A` | primary text |
| `--ink-muted` | `#6B665D` | labels, dates, secondary text |
| `--accent` | `#2D5BD0` | links, focus rings, `in-progress` |
| `--ok` | `#2F7D5B` | `resolved` / `shipped` / `operational` |
| `--warn` | `#B7791F` | `winner` |

**Alternative palette ("fog"), kept in the code as a commented swap:** `--bg #EFF2F4`, `--surface #F8FAFB`, `--surface-sunken #E6EAEE`, `--border #DCE2E7`, `--ink #111827`, `--ink-muted #5F6B7A`. Same status colors.

**Rules**
- Cards: `--surface`, 1px `--border`, ~12px radius, no drop shadows (at most a very faint one on hover)
- Status colors appear **only** on status dots, status tags, and metric "after" values. Never as large fills.
- Monospace is used **only** for: status tags, metric values, small uppercase labels, dates, and the deploy stamp. All prose is Inter.
- Generous whitespace, max content width ~1100px, readable line length (~70ch) in incident reports
- Status is never shown by color alone. Every dot has a text label.

**Motion (subtle, and disabled under `prefers-reduced-motion`)**
- A slow pulse on the main status dot
- Metric and overview numbers count up once on first view
- The incident drawer slides in from the right (~200ms)

---

## 4. Page structure

### `/` — the dashboard

**1. Status bar** (sticky, thin, full width)
- Left: `● chetan-prod`, then `All systems operational` (green pulsing dot)
- Right: links to Resume (`/resume.pdf`), GitHub, LinkedIn, Email
- On mobile: collapse the links into a compact menu

**2. Service description** (the hero)
- Name: **Chetan Gorantla**
- 2–3 first-person sentences. **TODO (Chetan)**: placeholder suggestion to edit:
  > "I'm a CS student at UT Austin who likes the unglamorous parts of systems: the retry logic, the failure paths, the things nobody notices until they break. Lately I've been leading engineering teams and teaching student engineers how to build for the cloud."
- `Currently:` Tech Lead, Forge × Family Dollar · Engineering Chair, Texas Convergent
- `Focus:` distributed systems · cloud infrastructure · reliable backend services
- Small muted line: `Previously: Capital One · JPMorgan Chase`

**3. System overview strip**
4 small tiles in a row on desktop, 2×2 on mobile. Large monospace value with a small muted label. **Each tile is a link** to the card that supports it.

| Value | Label | Links to |
|---|---|---|
| `3` | hackathon wins | projects section |
| `2` | industry SWE internships | experience section |
| `100+` | engineers in the org I lead | Engineering Chair card |
| `● Forge × Family Dollar` (blue dot, no number) | currently leading | opens the Forge incident report |

**4. Services grid** — three labeled groups, ordered by relevance, **not by date**:

*Production experience*
1. **Forge × Family Dollar**: `in-progress`, **featured (spans 2 columns)**
2. **Capital One**: `resolved`
3. **Retail attribution (Texas Convergent)**: `shipped`
4. **JPMorgan Chase**: `resolved`

*Runbooks: what I teach* (one **full-width featured card**, see §6)
5. **Engineering Chair, Texas Convergent**: `operational`

*Side projects*
6. **Ontology**: `winner`, leads with demo video
7. **JimmySimulation**: `shipped`, leads with a screenshot
8. **DetectFX**: `shipped`

**Card anatomy (standard card)**
- Top row: status tag (dot + monospace label) on the left, dates (muted mono) on the right
- Org / project name (semibold) and role (muted)
- **Metric block** if `metric` exists: small uppercase label, then `before → after` in mono, with "after" in `--ok`. **If there's no metric, show the `outcome` line instead.** Not every card needs a number.
- One-sentence `summary`
- Up to 4 small tech tags
- `Read incident report →`
- The whole card is clickable, with a visible hover and focus state

**5. Changelog + on-call notes** (two panels side by side, stacked on mobile)
- **Changelog:** short dated entries, newest first, rendered from `content/changelog.mdx`
- **On-call notes:** personal, business casual, rendered from `content/oncall.mdx`

**6. Footer**
- `Last deployed <build date> · commit <short SHA>`, from `process.env.VERCEL_GIT_COMMIT_SHA` (first 7 chars) and the build timestamp. Fall back to `local` in development.
- Contact links repeated

### `/incidents/[slug]` — incident reports
- **From the dashboard:** open in a **right-side drawer** over the dashboard using Next.js parallel + intercepting routes (`@modal/(.)incidents/[slug]`). The URL updates, so every report is shareable. Close with Esc, the close button, or clicking the backdrop. Trap focus while open and restore focus to the card on close.
- **Direct visit:** render as a full page with `← Back to dashboard`.
- **Header:** status tag, org, role, dates, metric/outcome, tech tags, links (demo/repo)
- **Media** (if any): video or screenshot gallery below the header
- **Body:** the MDX sections (see §5)
- **Footer:** `Next incident →` linking to the next card in grid order
- Mobile: the drawer becomes a full-screen sheet

### `/404`
Themed and light: `404 · Route not found. It wandered into the Labyrinth.` with a link back to the dashboard. (A nod to my interest in Greek mythology.)

---

## 5. Content model

### Service files: `content/services/<slug>.mdx`

```yaml
---
slug: capital-one
title: Card Tech Platform
org: Capital One
role: Software Engineering Intern
dates: Jun – Aug 2026
group: experience          # experience | teaching | project
status: resolved           # resolved | shipped | in-progress | winner | operational
featured: false            # featured cards span 2 columns (or full width for teaching)
order: 2
metric:                    # optional
  label: Release time
  before: 3h
  after: 6m
outcome: null              # used when metric is absent
summary: Built a self-service workflow that cut release time from 3 hours to 6 minutes.
tags: [Go, Node.js, AWS Lambda, DynamoDB]
links:
  demo: null
  repo: null
media:                     # optional
  type: null               # video | images
  src: []
  alt: []
---
```

### Incident report body: the same sections every time

```md
## Summary
## Context
## Approach
## The hard part
## Resolution
## Lessons learned
## If I did it again        <!-- optional -->
```

**Voice guide for report bodies**
- First person, business casual, with a little dry humor. Like explaining it to a smart coworker over coffee.
- *Summary* and *Resolution* are plain and factual. *Context* and *Lessons learned* are where the personality goes.
- Mention dead ends honestly. Keep each report readable in about 2 minutes (~300–450 words).
- **Draft the factual sections (Summary, Approach, The hard part, Resolution) from the facts in §7.** For *Context*, *Lessons learned*, and *If I did it again*, write a **clearly marked placeholder** with one guiding question for me, e.g.:
  `> TODO (Chetan): What made you care about this problem? A moment you remember from the first week?`
  Don't invent personal anecdotes.

### Other content files
- `content/profile.mdx`: name, hero text, Currently / Focus / Previously lines, overview tiles, links
- `content/changelog.mdx`: dated entries
- `content/oncall.mdx`: personal notes

---

## 6. The Engineering Chair card (emphasized)

This card shows that I can **teach and level up many engineers at once**, so it's presented differently from the others.

- Lives in its own section, **"Runbooks: what I teach"**, as a **full-width featured card**
- Card shows:
  - Status `● operational`, `Jun 2026 – Present`
  - Outcome line: **"Lead curriculum for a 100+ member engineering org"**
  - Three inline mini-stats in mono: `100+ engineers` · `5 workshops / semester` · `700+ applicants on the portal I launched`
  - A **"Runbook index"**: a short list of the workshop topics as runbook entries (e.g., `RB-01 · System design fundamentals`). **TODO (Chetan): real workshop titles.** Placeholders: `RB-01 System design fundamentals`, `RB-02 Cloud architecture`, `RB-03 …`
- Its incident report focuses on **teaching and leadership**: how I design a curriculum, how I explain hard ideas to newer engineers, what I learned about leading peers. The member portal and rotating-token QR check-in go under *The hard part* as proof I still build.

---

## 7. Facts for every card (source of truth: don't add facts beyond these)

**Forge × Family Dollar** · Tech Lead · Fall 2026 – Present · `in-progress` · featured
- Texas Convergent's Forge program partnership with Family Dollar, spanning the whole company
- Working directly with the CIO
- I lead the engineering initiative for 2 projects under the partnership
- Outcome line: **"Leading engineering for 2 company-wide projects, working directly with the CIO"**
- **TODO (Chetan):** what each project does (one sentence each), team size, stack, and the metrics we're deriving. Write the report as a **live incident update**: what we're building, what I'm figuring out, what working with an executive stakeholder is like.

**Capital One** · Software Engineering Intern, Card Tech Platform · Jun – Aug 2026 · `resolved`
- Metric: Release time `3h → 6m`
- Cut cardholder-intent release time from 3 hours to 6 minutes with a Node.js self-service staging-to-production workflow
- Built Go/DynamoDB CRUD APIs against system-of-record tables, replacing a read-only service and removing direct DB access
- Built a cross-account promotion pipeline: a QA-manifest-triggered Lambda calls a production Go API to atomically upsert dependency-linked system-of-record entries, paging the team via CloudWatch → Splunk on write failures
- Tags: Go, Node.js, AWS Lambda, DynamoDB

**Retail attribution, Texas Convergent** · Software Engineer · Sept – Dec 2025 · `shipped`
- Outcome: **"Matched POS transactions to ad impressions within a 2-minute window"**
- Retail attribution backend on Python + Cloud Run, ingesting real-time speech, POS, and video via 3 REST APIs
- OpenAI NLP classifier with prompt-injection-resistant extraction for upsell intent and product mentions
- Real-time YOLOv8/OpenCV pipeline with calibrated proximity scoring to verify cashier-customer interactions
- Automated ad-to-purchase attribution
- Tags: Python, Cloud Run, OpenAI, YOLOv8

**JPMorgan Chase** · Software Engineering Intern, Full-Stack Platform · Jun – Aug 2023 · `resolved`
- Metric: Read throughput `1× → 2×` (label: "Cassandra read throughput, 10M records")
- Redesigned row width to match query patterns, built denormalized query tables, and cut network hops with prepared statements and token-aware routing
- Migrated 100+ GB of legacy Cassandra data to S3 as Parquet via a Java thread-pool pipeline of concurrent multipart uploads
- Hardened the pipeline with idempotent, checkpointed retries and backpressure tuning
- Tags: Java, Cassandra, S3, Parquet

**Engineering Chair, Texas Convergent** · Jun 2026 – Present · `operational` · see §6
- Lead curriculum for a 100+ member engineering org; 5 workshops per semester on system design and cloud architecture
- Launched a secure internal member portal serving 700+ applicants (Next.js, Supabase, PostgreSQL)
- Eliminated replay-attack check-in fraud with rotating-token QR authentication, refreshed every second

**Ontology** · Google Hackathon · `winner` · media: demo video
- Status tag label: `winner · Best Use of Gemini, 200+ teams`
- Next.js/TypeScript platform that ingests PDFs, GitHub, and Slack into a typed 250-node knowledge graph, deduplicating entities with cosine-similarity embeddings and Union-Find merge
- Gemini 2.5 tool-calling RAG loop with top-7 pgvector retrieval, context caching, and citation validation
- Multi-tenant isolation via Postgres row-level security; async ingestion through a job queue
- Tags: Next.js, TypeScript, pgvector, Gemini
- Media: `public/media/ontology-demo.mp4` (**TODO (Chetan):** add the file, or replace with a YouTube/Loom embed URL). Lazy-load, muted autoplay loop on the card preview, full controls in the report.

**JimmySimulation** · NVIDIA Hackathon · `shipped` · media: screenshots
- Metric: Inference throughput `1× → 100×` (label: "GPU throughput, 17K tok/sec")
- LLaMA 3.1 evacuation simulator making 6 routing decisions per tick at 17K tok/sec
- Parallelized Monte Carlo evacuation trials across Kafka consumer-group workers to find bottlenecks and exit imbalances
- Ranked k-shortest evacuation routes per exit by hazard risk, congestion, and crowd popularity via weighted graph search
- Graph-grounded guardrails rejecting hallucinated or discontinuous LLM-proposed routes
- Tags: LLaMA 3.1, Kafka, Python, graph search
- Media: `public/media/jimmysim-1.png`, `jimmysim-2.png`, … (**TODO (Chetan):** add files). First image on the card, gallery with a lightbox in the report.

**DetectFX** · ML guitar tone emulator · `shipped`
- Outcome: **"Identifies 13 guitar effects from a recording and recreates the tone"**
- Trained a 13-class guitar-effect classifier on EGFxSet; fit inference into a 512 MB Heroku dyno via staged profiling
- Mapped an FFT-derived 18-dimensional audio feature delta to 9 conditional DSP effects via threshold-calibrated rules
- Built 10 DSP effects in NumPy/SciPy (frequency filters, feedback delay networks, nonlinear waveshaping)
- Decoupled storage from compute using UUID-namespaced per-user Supabase paths
- Tags: Python, NumPy/SciPy, ML, Supabase
- (A nice personal tie-in: I'm learning guitar. Mention it in *Context* only as a TODO prompt for me.)

---

## 8. Changelog (seed content)

```md
- **Nov 2026**: Started leading engineering for 2 projects in the Forge × Family Dollar partnership.
- **Aug 2026**: Wrapped up my internship on Capital One's Card Tech Platform.
- **Jun 2026**: Became Engineering Chair at Texas Convergent.
```
**TODO (Chetan):** confirm dates and add 1–2 more (e.g., hackathon wins).

## 9. On-call notes (seed content, business casual with light humor)

```md
**Currently on call for:**
- 🎸 Learning guitar. My DSP knowledge is ahead of my finger strength.
- 🏛️ Reading Greek mythology. Strong opinions on Icarus's deployment strategy.
- ✍️ [Creative writing](https://hearth-journals.vercel.app/), mostly short fiction.
```
**TODO (Chetan):** rewrite in your own words. These are placeholders to show the tone.

**Required:** "Creative writing" must stay a hyperlink to my blog, `https://hearth-journals.vercel.app/`, whatever the final wording. Open it in a new tab (`target="_blank" rel="noopener noreferrer"`) and style it like other inline links (`--accent`, underline on hover). A small ↗ after the link signals it leaves the site.

---

## 10. Quality bar

- **Responsive:** test at 375px, 768px, 1280px. Hosts may open the link on a phone.
- **Performance:** Lighthouse 95+ on all categories. Use `next/image` for screenshots. Video as MP4/WebM, lazy-loaded, never GIFs.
- **Accessibility:** semantic HTML, keyboard navigable, visible focus rings in `--accent`, drawer focus trap + Esc, `alt` text on all media, sufficient contrast on the warm background (check `--ink-muted` on `--bg`).
- **SEO / sharing:** title `Chetan Gorantla · chetan-prod`, a meta description, and a generated **Open Graph image** (via `next/og`) showing the status bar look: `● chetan-prod · All systems operational`, my name, and the Focus line.
- **Favicon:** a small green status dot.
- **Resume:** served at `/resume.pdf` from `public/resume.pdf` (I'll swap the file when I update it).
- **Analytics (optional):** Vercel Analytics.
- No console errors, no layout shift on load, and every external link opens in a new tab with `rel="noopener noreferrer"`.

---

## 11. Build order

1. Scaffold the Next.js app and deploy an empty page to Vercel, to confirm the link works
2. Design tokens, fonts, status bar, hero
3. Content loading from MDX + card component + services grid
4. System overview strip with links
5. Incident drawer (intercepting route) + full-page fallback
6. Engineering Chair "Runbooks" featured card
7. Media: Ontology video, JimmySimulation gallery
8. Changelog, on-call notes, footer deploy stamp
9. 404 page, OG image, favicon, metadata
10. Accessibility and Lighthouse pass, then a final mobile check

When done, give me a list of every **TODO (Chetan)** placeholder left in the content so I can fill them in.
