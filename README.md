# megaTrainer

> **This is a learning project.** I'm building it to learn how multi-agent LLM
> systems behave when the output is parsed by code rather than read by a human. It is
> a working system, not a finished product, and the sections below deliberately include
> what is broken. I found that documenting the edges was more useful than hiding them,
> and the [known limitations](#known-limitations) section is the part I'd most want a
> reviewer to read.

An AI coaching platform where a user has a structured onboarding conversation with a
generated AI trainer, and the trainer builds a structured profile of them along the
way. Every trainer has its own personality, its own world, its own generated panel
wording, and its own generated face.

Everything runs locally. No cloud LLM calls, no API keys, no hosted inference.

**Stack:** [Bun](https://bun.sh) · [Elysia](https://elysiajs.com) · [SvelteKit 5](https://svelte.dev) · [PostgreSQL](https://www.postgresql.org) · [Drizzle](https://orm.drizzle.team) · [Ollama](https://ollama.ai) · [ComfyUI](https://github.com/comfyanonymous/ComfyUI) · Docker Compose

---

## Why it's interesting

The hard part of this project isn't the chat. It's that **the LLM's output is
consumed by code**. A normal chat app can be sloppy with model output because a human
reads it and shrugs. Here, a malformed JSON object silently loses a user's details, and
nobody notices until much later.

That turns a small model into a systems problem, and it's where most of the real
engineering went:

- **Structured output that must parse.** Every turn returns a full profile object. A
  model that translates keys, emits a preamble, or omits fields has to be detected and
  retried rather than merged in.
- **Phase ownership.** Each phase is exclusively responsible for certain profile
  fields, so out-of-scope information gets routed to a classifier instead of being
  guessed at.
- **Loud failure over silent data loss.** When a call fails, the raw model output is
  logged. A user losing their background because a merge discarded it is worse than an
  error message.

## How the onboarding flow works

Onboarding runs as four ordered phases, each owning a fixed set of profile fields:

| Phase | Owns |
|---|---|
| `basicInfo` | name, age, location |
| `motivationsAndGoals` | motivations, goals |
| `backgroundAndMetrics` | trainingBackground, performanceMetrics, injuries |
| `toolsAndTime` | equipmentAndSchedule |

Per user turn:

1. The user's message goes to an **assessment agent**, which returns the full profile
   as JSON. Out-of-scope information goes into `unclassifiedNotes` rather than being
   force-fitted.
2. `mergeProfiles` merges the result, respecting phase ownership.
3. Any leftover `unclassifiedNotes` go to a **classifier** that routes them to the
   right field — so something you mentioned two turns early still ends up recorded.
4. A **response agent** writes the next question in the trainer's voice.

On completion, a sign-off turn runs and `completedAt` is stamped once and preserved.

### A bug worth reading about

`mergeProfiles` originally *discarded* any field the current phase didn't own. The
intent was to stop the model fabricating a training background out of the selected
sport. The side effect was worse: a user who volunteered "I used to run at school but
stopped for years" during the *motivations* phase had that sentence deleted. Since
nobody repeats themselves, `trainingBackground` stayed permanently empty and onboarding
could never finish.

The fix was to **demote rather than discard** — out-of-phase content becomes an
`unclassifiedNotes` entry, and the classifier, which only ever sees real user text,
decides whether it deserves a field. Fabrication becomes a note that gets dropped;
genuine statements get routed. The original guard still holds, and the regression is
pinned by tests in `message.service.test.ts`.

This is the kind of bug that only appears with a *cooperative* user, which is why the
end-to-end harness below runs several user personas rather than one happy path.

## Verification

Testing an LLM app needs a way to exercise personas, not just unit tests. I built a
Playwright harness that drives the real UI against a real local model and screenshots
every turn, so a change can be checked against several trainer/user combinations at
once.

Verified end to end across three trainer personas:

| Trainer | World | Language | User |
|---|---|---|---|
| Arne Kommando | Macho World | English | cooperative |
| Maya Lindqvist | Trendy Trainers | English | normal, complete answers |
| Ingrid Solberg | Body & Spirit | Norwegian | cooperative, no metrics/injuries |

This is how the merge bug was found: a *normal* user volunteering history out of order
triggered it, and neither the military persona nor the evasive-user case ever did.

---

## Quick start

### Prerequisites

- [Bun](https://bun.sh) 1.0+
- Docker & Docker Compose
- ~10GB disk for the Ollama model and Stable Diffusion checkpoints
- A GPU is strongly recommended. ComfyUI runs on CPU but image generation becomes very
  slow.

### 1. Configure

```bash
cp .env.example .env
```

`.env` is git-ignored. Every variable in `.env.example` is read somewhere in the
source; the file documents where.

### 2. Start infrastructure

```bash
docker compose up -d
docker compose ps   # wait for healthy
```

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| Frontend (dev) | http://localhost:5173 |
| PostgreSQL | `postgresql://devuser:devpass@localhost:5432/megatrainer_db` |
| Ollama | http://localhost:11434 |
| ComfyUI | http://localhost:8188 |
| pgAdmin | http://localhost:5050 (`admin@megatrainer.local` / `admin`) |

A one-shot `ollama-model-init` service pulls the model named by `OLLAMA_MODEL` on first
boot. The first pull takes a while.

### 3. Install and run

```bash
bun install

# Terminal 1 — API
bun run dev:api

# Terminal 2 — frontend
bun run dev:web
```

Then open http://localhost:5173, create a trainer, and start onboarding.

> Trainer creation is slow on first use: it generates a portrait and an action shot
> through ComfyUI (35 steps on the default `juggernaut` profile — roughly 80s total on
> a modern GPU). Set `PORTRAIT_MODEL=lightning` in `.env` for 8-step drafts while
> iterating.

## Commands

```bash
bun test              # 19 tests
bun run typecheck     # tsc --noEmit (api) + svelte-check (web)
bun run check         # both
```

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness |
| `GET` | `/trainers` · `/trainers/:slug` | List / fetch a trainer |
| `POST` | `/trainers` | Create a trainer (generates persona, panel copy, greeting, images) |
| `GET` | `/worlds` · `/worlds/:slug` | List / fetch a world |
| `POST` | `/worlds` | Create a world |
| `DELETE` | `/worlds/:slug` | Delete a world |
| `POST` | `/onboarding/start` | Create a session, returns a claim token |
| `POST` | `/onboarding/initial-question` | Fetch the first question using a claim token |
| `POST` | `/onboarding/message` | Submit a user turn, returns the next question |
| `GET` | `/media/*` | Serve generated images |

Sessions are authorised by a `claimToken` issued at `/onboarding/start`. The token is
checked on every subsequent call; a session id alone is not sufficient, and an invalid
token returns 404 rather than leaking whether the session exists.


## Project structure

```
megatrainer/
├── apps/
│   ├── api/              Elysia API (Bun) — trainer, world, onboarding, media modules
│   └── web/              SvelteKit 5 frontend (runes, typed treaty client)
├── coach-engine/         Phase orchestration + Ollama calls + assessment/classifier logic
├── image-engine/         ComfyUI client, checkpoint profiles, portrait + action shots
├── packages/
│   └── shared-contracts/ (reserved; currently unreferenced)
├── docker/               Dockerfiles for api and comfyui
└── docker-compose.yml    postgres, ollama, comfyui, pgadmin + model bootstraps
```

Roughly 3.6k lines frontend, 1.1k API, 1.8k coach engine, 0.6k image engine.

> `coach-engine` and `image-engine` are plain TypeScript directories, not Bun
> workspaces — they have no `package.json`, so they are type-checked transitively
> through the API rather than by the workspace root.

### Where things are

- **Phase prompts** — `coach-engine/phases/onboarding/message/instructions/`
- **Profile merge logic** — `coach-engine/phases/onboarding/message/instructions/message.service.ts`
- **Which fields a phase owns** — `coach-engine/phases/onboarding/message/instructions/promptObject.ts`
- **Panel copy generation + validation** — `coach-engine/phases/onboarding/panel_copy/`
- **Front-end profile model** — `apps/web/src/lib/onboarding/profile.ts`
- **UI strings** — `apps/web/src/lib/i18n/strings.ts`

## Known limitations

Listed deliberately — these are real, and I would rather you find them here.

- **No session rehydration.** There is no `GET /onboarding/session/:id`, so refreshing
  the browser mid-conversation loses the chat and profile. This is the single biggest
  gap.
- **Unknown `trainerId` returns 500**, not 404.
- **Fields that don't apply to a sport.** Phases require every field they own, so a
  yoga user with no race times and no injuries must answer "no" several times before
  the flow's give-up path moves on. A per-sport "not applicable" affordance is the real
  fix.
- **Assessment JSON compliance is flaky.** The model occasionally returns malformed or
  translated keys. There is retry logic and the raw output is now logged, but
  prompt-level enforcement is not reliable enough to call this solved.
- **The API base URL is hardcoded** in 19 places in the frontend. Nothing is served off
  localhost yet, so it works, but it will break on deployment.
- **No auth.** The auth endpoints and `JWT_SECRET` referenced in earlier versions of
  this README never existed.
- **The design token system is defined but bypassed** — `global.css` defines `--mt-*`
  tokens that components largely ignore in favour of hardcoded hex.
- **No linter is configured.** `bun run check` runs tests and typechecking only.
- **Two dead code paths:** `apps/web/src/routes/debug/` calls an API route that does not
  exist, and `trainers/create/waitingScreen/page.svelte` is missing the `+` prefix so it
  was never a valid route.

## What I'd do next

1. `GET /onboarding/session/:id` + hydrate on load — unlocks refresh and makes the
   session durable.
2. Extract the API base URL into one config module.
3. Route hardcoded colours through the existing tokens.
4. 404 for unknown trainer.
5. Delete the dead routes and the unreferenced `shared-contracts` package.

## Licence

Learning project, no licence granted. The architecture and the onboarding phase model
are the parts I'd be happy to discuss in detail.
