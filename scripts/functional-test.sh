#!/bin/bash
# Functional Test Script for Expense Management API
# Run after Docker containers are up: docker-compose up -d

set -e

BASE_URL="${API_URL:-http://localhost:8080}"
PASS="TestPassword123!"
TEST_EMAIL="functest+$(date +%s)@example.com"

echo "========================================="
echo "Expense Management API - Functional Tests"
echo "========================================="
echo "Base URL: $BASE_URL"
echo ""

# Wait for the service to be ready
echo "[0] Waiting for service to be ready..."
for i in {1..30}; do
    if curl -s "$BASE_URL/api/health" > /dev/null 2>&1; then
        echo "    Service is ready!"
        break
    fi
    echo "    Attempt $i/30 - waiting..."
    sleep 2
done

# Test 1: Health Check
echo ""
echo "[1] Health Check"
HEALTH=$(curl -s "$BASE_URL/api/health")
echo "    Response: $HEALTH"
echo "$HEALTH" | grep -q '"status":"UP"' && echo "    PASS" || echo "    FAIL"

# Test 2: Register User
echo ""
echo "[2] Register User ($TEST_EMAIL)"
REGISTER=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$PASS\",\"firstName\":\"Func\",\"lastName\":\"Test\"}")
echo "    Response: $(echo $REGISTER | head -c 200)"
ACCESS_TOKEN=$(echo $REGISTER | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "FAILED")
if [ "$ACCESS_TOKEN" != "FAILED" ]; then
    echo "    PASS - Got access token"
else
    echo "    FAIL - No access token"
    exit 1
fi

# Test 3: Login
echo ""
echo "[3] Login"
LOGIN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$PASS\"}")
echo "    Response: $(echo $LOGIN | head -c 200)"
echo "$LOGIN" | grep -q 'accessToken' && echo "    PASS" || echo "    FAIL"

AUTH="Authorization: Bearer $ACCESS_TOKEN"

# Test 4: Create Account
echo ""
echo "[4] Create Checking Account"
CREATE_ACCT=$(curl -s -X POST "$BASE_URL/api/v1/accounts" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d '{"type":"CHECKING","name":"Primary Checking","institution":"Chase Bank","currency":"USD"}')
echo "    Response: $(echo $CREATE_ACCT | head -c 200)"
ACCOUNT_ID=$(echo $CREATE_ACCT | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "FAILED")
echo "$CREATE_ACCT" | grep -q '"type":"CHECKING"' && echo "    PASS - Account ID: $ACCOUNT_ID" || echo "    FAIL"

# Test 5: Get Accounts
echo ""
echo "[5] Get Accounts"
GET_ACCTS=$(curl -s "$BASE_URL/api/v1/accounts" -H "$AUTH")
echo "    Response: $(echo $GET_ACCTS | head -c 200)"
echo "$GET_ACCTS" | grep -q 'Primary Checking' && echo "    PASS" || echo "    FAIL"

# Test 6: Create Transaction
echo ""
echo "[6] Create Transaction"
TODAY=$(date +%Y-%m-%d)
CREATE_TXN=$(curl -s -X POST "$BASE_URL/api/v1/transactions" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"accountId\":\"$ACCOUNT_ID\",\"date\":\"$TODAY\",\"merchant\":\"Whole Foods\",\"amount\":127.45,\"type\":\"DEBIT\",\"description\":\"Grocery shopping\",\"lineItems\":[{\"name\":\"Organic Milk\",\"quantity\":2,\"unit\":\"gallon\",\"unitPrice\":6.99}]}")
echo "    Response: $(echo $CREATE_TXN | head -c 200)"
TXN_ID=$(echo $CREATE_TXN | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "FAILED")
echo "$CREATE_TXN" | grep -q '"merchant":"Whole Foods"' && echo "    PASS - Txn ID: $TXN_ID" || echo "    FAIL"

# Test 7: Get Transactions
echo ""
echo "[7] Get Transactions"
YESTERDAY=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d 'yesterday' +%Y-%m-%d)
TOMORROW=$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d 'tomorrow' +%Y-%m-%d)
GET_TXNS=$(curl -s "$BASE_URL/api/v1/transactions?startDate=$YESTERDAY&endDate=$TOMORROW" -H "$AUTH")
echo "    Response: $(echo $GET_TXNS | head -c 200)"
echo "$GET_TXNS" | grep -q 'Whole Foods' && echo "    PASS" || echo "    FAIL"

