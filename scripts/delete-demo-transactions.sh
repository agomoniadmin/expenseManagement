#!/bin/bash
# Delete all transactions and accounts for the demo user
# Requires Docker to be running with the postgres container

set -e

DEMO_EMAIL="demo@expense.com"

echo ""
echo "🗑️  Delete Demo User Data (Transactions & Accounts)"
echo "================================================"
echo ""
echo "   User: $DEMO_EMAIL"
echo ""

# Check if Docker is running
if ! docker compose ps postgres 2>/dev/null | grep -q "Up"; then
  echo "❌ PostgreSQL container is not running"
  echo "   Run: docker compose up -d postgres"
  exit 1
fi

# Get the demo user ID and delete their transactions
echo "🔍 Finding demo user and transactions..."

RESULT=$(docker compose exec -T postgres psql -U expense_user -d expense_mgmt -t -c "
  SELECT id FROM users WHERE email = '$DEMO_EMAIL';
")

USER_ID=$(echo "$RESULT" | tr -d '[:space:]')

if [ -z "$USER_ID" ]; then
  echo "❌ Demo user not found: $DEMO_EMAIL"
  exit 1
fi

echo "   User ID: $USER_ID"

# Count accounts and transactions before deletion
ACCT_COUNT=$(docker compose exec -T postgres psql -U expense_user -d expense_mgmt -t -c "
  SELECT COUNT(*) FROM accounts WHERE user_id = '$USER_ID';
" | tr -d '[:space:]')

TXN_COUNT=$(docker compose exec -T postgres psql -U expense_user -d expense_mgmt -t -c "
  SELECT COUNT(*) FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = '$USER_ID');
" | tr -d '[:space:]')

echo "   Found $ACCT_COUNT accounts"
echo "   Found $TXN_COUNT transactions"

if [ "$TXN_COUNT" -eq 0 ] && [ "$ACCT_COUNT" -eq 0 ]; then
  echo ""
  echo "✅ No data to delete!"
  exit 0
fi

echo ""
echo "🗑️  Deleting transactions and accounts..."

# Delete in order: line_items -> ledger_entries -> domain_events -> transactions
docker compose exec -T postgres psql -U expense_user -d expense_mgmt -c "
  -- Get account IDs for this user
  WITH user_accounts AS (
    SELECT id FROM accounts WHERE user_id = '$USER_ID'
  ),
  user_transactions AS (
    SELECT id FROM transactions WHERE account_id IN (SELECT id FROM user_accounts)
  )
  -- Delete line items first
  DELETE FROM line_items WHERE transaction_id IN (SELECT id FROM user_transactions);

  -- Delete ledger entries
  DELETE FROM ledger_entries WHERE transaction_id IN (
    SELECT id FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = '$USER_ID')
  );

  -- Delete domain events (uses aggregate_id for transaction references)
  DELETE FROM domain_events WHERE aggregate_type = 'TRANSACTION' AND aggregate_id IN (
    SELECT id FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = '$USER_ID')
  );

  -- Delete transactions
  DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = '$USER_ID');

  -- Delete accounts
  DELETE FROM accounts WHERE user_id = '$USER_ID';
" > /dev/null

echo ""
echo "✅ Done!"
echo ""
echo "   Deleted: $TXN_COUNT transactions"
echo "   Deleted: $ACCT_COUNT accounts"
echo ""
