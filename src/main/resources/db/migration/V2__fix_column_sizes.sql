-- Fix transaction_type column to accommodate TRANSFER_OUT (12 chars)
ALTER TABLE transactions ALTER COLUMN transaction_type TYPE VARCHAR(20);

-- Fix entry_type column on ledger_entries as well
ALTER TABLE ledger_entries ALTER COLUMN entry_type TYPE VARCHAR(20);
