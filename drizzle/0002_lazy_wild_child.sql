ALTER TABLE `withdrawalRequests` MODIFY COLUMN `coin` varchar(20);--> statement-breakpoint
ALTER TABLE `withdrawalRequests` MODIFY COLUMN `network` varchar(40);--> statement-breakpoint
ALTER TABLE `withdrawalRequests` MODIFY COLUMN `walletAddress` varchar(255);--> statement-breakpoint
ALTER TABLE `withdrawalRequests` ADD `method` enum('crypto','bank') DEFAULT 'crypto' NOT NULL;--> statement-breakpoint
ALTER TABLE `withdrawalRequests` ADD `accountHolderName` varchar(160);--> statement-breakpoint
ALTER TABLE `withdrawalRequests` ADD `bankName` varchar(160);--> statement-breakpoint
ALTER TABLE `withdrawalRequests` ADD `accountNumberIban` varchar(120);--> statement-breakpoint
ALTER TABLE `withdrawalRequests` ADD `swiftBic` varchar(40);--> statement-breakpoint
ALTER TABLE `withdrawalRequests` ADD `bankCountry` varchar(80);--> statement-breakpoint
ALTER TABLE `withdrawalRequests` ADD `withdrawalNote` varchar(500);