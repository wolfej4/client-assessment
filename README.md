# SwyfTech Quote App

The pricing worksheet, plus a section that drafts a client quote email using
either your self-hosted Ollama instance or Google Gemini and sends it over
SMTP, and a section that summarizes a completed Network & Security
Assessment PDF using the same AI providers.

## What's inside

- `frontend/` — the React pricing worksheet (Vite). Pick Ollama or Gemini
  with a toggle above each AI action.
- `server/` — a small Express server that:
  - serves the built frontend
  - `POST /api/quote-summary` — sends your quote numbers to the chosen AI
    provider (`provider: "ollama" | "gemini"` in the request body) and gets
    back a drafted subject + body
  - `POST /api/summarize-assessment` — accepts a filled-out assessment PDF
    (`multipart/form-data`, fields `file` + `provider`), extracts its form
    field values (or plain text if it isn't an interactive PDF form), and
    returns an AI-written summary of top risks and recommended next steps
  - `POST /api/send-email` — sends that (editable) draft to the client over
    SMTP
  - `GET /api/health` — quick check that Ollama/Gemini/SMTP env vars are set
- `Dockerfile` — multi-stage build (Vite build → slim Node runtime)
- `docker-compose.yml` — ready to paste into a Portainer stack

Nothing gets emailed automatically. The AI draft always lands in an editable
text box first — you review or tweak it, then hit "Send email" yourself.

If you summarize an assessment PDF before drafting the quote email, that
summary is automatically folded into the AI's context so the drafted pitch
can reference real findings (e.g. missing MFA, EOL hardware) instead of
staying generic.

## Deploying in Portainer

**Option A — Portainer builds it from a Git repo (recommended)**

1. Push this folder to a repo (e.g. a new repo alongside your existing
   `wolfej4/msp-pitch`, or a folder inside it).
2. In Portainer: **Stacks → Add stack → Repository**, point it at the repo/
   branch, and set the compose path to `docker-compose.yml`.
3. Fill in the environment variables in the Portainer stack editor (see
   below) — you don't need a `.env` file if you set them there.
4. Deploy. Portainer will build the image from the `Dockerfile` and start it.

**Option B — build locally, push to a registry, deploy from image**

```bash
docker build -t ghcr.io/wolfej4/swyftech-quote-app:latest .
docker push ghcr.io/wolfej4/swyftech-quote-app:latest
```

Then in `docker-compose.yml`, replace `build: .` with:
```yaml
image: ghcr.io/wolfej4/swyftech-quote-app:latest
```
and deploy that stack in Portainer as usual (**Stacks → Add stack → Web
editor**, paste the compose file).

## Environment variables

Set these in the Portainer stack's environment editor (or `docker-compose.yml`
directly, or a `.env` file for local runs — see `.env.example`):

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `8787` | Port the app listens on inside the container |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Your Ollama instance. If it's the Open WebUI/Ollama stack on the same Unraid box but a different Docker network, use the box's LAN IP (e.g. `http://10.0.20.5:11434`) rather than `localhost` |
| `OLLAMA_MODEL` | `llama3.1` | Whichever model you've pulled in Ollama |
| `GEMINI_API_KEY` | — | Optional. Set to enable the Gemini provider. Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Which Gemini model to use |
| `SMTP_HOST` | — | Your SMTP relay |
| `SMTP_PORT` | `587` | |
| `SMTP_SECURE` | `false` | `true` for port 465 (implicit TLS) |
| `SMTP_USER` / `SMTP_PASS` | — | SMTP credentials |
| `MAIL_FROM` | — | e.g. `SwyfTech LLC <quotes@yourdomain.com>` |
| `MAIL_BCC` | — | Optional — bcc yourself on every quote sent |

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
