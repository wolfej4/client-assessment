import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFTextField } from "pdf-lib";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "dist");

const PORT = process.env.PORT || 8787;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false") === "true";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || "SwyfTech LLC <quotes@swyftech.example>";
const MAIL_BCC = process.env.MAIL_BCC || "";

const app = express();
app.use(express.json({ limit: "1mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === "application/pdf");
  }
});

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

async function draftWithOllama(system, user) {
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
    throw new Error(`Ollama returned an error (${ollamaRes.status}). ${errText}`.trim());
  }

  const data = await ollamaRes.json();
  return data?.message?.content || data?.response || "";
}

async function draftWithGemini(system, user) {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini is not configured. Set GEMINI_API_KEY.");
  }

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }]
      })
    }
  );

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => "");
    throw new Error(`Gemini returned an error (${geminiRes.status}). ${errText}`.trim());
  }

  const data = await geminiRes.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("");
}

const PROVIDERS = {
  ollama: { label: "Ollama", draft: draftWithOllama },
  gemini: { label: "Gemini", draft: draftWithGemini }
};

app.post("/api/quote-summary", async (req, res) => {
  const { businessName, contactName, contactEmail, context, lines, monthly, annual, provider } = req.body || {};

  if (!businessName || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: "Missing business name or quote line items." });
  }

  const selected = PROVIDERS[provider] || PROVIDERS.ollama;
  const { system, user } = buildPrompt({ businessName, contactName, contactEmail, context, lines, monthly, annual });

  try {
    const raw = await selected.draft(system, user);
    const { subject, body } = parseDraft(raw);

    if (!body) {
      return res.status(502).json({ error: `${selected.label} returned an empty response.` });
    }

    res.json({
      subject: subject || `Your SwyfTech IT quote for ${businessName}`,
      body
    });
  } catch (err) {
    res.status(502).json({ error: err.message || `Could not reach ${selected.label}.` });
  }
});

async function extractPdfText(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const fields = pdfDoc.getForm().getFields();
    const lines = fields
      .map((field) => {
        const name = field.getName();
        let value = "";
        if (field instanceof PDFTextField) value = field.getText() || "";
        else if (field instanceof PDFCheckBox) value = field.isChecked() ? "Yes" : "No";
        else if (field instanceof PDFRadioGroup) value = field.getSelected() || "";
        else if (field instanceof PDFDropdown) value = (field.getSelected() || []).join(", ");
        return value.trim() ? `${name}: ${value.trim()}` : "";
      })
      .filter(Boolean);

    if (lines.length > 0) return lines.join("\n");
  } catch {
    // Not an AcroForm PDF, or it failed to parse as one — fall back to plain text extraction below.
  }

  const data = await pdfParse(buffer);
  return (data.text || "").trim();
}

function buildAssessmentSummaryPrompt(extractedText) {
  const system = `You are an experienced MSP (managed service provider) technician summarizing a completed client network & security assessment intake form for internal use. Be direct and specific, not generic. Output plain text, no markdown. Structure your response as:
TOP RISKS:
<3-6 bullet points, most urgent first, each one line>
RECOMMENDED NEXT STEPS:
<3-6 bullet points, concrete and prioritized>
NOTES:
<1-3 sentences on anything else worth flagging - EOL systems, missing backups/MFA, compliance gaps, budget/timeline signals>`;

  const user = `Here is the extracted content of a filled-out SwyfTech Network & Security Assessment form (field name/value pairs, or raw text if the PDF wasn't an interactive form):

${extractedText}

Summarize it now, following the required TOP RISKS / RECOMMENDED NEXT STEPS / NOTES format. Only use what's actually in the form - do not invent findings.`;

  return { system, user };
}

app.post("/api/summarize-assessment", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Attach a PDF file to summarize." });
  }

  const selected = PROVIDERS[req.body?.provider] || PROVIDERS.ollama;

  let extractedText;
  try {
    extractedText = await extractPdfText(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ error: `Could not read that PDF. ${err.message || ""}`.trim() });
  }

  if (!extractedText || extractedText.length < 20) {
    return res.status(400).json({
      error: "Couldn't find readable text in this PDF. If it's a scanned image, export a text-based or form-fillable PDF instead."
    });
  }

  const { system, user } = buildAssessmentSummaryPrompt(extractedText);

  try {
    const summary = (await selected.draft(system, user)).trim();
    if (!summary) {
      return res.status(502).json({ error: `${selected.label} returned an empty response.` });
    }
    res.json({ summary });
  } catch (err) {
    res.status(502).json({ error: err.message || `Could not reach ${selected.label}.` });
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
  res.json({
    ok: true,
    ollama: OLLAMA_BASE_URL,
    model: OLLAMA_MODEL,
    geminiConfigured: Boolean(GEMINI_API_KEY),
    geminiModel: GEMINI_MODEL,
    smtpConfigured: Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)
  });
});

app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload failed: ${err.message}` });
  }
  next(err);
});

app.use(express.static(DIST_DIR));
app.get("*", (_req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`SwyfTech quote app listening on port ${PORT}`);
  console.log(`Ollama base URL: ${OLLAMA_BASE_URL} (model: ${OLLAMA_MODEL})`);
  console.log(`Gemini configured: ${Boolean(GEMINI_API_KEY)} (model: ${GEMINI_MODEL})`);
  console.log(`SMTP configured: ${Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)}`);
});
