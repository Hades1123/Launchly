CREATE TYPE "AuthTokenPurpose" AS ENUM (
    'EMAIL_VERIFICATION',
    'PASSWORD_RESET',
    'GOOGLE_ACCOUNT_LINK'
);

ALTER TABLE "User"
    ALTER COLUMN "fullName" DROP NOT NULL,
    ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
    ADD COLUMN "lockedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_email_lower_key" ON "User"(LOWER("email"));

CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "providerSubject" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");
CREATE INDEX "AuthToken_userId_purpose_idx" ON "AuthToken"("userId", "purpose");
CREATE INDEX "AuthToken_expiresAt_idx" ON "AuthToken"("expiresAt");
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");
CREATE INDEX "AuthSession_userId_revokedAt_idx" ON "AuthSession"("userId", "revokedAt");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

ALTER TABLE "AuthToken"
    ADD CONSTRAINT "AuthToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuthSession"
    ADD CONSTRAINT "AuthSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
