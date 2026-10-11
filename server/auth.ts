import crypto from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { parse as parseCookie } from "cookie";
import { getDb } from "./db";
import { accounts, passwordResetTokens, roles, sessions, users, verificationCodes } from "../drizzle/schema";
import { COOKIE_NAME, RESET_TTL_MS, SESSION_TTL_MS, VERIFICATION_RESEND_COOLDOWN_MS, VERIFICATION_TTL_MS } from "../shared/const";
import { EmailDeliveryError, sendEmail } from "./email";

const scryptAsync = promisify(crypto.scrypt);
const HASH_KEYLEN = 64;

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function randomCode() { return String(crypto.randomInt(100000, 1000000)); }
export function randomToken() { return crypto.randomBytes(32).toString("hex"); }
export function hashValue(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, HASH_KEYLEN)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [, salt, hash] = encoded.split("$");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, HASH_KEYLEN)) as Buffer;
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived);
}

export function getSessionToken(req: Request) {
  const cookies = parseCookie(req.headers.cookie ?? "");
  const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined;
  return cookies[COOKIE_NAME] ?? bearer;
}

export async function createSession(userId: number, res: Response, req: Request) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const token = randomToken();
  await db.insert(sessions).values({ userId, tokenHash: hashValue(token), expiresAt: new Date(Date.now() + SESSION_TTL_MS) });
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; Path=/; HttpOnly${cookieSecurity(req)}`);
  return token;
}

export async function destroySession(req: Request, res: Response) {
  const db = await getDb();
  const token = getSessionToken(req);
  if (db && token) await db.delete(sessions).where(eq(sessions.tokenHash, hashValue(token)));
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly${cookieSecurity(req)}`);
}

function cookieSecurity(req: Request) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const isPublicHttps = process.env.NODE_ENV === "production" || forwardedProto === "https" || (Array.isArray(forwardedProto) && forwardedProto.includes("https"));
  return isPublicHttps ? "; Secure; SameSite=None" : "; SameSite=Lax";
}

export async function authenticateAppRequest(req: Request) {
  const db = await getDb();
  const token = getSessionToken(req);
  if (!db || !token) return null;
  const rows = await db.select({ session: sessions, user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.tokenHash, hashValue(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  const row = rows[0];
  if (!row || row.user.isSuspended) return null;
  return row.user;
}

export async function issueVerificationCode(userId: number, email: string, fullName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const latest = await db.select().from(verificationCodes).where(eq(verificationCodes.userId, userId)).orderBy(desc(verificationCodes.sentAt)).limit(1);
  if (latest[0] && Date.now() - latest[0].sentAt.getTime() < VERIFICATION_RESEND_COOLDOWN_MS) throw new Error("Please wait before requesting another code");
  const code = randomCode();
  const inserted = await db.insert(verificationCodes).values({ userId, codeHash: hashValue(code), expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS), sentAt: new Date() });
  try {
    await sendEmail({ userId, recipient: email, eventType: "email_verification", subject: "Verify your Vaultora email", text: `Hi ${fullName}, your Vaultora verification code is ${code}. It expires in 20 minutes.` });
  } catch (error) {
    await db.delete(verificationCodes).where(eq(verificationCodes.id, Number(inserted[0].insertId)));
    throw error;
  }
  await db.update(verificationCodes).set({ consumedAt: new Date() }).where(and(eq(verificationCodes.userId, userId), isNull(verificationCodes.consumedAt), sql`${verificationCodes.id} <> ${Number(inserted[0].insertId)}`));
  return { cooldownSeconds: Math.floor(VERIFICATION_RESEND_COOLDOWN_MS / 1000) };
}

export async function verifyEmailCode(userId: number, code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const row = (await db.select().from(verificationCodes).where(and(eq(verificationCodes.userId, userId), isNull(verificationCodes.consumedAt))).orderBy(desc(verificationCodes.sentAt)).limit(1))[0];
  if (!row || row.expiresAt < new Date()) throw new Error("That verification code has expired");
  if (row.attempts >= 5) throw new Error("Too many attempts. Request a new code.");
  if (row.codeHash !== hashValue(code)) {
    await db.update(verificationCodes).set({ attempts: row.attempts + 1 }).where(eq(verificationCodes.id, row.id));
    throw new Error("Invalid verification code");
  }
  await db.update(verificationCodes).set({ consumedAt: new Date() }).where(eq(verificationCodes.id, row.id));
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
}

export async function createResetToken(userId: number, email: string, fullName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const token = randomToken();
  const origin = process.env.PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!origin) throw new EmailDeliveryError("Password reset delivery is not configured");
  const inserted = await db.insert(passwordResetTokens).values({ userId, tokenHash: hashValue(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) });
  try {
    await sendEmail({ userId, recipient: email, eventType: "password_reset", subject: "Reset your Vaultora password", text: `Hi ${fullName}, reset your Vaultora password here: ${origin}/reset-password?token=${token}` });
  } catch (error) {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, Number(inserted[0].insertId)));
    throw error;
  }
  return token;
}

export async function consumeResetToken(token: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const row = (await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, hashValue(token)), isNull(passwordResetTokens.consumedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1))[0];
  if (!row) throw new Error("That reset link is invalid or expired");
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, row.userId));
  await db.update(passwordResetTokens).set({ consumedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  await db.delete(sessions).where(eq(sessions.userId, row.userId));
}

export async function ensureRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(roles).where(and(eq(roles.userId, userId), eq(roles.role, role))).limit(1);
  if (!existing[0]) await db.insert(roles).values({ userId, role });
}
