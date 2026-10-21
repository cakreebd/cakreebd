type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error("Email delivery is not configured; set RESEND_API_KEY and EMAIL_FROM.");
    return false;
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("Email delivery request failed.", error);
    return false;
  }
  if (!response.ok) {
    console.error(`Email provider rejected message (${response.status}): ${await response.text()}`);
    return false;
  }
  return true;
}

export function siteUrl(path: string) {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const url = new URL(base);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("SITE_URL must use HTTPS outside localhost.");
  }
  return new URL(path, url).toString();
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}
