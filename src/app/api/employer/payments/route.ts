import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { EMPLOYER_PLANS } from "@/lib/employer-plans";
import { createBkashPayment, executeBkashPayment, isBkashConfigured, queryBkashPayment } from "@/lib/bkash";
import { badRequest, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/email";

export async function POST(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "EMPLOYER") return roleRequiredResponse();
  if (!isBkashConfigured()) {
    return NextResponse.json({
      error: "bKash checkout is not configured. Add merchant credentials and token-encryption key on the server.",
    }, { status: 503 });
  }

  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = z.object({ plan: z.enum(["STARTER", "GROWTH"]) }).safeParse(body.data);
  if (!parsed.success) return badRequest("Choose a paid employer package.");

  const site = new URL(siteUrl("/"));
  if (site.protocol !== "https:" || ["localhost", "127.0.0.1", "::1"].includes(site.hostname)) {
    return badRequest("Set SITE_URL to a public HTTPS address before enabling bKash checkout.");
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const invoiceNumber = `CK${Date.now().toString(36).toUpperCase()}${randomBytes(5).toString("hex").toUpperCase()}`;
  const amountBdt = EMPLOYER_PLANS[parsed.data.plan].price;
  const order = await prisma.employerPayment.create({
    data: {
      userId: user.id,
      plan: parsed.data.plan,
      amountBdt,
      invoiceNumber,
      expiresAt,
    },
  });

  try {
    const callbackURL = new URL("/api/employer/payments", site);
    callbackURL.searchParams.set("orderId", order.id);
    const payment = await createBkashPayment({
      payerReference: user.id,
      callbackURL: callbackURL.toString(),
      amount: String(amountBdt),
      merchantInvoiceNumber: invoiceNumber,
    });
    await prisma.employerPayment.update({
      where: { id: order.id },
      data: { providerPaymentId: payment.paymentId, checkoutUrl: payment.checkoutUrl },
    });
    return NextResponse.json({ checkoutUrl: payment.checkoutUrl, expiresAt }, { status: 201 });
  } catch (error) {
    console.error("Could not initialize bKash employer package checkout.", error);
    await prisma.employerPayment.update({
      where: { id: order.id },
      data: { status: "FAILED", failureReason: "Checkout initialization failed." },
    });
    return NextResponse.json({ error: "Could not start bKash checkout. Please check the merchant configuration and try again." }, { status: 502 });
  }
}

function textField(payload: Record<string, unknown>, ...names: string[]) {
  for (const name of names) {
    if (typeof payload[name] === "string") return payload[name];
  }
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  const status = (url.searchParams.get("status") ?? "").toLowerCase();
  const paymentId = url.searchParams.get("paymentID") ?? url.searchParams.get("paymentId");
  const dashboardUrl = (result: string) => {
    const target = new URL("/dashboard", siteUrl("/"));
    target.searchParams.set("payment", result);
    return NextResponse.redirect(target);
  };
  if (!orderId || orderId.length > 30) return dashboardUrl("invalid");
  const order = await prisma.employerPayment.findUnique({ where: { id: orderId } });
  if (!order) return dashboardUrl("invalid");
  if (order.status === "PAID") return dashboardUrl("success");
  if (order.status !== "PENDING" || (order.expiresAt <= new Date() && status !== "success")) {
    if (order.status === "PENDING" && order.expiresAt <= new Date()) {
      await prisma.employerPayment.update({ where: { id: order.id }, data: { status: "EXPIRED" } });
    }
    return dashboardUrl("expired");
  }
  if (status === "cancel") {
    await prisma.employerPayment.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "CANCELLED", failureReason: "Customer cancelled checkout." },
    });
    return dashboardUrl("cancelled");
  }
  if (status !== "success" || !paymentId || paymentId.length > 100 || paymentId !== order.providerPaymentId) {
    if (status === "failure" || status === "error") {
      await prisma.employerPayment.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "FAILED", failureReason: "Provider reported an unsuccessful checkout." },
      });
    }
    return dashboardUrl("failed");
  }

  let verified: Record<string, unknown>;
  try {
    try {
      verified = await executeBkashPayment(paymentId);
    } catch (executeError) {
      console.error("bKash execute payment did not confirm; checking provider payment status.", executeError);
      verified = await queryBkashPayment(paymentId);
    }
  } catch (error) {
    console.error("Could not verify bKash payment status.", error);
    return dashboardUrl("pending");
  }

  const returnedAmount = Number(textField(verified, "amount"));
  const returnedInvoice = textField(verified, "merchantInvoiceNumber", "merchantInvoice");
  if (
    textField(verified, "paymentId", "paymentID") !== paymentId ||
    textField(verified, "transactionStatus") !== "Completed" ||
    textField(verified, "currency") !== "BDT" ||
    !Number.isSafeInteger(returnedAmount) ||
    returnedAmount !== order.amountBdt ||
    returnedInvoice !== order.invoiceNumber ||
    !textField(verified, "trxId")
  ) {
    await prisma.employerPayment.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "FAILED", failureReason: "Provider payment details did not match the order." },
    });
    console.error("bKash payment verification failed for order.", order.id);
    return dashboardUrl("failed");
  }

  const paidAt = new Date();
  const result = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.employerPayment.updateMany({
      where: { id: order.id, status: "PENDING", providerPaymentId: paymentId },
      data: {
        status: "PAID",
        providerTransactionId: textField(verified, "trxId"),
        paidAt,
        failureReason: null,
      },
    });
    if (updated.count === 1) {
      const currentPlan = await transaction.employerPlan.findUnique({
        where: { userId: order.userId },
        select: { expiresAt: true },
      });
      const planStartsAt = Math.max(Date.now(), currentPlan?.expiresAt?.getTime() ?? 0);
      const planExpiry = new Date(planStartsAt + 30 * 24 * 60 * 60 * 1000);
      await transaction.employerPlan.upsert({
        where: { userId: order.userId },
        create: { userId: order.userId, plan: order.plan, expiresAt: planExpiry },
        update: { plan: order.plan, expiresAt: planExpiry },
      });
      return true;
    }
    const latest = await transaction.employerPayment.findUnique({ where: { id: order.id }, select: { status: true } });
    return latest?.status === "PAID";
  });
  return dashboardUrl(result ? "success" : "pending");
}
