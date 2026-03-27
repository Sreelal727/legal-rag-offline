-- AlterTable
ALTER TABLE "Notice" ADD COLUMN "noticeType" TEXT;

-- CreateTable
CREATE TABLE "NoticeRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noticeId" TEXT NOT NULL,
    "oppositePartyId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "recipientCity" TEXT,
    "recipientState" TEXT,
    "recipientPincode" TEXT,
    "deliveryMethod" TEXT NOT NULL DEFAULT 'REGISTERED_POST',
    "trackingNumber" TEXT,
    "sentDate" DATETIME,
    "deliveredDate" DATETIME,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "adCardUrl" TEXT,
    "receiptUrl" TEXT,
    "returnReason" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NoticeRecipient_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoticeRecipient_oppositePartyId_fkey" FOREIGN KEY ("oppositePartyId") REFERENCES "OppositeParty" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoticeReply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noticeId" TEXT NOT NULL,
    "recipientId" TEXT,
    "replyDate" DATETIME NOT NULL,
    "replyContent" TEXT,
    "documentPath" TEXT,
    "documentName" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NoticeReply_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoticeReply_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "NoticeRecipient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
