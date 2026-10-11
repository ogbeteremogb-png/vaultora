import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { accounts, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values: InsertUser = { openId: user.openId, name: user.name ?? null, email: user.email ?? "", loginMethod: user.loginMethod ?? "oauth", fullName: user.fullName ?? user.name ?? "", phone: user.phone ?? "", country: user.country ?? "", passwordHash: user.passwordHash ?? "", role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"), lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { name: values.name, email: values.email, loginMethod: values.loginMethod, fullName: values.fullName, lastSignedIn: values.lastSignedIn };
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getAccount(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1))[0];
}

export async function getRecentTransactions(userId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from((await import("../drizzle/schema")).transactions).where(eq((await import("../drizzle/schema")).transactions.userId, userId)).orderBy(desc((await import("../drizzle/schema")).transactions.createdAt)).limit(limit);
}
