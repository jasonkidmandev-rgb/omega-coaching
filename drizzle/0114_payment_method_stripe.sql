-- Migration 0114: Fix client_protocols.paymentMethod enum
-- 1. Add 'stripe' as a valid payment method
-- 2. Change default from 'venmo' to NULL (new protocols no longer default to Venmo)
ALTER TABLE `client_protocols`
  MODIFY COLUMN `paymentMethod` ENUM('venmo','cc','stripe','other','paypal') DEFAULT NULL;
