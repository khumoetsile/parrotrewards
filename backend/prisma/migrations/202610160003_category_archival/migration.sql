-- Add reversible category removal; retain all existing records and relationships.
ALTER TABLE `MerchantCategory` ADD COLUMN `archivedAt` DATETIME(3) NULL;
