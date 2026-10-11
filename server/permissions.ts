import { and, eq } from "drizzle-orm";
import { adminActivityLogs, roles } from "../drizzle/schema";
import { getDb } from "./db";

export async function isAdmin(userId: number) {
  const db = await getDb();
  if (!db) return false;
  const row = (await db.select({ id: roles.id }).from(roles).where(and(eq(roles.userId, userId), eq(roles.role, "admin"))).limit(1))[0];
  return Boolean(row);
}

export async function logAdminAction(input: { adminUserId: number; action: string; targetType?: string; targetId?: number; targetUserId?: number; metadata?: unknown }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(adminActivityLogs).values({ adminUserId: input.adminUserId, action: input.action, targetType: input.targetType, targetId: input.targetId, targetUserId: input.targetUserId, metadata: input.metadata });
}
