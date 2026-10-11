import crypto from "node:crypto";
import { and, asc, count, desc, eq, gte, like, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { accounts, adminActivityLogs, depositRequests, emailLogs, inboxMessages, investments, plans, roles, transactions, users, wallets, withdrawalRequests } from "../drizzle/schema";
import { getDb } from "./db";
import { consumeResetToken, createResetToken, createSession, destroySession, ensureRole, hashPassword, issueVerificationCode, normalizeEmail, verifyEmailCode, verifyPassword } from "./auth";
import { changeBalance, money } from "./ledger";
import { getMarketPrices } from "./market";
import { logAdminAction } from "./permissions";
import { EmailDeliveryError, notifyUser } from "./email";

const passwordSchema = z.string().min(8, "Use at least 8 characters").max(128);
const amountSchema = z.coerce.number().finite().positive().max(1_000_000_000);
const reasonSchema = z.string().trim().min(2).max(500);
const withdrawalInputSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("crypto"), coin: z.string().trim().min(2).max(20), network: z.string().trim().min(2).max(40), walletAddress: z.string().trim().min(8).max(255), amount: amountSchema, withdrawalNote: z.string().trim().max(500).optional() }),
  z.object({ method: z.literal("bank"), accountHolderName: z.string().trim().min(2).max(160), bankName: z.string().trim().min(2).max(160), accountNumberIban: z.string().trim().min(5).max(120), swiftBic: z.string().trim().max(40).optional(), bankCountry: z.string().trim().min(2).max(80), amount: amountSchema, withdrawalNote: z.string().trim().max(500).optional() }),
]);
let currencyRatesCache: { expiresAt: number; rates: Record<string, number> } | null = null;
async function getCurrencyRates() {
  if (currencyRatesCache && currencyRatesCache.expiresAt > Date.now()) return currencyRatesCache.rates;
  try {
    const response = await fetch("https://api.frankfurter.app/latest?from=USD");
    if (!response.ok) throw new Error("Exchange-rate provider unavailable");
    const payload = await response.json() as { rates?: Record<string, number> };
    const rates = { USD: 1, ...(payload.rates ?? {}) };
    currencyRatesCache = { expiresAt: Date.now() + 15 * 60_000, rates };
    return rates;
  } catch {
    return { USD: 1 };
  }
}

