-- Migration 003: Add profileCompleted columns to transformation_enrollments
-- Run: node run-migration.mjs migrations/003_add_profile_completed.sql
--
-- These columns are in the Drizzle schema but were never included in a migration,
-- so the Railway DB does not have them. This causes getEnrollmentCompletionStats
-- to fail on every admin dashboard load.

ALTER TABLE transformation_enrollments
  ADD COLUMN profileCompleted TINYINT NOT NULL DEFAULT 0;

ALTER TABLE transformation_enrollments
  ADD COLUMN profileCompletedAt DATETIME NULL;
