-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'SECURITY_ANALYST', 'DEVELOPER');

-- CreateEnum
CREATE TYPE "public"."SourceType" AS ENUM ('GITHUB_URL', 'GITLAB_URL', 'BITBUCKET_URL', 'FILE_UPLOAD', 'OTHER_GIT_URL');

-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."ScanStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ScanType" AS ENUM ('FULL', 'INCREMENTAL', 'TARGETED', 'QUICK');

-- CreateEnum
CREATE TYPE "public"."ScanDepth" AS ENUM ('BASIC', 'STANDARD', 'DEEP', 'COMPREHENSIVE');

-- CreateEnum
CREATE TYPE "public"."FindingStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "public"."Severity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."VulnerabilityType" AS ENUM ('SQL_INJECTION', 'NOSQL_INJECTION', 'COMMAND_INJECTION', 'LDAP_INJECTION', 'XPATH_INJECTION', 'XSS_REFLECTED', 'XSS_STORED', 'XSS_DOM', 'BROKEN_AUTHENTICATION', 'BROKEN_ACCESS_CONTROL', 'INSECURE_DIRECT_OBJECT_REFERENCES', 'CSRF', 'SENSITIVE_DATA_EXPOSURE', 'INFORMATION_DISCLOSURE', 'HARDCODED_SECRETS', 'HARDCODED_CREDENTIALS', 'WEAK_CRYPTOGRAPHY', 'INSECURE_RANDOM', 'WEAK_HASHING', 'SECURITY_MISCONFIGURATION', 'INSECURE_DEFAULTS', 'VULNERABLE_COMPONENTS', 'OUTDATED_DEPENDENCIES', 'INSECURE_DESERIALIZATION', 'PATH_TRAVERSAL', 'BUFFER_OVERFLOW', 'RACE_CONDITION', 'DENIAL_OF_SERVICE', 'INSUFFICIENT_LOGGING', 'SUSPICIOUS_PATTERN', 'POTENTIAL_BACKDOOR', 'INSECURE_CODING_PRACTICE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."AISuggestionType" AS ENUM ('VULNERABILITY_FIX', 'SECURITY_IMPROVEMENT', 'CODE_REFACTOR', 'DEPENDENCY_UPDATE', 'CONFIGURATION_CHANGE', 'ARCHITECTURE_CHANGE', 'BEST_PRACTICE', 'PERFORMANCE_FIX');

-- CreateEnum
CREATE TYPE "public"."SuggestionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."SuggestionEffort" AS ENUM ('TRIVIAL', 'EASY', 'MEDIUM', 'HARD', 'COMPLEX');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('PROJECT_UPLOADED', 'PROJECT_PROCESSED', 'PROJECT_FAILED', 'SCAN_STARTED', 'SCAN_COMPLETED', 'SCAN_FAILED', 'CRITICAL_VULNERABILITY_FOUND', 'HIGH_VULNERABILITY_FOUND', 'AI_SUGGESTION_AVAILABLE', 'PLAN_LIMIT_REACHED', 'PLAN_EXPIRING', 'WELCOME', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "role" "public"."UserRole" NOT NULL DEFAULT 'DEVELOPER',
    "planId" TEXT,
    "planStartedAt" TIMESTAMP(3),
    "planExpireAt" TIMESTAMP(3),
    "sessionToken" TEXT,
    "sessionExpire" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" MONEY NOT NULL,
    "scanLimit" INTEGER NOT NULL DEFAULT 0,
    "userLimit" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" "public"."SourceType" NOT NULL,
    "repoUrl" TEXT,
    "branch" TEXT DEFAULT 'main',
    "s3Bucket" TEXT,
    "s3KeyPrefix" TEXT,
    "language" TEXT,
    "framework" TEXT,
    "totalFiles" INTEGER DEFAULT 0,
    "totalLines" INTEGER DEFAULT 0,
    "status" "public"."ProjectStatus" NOT NULL DEFAULT 'PENDING',
    "statusMessage" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "lastScanAt" TIMESTAMP(3),
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."File" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "extension" TEXT,
    "s3Key" TEXT NOT NULL,
    "language" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "lineCount" INTEGER DEFAULT 0,
    "checksum" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Chunk" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "startLine" INTEGER NOT NULL,
    "endLine" INTEGER NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Scan" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "projectId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "public"."ScanStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "scanType" "public"."ScanType" NOT NULL DEFAULT 'FULL',
    "scanDepth" "public"."ScanDepth" NOT NULL DEFAULT 'STANDARD',
    "includeTests" BOOLEAN NOT NULL DEFAULT false,
    "aiModel" TEXT,
    "aiProvider" TEXT,
    "totalFindings" INTEGER NOT NULL DEFAULT 0,
    "criticalCount" INTEGER NOT NULL DEFAULT 0,
    "highCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "lowCount" INTEGER NOT NULL DEFAULT 0,
    "infoCount" INTEGER NOT NULL DEFAULT 0,
    "filesScanned" INTEGER NOT NULL DEFAULT 0,
    "linesScanned" INTEGER NOT NULL DEFAULT 0,
    "processingTime" INTEGER,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Finding" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "fileId" TEXT,
    "severity" "public"."Severity" NOT NULL,
    "type" "public"."VulnerabilityType" NOT NULL,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT,
    "filePath" TEXT,
    "startLine" INTEGER,
    "endLine" INTEGER,
    "columnStart" INTEGER,
    "columnEnd" INTEGER,
    "codeSnippet" TEXT,
    "context" TEXT,
    "aiConfidence" INTEGER NOT NULL DEFAULT 100,
    "aiReasoning" TEXT,
    "aiModel" TEXT,
    "cweId" TEXT,
    "owaspTop10" TEXT,
    "severity_score" DOUBLE PRECISION,
    "status" "public"."FindingStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "falsePositive" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AISuggestion" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "findingId" TEXT,
    "title" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "fixCode" TEXT,
    "category" "public"."AISuggestionType" NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 100,
    "aiModel" TEXT,
    "aiProvider" TEXT,
    "helpful" BOOLEAN,
    "implemented" BOOLEAN NOT NULL DEFAULT false,
    "implementedAt" TIMESTAMP(3),
    "priority" "public"."SuggestionPriority" NOT NULL DEFAULT 'MEDIUM',
    "effort" "public"."SuggestionEffort" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AISuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "priority" "public"."NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "projectId" TEXT,
    "scanId" TEXT,
    "findingId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "channels" TEXT[],
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_sessionToken_key" ON "public"."User"("sessionToken");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_planId_idx" ON "public"."User"("planId");

-- CreateIndex
CREATE INDEX "User_sessionToken_idx" ON "public"."User"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "public"."Plan"("name");

-- CreateIndex
CREATE INDEX "Plan_name_idx" ON "public"."Plan"("name");

-- CreateIndex
CREATE INDEX "Plan_isActive_idx" ON "public"."Plan"("isActive");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "public"."Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "public"."Project"("status");

-- CreateIndex
CREATE INDEX "Project_sourceType_idx" ON "public"."Project"("sourceType");

-- CreateIndex
CREATE INDEX "Project_language_idx" ON "public"."Project"("language");

-- CreateIndex
CREATE UNIQUE INDEX "File_s3Key_key" ON "public"."File"("s3Key");

-- CreateIndex
CREATE INDEX "File_projectId_idx" ON "public"."File"("projectId");

-- CreateIndex
CREATE INDEX "File_language_idx" ON "public"."File"("language");

-- CreateIndex
CREATE INDEX "File_extension_idx" ON "public"."File"("extension");

-- CreateIndex
CREATE INDEX "Chunk_fileId_idx" ON "public"."Chunk"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "Chunk_fileId_chunkIndex_key" ON "public"."Chunk"("fileId", "chunkIndex");

-- CreateIndex
CREATE INDEX "Scan_projectId_idx" ON "public"."Scan"("projectId");

-- CreateIndex
CREATE INDEX "Scan_userId_idx" ON "public"."Scan"("userId");

-- CreateIndex
CREATE INDEX "Scan_status_idx" ON "public"."Scan"("status");

-- CreateIndex
CREATE INDEX "Scan_startedAt_idx" ON "public"."Scan"("startedAt");

-- CreateIndex
CREATE INDEX "Finding_scanId_idx" ON "public"."Finding"("scanId");

-- CreateIndex
CREATE INDEX "Finding_fileId_idx" ON "public"."Finding"("fileId");

-- CreateIndex
CREATE INDEX "Finding_severity_idx" ON "public"."Finding"("severity");

-- CreateIndex
CREATE INDEX "Finding_type_idx" ON "public"."Finding"("type");

-- CreateIndex
CREATE INDEX "Finding_status_idx" ON "public"."Finding"("status");

-- CreateIndex
CREATE INDEX "Finding_falsePositive_idx" ON "public"."Finding"("falsePositive");

-- CreateIndex
CREATE INDEX "Finding_aiConfidence_idx" ON "public"."Finding"("aiConfidence");

-- CreateIndex
CREATE INDEX "AISuggestion_scanId_idx" ON "public"."AISuggestion"("scanId");

-- CreateIndex
CREATE INDEX "AISuggestion_findingId_idx" ON "public"."AISuggestion"("findingId");

-- CreateIndex
CREATE INDEX "AISuggestion_category_idx" ON "public"."AISuggestion"("category");

-- CreateIndex
CREATE INDEX "AISuggestion_priority_idx" ON "public"."AISuggestion"("priority");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "public"."Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "public"."Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "public"."Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_priority_idx" ON "public"."Notification"("priority");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Chunk" ADD CONSTRAINT "Chunk_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Scan" ADD CONSTRAINT "Scan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Scan" ADD CONSTRAINT "Scan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Finding" ADD CONSTRAINT "Finding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "public"."Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Finding" ADD CONSTRAINT "Finding_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AISuggestion" ADD CONSTRAINT "AISuggestion_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "public"."Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AISuggestion" ADD CONSTRAINT "AISuggestion_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "public"."Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
