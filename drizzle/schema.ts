import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).default("").notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }).default("password").notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  fullName: varchar("fullName", { length: 160 }).default("").notNull(),
  phone: varchar("phone", { length: 40 }).default("").notNull(),
  country: varchar("country", { length: 80 }).default("").notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).default("").notNull(),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  isSuspended: boolean("isSuspended").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
}, table => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
  suspendedIdx: index("users_suspended_idx").on(table.isSuspended),
}));

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["user", "admin"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userRoleIdx: uniqueIndex("roles_user_role_idx").on(table.userId, table.role),
  roleIdx: index("roles_role_idx").on(table.role),
}));

export const accounts = mysqlTable("accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  availableBalance: decimal("availableBalance", { precision: 24, scale: 8 }).default("0.00000000").notNull(),
  totalProfit: decimal("totalProfit", { precision: 24, scale: 8 }).default("0.00000000").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userIdx: uniqueIndex("accounts_user_idx").on(table.userId) }));

export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  tokenIdx: uniqueIndex("sessions_token_idx").on(table.tokenHash),
  userIdx: index("sessions_user_idx").on(table.userId),
}));

export const verificationCodes = mysqlTable("verificationCodes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeHash: varchar("codeHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  attempts: int("attempts").default(0).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
}, table => ({ userIdx: index("verification_user_idx").on(table.userId, table.expiresAt) }));

export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  tokenIdx: uniqueIndex("password_reset_token_idx").on(table.tokenHash),
  userIdx: index("password_reset_user_idx").on(table.userId),
}));

export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 40 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  roiPercent: decimal("roiPercent", { precision: 8, scale: 2 }).notNull(),
  durationDays: int("durationDays").notNull(),
  minAmount: decimal("minAmount", { precision: 24, scale: 8 }).notNull(),
  maxAmount: decimal("maxAmount", { precision: 24, scale: 8 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  slugIdx: uniqueIndex("plans_slug_idx").on(table.slug),
  enabledIdx: index("plans_enabled_idx").on(table.enabled),
}));

export const investments = mysqlTable("investments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: int("planId").notNull().references(() => plans.id),
  principal: decimal("principal", { precision: 24, scale: 8 }).notNull(),
  expectedProfit: decimal("expectedProfit", { precision: 24, scale: 8 }).notNull(),
  status: mysqlEnum("status", ["active", "completed", "cancelled"]).default("active").notNull(),
  startsAt: timestamp("startsAt").defaultNow().notNull(),
  endsAt: timestamp("endsAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userIdx: index("investments_user_idx").on(table.userId),
  statusIdx: index("investments_status_idx").on(table.status),
}));

export const wallets = mysqlTable("wallets", {
  id: int("id").autoincrement().primaryKey(),
  coin: varchar("coin", { length: 20 }).notNull(),
  network: varchar("network", { length: 40 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  label: varchar("label", { length: 120 }),
  enabled: boolean("enabled").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdBy: int("createdBy").references(() => users.id),
  updatedBy: int("updatedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ coinIdx: index("wallets_coin_idx").on(table.coin, table.network, table.enabled) }));

export const depositRequests = mysqlTable("depositRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  walletId: int("walletId").references(() => wallets.id),
  coin: varchar("coin", { length: 20 }).notNull(),
  network: varchar("network", { length: 40 }).notNull(),
  walletAddress: varchar("walletAddress", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 24, scale: 8 }).notNull(),
  transactionId: varchar("transactionId", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewReason: text("reviewReason"),
  reviewedBy: int("reviewedBy").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  statusIdx: index("deposits_status_idx").on(table.status),
  userIdx: index("deposits_user_idx").on(table.userId),
}));

export const withdrawalRequests = mysqlTable("withdrawalRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  method: mysqlEnum("method", ["crypto", "bank"]).default("crypto").notNull(),
  coin: varchar("coin", { length: 20 }),
  network: varchar("network", { length: 40 }),
  walletAddress: varchar("walletAddress", { length: 255 }),
  accountHolderName: varchar("accountHolderName", { length: 160 }),
  bankName: varchar("bankName", { length: 160 }),
  accountNumberIban: varchar("accountNumberIban", { length: 120 }),
  swiftBic: varchar("swiftBic", { length: 40 }),
  bankCountry: varchar("bankCountry", { length: 80 }),
  withdrawalNote: varchar("withdrawalNote", { length: 500 }),
  amount: decimal("amount", { precision: 24, scale: 8 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewReason: text("reviewReason"),
  reviewedBy: int("reviewedBy").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  statusIdx: index("withdrawals_status_idx").on(table.status),
  userIdx: index("withdrawals_user_idx").on(table.userId),
}));

export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["deposit", "withdrawal", "investment", "credit", "debit", "profit", "refund"]).notNull(),
  direction: mysqlEnum("direction", ["credit", "debit"]).notNull(),
  amount: decimal("amount", { precision: 24, scale: 8 }).notNull(),
  balanceAfter: decimal("balanceAfter", { precision: 24, scale: 8 }).notNull(),
  referenceType: varchar("referenceType", { length: 60 }),
  referenceId: int("referenceId"),
  note: text("note"),
  actorId: int("actorId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userIdx: index("transactions_user_idx").on(table.userId, table.createdAt),
  typeIdx: index("transactions_type_idx").on(table.type),
}));

export const inboxMessages = mysqlTable("inboxMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: varchar("subject", { length: 180 }).notNull(),
  body: text("body").notNull(),
  category: mysqlEnum("category", ["security", "deposit", "withdrawal", "balance", "direct", "system"]).default("system").notNull(),
  relatedType: varchar("relatedType", { length: 60 }),
  relatedId: int("relatedId"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userIdx: index("inbox_user_idx").on(table.userId, table.createdAt),
  unreadIdx: index("inbox_unread_idx").on(table.userId, table.readAt),
}));

export const emailLogs = mysqlTable("emailLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  adminUserId: int("adminUserId").references(() => users.id, { onDelete: "set null" }),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  subject: varchar("subject", { length: 180 }).notNull(),
  status: mysqlEnum("status", ["queued", "sent", "failed", "skipped"]).default("queued").notNull(),
  providerId: varchar("providerId", { length: 255 }),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
}, table => ({
  recipientIdx: index("email_logs_recipient_idx").on(table.recipient),
  statusIdx: index("email_logs_status_idx").on(table.status),
}));

export const adminActivityLogs = mysqlTable("adminActivityLogs", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull().references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("targetType", { length: 60 }),
  targetId: int("targetId"),
  targetUserId: int("targetUserId").references(() => users.id),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  actionIdx: index("admin_activity_action_idx").on(table.action),
  createdIdx: index("admin_activity_created_idx").on(table.createdAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Plan = typeof plans.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type InboxMessage = typeof inboxMessages.$inferSelect;
