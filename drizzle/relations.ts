import { relations } from "drizzle-orm";
import { accounts, adminActivityLogs, depositRequests, emailLogs, inboxMessages, investments, passwordResetTokens, plans, roles, sessions, transactions, users, verificationCodes, wallets, withdrawalRequests } from "./schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  roles: many(roles),
  account: one(accounts),
  sessions: many(sessions),
  verificationCodes: many(verificationCodes),
  passwordResetTokens: many(passwordResetTokens),
  investments: many(investments),
  deposits: many(depositRequests),
  withdrawals: many(withdrawalRequests),
  transactions: many(transactions),
  inbox: many(inboxMessages),
  emailLogs: many(emailLogs),
  adminActions: many(adminActivityLogs),
}));

export const rolesRelations = relations(roles, ({ one }) => ({ user: one(users, { fields: [roles.userId], references: [users.id] }) }));
export const accountsRelations = relations(accounts, ({ one }) => ({ user: one(users, { fields: [accounts.userId], references: [users.id] }) }));
export const sessionsRelations = relations(sessions, ({ one }) => ({ user: one(users, { fields: [sessions.userId], references: [users.id] }) }));
export const verificationRelations = relations(verificationCodes, ({ one }) => ({ user: one(users, { fields: [verificationCodes.userId], references: [users.id] }) }));
export const resetRelations = relations(passwordResetTokens, ({ one }) => ({ user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }) }));
export const plansRelations = relations(plans, ({ many }) => ({ investments: many(investments) }));
export const investmentsRelations = relations(investments, ({ one }) => ({ user: one(users, { fields: [investments.userId], references: [users.id] }), plan: one(plans, { fields: [investments.planId], references: [plans.id] }) }));
export const walletsRelations = relations(wallets, ({ many, one }) => ({ createdByUser: one(users, { fields: [wallets.createdBy], references: [users.id] }), updatedByUser: one(users, { fields: [wallets.updatedBy], references: [users.id] }), deposits: many(depositRequests) }));
export const depositsRelations = relations(depositRequests, ({ one }) => ({ user: one(users, { fields: [depositRequests.userId], references: [users.id] }), wallet: one(wallets, { fields: [depositRequests.walletId], references: [wallets.id] }) }));
export const withdrawalsRelations = relations(withdrawalRequests, ({ one }) => ({ user: one(users, { fields: [withdrawalRequests.userId], references: [users.id] }) }));
export const transactionsRelations = relations(transactions, ({ one }) => ({ user: one(users, { fields: [transactions.userId], references: [users.id] }), actor: one(users, { fields: [transactions.actorId], references: [users.id] }) }));
export const inboxRelations = relations(inboxMessages, ({ one }) => ({ user: one(users, { fields: [inboxMessages.userId], references: [users.id] }) }));
export const emailRelations = relations(emailLogs, ({ one }) => ({ user: one(users, { fields: [emailLogs.userId], references: [users.id] }) }));
export const activityRelations = relations(adminActivityLogs, ({ one }) => ({ admin: one(users, { fields: [adminActivityLogs.adminUserId], references: [users.id] }), targetUser: one(users, { fields: [adminActivityLogs.targetUserId], references: [users.id] }) }));
