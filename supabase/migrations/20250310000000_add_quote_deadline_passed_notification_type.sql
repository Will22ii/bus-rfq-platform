-- Add quote_deadline_passed to notification_type enum (per docs/15_notification_plan.md)
-- Run once. If enum already has the value, run manually: DO $$ BEGIN ALTER TYPE notification_type ADD VALUE 'quote_deadline_passed'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE notification_type ADD VALUE 'quote_deadline_passed';
