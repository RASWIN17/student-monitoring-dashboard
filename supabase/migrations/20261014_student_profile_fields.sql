-- ====================================================================
-- CodeTrack: Student Profile Fields & Classroom Matching Migration
-- Version: 20261014_student_profile_fields.sql
-- ====================================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS register_number TEXT NULL,
ADD COLUMN IF NOT EXISTS class_name TEXT NULL,
ADD COLUMN IF NOT EXISTS section TEXT NULL,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Create indexes for fast lookup and duplicate register number validation
CREATE INDEX IF NOT EXISTS idx_user_profiles_register_number ON public.user_profiles(register_number);
CREATE INDEX IF NOT EXISTS idx_user_profiles_class_section ON public.user_profiles(class_name, section);
