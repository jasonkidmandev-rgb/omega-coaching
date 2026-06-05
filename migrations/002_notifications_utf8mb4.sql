-- Migration 002: Convert notifications table to utf8mb4
-- Run: node run-migration.mjs migrations/002_notifications_utf8mb4.sql
--
-- Allows emoji characters (💰 🛒 ✅ etc.) in notification titles and messages.
-- Safe to run on live data — only changes the character encoding, not the data.
-- Existing rows are converted automatically by MySQL.

ALTER TABLE notifications
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE email_tracking
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
