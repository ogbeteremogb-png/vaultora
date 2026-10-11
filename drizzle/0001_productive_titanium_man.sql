CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`availableBalance` decimal(24,8) NOT NULL DEFAULT '0.00000000',
	`totalProfit` decimal(24,8) NOT NULL DEFAULT '0.00000000',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_user_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `adminActivityLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`targetType` varchar(60),
	`targetId` int,
	`targetUserId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminActivityLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `depositRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`walletId` int,
	`coin` varchar(20) NOT NULL,
	`network` varchar(40) NOT NULL,
	`walletAddress` varchar(255) NOT NULL,
	`amount` decimal(24,8) NOT NULL,
	`transactionId` varchar(255) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewReason` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `depositRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`recipient` varchar(320) NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`subject` varchar(180) NOT NULL,
	`status` enum('queued','sent','failed','skipped') NOT NULL DEFAULT 'queued',
	`providerId` varchar(255),
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	CONSTRAINT `emailLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inboxMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subject` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`category` enum('security','deposit','withdrawal','balance','direct','system') NOT NULL DEFAULT 'system',
	`relatedType` varchar(60),
	`relatedId` int,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inboxMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int NOT NULL,
	`principal` decimal(24,8) NOT NULL,
	`expectedProfit` decimal(24,8) NOT NULL,
	`status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
	`startsAt` timestamp NOT NULL DEFAULT (now()),
	`endsAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `investments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `passwordResetTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passwordResetTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_token_idx` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(40) NOT NULL,
	`name` varchar(80) NOT NULL,
	`roiPercent` decimal(8,2) NOT NULL,
	`durationDays` int NOT NULL,
	`minAmount` decimal(24,8) NOT NULL,
	`maxAmount` decimal(24,8) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','admin') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_user_role_idx` UNIQUE(`userId`,`role`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_idx` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('deposit','withdrawal','investment','credit','debit','profit','refund') NOT NULL,
	`direction` enum('credit','debit') NOT NULL,
	`amount` decimal(24,8) NOT NULL,
	`balanceAfter` decimal(24,8) NOT NULL,
	`referenceType` varchar(60),
	`referenceId` int,
	`note` text,
	`actorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verificationCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`attempts` int NOT NULL DEFAULT 0,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verificationCodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coin` varchar(20) NOT NULL,
	`network` varchar(40) NOT NULL,
	`address` varchar(255) NOT NULL,
	`label` varchar(120),
	`enabled` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `withdrawalRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`coin` varchar(20) NOT NULL,
	`network` varchar(40) NOT NULL,
	`walletAddress` varchar(255) NOT NULL,
	`amount` decimal(24,8) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewReason` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `withdrawalRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) NOT NULL DEFAULT 'password';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `fullName` varchar(160) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(40) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `country` varchar(80) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `isSuspended` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_idx` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adminActivityLogs` ADD CONSTRAINT `adminActivityLogs_adminUserId_users_id_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adminActivityLogs` ADD CONSTRAINT `adminActivityLogs_targetUserId_users_id_fk` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `depositRequests` ADD CONSTRAINT `depositRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `depositRequests` ADD CONSTRAINT `depositRequests_walletId_wallets_id_fk` FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `depositRequests` ADD CONSTRAINT `depositRequests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emailLogs` ADD CONSTRAINT `emailLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inboxMessages` ADD CONSTRAINT `inboxMessages_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `investments` ADD CONSTRAINT `investments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `investments` ADD CONSTRAINT `investments_planId_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `passwordResetTokens` ADD CONSTRAINT `passwordResetTokens_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roles` ADD CONSTRAINT `roles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verificationCodes` ADD CONSTRAINT `verificationCodes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `withdrawalRequests` ADD CONSTRAINT `withdrawalRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `withdrawalRequests` ADD CONSTRAINT `withdrawalRequests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_activity_action_idx` ON `adminActivityLogs` (`action`);--> statement-breakpoint
CREATE INDEX `admin_activity_created_idx` ON `adminActivityLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `deposits_status_idx` ON `depositRequests` (`status`);--> statement-breakpoint
CREATE INDEX `deposits_user_idx` ON `depositRequests` (`userId`);--> statement-breakpoint
CREATE INDEX `email_logs_recipient_idx` ON `emailLogs` (`recipient`);--> statement-breakpoint
CREATE INDEX `email_logs_status_idx` ON `emailLogs` (`status`);--> statement-breakpoint
CREATE INDEX `inbox_user_idx` ON `inboxMessages` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `inbox_unread_idx` ON `inboxMessages` (`userId`,`readAt`);--> statement-breakpoint
CREATE INDEX `investments_user_idx` ON `investments` (`userId`);--> statement-breakpoint
CREATE INDEX `investments_status_idx` ON `investments` (`status`);--> statement-breakpoint
CREATE INDEX `password_reset_user_idx` ON `passwordResetTokens` (`userId`);--> statement-breakpoint
CREATE INDEX `plans_enabled_idx` ON `plans` (`enabled`);--> statement-breakpoint
CREATE INDEX `roles_role_idx` ON `roles` (`role`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `transactions_user_idx` ON `transactions` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `transactions_type_idx` ON `transactions` (`type`);--> statement-breakpoint
CREATE INDEX `verification_user_idx` ON `verificationCodes` (`userId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `wallets_coin_idx` ON `wallets` (`coin`,`network`,`enabled`);--> statement-breakpoint
CREATE INDEX `withdrawals_status_idx` ON `withdrawalRequests` (`status`);--> statement-breakpoint
CREATE INDEX `withdrawals_user_idx` ON `withdrawalRequests` (`userId`);--> statement-breakpoint
CREATE INDEX `users_suspended_idx` ON `users` (`isSuspended`);