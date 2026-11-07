# Data Model Specification

## Prisma Schema Additions

```prisma
model JobStage {
  id                String   @id @default(uuid())
  jobId             String
  name              String
  description       String?
  format            String?  // NEW: free-text format (e.g. "Online", "Take-home test")
  estimatedDuration String?  // NEW: estimated duration (e.g. "45 minutes", "3 days")
  position          Int
  job               Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([jobId, position])
  @@index([jobId])
}

model JobNote {
  id        String   @id @default(uuid())
  jobId     String
  content   String
  position  Int
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([jobId, position])
  @@index([jobId])
}