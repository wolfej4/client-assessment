import React, { useState, useMemo } from "react";
import { Monitor, Server, Users, ShieldCheck, Moon, Plus, Minus, Mail, Sparkles, Send, Loader2, FileText, Paperclip } from "lucide-react";

const NAVY = "#0f2438";
const BLUE = "#1f6fa8";
const LIGHT = "#f4f7f9";
const GREY = "#55636f";
const TEXT = "#1c2530";
const BORDER = "#c8d6de";
const GREEN = "#1d9e75";
const RED = "#c94b4b";

const card = {
  width: "100%",
  maxWidth: 480,
  margin: "0 auto",
  borderRadius: 14,
  overflow: "hidden",
  border: `1px solid ${BORDER}`,
  background: "#fff",
  boxShadow: "0 1px 3px rgba(15,36,56,0.08)"
};

function Stepper({ icon: Icon, label, sub, value, onChange, min = 0 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: LIGHT, color: BLUE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} />
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: NAVY }}>{label}</div>
          {sub && <div style={{ fontSize: 11.5, color: GREY }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${BORDER}`, background: "#fff", color: NAVY, cursor: "pointer" }}
        >
          <Minus size={14} />
        </button>
        <div style={{ width: 28, textAlign: "center", fontSize: 14, fontWeight: 700, color: TEXT }}>{value}</div>
        <button
          onClick={() => onChange(value + 1)}
          style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: BLUE, color: "#fff", cursor: "pointer" }}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function RateInput({ label, value, onChange, suffix = "/mo" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ fontSize: 12, color: GREY }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 12, color: GREY }}>$</span>
        <input
          type="number"
          value={value}
          min={0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          style={{ width: 64, fontSize: 13, textAlign: "right", borderRadius: 6, border: `1px solid ${BORDER}`, padding: "4px 6px", color: TEXT }}
        />
        <span style={{ fontSize: 12, color: GREY }}>{suffix}</span>
      </div>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, sub, price, checked, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: LIGHT, color: BLUE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} />
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: NAVY }}>{label}</div>
          <div style={{ fontSize: 11.5, color: GREY }}>{sub} &middot; +${price}/mo</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        aria-label={label}
        style={{ width: 42, height: 24, borderRadius: 999, position: "relative", border: "none", cursor: "pointer", background: checked ? BLUE : BORDER, flexShrink: 0 }}
      >
        <span style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: NAVY, marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", fontSize: 13.5, borderRadius: 8, border: `1px solid ${BORDER}`, padding: "9px 10px", color: TEXT }}
      />
    </div>
  );
}

export default function App() {
  const [workstations, setWorkstations] = useState(8);
  const [servers, setServers] = useState(1);
  const [seats, setSeats] = useState(8);

  const [wsRate, setWsRate] = useState(45);
  const [srvRate, setSrvRate] = useState(140);
  const [seatRate, setSeatRate] = useState(15);

  const [compliance, setCompliance] = useState(false);
  const [afterHours, setAfterHours] = useState(false);

  const complianceFee = 250;
  const afterHoursFee = 150;

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [context, setContext] = useState("");

  const [provider, setProvider] = useState("ollama");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [sendResult, setSendResult] = useState(null);

  const [assessmentFile, setAssessmentFile] = useState(null);
  const [assessmentProvider, setAssessmentProvider] = useState("ollama");
  const [assessmentSummary, setAssessmentSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [assessmentError, setAssessmentError] = useState("");
  const [assessmentFilled, setAssessmentFilled] = useState(false);
  const [assessmentUnrecognized, setAssessmentUnrecognized] = useState(false);

  const lines = useMemo(() => {
    const items = [];
    if (workstations > 0) items.push({ label: `Workstations (${workstations} x $${wsRate})`, amount: workstations * wsRate });
    if (servers > 0) items.push({ label: `Servers (${servers} x $${srvRate})`, amount: servers * srvRate });
    if (seats > 0) items.push({ label: `Help desk seats (${seats} x $${seatRate})`, amount: seats * seatRate });
    if (compliance) items.push({ label: "Compliance package (CMMC/HIPAA/PCI)", amount: complianceFee });
    if (afterHours) items.push({ label: "Priority after-hours support", amount: afterHoursFee });
    return items;
  }, [workstations, servers, seats, wsRate, srvRate, seatRate, compliance, afterHours]);

  const monthly = lines.reduce((sum, l) => sum + l.amount, 0);
  const annual = monthly * 12;

  async function handleSummarizeAssessment() {
    setAssessmentError("");
    setAssessmentSummary("");
    setAssessmentFilled(false);
    setAssessmentUnrecognized(false);
    if (!assessmentFile) {
      setAssessmentError("Choose a filled-out assessment PDF first.");
      return;
    }
    setSummarizing(true);
    try {
      const formData = new FormData();
      formData.append("file", assessmentFile);
      formData.append("provider", assessmentProvider);
      const res = await fetch("/api/summarize-assessment", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to summarize the assessment.");
      setAssessmentSummary(data.summary || "");

      if (data.recognizedForm && data.fields) {
        const f = data.fields;
        if (f.businessName) setBusinessName(f.businessName);
        if (f.contactName) setContactName(f.contactName);
        if (f.contactEmail) setContactEmail(f.contactEmail);

        const ws = parseInt(f.workstations, 10);
        if (Number.isFinite(ws) && ws >= 0) setWorkstations(ws);
        const srv = parseInt(f.servers, 10);
        if (Number.isFinite(srv) && srv >= 0) setServers(srv);
        const emp = parseInt(f.employees, 10);
        if (Number.isFinite(emp) && emp >= 0) setSeats(emp);

        setCompliance(Boolean(f.complianceApplies));

        const notes = [
          f.clientGoals && `Client-stated goals/concerns: ${f.clientGoals}`,
          f.budgetRange && `Budget range: ${f.budgetRange}`,
          f.desiredTimeline && `Desired timeline: ${f.desiredTimeline}`
        ].filter(Boolean).join("\n");
        if (notes) setContext((prev) => prev || notes);

        setAssessmentFilled(true);
      } else {
        setAssessmentUnrecognized(true);
      }
    } catch (err) {
      setAssessmentError(err.message || "Could not reach the AI provider.");
    } finally {
      setSummarizing(false);
    }
  }

  async function handleDraft() {
    setDraftError("");
    setSendResult(null);
    if (!businessName.trim()) {
      setDraftError("Enter the client's business name first.");
      return;
    }
    if (lines.length === 0) {
      setDraftError("Add at least one device or seat to quote.");
      return;
    }
    setDrafting(true);
    try {
      const combinedContext = [context.trim(), assessmentSummary.trim() && `Network & security assessment findings:\n${assessmentSummary.trim()}`]
        .filter(Boolean)
        .join("\n\n");
      const res = await fetch("/api/quote-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          contactName,
          contactEmail,
          context: combinedContext,
          lines,
          monthly,
          annual,
          provider
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to draft email.");
      setDraftSubject(data.subject || `Your SwyfTech IT quote for ${businessName}`);
      setDraftBody(data.body || "");
    } catch (err) {
      setDraftError(err.message || "Could not reach the AI provider.");
    } finally {
      setDrafting(false);
    }
  }

  async function handleSend() {
    setSendResult(null);
    if (!contactEmail.trim()) {
      setDraftError("Enter the client's email address before sending.");
      return;
    }
    if (!draftBody.trim()) {
      setDraftError("Draft the email before sending.");
      return;
    }
    setDraftError("");
    setSending(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: contactEmail,
          subject: draftSubject,
          body: draftBody
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email.");
      setSendResult({ ok: true, message: `Sent to ${contactEmail}.` });
    } catch (err) {
      setSendResult({ ok: false, message: err.message || "Send failed." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={card}>
      <div style={{ padding: "20px 20px 24px", background: NAVY }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#7fb8d9" }}>
          SwyfTech LLC
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 2 }}>Pricing Worksheet</div>
        <div style={{ marginTop: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11.5, color: "#9fb6c7" }}>Monthly total</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>
              ${monthly.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11.5, color: "#9fb6c7" }}>Annual</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>${annual.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "18px 20px 22px", background: LIGHT, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <FileText size={16} color={BLUE} />
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Start from a completed assessment</div>
        </div>
        <div style={{ fontSize: 11.5, color: GREY, marginBottom: 10 }}>
          Optional. Attach a filled-out Network &amp; Security Assessment PDF to
          auto-fill the worksheet below and get an AI risk summary.
        </div>

        <label
          htmlFor="assessment-file"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            boxSizing: "border-box",
            fontSize: 13,
            borderRadius: 8,
            border: `1px dashed ${BORDER}`,
            background: "#fff",
            padding: "10px 10px",
            color: assessmentFile ? TEXT : GREY,
            cursor: "pointer",
            marginBottom: 10
          }}
        >
          <Paperclip size={15} />
          {assessmentFile ? assessmentFile.name : "Attach filled-out assessment PDF"}
        </label>
        <input
          id="assessment-file"
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            setAssessmentFile(e.target.files?.[0] || null);
            setAssessmentSummary("");
            setAssessmentError("");
            setAssessmentFilled(false);
            setAssessmentUnrecognized(false);
          }}
          style={{ display: "none" }}
        />

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
            AI provider
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { id: "ollama", label: "Ollama (self-hosted)" },
              { id: "gemini", label: "Google Gemini" }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setAssessmentProvider(p.id)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: `1px solid ${assessmentProvider === p.id ? BLUE : BORDER}`,
                  background: assessmentProvider === p.id ? BLUE : "#fff",
                  color: assessmentProvider === p.id ? "#fff" : TEXT,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSummarizeAssessment}
          disabled={summarizing}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 0",
            borderRadius: 8,
            border: "none",
            background: BLUE,
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 700,
            cursor: summarizing ? "default" : "pointer",
            opacity: summarizing ? 0.75 : 1
          }}
        >
          {summarizing ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
          {summarizing ? `Analyzing with ${assessmentProvider === "gemini" ? "Gemini" : "Ollama"}...` : "Analyze assessment"}
        </button>

        {assessmentError && (
          <div style={{ marginTop: 8, fontSize: 12, color: RED }}>{assessmentError}</div>
        )}

        {assessmentFilled && (
          <div style={{ marginTop: 8, fontSize: 12, color: GREEN }}>
            Pulled business info, device counts, and compliance status into the worksheet below — review before sending.
          </div>
        )}

        {assessmentUnrecognized && (
          <div style={{ marginTop: 8, fontSize: 12, color: GREY }}>
            Got a summary, but this doesn't look like the SwyfTech assessment form, so the worksheet fields weren't auto-filled.
          </div>
        )}

        {assessmentSummary && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Summary</label>
            <textarea
              value={assessmentSummary}
              onChange={(e) => setAssessmentSummary(e.target.value)}
              rows={8}
              style={{ width: "100%", boxSizing: "border-box", fontSize: 13, borderRadius: 8, border: `1px solid ${BORDER}`, padding: "9px 10px", color: TEXT, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
            />
            <div style={{ marginTop: 8, fontSize: 11.5, color: GREY }}>
              This will be included automatically when you draft the quote email with AI.
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "16px 20px 0", background: "#fff" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: NAVY, marginBottom: 2 }}>
          Environment
        </div>
        <Stepper icon={Monitor} label="Workstations" value={workstations} onChange={setWorkstations} />
        <Stepper icon={Server} label="Servers" value={servers} onChange={setServers} />
        <Stepper icon={Users} label="Help desk seats" sub="Employees needing support access" value={seats} onChange={setSeats} />

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: NAVY, marginTop: 18, marginBottom: 2 }}>
          Add-ons
        </div>
        <ToggleRow icon={ShieldCheck} label="Compliance package" sub="CMMC / HIPAA / PCI docs & controls" price={complianceFee} checked={compliance} onChange={setCompliance} />
        <ToggleRow icon={Moon} label="After-hours priority" sub="Guaranteed response outside business hours" price={afterHoursFee} checked={afterHours} onChange={setAfterHours} />

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: NAVY, marginTop: 18, marginBottom: 2 }}>
          Rates
        </div>
        <div style={{ borderRadius: 8, background: LIGHT, padding: "2px 12px", marginBottom: 20 }}>
          <RateInput label="Per workstation" value={wsRate} onChange={setWsRate} />
          <RateInput label="Per server" value={srvRate} onChange={setSrvRate} />
          <RateInput label="Per help desk seat" value={seatRate} onChange={setSeatRate} />
        </div>
      </div>

      <div style={{ padding: "16px 20px", background: LIGHT }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: NAVY, marginBottom: 8 }}>
          Breakdown
        </div>
        {lines.length === 0 ? (
          <div style={{ fontSize: 12, color: GREY }}>Add devices or seats to build a quote.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {lines.map((l, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: GREY }}>{l.label}</span>
                <span style={{ color: TEXT, fontWeight: 600 }}>${l.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "18px 20px 22px", background: "#fff", borderTop: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Mail size={16} color={BLUE} />
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Email quote to client</div>
        </div>

        <Field label="Client business name" value={businessName} onChange={setBusinessName} placeholder="Acme HVAC LLC" />
        <Field label="Contact name" value={contactName} onChange={setContactName} placeholder="Jane Smith" />
        <Field label="Contact email" value={contactEmail} onChange={setContactEmail} placeholder="jane@acmehvac.com" type="email" />

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
            Notes for the AI draft (optional)
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. mention their aging firewall, they're worried about ransomware, prior IT guy retired"
            rows={3}
            style={{ width: "100%", boxSizing: "border-box", fontSize: 13, borderRadius: 8, border: `1px solid ${BORDER}`, padding: "9px 10px", color: TEXT, resize: "vertical", fontFamily: "inherit" }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
            AI provider
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { id: "ollama", label: "Ollama (self-hosted)" },
              { id: "gemini", label: "Google Gemini" }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: `1px solid ${provider === p.id ? BLUE : BORDER}`,
                  background: provider === p.id ? BLUE : "#fff",
                  color: provider === p.id ? "#fff" : TEXT,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleDraft}
          disabled={drafting}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 0",
            borderRadius: 8,
            border: "none",
            background: BLUE,
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 700,
            cursor: drafting ? "default" : "pointer",
            opacity: drafting ? 0.75 : 1
          }}
        >
          {drafting ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
          {drafting ? `Drafting with ${provider === "gemini" ? "Gemini" : "Ollama"}...` : "Draft email with AI"}
        </button>

        {draftError && (
          <div style={{ marginTop: 8, fontSize: 12, color: RED }}>{draftError}</div>
        )}

        {(draftSubject || draftBody) && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Subject</label>
            <input
              type="text"
              value={draftSubject}
              onChange={(e) => setDraftSubject(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", fontSize: 13.5, borderRadius: 8, border: `1px solid ${BORDER}`, padding: "9px 10px", color: TEXT, marginBottom: 10 }}
            />
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Body</label>
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={10}
              style={{ width: "100%", boxSizing: "border-box", fontSize: 13, borderRadius: 8, border: `1px solid ${BORDER}`, padding: "9px 10px", color: TEXT, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
            />

            <button
              onClick={handleSend}
              disabled={sending}
              style={{
                width: "100%",
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 0",
                borderRadius: 8,
                border: `1px solid ${GREEN}`,
                background: "#fff",
                color: GREEN,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: sending ? "default" : "pointer",
                opacity: sending ? 0.75 : 1
              }}
            >
              {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              {sending ? "Sending..." : "Send email"}
            </button>

            {sendResult && (
              <div style={{ marginTop: 8, fontSize: 12, color: sendResult.ok ? GREEN : RED }}>
                {sendResult.message}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
