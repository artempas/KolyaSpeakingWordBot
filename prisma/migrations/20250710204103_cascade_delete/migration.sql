-- DropForeignKey
ALTER TABLE "Word" DROP CONSTRAINT "Word_user_id_fkey";

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
