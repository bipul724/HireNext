-- Run this in your Supabase SQL Editor

-- 1. InterviewEvents
CREATE TABLE "InterviewEvents" (
    "id" UUID PRIMARY KEY,
    "interviewId" UUID NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast timeline queries
CREATE INDEX "idx_interview_events_interview_id" ON "InterviewEvents"("interviewId", "createdAt");

-- 2. CodeSnapshots
CREATE TABLE "CodeSnapshots" (
    "id" UUID PRIMARY KEY,
    "interviewId" UUID NOT NULL,
    "userEmail" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for snapshot lookups
CREATE INDEX "idx_code_snapshots_interview_id" ON "CodeSnapshots"("interviewId", "createdAt");