function fail(message: string, code: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT" = "BAD_REQUEST"): never { throw new TRPCError({ code, message }); }
function rethrowDeliveryError(error: unknown): never { if (error instanceof EmailDeliveryError) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "We couldn't send your confirmation email just now. Please try again in a moment." }); throw error; }
function safeUser(user: typeof users.$inferSelect) { return { id: user.id, name: user.name, fullName: user.fullName, email: user.email, phone: user.phone, country: user.country, emailVerifiedAt: user.emailVerifiedAt, isSuspended: user.isSuspended, createdAt: user.createdAt }; }
function cryptoChatReply(message: string, language: string, btcPrice: number) {
  const topic = message.toLowerCase();
  const english = topic.includes("deposit") ? "Deposits are submitted from the Deposit tab with a verified wallet address and transaction ID. An authorized admin reviews the request before your balance is credited." : topic.includes("withdraw") ? "You can request a crypto or bank withdrawal from the Withdraw tab. Requests remain pending until reviewed, and approved payouts are recorded in your ledger." : topic.includes("plan") || topic.includes("roi") ? "Review each plan's duration, target ROI, and amount range before investing. These are illustrative platform terms, not guaranteed returns." : topic.includes("price") || topic.includes("btc") ? `The live BTC reference price is $${btcPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}. Crypto prices move quickly, so treat market data as informational.` : "I can help you understand deposits, withdrawals, investment plans, account balance, and the crypto market. What would you like to explore?";
  const localized: Record<string, string> = { it: "Posso aiutarti con depositi, prelievi, piani, saldo e mercato crypto. Cosa vuoi esplorare?", de: "Ich kann dir bei Einzahlungen, Auszahlungen, Plänen, Guthaben und dem Kryptomarkt helfen. Was möchtest du wissen?", fr: "Je peux vous aider avec les dépôts, retraits, plans, solde et marché crypto. Que souhaitez-vous explorer ?", es: "Puedo ayudarte con depósitos, retiros, planes, saldo y mercado cripto. ¿Qué quieres explorar?", bg: "Мога да помогна с депозити, тегления, планове, баланс и крипто пазара. Какво искате да разгледате?" };
  return language === "en" ? english : localized[language] ?? english;
}
export const appRouter = router({
  system: router({ health: publicProcedure.query(() => ({ ok: true })) }),
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => ctx.user ? { ...safeUser(ctx.user), isAdmin: await (await import("./permissions")).isAdmin(ctx.user.id) } : null),
    signup: publicProcedure.input(z.object({ fullName: z.string().trim().min(2).max(160), email: z.string().email(), phone: z.string().trim().min(5).max(40), country: z.string().trim().min(2).max(80), password: passwordSchema, confirmPassword: z.string() })).mutation(async ({ input }) => {
      if (input.password !== input.confirmPassword) fail("Passwords do not match");
      const db = await getDb(); if (!db) fail("Database is not available");
      const email = normalizeEmail(input.email);
      if ((await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0]) fail("An account with that email already exists", "CONFLICT");
      const passwordHash = await hashPassword(input.password);
      const inserted = await db.insert(users).values({ openId: `local_${crypto.randomUUID()}`, name: input.fullName, fullName: input.fullName, email, phone: input.phone, country: input.country, passwordHash, loginMethod: "password", role: "user", emailVerifiedAt: new Date() });
      const userId = Number(inserted[0].insertId);
      await db.insert(roles).values({ userId, role: "user" });
      await db.insert(accounts).values({ userId, availableBalance: "0.00000000", totalProfit: "0.00000000" });
      return { ok: true, userId, email };
    }),
    verifyEmail: publicProcedure.input(z.object({ userId: z.number().int().positive(), code: z.string().regex(/^\d{6}$/) })).mutation(async ({ input }) => { await verifyEmailCode(input.userId, input.code); return { ok: true }; }),
    resendVerification: publicProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) fail("Database is not available");
      const user = (await db.select().from(users).where(eq(users.id, input.userId)).limit(1))[0];
      if (!user) fail("Account not found", "NOT_FOUND");
      if (user.emailVerifiedAt) return { ok: true, alreadyVerified: true, cooldownSeconds: 0 };
      try { return { ok: true, alreadyVerified: false, ...(await issueVerificationCode(user.id, user.email, user.fullName)) }; } catch (error) { rethrowDeliveryError(error); }
    }),
    login: publicProcedure.input(z.object({ email: z.string().email(), password: z.string().min(1) })).mutation(async ({ input, ctx }) => {
      const db = await getDb(); if (!db) fail("Database is not available");
      const user = (await db.select().from(users).where(eq(users.email, normalizeEmail(input.email))).limit(1))[0];
      if (!user || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) fail("Invalid email or password");
      if (!user.emailVerifiedAt) fail("Please verify your email before logging in");
      if (user.isSuspended) fail("This account is suspended");
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
      await createSession(user.id, ctx.res, ctx.req);
      return { ok: true, user: safeUser(user), isAdmin: await (await import("./permissions")).isAdmin(user.id) };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => { await destroySession(ctx.req, ctx.res); return { ok: true }; }),
    forgotPassword: publicProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) fail("Database is not available");
      const user = (await db.select().from(users).where(eq(users.email, normalizeEmail(input.email))).limit(1))[0];
      if (user) { try { await createResetToken(user.id, user.email, user.fullName); } catch (error) { if (error instanceof EmailDeliveryError) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "We couldn't send the reset email. Please try again shortly." }); throw error; } }
      return { ok: true, message: "If that email is registered, a reset link is on its way." };
    }),
    resetPassword: publicProcedure.input(z.object({ token: z.string().min(20), password: passwordSchema, confirmPassword: z.string() })).mutation(async ({ input }) => { if (input.password !== input.confirmPassword) fail("Passwords do not match"); await consumeResetToken(input.token, input.password); return { ok: true }; }),
  }),
  market: router({ ticker: publicProcedure.query(() => getMarketPrices()) }),
  currency: router({ rates: publicProcedure.query(() => getCurrencyRates()) }),
  plans: router({ list: publicProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select().from(plans).where(eq(plans.enabled, true)).orderBy(asc(plans.sortOrder)); }) }),
  dashboard: router({ overview: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) fail("Database is not available");
    const account = (await db.select().from(accounts).where(eq(accounts.userId, ctx.user.id)).limit(1))[0];
    const active = await db.select().from(investments).where(and(eq(investments.userId, ctx.user.id), eq(investments.status, "active")));
    const pending = await db.select().from(withdrawalRequests).where(and(eq(withdrawalRequests.userId, ctx.user.id), eq(withdrawalRequests.status, "pending")));
    const unread = (await db.select({ total: count() }).from(inboxMessages).where(and(eq(inboxMessages.userId, ctx.user.id), sql`${inboxMessages.readAt} IS NULL`)))[0]?.total ?? 0;
    return { balance: money(account?.availableBalance ?? 0), totalProfit: money(account?.totalProfit ?? 0), activeInvestments: active.length, pendingWithdrawals: pending.reduce((sum, item) => sum + money(item.amount), 0), unreadMessages: Number(unread) };
  }), cryptoChat: protectedProcedure.input(z.object({ language: z.enum(["en", "it", "de", "fr", "es", "bg"]).default("en"), messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) })).max(12) })).mutation(async ({ input }) => { const latest = input.messages.filter(message => message.role === "user").at(-1)?.content ?? ""; const prices = await getMarketPrices(); const btc = prices.find(item => item.symbol === "BTC")?.price ?? 0; return { role: "assistant" as const, content: cryptoChatReply(latest, input.language, btc) }; }) }),
  profile: router({
    update: protectedProcedure.input(z.object({ fullName: z.string().trim().min(2).max(160), phone: z.string().trim().min(5).max(40), country: z.string().trim().min(2).max(80) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) fail("Database is not available"); await db.update(users).set({ fullName: input.fullName, name: input.fullName, phone: input.phone, country: input.country }).where(eq(users.id, ctx.user.id)); return { ok: true }; }),
    changePassword: protectedProcedure.input(z.object({ currentPassword: z.string(), password: passwordSchema, confirmPassword: z.string() })).mutation(async ({ ctx, input }) => { if (input.password !== input.confirmPassword) fail("Passwords do not match"); if (!(await verifyPassword(input.currentPassword, ctx.user.passwordHash))) fail("Current password is incorrect"); const db = await getDb(); if (!db) fail("Database is not available"); await db.update(users).set({ passwordHash: await hashPassword(input.password) }).where(eq(users.id, ctx.user.id)); return { ok: true }; }),
  }),
  deposits: router({
    wallets: protectedProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select().from(wallets).where(eq(wallets.enabled, true)).orderBy(asc(wallets.sortOrder), desc(wallets.createdAt)); }),
    mine: protectedProcedure.query(async ({ ctx }) => { const db = await getDb(); if (!db) return []; return db.select().from(depositRequests).where(eq(depositRequests.userId, ctx.user.id)).orderBy(desc(depositRequests.createdAt)); }),
    create: protectedProcedure.input(z.object({ walletId: z.number().int().positive(), amount: amountSchema, transactionId: z.string().trim().min(6).max(255) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) fail("Database is not available");
      const wallet = (await db.select().from(wallets).where(and(eq(wallets.id, input.walletId), eq(wallets.enabled, true))).limit(1))[0];
      if (!wallet) fail("That deposit address is no longer active", "NOT_FOUND");
      await db.insert(depositRequests).values({ userId: ctx.user.id, walletId: wallet.id, coin: wallet.coin, network: wallet.network, walletAddress: wallet.address, amount: input.amount.toFixed(8), transactionId: input.transactionId });
      return { ok: true };
    }),
  }),
  investments: router({
    mine: protectedProcedure.query(async ({ ctx }) => { const db = await getDb(); if (!db) return []; return db.select({ investment: investments, plan: plans }).from(investments).innerJoin(plans, eq(investments.planId, plans.id)).where(eq(investments.userId, ctx.user.id)).orderBy(desc(investments.createdAt)); }),
    create: protectedProcedure.input(z.object({ planId: z.number().int().positive(), amount: amountSchema })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) fail("Database is not available");
      const plan = (await db.select().from(plans).where(and(eq(plans.id, input.planId), eq(plans.enabled, true))).limit(1))[0];
      if (!plan) fail("Plan not found", "NOT_FOUND");
      const min = money(plan.minAmount), max = money(plan.maxAmount);
      if (input.amount < min || input.amount > max) fail(`Amount must be between $${min.toLocaleString()} and $${max.toLocaleString()}`);
      const account = (await db.select().from(accounts).where(eq(accounts.userId, ctx.user.id)).limit(1))[0];
      if (!account || money(account.availableBalance) < input.amount) fail("Insufficient available balance");
      const profit = input.amount * money(plan.roiPercent) / 100;
      const endsAt = new Date(Date.now() + plan.durationDays * 86400000);
      await changeBalance({ userId: ctx.user.id, amount: input.amount, direction: "debit", type: "investment", note: `${plan.name} investment` });
      await db.insert(investments).values({ userId: ctx.user.id, planId: plan.id, principal: input.amount.toFixed(8), expectedProfit: profit.toFixed(8), endsAt });
      return { ok: true };
    }),
  }),
  withdrawals: router({
    mine: protectedProcedure.query(async ({ ctx }) => { const db = await getDb(); if (!db) return []; return db.select({ id: withdrawalRequests.id, userId: withdrawalRequests.userId, method: withdrawalRequests.method, coin: withdrawalRequests.coin, network: withdrawalRequests.network, walletAddress: withdrawalRequests.walletAddress, accountHolderName: withdrawalRequests.accountHolderName, bankName: withdrawalRequests.bankName, bankCountry: withdrawalRequests.bankCountry, amount: withdrawalRequests.amount, status: withdrawalRequests.status, reviewReason: withdrawalRequests.reviewReason, createdAt: withdrawalRequests.createdAt }).from(withdrawalRequests).where(eq(withdrawalRequests.userId, ctx.user.id)).orderBy(desc(withdrawalRequests.createdAt)); }),
    create: protectedProcedure.input(withdrawalInputSchema).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) fail("Database is not available");
      const account = (await db.select().from(accounts).where(eq(accounts.userId, ctx.user.id)).limit(1))[0];
      if (!account || money(account.availableBalance) < input.amount) fail("Insufficient available balance");
      if (input.method === "crypto") {
        await db.insert(withdrawalRequests).values({ userId: ctx.user.id, method: "crypto", coin: input.coin.toUpperCase(), network: input.network, walletAddress: input.walletAddress, amount: input.amount.toFixed(8), withdrawalNote: input.withdrawalNote });
      } else {
        await db.insert(withdrawalRequests).values({ userId: ctx.user.id, method: "bank", accountHolderName: input.accountHolderName, bankName: input.bankName, accountNumberIban: input.accountNumberIban, swiftBic: input.swiftBic, bankCountry: input.bankCountry, amount: input.amount.toFixed(8), withdrawalNote: input.withdrawalNote });
      }
      return { ok: true };
    }),
  }),
  transactions: router({ mine: protectedProcedure.query(async ({ ctx }) => { const db = await getDb(); if (!db) return []; return db.select().from(transactions).where(eq(transactions.userId, ctx.user.id)).orderBy(desc(transactions.createdAt)).limit(100); }) }),
  inbox: router({
    list: protectedProcedure.query(async ({ ctx }) => { const db = await getDb(); if (!db) return []; return db.select().from(inboxMessages).where(eq(inboxMessages.userId, ctx.user.id)).orderBy(desc(inboxMessages.createdAt)).limit(100); }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => { const db = await getDb(); if (!db) return 0; return Number((await db.select({ total: count() }).from(inboxMessages).where(and(eq(inboxMessages.userId, ctx.user.id), sql`${inboxMessages.readAt} IS NULL`)))[0]?.total ?? 0); }),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) fail("Database is not available"); await db.update(inboxMessages).set({ readAt: new Date() }).where(and(eq(inboxMessages.id, input.id), eq(inboxMessages.userId, ctx.user.id))); return { ok: true }; }),
  }),
  admin: router({
    dashboard: router({ stats: adminProcedure.query(async () => { const db = await getDb(); if (!db) return { users: 0, deposits: 0, pendingWithdrawals: 0, balances: 0 }; const userCount = Number((await db.select({ total: count() }).from(users))[0]?.total ?? 0); const approvedDeposits = await db.select().from(depositRequests).where(eq(depositRequests.status, "approved")); const pending = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.status, "pending")); const balances = await db.select().from(accounts); return { users: userCount, deposits: approvedDeposits.reduce((sum, item) => sum + money(item.amount), 0), pendingWithdrawals: pending.reduce((sum, item) => sum + money(item.amount), 0), balances: balances.reduce((sum, item) => sum + money(item.availableBalance), 0) }; }) }),
    users: router({
      list: adminProcedure.input(z.object({ search: z.string().trim().max(100).optional() }).optional()).query(async ({ input }) => { const db = await getDb(); if (!db) return []; const search = input?.search ? `%${input.search}%` : undefined; const rows = search ? await db.select().from(users).where(or(like(users.fullName, search), like(users.email, search))).orderBy(desc(users.createdAt)).limit(100) : await db.select().from(users).orderBy(desc(users.createdAt)).limit(100); const roleRows = await db.select().from(roles); return rows.map(user => ({ ...safeUser(user), roles: roleRows.filter(role => role.userId === user.id).map(role => role.role) })); }),
      setStatus: adminProcedure.input(z.object({ userId: z.number().int().positive(), suspended: z.boolean() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) fail("Database is not available"); await db.update(users).set({ isSuspended: input.suspended }).where(eq(users.id, input.userId)); await logAdminAction({ adminUserId: ctx.user.id, action: input.suspended ? "suspend_user" : "activate_user", targetType: "user", targetId: input.userId, targetUserId: input.userId }); return { ok: true }; }),
      softDelete: adminProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (input.userId === ctx.user.id) fail("You cannot delete your own admin account"); const db = await getDb(); if (!db) fail("Database is not available"); await db.update(users).set({ isSuspended: true, fullName: "Deleted user", name: "Deleted user", phone: "", country: "" }).where(eq(users.id, input.userId)); await logAdminAction({ adminUserId: ctx.user.id, action: "delete_user", targetType: "user", targetId: input.userId, targetUserId: input.userId }); return { ok: true }; }),
      adjustBalance: adminProcedure.input(z.object({ userId: z.number().int().positive(), direction: z.enum(["credit", "debit"]), amount: amountSchema, note: reasonSchema })).mutation(async ({ ctx, input }) => { const result = await changeBalance({ userId: input.userId, amount: input.amount, direction: input.direction, type: input.direction, note: input.note, actorId: ctx.user.id }); await logAdminAction({ adminUserId: ctx.user.id, action: input.direction === "credit" ? "credit_balance" : "debit_balance", targetType: "user", targetId: input.userId, targetUserId: input.userId, metadata: { amount: input.amount, newBalance: result.after, note: input.note } }); const db = await getDb(); const user = db ? (await db.select().from(users).where(eq(users.id, input.userId)).limit(1))[0] : undefined; if (user) await notifyUser({ userId: user.id, recipient: user.email, eventType: input.direction === "credit" ? "admin_credit" : "admin_debit", subject: `Vaultora balance ${input.direction}`, text: input.direction === "credit" ? `Your account was credited with $${input.amount.toFixed(2)}. New balance: $${result.after.toFixed(2)}.` : `Your balance was debited by $${input.amount.toFixed(2)}. New balance: $${result.after.toFixed(2)}. Note: ${input.note}`, category: "balance" }); return { ok: true, newBalance: result.after }; }),
      setAdmin: adminProcedure.input(z.object({ userId: z.number().int().positive(), enabled: z.boolean() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) fail("Database is not available"); if (input.enabled) await ensureRole(input.userId, "admin"); else await db.delete(roles).where(and(eq(roles.userId, input.userId), eq(roles.role, "admin"))); await logAdminAction({ adminUserId: ctx.user.id, action: input.enabled ? "promote_admin" : "remove_admin", targetType: "user", targetId: input.userId, targetUserId: input.userId }); return { ok: true }; }),
    }),
    deposits: router({
      list: adminProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select({ request: depositRequests, user: users }).from(depositRequests).innerJoin(users, eq(depositRequests.userId, users.id)).orderBy(desc(depositRequests.createdAt)).limit(100); }),
      review: adminProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reason: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) fail("Database is not available"); const row = (await db.select({ request: depositRequests, user: users }).from(depositRequests).innerJoin(users, eq(depositRequests.userId, users.id)).where(eq(depositRequests.id, input.id)).limit(1))[0]; if (!row) fail("Deposit not found", "NOT_FOUND"); if (row.request.status !== "pending") fail("This deposit has already been reviewed", "CONFLICT"); if (input.decision === "approved") await changeBalance({ userId: row.request.userId, amount: money(row.request.amount), direction: "credit", type: "deposit", note: `Deposit ${row.request.transactionId}`, referenceType: "deposit", referenceId: row.request.id, actorId: ctx.user.id }); await db.update(depositRequests).set({ status: input.decision, reviewReason: input.reason, reviewedBy: ctx.user.id, reviewedAt: new Date() }).where(eq(depositRequests.id, input.id)); await logAdminAction({ adminUserId: ctx.user.id, action: `deposit_${input.decision}`, targetType: "deposit", targetId: input.id, targetUserId: row.request.userId, metadata: { reason: input.reason } }); await notifyUser({ userId: row.user.id, recipient: row.user.email, eventType: `deposit_${input.decision}`, subject: `Deposit ${input.decision}`, text: `Your deposit of $${money(row.request.amount).toFixed(2)} was ${input.decision}.${input.reason ? ` Reason: ${input.reason}` : ""}`, category: "deposit", relatedType: "deposit", relatedId: input.id }); return { ok: true }; }),
    }),
    withdrawals: router({
      list: adminProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select({ request: withdrawalRequests, user: users }).from(withdrawalRequests).innerJoin(users, eq(withdrawalRequests.userId, users.id)).orderBy(desc(withdrawalRequests.createdAt)).limit(100); }),
      review: adminProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reason: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) fail("Database is not available"); const row = (await db.select({ request: withdrawalRequests, user: users }).from(withdrawalRequests).innerJoin(users, eq(withdrawalRequests.userId, users.id)).where(eq(withdrawalRequests.id, input.id)).limit(1))[0]; if (!row) fail("Withdrawal not found", "NOT_FOUND"); if (row.request.status !== "pending") fail("This withdrawal has already been reviewed", "CONFLICT"); if (input.decision === "approved") await changeBalance({ userId: row.request.userId, amount: money(row.request.amount), direction: "debit", type: "withdrawal", note: row.request.method === "bank" ? "Bank withdrawal" : `Withdrawal to ${row.request.walletAddress ?? "crypto wallet"}`, referenceType: "withdrawal", referenceId: row.request.id, actorId: ctx.user.id }); await db.update(withdrawalRequests).set({ status: input.decision, reviewReason: input.reason, reviewedBy: ctx.user.id, reviewedAt: new Date() }).where(eq(withdrawalRequests.id, input.id)); await logAdminAction({ adminUserId: ctx.user.id, action: `withdrawal_${input.decision}`, targetType: "withdrawal", targetId: input.id, targetUserId: row.request.userId, metadata: { reason: input.reason, method: row.request.method } }); await notifyUser({ userId: row.user.id, recipient: row.user.email, eventType: `withdrawal_${input.decision}`, subject: `${row.request.method === "bank" ? "Bank" : "Crypto"} withdrawal ${input.decision}`, text: `Your ${row.request.method === "bank" ? "bank" : "crypto"} withdrawal of $${money(row.request.amount).toFixed(2)} was ${input.decision}.${input.reason ? ` Reason: ${input.reason}` : ""}`, category: "withdrawal", relatedType: "withdrawal", relatedId: input.id }); return { ok: true }; }),
    }),
    wallets: router({
      list: adminProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select().from(wallets).orderBy(asc(wallets.coin), asc(wallets.network), asc(wallets.sortOrder), desc(wallets.createdAt)); }),
      create: adminProcedure.input(z.object({ coin: z.string().trim().min(2).max(20), network: z.string().trim().min(2).max(40), address: z.string().trim().min(8).max(255), label: z.string().trim().max(120).optional(), enabled: z.boolean().default(true), sortOrder: z.number().int().min(0).default(0) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) fail("Database is not available"); const inserted = await db.insert(wallets).values({ coin: input.coin.toUpperCase(), network: input.network, address: input.address, label: input.label, enabled: input.enabled, sortOrder: input.sortOrder, createdBy: ctx.user.id, updatedBy: ctx.user.id }); await logAdminAction({ adminUserId: ctx.user.id, action: "create_wallet", targetType: "wallet", targetId: Number(inserted[0].insertId), metadata: { coin: input.coin, network: input.network, address: input.address } }); return { ok: true }; }),
      update: adminProcedure.input(z.object({ id: z.number().int().positive(), coin: z.string().trim().min(2).max(20), network: z.string().trim().min(2).max(40), address: z.string().trim().min(8).max(255), label: z.string().trim().max(120).optional(), enabled: z.boolean(), sortOrder: z.number().int().min(0) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) fail("Database is not available"); await db.update(wallets).set({ coin: input.coin.toUpperCase(), network: input.network, address: input.address, label: input.label, enabled: input.enabled, sortOrder: input.sortOrder, updatedBy: ctx.user.id }).where(eq(wallets.id, input.id)); await logAdminAction({ adminUserId: ctx.user.id, action: "update_wallet", targetType: "wallet", targetId: input.id, metadata: { coin: input.coin, network: input.network, enabled: input.enabled } }); return { ok: true }; }),
      toggle: adminProcedure.input(z.object({ id: z.number().int().positive(), enabled: z.boolean() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) fail("Database is not available"); await db.update(wallets).set({ enabled: input.enabled, updatedBy: ctx.user.id }).where(eq(wallets.id, input.id)); await logAdminAction({ adminUserId: ctx.user.id, action: input.enabled ? "enable_wallet" : "disable_wallet", targetType: "wallet", targetId: input.id }); return { ok: true }; }),
    }),
    email: router({
      recipients: adminProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select({ id: users.id, fullName: users.fullName, email: users.email, isSuspended: users.isSuspended }).from(users).where(eq(users.isSuspended, false)).orderBy(asc(users.fullName)); }),
      history: adminProcedure.query(async () => { const db = await getDb(); if (!db) return []; const logs = await db.select().from(emailLogs).where(eq(emailLogs.eventType, "admin_bulk_email")).orderBy(desc(emailLogs.createdAt)).limit(200); const people = await db.select({ id: users.id, fullName: users.fullName, email: users.email }).from(users); return logs.map(log => ({ ...log, recipientUser: people.find(person => person.id === log.userId) ?? null, adminUser: people.find(person => person.id === log.adminUserId) ?? null })); }),
      send: adminProcedure.input(z.object({ userIds: z.array(z.number().int().positive()).min(1, "Select at least one recipient").max(250, "Send in batches of 250 recipients or fewer"), subject: z.string().trim().min(3).max(180), body: z.string().trim().min(2).max(10000) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) fail("Database is not available"); const since = new Date(Date.now() - 5 * 60_000); const recent = Number((await db.select({ total: count() }).from(emailLogs).where(and(eq(emailLogs.adminUserId, ctx.user.id), eq(emailLogs.eventType, "admin_bulk_email"), gte(emailLogs.createdAt, since))))[0]?.total ?? 0); if (recent >= 250) fail("Email sending is temporarily rate-limited. Please wait a few minutes and try again."); const uniqueIds = [...new Set(input.userIds)]; const recipients = await db.select().from(users).where(and(or(...uniqueIds.map(id => eq(users.id, id))), eq(users.isSuspended, false))); if (recipients.length !== uniqueIds.length) fail("One or more selected recipients are unavailable"); let sent = 0; let inboxOnly = 0; let failed = 0; for (const recipient of recipients) { const result = await notifyUser({ userId: recipient.id, adminUserId: ctx.user.id, recipient: recipient.email, eventType: "admin_bulk_email", subject: input.subject, text: input.body, category: "direct" }); if (result.status === "sent") sent += 1; else if (result.status === "inbox_only") inboxOnly += 1; else failed += 1; } await logAdminAction({ adminUserId: ctx.user.id, action: "send_bulk_email", targetType: "email", metadata: { recipientCount: recipients.length, subject: input.subject, sent, inboxOnly, failed } }); return { ok: true, recipientCount: recipients.length, sent, inboxOnly, failed, emailConfigured: failed === 0 && inboxOnly === 0 }; }),
    }),
    messages: router({ send: adminProcedure.input(z.object({ userId: z.number().int().positive(), subject: z.string().trim().min(2).max(180), body: z.string().trim().min(2).max(5000) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) fail("Database is not available"); const user = (await db.select().from(users).where(eq(users.id, input.userId)).limit(1))[0]; if (!user) fail("User not found", "NOT_FOUND"); const notification = await notifyUser({ userId: user.id, recipient: user.email, eventType: "admin_direct_message", adminUserId: ctx.user.id, subject: input.subject, text: input.body, category: "direct" }); await logAdminAction({ adminUserId: ctx.user.id, action: "send_message", targetType: "user", targetId: user.id, targetUserId: user.id, metadata: { subject: input.subject, emailStatus: notification.status } }); return { ok: true, emailStatus: notification.status }; }) }),
    activity: router({ list: adminProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select().from(adminActivityLogs).orderBy(desc(adminActivityLogs.createdAt)).limit(200); }) }),
  }),
});

export type AppRouter = typeof appRouter;
