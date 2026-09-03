import express from "express";
import nodemailer from "nodemailer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "dist");

const PORT = process.env.PORT || 8787;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false") === "true";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || "SwyfTech LLC <quotes@swyftech.example>";
const MAIL_BCC = process.env.MAIL_BCC || "";

const app = express();
app.use(express.json({ limit: "1mb" }));

function buildPrompt({ businessName, contactName, contactEmail, context, lines, monthly, annual }) {
  const breakdown = lines
    .map((l) => `- ${l.label}: $${l.amount}/mo`)
    .join("\n");

  const system = `You are a plain-spoken, professional MSP (managed service provider) owner writing a short quote email to a prospective or existing small business client. Tone: confident, warm, no corporate filler, no exclamation points, no "please" as a favor-ask, no emoji. Keep it concise: 120-180 words in the body. Do not invent pricing or services beyond what is given. Do not invent a signature block beyond "Jacob" and "SwyfTech LLC" unless told otherwise. Output must follow this exact format with no extra commentary before or after:
SUBJECT: <one line subject>
BODY:
<email body text, plain text, no markdown>`;

  const user = `Client business name: ${businessName || "the client"}
Contact name: ${contactName || "there"}
Contact email: ${contactEmail || "unknown"}
Extra context to weave in naturally (optional): ${context || "none"}

Monthly total: $${monthly}
Annual total: $${annual}

Line-item breakdown:
${breakdown || "(no line items)"}

Write the quote email now, following the required SUBJECT/BODY format.`;

  return { system, user };
}

function parseDraft(raw) {
  const text = String(raw || "").trim();
  const subjectMatch = text.match(/SUBJECT:\s*(.+)/i);
  const bodyMatch = text.match(/BODY:\s*([\s\S]*)/i);
  const subject = subjectMatch ? subjectMatch[1].trim() : "";
  const body = bodyMatch ? bodyMatch[1].trim() : text;
  return { subject, body };
}

app.post("/api/quote-summary", async (req, res) => {
  const { businessName, contactName, contactEmail, context, lines, monthly, annual } = req.body || {};

  if (!businessName || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: "Missing business name or quote line items." });
  }

  const { system, user } = buildPrompt({ businessName, contactName, contactEmail, context, lines, monthly, annual });

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text().catch(() => "");
      return res.status(502).json({ error: `Ollama returned an error (${ollamaRes.status}). ${errText}`.trim() });
    }

    const data = await ollamaRes.json();
    const raw = data?.message?.content || data?.response || "";
    const { subject, body } = parseDraft(raw);

    if (!body) {
      return res.status(502).json({ error: "Ollama returned an empty response." });
    }

    res.json({
      subject: subject || `Your SwyfTech IT quote for ${businessName}`,
      body
    });
  } catch (err) {
    res.status(502).json({ error: `Could not reach Ollama at ${OLLAMA_BASE_URL}. ${err.message || ""}`.trim() });
  }
});

app.post("/api/send-email", async (req, res) => {
  const { to, subject, body } = req.body || {};

  if (!to || !subject || !body) {
    return res.status(400).json({ error: "Missing recipient, subject, or body." });
  }
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return res.status(500).json({ error: "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS." });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });

    await transporter.sendMail({
      from: MAIL_FROM,
      to,
      bcc: MAIL_BCC || undefined,
      subject,
      text: body
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: `Failed to send email. ${err.message || ""}`.trim() });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ollama: OLLAMA_BASE_URL, model: OLLAMA_MODEL, smtpConfigured: Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS) });
});

app.use(express.static(DIST_DIR));
app.get("*", (_req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`SwyfTech quote app listening on port ${PORT}`);
  console.log(`Ollama base URL: ${OLLAMA_BASE_URL} (model: ${OLLAMA_MODEL})`);
  console.log(`SMTP configured: ${Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)}`);
});
