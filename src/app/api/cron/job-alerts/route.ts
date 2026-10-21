import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { escapeHtml, sendEmail, siteUrl } from "@/lib/email";
import { prisma } from "@/lib/prisma";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const suppliedBytes = Buffer.from(supplied);
  const secretBytes = Buffer.from(secret ?? "");
  if (!secret || suppliedBytes.byteLength !== secretBytes.byteLength) return false;
  return timingSafeEqual(suppliedBytes, secretBytes);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const alerts = await prisma.jobAlert.findMany({
    where: { active: true, user: { emailNotifications: true } },
    include: { user: { select: { email: true } } },
    orderBy: [{ lastNotifiedAt: "asc" }, { createdAt: "asc" }],
    take: 200,
  });
  let emailsSent = 0;
  let alertsProcessed = 0;
  const failures: string[] = [];
  const now = new Date();

  for (const alert of alerts) {
    const jobs = await prisma.job.findMany({
      where: {
        status: "ACTIVE",
        createdAt: { gt: alert.lastNotifiedAt ?? alert.createdAt },
        ...(alert.location ? { location: { contains: alert.location } } : {}),
        ...(alert.category ? { category: alert.category } : {}),
        ...(alert.minSalary ? { salaryMax: { gte: alert.minSalary } } : {}),
        ...(alert.query
          ? {
              OR: [
                { title: { contains: alert.query } },
                { companyName: { contains: alert.query } },
                { description: { contains: alert.query } },
                { tags: { contains: alert.query } },
              ],
            }
          : {}),
      },
      select: { id: true, title: true, companyName: true, location: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (jobs.length > 0) {
      const list = jobs.map((job) => {
        const url = siteUrl(`/jobs/${job.id}`);
        return `<li><a href="${url}">${escapeHtml(job.title)}</a> — ${escapeHtml(job.companyName)}, ${escapeHtml(job.location)}</li>`;
      }).join("");
      const delivered = await sendEmail({
        to: alert.user.email,
        subject: `New jobs for your Cakree alert: ${alert.name}`,
        text: jobs.map((job) => `${job.title} — ${job.companyName}, ${job.location}: ${siteUrl(`/jobs/${job.id}`)}`).join("\n"),
        html: `<p>New jobs match <strong>${escapeHtml(alert.name)}</strong>:</p><ul>${list}</ul>`,
      });
      if (!delivered) {
        failures.push(alert.id);
        continue;
      }
      emailsSent += 1;
    }
    await prisma.jobAlert.update({ where: { id: alert.id }, data: { lastNotifiedAt: now } });
    alertsProcessed += 1;
  }

  return NextResponse.json({ alertsProcessed, emailsSent, failedAlertIds: failures });
}
