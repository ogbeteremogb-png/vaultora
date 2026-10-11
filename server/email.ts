import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { emailLogs, inboxMessages } from "../drizzle/schema";
import { getDb } from "./db";

export type EmailInput = { userId?: number; adminUserId?: number; recipient: string; eventType: string; subject: string; text: string; html?: string };

export class EmailDeliveryError extends Error {
  constructor(message = "Email delivery is unavailable") {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character] ?? character);
}

function brandedHtml(subject: string, text: string) {
  const name = process.env.EMAIL_PLATFORM_NAME ?? "Vaultora";
  const logoUrl = process.env.EMAIL_LOGO_URL ?? (process.env.PUBLIC_APP_URL ? `${process.env.PUBLIC_APP_URL.replace(/\/$/, "")}/vaultora-mark.svg` : "");
  const paragraphs = text.split(/\r?\n\s*\r?\n/).map(paragraph => `<p style="margin:0 0 16px;line-height:1.65;color:#526078;">${escapeHtml(paragraph).replace(/\r?\n/g, "<br>")}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#142033;"><div style="max-width:620px;margin:32px auto;padding:0 16px;"><div style="background:#0b1220;border-radius:14px 14px 0 0;padding:24px 28px;">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(name)}" width="34" height="34" style="vertical-align:middle;margin-right:10px;">` : ""}<span style="color:#d7b56d;font-weight:700;letter-spacing:.16em;font-size:13px;vertical-align:middle;">${escapeHtml(name).toUpperCase()}</span></div><div style="background:#fff;border:1px solid #e2e7ee;border-top:0;border-radius:0 0 14px 14px;padding:30px 28px;"><h1 style="font-size:22px;line-height:1.3;margin:0 0 22px;color:#142033;">${escapeHtml(subject)}</h1>${paragraphs}<div style="margin-top:28px;padding-top:18px;border-top:1px solid #e8edf2;color:#8b96a6;font-size:12px;">This message was sent by ${escapeHtml(name)}. Please do not share your password or security codes.</div></div></div></body></html>`;
}

export async function sendEmail(input: EmailInput) {
  const db = await getDb();
  if (!db) throw new EmailDeliveryError("Email delivery is temporarily unavailable");
  const inserted = await db.insert(emailLogs).values({ userId: input.userId, adminUserId: input.adminUserId, recipient: input.recipient, eventType: input.eventType, subject: input.subject, status: "queued" });
  try {
    const host = process.env.SMTP_HOST;
    const fromAddress = process.env.SMTP_FROM;
    if (!host || !fromAddress) throw new EmailDeliveryError("Email delivery is not configured");
    const from = fromAddress.includes("<") ? fromAddress : process.env.SMTP_FROM_NAME ? { name: process.env.SMTP_FROM_NAME, address: fromAddress } : fromAddress;
    const transport = nodemailer.createTransport({ host, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === "true", auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 });
    const info = await transport.sendMail({ from, to: input.recipient, replyTo: process.env.SMTP_REPLY_TO || undefined, subject: input.subject, text: input.text, html: input.html ?? brandedHtml(input.subject, input.text) });
    await db.update(emailLogs).set({ status: "sent", providerId: info.messageId, sentAt: new Date() }).where(eq(emailLogs.id, inserted[0].insertId));
    return { status: "sent" as const, providerId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed";
    await db.update(emailLogs).set({ status: "failed", error: message }).where(eq(emailLogs.id, inserted[0].insertId));
    if (error instanceof EmailDeliveryError) throw error;
    console.error("[Vaultora email delivery failed]", message);
    throw new EmailDeliveryError("We couldn't send the email. Please try again shortly.");
  }
}

export async function notifyUser(input: EmailInput & { category: "security" | "deposit" | "withdrawal" | "balance" | "direct" | "system"; relatedType?: string; relatedId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(inboxMessages).values({ userId: input.userId!, subject: input.subject, body: input.text, category: input.category, relatedType: input.relatedType, relatedId: input.relatedId });
  try {
    return await sendEmail(input);
  } catch (error) {
    if (error instanceof EmailDeliveryError) return { status: "inbox_only" as const, emailError: error.message };
    throw error;
  }
}
