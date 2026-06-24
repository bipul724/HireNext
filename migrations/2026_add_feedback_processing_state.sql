-- Webhook-driven feedback generation: failure recovery + idempotency support.
-- Run in the Supabase SQL editor. All columns are additive & nullable, so the
-- existing frontend flow keeps working unchanged.

-- 1) Processing lifecycle for backend-generated feedback.
ALTER TABLE "interview-feedback"
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'completed';
  -- values: 'pending' | 'processing' | 'completed' | 'failed'

-- 2) Preserve the raw transcript so a failed generation can be retried later
--    without losing the interview.
ALTER TABLE "interview-feedback"
  ADD COLUMN IF NOT EXISTS transcript jsonb;

-- 3) Audit / dedup aid (the Vapi call this record was generated from).
ALTER TABLE "interview-feedback"
  ADD COLUMN IF NOT EXISTS vapi_call_id text;

-- 4) When backend processing finished (success or failure).
ALTER TABLE "interview-feedback"
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- 5) Idempotency / race protection — one interview attempt → one feedback row.
--    (Already added in a prior change; included here idempotently for safety.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_interview_feedback_interview_user'
  ) THEN
    ALTER TABLE "interview-feedback"
      ADD CONSTRAINT uq_interview_feedback_interview_user
      UNIQUE (interview_id, "userEmail");
  END IF;
END $$;
