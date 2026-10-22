-- DropForeignKey
ALTER TABLE `Offer` DROP FOREIGN KEY `Offer_shopId_fkey`;

-- AlterTable
ALTER TABLE `Merchant` ADD COLUMN `categoryId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Offer` ADD COLUMN `categoryId` VARCHAR(191) NULL,
    ADD COLUMN `claimTtlHours` INTEGER NULL,
    ADD COLUMN `claimedCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `discountType` VARCHAR(191) NOT NULL DEFAULT 'NONE',
    ADD COLUMN `discountedPrice` DECIMAL(12, 2) NULL,
    ADD COLUMN `eventId` VARCHAR(191) NULL,
    ADD COLUMN `imageKey` VARCHAR(191) NOT NULL DEFAULT 'placeholder',
    ADD COLUMN `isDemo` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `merchantId` VARCHAR(191) NULL,
    ADD COLUMN `originalPrice` DECIMAL(12, 2) NULL,
    ADD COLUMN `perUserClaimLimit` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `productId` VARCHAR(191) NULL,
    ADD COLUMN `slug` VARCHAR(191) NULL,
    ADD COLUMN `startsAt` DATETIME(3) NULL,
    ADD COLUMN `status` ENUM('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN `terms` TEXT NULL,
    ADD COLUMN `totalClaimLimit` INTEGER NULL,
    MODIFY `shopId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `MerchantCategory` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MerchantCategory_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isDemo` BOOLEAN NOT NULL DEFAULT true,
    `startsAt` DATETIME(3) NULL,
    `venue` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `isDemo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromotionalCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `startsAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PromotionalCampaign_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralLink` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ReferralLink_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CampaignTouch` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `referralCode` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CampaignTouch_userId_campaignId_referralCode_key`(`userId`, `campaignId`, `referralCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OfferClaim` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `referralLinkId` VARCHAR(191) NULL,
    `status` ENUM('CLAIMED', 'REDEEMED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'CLAIMED',
    `titleSnapshot` VARCHAR(191) NOT NULL,
    `termsSnapshot` TEXT NOT NULL,
    `discountedPrice` DECIMAL(12, 2) NOT NULL,
    `originalPrice` DECIMAL(12, 2) NULL,
    `isDemo` BOOLEAN NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `requestHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OfferClaim_reference_key`(`reference`),
    INDEX `OfferClaim_offerId_userId_idx`(`offerId`, `userId`),
    INDEX `OfferClaim_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `OfferClaim_status_expiresAt_idx`(`status`, `expiresAt`),
    UNIQUE INDEX `OfferClaim_userId_idempotencyKey_key`(`userId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RedemptionRecord` (
    `id` VARCHAR(191) NOT NULL,
    `claimId` VARCHAR(191) NOT NULL,
    `verifiedById` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RedemptionRecord_claimId_key`(`claimId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Offer_slug_key` ON `Offer`(`slug`);

-- AddForeignKey
ALTER TABLE `Merchant` ADD CONSTRAINT `Merchant_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `MerchantCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `Shop`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `Merchant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `MerchantCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromotionalCampaign` ADD CONSTRAINT `PromotionalCampaign_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `Offer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralLink` ADD CONSTRAINT `ReferralLink_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `PromotionalCampaign`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignTouch` ADD CONSTRAINT `CampaignTouch_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignTouch` ADD CONSTRAINT `CampaignTouch_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `PromotionalCampaign`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferClaim` ADD CONSTRAINT `OfferClaim_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferClaim` ADD CONSTRAINT `OfferClaim_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `Offer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferClaim` ADD CONSTRAINT `OfferClaim_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `PromotionalCampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferClaim` ADD CONSTRAINT `OfferClaim_referralLinkId_fkey` FOREIGN KEY (`referralLinkId`) REFERENCES `ReferralLink`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RedemptionRecord` ADD CONSTRAINT `RedemptionRecord_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `OfferClaim`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RedemptionRecord` ADD CONSTRAINT `RedemptionRecord_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
