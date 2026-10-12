# SwyfTech Quote App

A full-screen app: the pricing worksheet, plus an optional first step that
reads a completed Network & Security Assessment PDF and pre-fills the
worksheet from it, a section that drafts a client quote email — using either
your self-hosted Ollama instance or Google Gemini — and sends it over SMTP,
and a history sidebar that automatically saves every assessment/quote so you
can reopen and pick up where you left off.

## What's inside

- `frontend/` — the React pricing worksheet (Vite). Pick Ollama or Gemini
  with a toggle above each AI action.
- `server/` — a small Express server that:
  - serves the built frontend
  - `POST /api/summarize-assessment` — accepts a filled-out assessment PDF
    (`multipart/form-data`, fields `file` + `provider`). If it's the
    SwyfTech assessment template, it reads the form field values directly
    (business name, device counts, compliance status, etc.) for the
    worksheet, and always returns an AI-written summary of top risks and
    recommended next steps (falling back to plain text extraction if the
    PDF isn't an interactive form)
  - `POST /api/quote-summary` — sends your quote numbers to the chosen AI
    provider (`provider: "ollama" | "gemini"` in the request body) and gets
    back a drafted subject + body
  - `POST /api/send-email` — sends that (editable) draft to the client over
    SMTP
  - `GET /api/health` — quick check that Ollama/Gemini/SMTP env vars are set
  - `GET /api/history`, `GET /api/history/:id`, `POST /api/history`,
    `DELETE /api/history/:id` — list/load/save/delete saved quotes (see
    `server/history.js`). Worksheet state, the assessment summary, and the
    quote draft are saved automatically as you work (no manual "save"
    button) and shown in the app's sidebar, newest first
- `server/history.js` — a tiny JSON-file-backed store for saved quotes
  (`DATA_DIR/history.json`, `DATA_DIR` defaults to `./data`, i.e.
  `/app/data` in the container — see `DATA_DIR_HOST` below for Docker)
- `frontend/public/SwyfTech_Network_Security_Assessment.pdf` — the blank,
  fillable assessment template. Vite copies it into `dist/` at build time,
  so it's served at `/SwyfTech_Network_Security_Assessment.pdf` and linked
  from the "Start from a completed assessment" section in the app. Its
  AcroForm field names are exactly what `extractAssessmentData` in
  `server/index.js` looks for — if you edit the template, keep the field
  names in sync (or update `WORKSHEET_FIELD_MAP` to match).
- `Dockerfile` — multi-stage build (Vite build → slim Node runtime)
- `.github/workflows/docker-publish.yml` — builds the image and pushes it to
  `ghcr.io/wolfej4/swyftech-quote-app` on every push to `main`
- `docker-compose.yml` — pulls that published image; works with any Docker
  stack UI (Portainer, Dockhand, etc.), build support or not

Nothing gets emailed automatically. The AI draft always lands in an editable
text box first — you review or tweak it, then hit "Send email" yourself.

## Typical flow

0. **Don't have a completed assessment yet?** Download the blank, fillable
   PDF from the link in the "Start from a completed assessment" section
   (or directly at `/SwyfTech_Network_Security_Assessment.pdf`), fill it
   out with the client, then come back and upload it.
1. **Attach the completed assessment PDF** (optional) and click "Analyze
   assessment." If it's the SwyfTech template, business info, device
   counts, and compliance status are pulled straight into the worksheet
   below, and an AI risk summary is generated.
2. **Review/adjust the worksheet** — devices, add-ons, and rates.
3. **Draft the quote email with AI** — the assessment summary (if any) is
   automatically folded into the AI's context, so the pitch can reference
   real findings (e.g. missing MFA, EOL hardware) instead of staying
   generic.
4. **Review and send.**

If the uploaded PDF isn't the SwyfTech template (different form, or a
scanned/flattened PDF with no matching field names), the worksheet fields
are left as-is — you still get the AI summary, just not the auto-fill.

## Deploying

