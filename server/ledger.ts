import { eq } from "drizzle-orm";
import { accounts, transactions } from "../drizzle/schema";
import { getDb } from "./db";

export function money(value: string | number) { return Number(Number(value).toFixed(8)); }

export async function changeBalance(input: { userId: number; amount: number; direction: "credit" | "debit"; type: "deposit" | "withdrawal" | "investment" | "credit" | "debit" | "profit" | "refund"; note?: string; referenceType?: string; referenceId?: number; actorId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Amount must be positive");
  return db.transaction(async tx => {
    const row = (await tx.select().from(accounts).where(eq(accounts.userId, input.userId)).limit(1))[0];
    if (!row) throw new Error("Account not found");
    const before = money(row.availableBalance);
    const after = money(input.direction === "credit" ? before + input.amount : before - input.amount);
    if (after < 0) throw new Error("Insufficient available balance");
    await tx.update(accounts).set({ availableBalance: after.toFixed(8) }).where(eq(accounts.id, row.id));
    await tx.insert(transactions).values({ userId: input.userId, type: input.type, direction: input.direction, amount: input.amount.toFixed(8), balanceAfter: after.toFixed(8), referenceType: input.referenceType, referenceId: input.referenceId, note: input.note, actorId: input.actorId });
    return { before, after };
  });
}
