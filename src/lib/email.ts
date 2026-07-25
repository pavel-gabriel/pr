/** Emailuri tranzacționale prin Resend (opțional — no-op fără RESEND_API_KEY). */
export async function sendEmail(
  to: string,
  subject: string,
  text: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FTF Consulting <noreply@ftfconsulting.ro>",
        to: [to],
        subject,
        text,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Emailul e best-effort; datele rămân oricum în baza de date.
  }
}

/** Notificare către adresa de admin (lead-uri noi etc.). */
export async function sendAdminEmail(subject: string, text: string): Promise<void> {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return;
  await sendEmail(to, subject, text);
}
