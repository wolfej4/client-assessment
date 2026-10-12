function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Wraps the AI-drafted plain-text body in the app's own navy/blue SwyfTech
// branding (same colors/wordmark as the assessment PDF and the worksheet
// UI), so recipients see a styled email instead of plain text. Uses a
// table-based layout with inline styles for broad email client support.
export function buildEmailHtml({ subject, body, senderName, mailFrom }) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 14px; color:#1c2530; font-size:14px; line-height:1.6;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`
    )
    .join("\n");

  const fromEmailMatch = String(mailFrom || "").match(/<([^>]+)>/);
  const fromEmail = fromEmailMatch ? fromEmailMatch[1] : mailFrom || "";

  return `<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background:#eef2f5; font-family: Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f5; padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #c8d6de;">
        <tr>
          <td style="background:#0f2438; padding:22px 28px;">
            <div style="font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#7fb8d9;">SwyfTech LLC</div>
            <div style="font-size:18px; font-weight:700; color:#ffffff; margin-top:4px;">${escapeHtml(subject)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 28px;">
            ${paragraphs}
          </td>
        </tr>
        <tr>
          <td style="background:#0f2438; padding:14px 28px; font-size:11px; color:#9fb6c7;">
            SwyfTech LLC &middot; Crestview, FL &middot; ${escapeHtml(senderName)} &middot; ${escapeHtml(fromEmail)}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