**The image is built by CI, not by your deploy tool.**
`.github/workflows/docker-publish.yml` builds and pushes
`ghcr.io/wolfej4/swyftech-quote-app:latest` to GitHub Container Registry on
every push to `main`. `docker-compose.yml` just pulls that image — it has no
`build:` directive. This is deliberate: lots of Docker UIs (Portainer's "Web
editor" without a repo, Dockhand, and other lightweight stack tools) only
support pulling a pre-built image and either ignore a `build:` key or have
no build context to use it with. Pointing those tools at a *source repo*
instead of a real image is exactly what produces
`pull access denied ... repository does not exist` — the tool tried to pull
an image that was never published anywhere, because it assumed something
else would build it locally first. Publishing via CI sidesteps all of that:
there's always a real, pullable image at that tag, regardless of which tool
deploys it or whether that tool can build at all.

**One-time setup after the first CI push:**

The GHCR package is private by default, so the Docker host needs access to pull it:

- **Easiest:** on GitHub, go to the repo → **Packages** → `swyftech-quote-app`
  → **Package settings** → change visibility to **Public**.
- **Or:** on the Docker host, `docker login ghcr.io -u <your-github-username>`
  using a [personal access token](https://github.com/settings/tokens) with
  `read:packages` scope as the password.

**Deploying the stack (any tool):**

1. In Portainer, Dockhand, or whatever you're using: add a stack pointed at
   this repo's `docker-compose.yml` (or just paste its contents — it works
   either way now, since there's nothing to build).
2. Fill in the environment variables (see below).
3. Deploy. It pulls `ghcr.io/wolfej4/swyftech-quote-app:latest` and starts it.

To pick up a new version after pushing more commits, redeploy/"pull & recreate"
the stack — most of these tools have a button for that — or `docker compose
pull && docker compose up -d` on the host.

Want to build the image yourself instead of using the published one? See
"Building the production image manually" below, or add a
`docker-compose.override.yml` with a `build: .` for that service.

## Environment variables

Set these in your deploy tool's environment-variables UI (Portainer,
Dockhand, etc.), or in a `.env` file next to `docker-compose.yml` if you're
running `docker compose` yourself — see `.env.example`. Either way works:
`docker-compose.yml` references each one as `${VAR_NAME:-default}`, so your
deploy tool's env values (or the `.env` file) get substituted in, falling
back to the default shown below if unset. (If you ever see your env values
not taking effect, check that the `environment:` block in
`docker-compose.yml` still uses `${...}` placeholders and not hardcoded
literal values — a hardcoded value has nothing for a deploy tool to
substitute into, which is a very easy mistake to reintroduce.)

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `8787` | Port the app listens on, both inside the container and on the host (`-p` mapping) |
| `OLLAMA_BASE_URL` | `http://ollama:11434` in Docker, `http://localhost:11434` outside it | Your Ollama instance. If it's the Open WebUI/Ollama stack on the same Unraid box but a different Docker network, use the box's LAN IP (e.g. `http://10.0.20.5:11434`) rather than `localhost` |
| `OLLAMA_MODEL` | `llama3.1` | Whichever model you've pulled in Ollama |
| `GEMINI_API_KEY` | — | Optional. Set to enable the Gemini provider. Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Which Gemini model to use |
| `SMTP_HOST` | — | Your SMTP relay |
| `SMTP_PORT` | `587` | |
| `SMTP_SECURE` | `false` | `true` for port 465 (implicit TLS) |
| `SMTP_USER` / `SMTP_PASS` | — | SMTP credentials |
| `MAIL_FROM` | — | e.g. `SwyfTech LLC <quotes@yourdomain.com>` |
| `MAIL_BCC` | — | Optional — bcc yourself on every quote sent |
| `DATA_DIR_HOST` | `./data` | Docker-only, read by `docker-compose.yml` (not the app). Host-side folder that stores `history.json` — maps to `/app/data` in the container. Without this volume, saved history is wiped on every redeploy |

**Networking note:** `localhost` inside the container refers to the container
itself, not your Unraid host. If Ollama isn't on the same Docker network as
this stack, point `OLLAMA_BASE_URL` at the host's LAN IP instead. If you'd
rather put both on the same Docker network, add this stack to Ollama's
network (uncomment the `networks:` block in `docker-compose.yml`) and use
the Ollama container's service/hostname instead.

## Local development (outside Docker)

```bash
npm install
npm run dev:frontend   # Vite dev server on :5173, proxies /api to :8787
# in a second terminal:
OLLAMA_BASE_URL=http://localhost:11434 node server/index.js
```

## Building the production image manually

```bash
docker build -t swyftech-quote-app .
docker run -p 8787:8787 \
  -e OLLAMA_BASE_URL=http://10.0.20.5:11434 \
  -e SMTP_HOST=smtp.example.com \
  -e SMTP_USER=quotes@swyftech.example \
  -e SMTP_PASS=changeme \
  -e MAIL_FROM="SwyfTech LLC <quotes@swyftech.example>" \
  swyftech-quote-app
```

## Notes

- The prompt (same for both providers) explicitly tells the model not to
  invent pricing or services beyond what's in the worksheet — but always
  read the draft before sending, same as you would with anything AI-drafted
  going to a client.
- Gemini calls go out over the internet to Google's API; Ollama stays fully
  self-hosted. Pick whichever fits your client's data-handling comfort level
  — this applies to the assessment summary too, since the extracted PDF
  content is sent to whichever provider you pick.
- Assessment PDF uploads are capped at 15MB and processed in memory only
  (never written to disk). If the PDF is a scanned image rather than a
  fillable/text-based form, extraction will fail — export a text-based or
  form-fillable PDF instead.
- `SMTP_PASS` sits in plain text in the Portainer stack's environment
  variables like any other stack secret. If you'd rather not do that, swap
  it for a Docker secret or an app-specific password from your mail
  provider.
