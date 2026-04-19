-- DropForeignKey
ALTER TABLE "AiPendingAction" DROP CONSTRAINT "AiPendingAction_conversationId_fkey";

-- DropIndex
DROP INDEX "AiPendingAction_conversationId_expiresAt_idx";

-- DropIndex
DROP INDEX "AiPendingAction_conversationId_key";

-- DropTable
DROP TABLE "AiPendingAction";
