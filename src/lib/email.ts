/** Notificări email prin Resend (opțional — no-op fără RESEND_API_KEY). */
export async function sendAdminEmail(subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;
  if (!apiKey || !to) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FTF Platform <noreply@ftfconsulting.ro>",
        to: [to],
        subject,
        text,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Notificarea e best-effort; lead-ul rămâne oricum în baza de date.
  }
}