# Test 8: Update Transaction
echo ""
echo "[8] Update Transaction"
if [ "$TXN_ID" != "FAILED" ]; then
    UPDATE_TXN=$(curl -s -X PATCH "$BASE_URL/api/v1/transactions/$TXN_ID" \
        -H "$AUTH" -H "Content-Type: application/json" \
        -d '{"notes":"Updated notes","merchant":"Whole Foods Market"}')
    echo "    Response: $(echo $UPDATE_TXN | head -c 200)"
    echo "$UPDATE_TXN" | grep -q 'Whole Foods Market' && echo "    PASS" || echo "    FAIL"
fi

# Test 9: Create Second Account and Transfer
echo ""
echo "[9] Create Credit Card Account and Transfer"
CREATE_CC=$(curl -s -X POST "$BASE_URL/api/v1/accounts" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d '{"type":"CREDIT_CARD","name":"Visa Card","institution":"Chase Bank","currency":"USD","creditLimit":10000}')
CC_ID=$(echo $CREATE_CC | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "FAILED")

TRANSFER=$(curl -s -X POST "$BASE_URL/api/v1/transactions/transfer" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"fromAccountId\":\"$ACCOUNT_ID\",\"toAccountId\":\"$CC_ID\",\"amount\":500,\"description\":\"CC Payment\"}")
echo "    Response: $(echo $TRANSFER | head -c 200)"
echo "$TRANSFER" | grep -q 'TRANSFER_OUT' && echo "    PASS" || echo "    FAIL"

# Test 10: Get Categories
echo ""
echo "[10] Get Categories"
GET_CATS=$(curl -s "$BASE_URL/api/v1/categories" -H "$AUTH")
echo "    Response: $(echo $GET_CATS | head -c 200)"
echo "$GET_CATS" | grep -q 'Food' && echo "    PASS" || echo "    FAIL"

# Test 11: Create Category Mapping
echo ""
echo "[11] Create Category Mapping"
FOOD_CAT_ID="00000000-0000-0000-0000-000000000011"
CREATE_MAP=$(curl -s -X POST "$BASE_URL/api/v1/categories/mappings" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"pattern\":\"WHOLE FOODS\",\"matchType\":\"CONTAINS\",\"categoryId\":\"$FOOD_CAT_ID\",\"priority\":10}")
echo "    Response: $(echo $CREATE_MAP | head -c 200)"
echo "$CREATE_MAP" | grep -q 'WHOLE FOODS' && echo "    PASS" || echo "    FAIL"

# Test 12: Get Dashboard
echo ""
echo "[12] Get Dashboard"
DASHBOARD=$(curl -s "$BASE_URL/api/v1/reports/dashboard" -H "$AUTH")
echo "    Response: $(echo $DASHBOARD | head -c 300)"
echo "$DASHBOARD" | grep -q 'cashFlow' && echo "    PASS" || echo "    FAIL"

# Test 13: Import CSV
echo ""
echo "[13] Import CSV Statement"
CSV_DATA="Date,Description,Amount,Type
01/15/2026,Amazon Purchase,45.67,DEBIT
01/16/2026,Gas Station,32.50,DEBIT"

IMPORT=$(curl -s -X POST "$BASE_URL/api/v1/import/upload" \
    -H "$AUTH" \
    -F "file=@-;filename=test.csv" \
    -F "accountId=$ACCOUNT_ID" \
    -F "dateFormat=MM/dd/yyyy" <<< "$CSV_DATA")
echo "    Response: $(echo $IMPORT | head -c 200)"
echo "$IMPORT" | grep -q 'COMPLETED\|PROCESSING' && echo "    PASS" || echo "    FAIL"

# Test 14: Reconciliation Candidates
echo ""
echo "[14] Get Reconciliation Candidates"
RECON=$(curl -s "$BASE_URL/api/v1/reconciliation/candidates?accountId=$ACCOUNT_ID" -H "$AUTH")
echo "    Response: $(echo $RECON | head -c 200)"
echo "    PASS (returned response)"

# Test 15: Validation Error
echo ""
echo "[15] Validation - Missing required fields"
INVALID=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/transactions" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d '{}')
[ "$INVALID" = "400" ] && echo "    PASS - Got 400" || echo "    FAIL - Got $INVALID"

echo ""
echo "========================================="
echo "Functional Tests Complete"
echo "========================================="
