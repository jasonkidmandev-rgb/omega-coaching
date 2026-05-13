-- Add tier field to transformation_access_codes table
ALTER TABLE `transformation_access_codes` MODIFY COLUMN `tier` enum('elite','flagship','essentials');

-- Add tier field to transformation_enrollments table (already exists but ensure it's correct)
-- No changes needed if already exists
