#!/bin/bash
# Setup demo data for expense management application
# Creates a demo user with realistic accounts and transactions

set -e

API_BASE="${API_BASE:-http://localhost:8080/api/v1}"
DEMO_EMAIL="demo@expense.com"
DEMO_PASSWORD="expenseuser_1"
DEMO_FIRST_NAME="Demo"
DEMO_LAST_NAME="User"

# Check for --delete flag
DELETE_ONLY=false
if [[ "$1" == "--delete" || "$1" == "-d" ]]; then
  DELETE_ONLY=true
fi

echo ""
echo "🚀 Expense Management Demo Data Setup"
echo "================================================"
echo ""
echo "   API:      $API_BASE"
echo "   Email:    $DEMO_EMAIL"
echo "   Password: $DEMO_PASSWORD"
echo ""

# ============================================================================
# Helper function for authenticated API calls
# ============================================================================
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ -n "$data" ]; then
    curl -s -X "$method" "$API_BASE$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$data"
  else
    curl -s -X "$method" "$API_BASE$endpoint" \
      -H "Authorization: Bearer $TOKEN"
  fi
}

# ============================================================================
# Step 1: Register or login demo user
# ============================================================================
echo "📝 Setting up demo user..."

# Try to register first
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DEMO_EMAIL\",
    \"password\": \"$DEMO_PASSWORD\",
    \"firstName\": \"$DEMO_FIRST_NAME\",
    \"lastName\": \"$DEMO_LAST_NAME\"
  }" 2>/dev/null) || true

# Login to get access token
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DEMO_EMAIL\",
    \"password\": \"$DEMO_PASSWORD\"
  }")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get access token. Response:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "   ✅ Logged in successfully"

# ============================================================================
# Step 2: Delete existing data for demo user (via database for reliability)
# ============================================================================
echo ""
echo "🗑️  Deleting existing demo data..."

# Get user ID from database
USER_ID=$(docker compose exec -T postgres psql -U expense_user -d expense_mgmt -t -c "
  SELECT id FROM users WHERE email = '$DEMO_EMAIL';
" 2>/dev/null | tr -d '[:space:]')

if [ -n "$USER_ID" ]; then
  # Delete all data for this user via database
  docker compose exec -T postgres psql -U expense_user -d expense_mgmt -c "
    -- Delete line items
    DELETE FROM line_items WHERE transaction_id IN (
      SELECT id FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = '$USER_ID')
    );

    -- Delete ledger entries
    DELETE FROM ledger_entries WHERE transaction_id IN (
      SELECT id FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = '$USER_ID')
    );

    -- Delete domain events
    DELETE FROM domain_events WHERE aggregate_type = 'TRANSACTION' AND aggregate_id IN (
      SELECT id FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = '$USER_ID')
    );

    -- Delete transactions
    DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = '$USER_ID');

    -- Delete accounts
    DELETE FROM accounts WHERE user_id = '$USER_ID';
  " > /dev/null 2>&1
fi

echo "   ✅ Existing data deleted"

if [ "$DELETE_ONLY" = true ]; then
  echo ""
  echo "✅ Demo user data deleted. Use without --delete flag to recreate data."
  exit 0
fi

# ============================================================================
# Step 3: Fetch category IDs from API
# ============================================================================
echo ""
echo "📂 Fetching categories..."

CATEGORIES_JSON=$(api_call GET "/categories")

# Function to find category ID by name (searches nested children too)
# Works with single-line JSON by extracting id:name pairs
find_category_id() {
  local name=$1
  # Extract the pattern "id":"uuid","name":"Name" and filter by name
  echo "$CATEGORIES_JSON" | grep -o '"id":"[^"]*","name":"[^"]*"' | grep "\"name\":\"$name\"" | head -1 | grep -o '"id":"[^"]*"' | cut -d'"' -f4
}

# Get category IDs - using actual category names from API
CAT_RENT=$(find_category_id "Rent/Mortgage")
CAT_GROCERIES=$(find_category_id "Groceries")
CAT_RESTAURANTS=$(find_category_id "Restaurants")
CAT_COFFEE=$(find_category_id "Coffee")
CAT_GAS=$(find_category_id "Gas")
CAT_UTILITIES=$(find_category_id "Utilities")
CAT_SUBSCRIPTIONS=$(find_category_id "Subscriptions")
CAT_SALARY=$(find_category_id "Salary")
CAT_CLOTHING=$(find_category_id "Clothing")
CAT_ELECTRONICS=$(find_category_id "Electronics")
CAT_GYM=$(find_category_id "Gym")
CAT_PHARMACY=$(find_category_id "Pharmacy")
CAT_DOCTOR=$(find_category_id "Doctor")
CAT_PARKING=$(find_category_id "Parking")
CAT_MOVIES=$(find_category_id "Movies")
CAT_GAMING=$(find_category_id "Gaming")
CAT_HOME_MAINT=$(find_category_id "Maintenance")
CAT_CAR_MAINT=$(find_category_id "Car Maintenance")
CAT_HEALTH_INSURANCE=$(find_category_id "Health Insurance")
CAT_HOME_GOODS=$(find_category_id "Home Goods")
CAT_PUBLIC_TRANSIT=$(find_category_id "Public Transit")
CAT_MUSIC=$(find_category_id "Music")
CAT_HOUSING_INSURANCE=$(find_category_id "Insurance")
CAT_BOOKS=$(find_category_id "Books")

echo "   ✅ Categories loaded"
echo "      Groceries: $CAT_GROCERIES"
echo "      Restaurants: $CAT_RESTAURANTS"
echo "      Salary: $CAT_SALARY"
echo "      Utilities: $CAT_UTILITIES"
echo "      Gas: $CAT_GAS"

# ============================================================================
# Step 4: Create Accounts
# ============================================================================
echo ""
echo "🏦 Creating accounts..."

# Primary Checking Account
CHECKING_RESPONSE=$(api_call POST "/accounts" '{
  "type": "CHECKING",
  "name": "Chase Checking",
  "institution": "Chase Bank",
  "currency": "USD",
  "initialBalance": 8500.00
}')
CHECKING_ID=$(echo "$CHECKING_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   ✅ Chase Checking: $CHECKING_ID"

# High-Yield Savings
SAVINGS_RESPONSE=$(api_call POST "/accounts" '{
  "type": "SAVINGS",
  "name": "Marcus Savings",
  "institution": "Goldman Sachs",
  "currency": "USD",
  "initialBalance": 25000.00
}')
SAVINGS_ID=$(echo "$SAVINGS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   ✅ Marcus Savings: $SAVINGS_ID"

# Cash Account
CASH_RESPONSE=$(api_call POST "/accounts" '{
  "type": "CASH",
  "name": "Wallet Cash",
  "currency": "USD",
  "initialBalance": 250.00
}')
CASH_ID=$(echo "$CASH_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   ✅ Wallet Cash: $CASH_ID"

# Credit Card
CREDIT_RESPONSE=$(api_call POST "/accounts" '{
  "type": "CREDIT_CARD",
  "name": "Chase Sapphire",
  "institution": "Chase",
  "currency": "USD",
  "creditLimit": 15000,
  "initialBalance": 0
}')
CREDIT_ID=$(echo "$CREDIT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   ✅ Chase Sapphire: $CREDIT_ID"

# Investment Account
INVEST_RESPONSE=$(api_call POST "/accounts" '{
  "type": "INVESTMENT",
  "name": "Fidelity 401k",
  "institution": "Fidelity",
  "currency": "USD",
  "initialBalance": 85000.00
}')
INVEST_ID=$(echo "$INVEST_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   ✅ Fidelity 401k: $INVEST_ID"

# ============================================================================
# Step 5: Create Transactions
# ============================================================================
echo ""
echo "💳 Creating transactions..."

CURRENT_YEAR=$(date +%Y)
TXN_COUNT=0

# Function to create a transaction
create_txn() {
  local account_id=$1
  local date=$2
  local merchant=$3
  local amount=$4
  local type=$5
  local category_id=$6
  local description=$7
  local line_items=$8

  local data="{
    \"accountId\": \"$account_id\",
    \"date\": \"$date\",
    \"merchant\": \"$merchant\",
    \"amount\": $amount,
    \"type\": \"$type\""

  if [ -n "$category_id" ] && [ "$category_id" != "null" ] && [ "$category_id" != "" ]; then
    data="$data, \"categoryId\": \"$category_id\""
  fi

  if [ -n "$description" ]; then
    data="$data, \"description\": \"$description\""
  fi

  if [ -n "$line_items" ]; then
    data="$data, \"lineItems\": $line_items"
  fi

  data="$data}"

  api_call POST "/transactions" "$data" > /dev/null
  TXN_COUNT=$((TXN_COUNT + 1))
}

# Function to create a transfer
create_transfer() {
  local from_id=$1
  local to_id=$2
  local amount=$3
  local description=$4

  api_call POST "/transactions/transfer" "{
    \"fromAccountId\": \"$from_id\",
    \"toAccountId\": \"$to_id\",
    \"amount\": $amount,
    \"description\": \"$description\"
  }" > /dev/null
  TXN_COUNT=$((TXN_COUNT + 2))
}

# ------------------------------
# INCOME - Salary (bi-weekly)
# ------------------------------
echo "   💰 Creating salary deposits (bi-weekly)..."
for month in 01 02 03 04 05 06 07 08 09 10 11 12; do
  create_txn "$CHECKING_ID" "$CURRENT_YEAR-$month-01" "TechCorp Inc - Payroll" 4250.00 "CREDIT" "$CAT_SALARY" "Bi-weekly salary"
  create_txn "$CHECKING_ID" "$CURRENT_YEAR-$month-15" "TechCorp Inc - Payroll" 4250.00 "CREDIT" "$CAT_SALARY" "Bi-weekly salary"
done

# ------------------------------
# HOUSING - Rent
# ------------------------------
echo "   🏠 Creating rent payments..."
for month in 01 02 03 04 05 06 07 08 09 10 11 12; do
  create_txn "$CHECKING_ID" "$CURRENT_YEAR-$month-01" "Parkview Apartments" 2100.00 "DEBIT" "$CAT_RENT" "Monthly rent"
done

# ------------------------------
# UTILITIES
# ------------------------------
echo "   ⚡ Creating utility bills..."
for month in 01 02 03 04 05 06 07 08 09 10 11 12; do
  # Electricity - varies by season
  if [[ "$month" == "06" || "$month" == "07" || "$month" == "08" || "$month" == "12" || "$month" == "01" ]]; then
    elec_amt="145.00"
  else
    elec_amt="95.00"
  fi
  create_txn "$CHECKING_ID" "$CURRENT_YEAR-$month-18" "Pacific Gas & Electric" "$elec_amt" "DEBIT" "$CAT_UTILITIES" "Electricity"

  # Water
  create_txn "$CHECKING_ID" "$CURRENT_YEAR-$month-20" "City Water Department" 45.00 "DEBIT" "$CAT_UTILITIES" "Water bill"

  # Internet
  create_txn "$CHECKING_ID" "$CURRENT_YEAR-$month-22" "Xfinity Internet" 79.99 "DEBIT" "$CAT_SUBSCRIPTIONS" "Internet service"

  # Phone
  create_txn "$CHECKING_ID" "$CURRENT_YEAR-$month-25" "T-Mobile" 85.00 "DEBIT" "$CAT_SUBSCRIPTIONS" "Cell phone"
done

# ------------------------------
# GROCERIES - Weekly shopping
# ------------------------------
echo "   🛒 Creating grocery transactions..."
GROCERY_STORES=("Whole Foods Market" "Trader Joes" "Safeway" "Costco" "Target" "Kroger" "Sprouts")
GROCERY_AMOUNTS=(78.45 52.30 89.12 145.67 62.89 71.23 48.90 95.45 67.80 83.15)

for month in 01 02 03 04 05 06 07 08 09 10 11 12; do
  # 4-5 grocery trips per month
  for day in 03 10 17 24; do
    store_idx=$((RANDOM % ${#GROCERY_STORES[@]}))
    amt_idx=$((RANDOM % ${#GROCERY_AMOUNTS[@]}))
    store="${GROCERY_STORES[$store_idx]}"
    amount="${GROCERY_AMOUNTS[$amt_idx]}"

    # Add line items to some transactions
    if [[ "$day" == "10" || "$day" == "24" ]]; then
      line_items='[
        {"name": "Organic Milk", "quantity": 2, "unitPrice": 5.99},
        {"name": "Whole Wheat Bread", "quantity": 1, "unitPrice": 4.49},
        {"name": "Free Range Eggs", "quantity": 1, "unitPrice": 6.99},
        {"name": "Chicken Breast", "quantity": 2, "unitPrice": 9.99},
        {"name": "Mixed Vegetables", "quantity": 1, "unitPrice": 8.50},
        {"name": "Greek Yogurt", "quantity": 3, "unitPrice": 1.50},
        {"name": "Fresh Fruit", "quantity": 1, "unitPrice": 12.00}
      ]'
      create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-$day" "$store" 67.94 "DEBIT" "$CAT_GROCERIES" "Weekly groceries" "$line_items"
    else
      create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-$day" "$store" "$amount" "DEBIT" "$CAT_GROCERIES" "Groceries"
    fi
  done
done

# ------------------------------
# RESTAURANTS & DINING
# ------------------------------
echo "   🍽️  Creating restaurant transactions..."
RESTAURANTS=("Chipotle Mexican Grill" "Panera Bread" "Olive Garden" "The Cheesecake Factory" "PF Changs" "Buffalo Wild Wings" "Red Robin" "Chilis" "Applebees" "Outback Steakhouse" "Texas Roadhouse" "Cracker Barrel")
RESTAURANT_AMOUNTS=(14.50 18.75 45.80 62.30 38.90 32.45 28.60 24.15 19.80 52.40 41.25 22.90)

for month in 01 02 03 04 05 06 07 08 09 10 11 12; do
  # 8-10 restaurant visits per month
  for i in 1 2 3 4 5 6 7 8; do
    day=$(printf "%02d" $((2 + (i * 3) % 26)))
    rest_idx=$((RANDOM % ${#RESTAURANTS[@]}))
    amt_idx=$((RANDOM % ${#RESTAURANT_AMOUNTS[@]}))
    create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-$day" "${RESTAURANTS[$rest_idx]}" "${RESTAURANT_AMOUNTS[$amt_idx]}" "DEBIT" "$CAT_RESTAURANTS" "Dining out"
  done
done

# ------------------------------
# COFFEE SHOPS
# ------------------------------
echo "   ☕ Creating coffee shop transactions..."
COFFEE_SHOPS=("Starbucks" "Peets Coffee" "Blue Bottle Coffee" "Dunkin" "Philz Coffee" "Dutch Bros")

for month in 01 02 03 04 05 06 07 08 09 10 11 12; do
  # 10-12 coffee runs per month
  for i in 1 2 3 4 5 6 7 8 9 10; do
    day=$(printf "%02d" $((1 + (i * 2 + RANDOM % 3) % 28)))
    shop_idx=$((RANDOM % ${#COFFEE_SHOPS[@]}))
    amt=$(echo "scale=2; 5 + ($RANDOM % 7)" | bc)
    create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-$day" "${COFFEE_SHOPS[$shop_idx]}" "$amt" "DEBIT" "$CAT_COFFEE" "Coffee"
  done
done

# ------------------------------
# FOOD DELIVERY
# ------------------------------
echo "   🚗 Creating food delivery transactions..."
DELIVERY_APPS=("DoorDash" "Uber Eats" "Grubhub" "Postmates")

for month in 01 02 03 04 05 06 07 08 09 10 11 12; do
  # 3-4 deliveries per month
  for day in 07 14 21 28; do
    app_idx=$((RANDOM % ${#DELIVERY_APPS[@]}))
    amt=$(echo "scale=2; 25 + ($RANDOM % 20)" | bc)
    create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-$day" "${DELIVERY_APPS[$app_idx]}" "$amt" "DEBIT" "$CAT_RESTAURANTS" "Food delivery"
  done
done

# ------------------------------
# GAS & TRANSPORTATION
# ------------------------------
echo "   ⛽ Creating gas and transportation..."
GAS_STATIONS=("Shell" "Chevron" "76" "Costco Gas" "Arco" "Mobil")

for month in 01 02 03 04 05 06 07 08 09 10 11 12; do
  # Gas 2-3 times per month
  for day in 05 15 25; do
    gas_idx=$((RANDOM % ${#GAS_STATIONS[@]}))
    amt=$(echo "scale=2; 48 + ($RANDOM % 25)" | bc)
    create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-$day" "${GAS_STATIONS[$gas_idx]}" "$amt" "DEBIT" "$CAT_GAS" "Gas"
  done

  # Occasional parking
  if [[ "$month" == "02" || "$month" == "05" || "$month" == "08" || "$month" == "11" ]]; then
    create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-12" "City Parking Garage" 25.00 "DEBIT" "$CAT_PARKING" "Parking"
  fi

  # Public transit occasionally
  create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-08" "BART" 12.50 "DEBIT" "$CAT_PUBLIC_TRANSIT" "Transit fare"
done

# Car Insurance - quarterly
for month in 01 04 07 10; do
  create_txn "$CHECKING_ID" "$CURRENT_YEAR-$month-15" "Geico Insurance" 385.00 "DEBIT" "$CAT_CAR_MAINT" "Auto insurance - quarterly"
done

# ------------------------------
# SUBSCRIPTIONS & STREAMING
# ------------------------------
echo "   📺 Creating subscription services..."
for month in 01 02 03 04 05 06 07 08 09 10 11 12; do
  create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-05" "Netflix" 15.99 "DEBIT" "$CAT_SUBSCRIPTIONS" "Netflix subscription"
  create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-08" "Spotify Premium" 10.99 "DEBIT" "$CAT_SUBSCRIPTIONS" "Spotify subscription"
  create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-12" "HBO Max" 15.99 "DEBIT" "$CAT_SUBSCRIPTIONS" "HBO Max subscription"
  create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-15" "Amazon Prime" 14.99 "DEBIT" "$CAT_SUBSCRIPTIONS" "Prime membership"
  create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-20" "YouTube Premium" 13.99 "DEBIT" "$CAT_SUBSCRIPTIONS" "YouTube Premium"
done

# ------------------------------
# GYM & FITNESS
# ------------------------------
echo "   🏋️  Creating gym membership..."
for month in 01 02 03 04 05 06 07 08 09 10 11 12; do
  create_txn "$CHECKING_ID" "$CURRENT_YEAR-$month-01" "24 Hour Fitness" 49.99 "DEBIT" "$CAT_GYM" "Gym membership"
done

# ------------------------------
# HEALTHCARE
# ------------------------------
echo "   🏥 Creating healthcare expenses..."
# Health insurance monthly
for month in 01 02 03 04 05 06 07 08 09 10 11 12; do
  create_txn "$CHECKING_ID" "$CURRENT_YEAR-$month-01" "Blue Cross Blue Shield" 285.00 "DEBIT" "$CAT_HEALTH_INSURANCE" "Health insurance premium"
done

# Doctor visits and pharmacy
create_txn "$CHECKING_ID" "$CURRENT_YEAR-01-22" "Dr. Johnson Medical Group" 45.00 "DEBIT" "$CAT_DOCTOR" "Copay - Annual checkup"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-02-15" "CVS Pharmacy" 28.50 "DEBIT" "$CAT_PHARMACY" "Prescription"
create_txn "$CHECKING_ID" "$CURRENT_YEAR-04-10" "Urgent Care Center" 75.00 "DEBIT" "$CAT_DOCTOR" "Urgent care visit"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-05-20" "Walgreens" 15.99 "DEBIT" "$CAT_PHARMACY" "OTC medication"
create_txn "$CHECKING_ID" "$CURRENT_YEAR-06-15" "City Dental Care" 150.00 "DEBIT" "$CAT_DOCTOR" "Dental cleaning"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-08-08" "CVS Pharmacy" 42.00 "DEBIT" "$CAT_PHARMACY" "Prescription refill"
create_txn "$CHECKING_ID" "$CURRENT_YEAR-09-25" "Eye Care Associates" 125.00 "DEBIT" "$CAT_DOCTOR" "Eye exam"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-11-12" "Walgreens" 32.50 "DEBIT" "$CAT_PHARMACY" "Cold medicine"

# ------------------------------
# SHOPPING & RETAIL
# ------------------------------
echo "   🛍️  Creating shopping transactions..."
# Regular shopping throughout the year
create_txn "$CREDIT_ID" "$CURRENT_YEAR-01-15" "Nordstrom" 185.00 "DEBIT" "$CAT_CLOTHING" "Winter sale shopping"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-02-14" "Macys" 95.50 "DEBIT" "$CAT_CLOTHING" "Valentines gift"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-03-20" "Target" 67.89 "DEBIT" "$CAT_HOME_GOODS" "Home supplies"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-04-05" "Best Buy" 249.99 "DEBIT" "$CAT_ELECTRONICS" "Wireless headphones" '[
  {"name": "Sony WH-1000XM5", "quantity": 1, "unitPrice": 249.99}
]'
create_txn "$CREDIT_ID" "$CURRENT_YEAR-05-12" "IKEA" 312.00 "DEBIT" "$CAT_HOME_GOODS" "Furniture" '[
  {"name": "Bookshelf", "quantity": 1, "unitPrice": 149.00},
  {"name": "Desk Lamp", "quantity": 2, "unitPrice": 29.99},
  {"name": "Storage Boxes", "quantity": 4, "unitPrice": 12.99},
  {"name": "Picture Frames", "quantity": 3, "unitPrice": 9.99}
]'
create_txn "$CREDIT_ID" "$CURRENT_YEAR-06-18" "Old Navy" 78.45 "DEBIT" "$CAT_CLOTHING" "Summer clothes"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-07-04" "REI" 156.00 "DEBIT" "$CAT_CLOTHING" "Hiking gear"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-08-15" "Apple Store" 1099.00 "DEBIT" "$CAT_ELECTRONICS" "iPhone 15" '[
  {"name": "iPhone 15 128GB", "quantity": 1, "unitPrice": 999.00},
  {"name": "AppleCare+", "quantity": 1, "unitPrice": 99.00}
]'
create_txn "$CREDIT_ID" "$CURRENT_YEAR-09-02" "Gap" 125.60 "DEBIT" "$CAT_CLOTHING" "Fall wardrobe"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-10-20" "Home Depot" 89.45 "DEBIT" "$CAT_HOME_MAINT" "Home repair supplies"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-11-25" "Amazon" 356.78 "DEBIT" "$CAT_ELECTRONICS" "Black Friday deals" '[
  {"name": "Echo Dot", "quantity": 2, "unitPrice": 29.99},
  {"name": "Fire TV Stick", "quantity": 1, "unitPrice": 24.99},
  {"name": "Kindle Paperwhite", "quantity": 1, "unitPrice": 139.99},
  {"name": "Smart Plugs 4-pack", "quantity": 1, "unitPrice": 24.99},
  {"name": "USB Cables", "quantity": 1, "unitPrice": 15.99}
]'
create_txn "$CREDIT_ID" "$CURRENT_YEAR-12-10" "Nordstrom Rack" 210.00 "DEBIT" "$CAT_CLOTHING" "Holiday shopping"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-12-20" "Target" 145.67 "DEBIT" "$CAT_HOME_GOODS" "Holiday decorations"

# ------------------------------
# ENTERTAINMENT & HOBBIES
# ------------------------------
echo "   🎬 Creating entertainment expenses..."
for month in 01 02 03 04 05 06 07 08 09 10 11 12; do
  # Movies 1-2 times per month
  day=$(printf "%02d" $((10 + RANDOM % 15)))
  create_txn "$CREDIT_ID" "$CURRENT_YEAR-$month-$day" "AMC Theatres" 28.00 "DEBIT" "$CAT_MOVIES" "Movie tickets"
done

# Special events
create_txn "$CREDIT_ID" "$CURRENT_YEAR-03-15" "Ticketmaster" 185.00 "DEBIT" "$CAT_MOVIES" "Concert tickets"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-06-20" "MLB.com" 120.00 "DEBIT" "$CAT_MOVIES" "Baseball game tickets"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-09-10" "Comedy Club" 65.00 "DEBIT" "$CAT_MOVIES" "Comedy show"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-11-28" "Broadway.com" 275.00 "DEBIT" "$CAT_MOVIES" "Theater tickets"

# Hobbies
create_txn "$CREDIT_ID" "$CURRENT_YEAR-02-20" "Guitar Center" 89.00 "DEBIT" "$CAT_MUSIC" "Guitar strings and accessories"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-05-05" "Michaels" 45.67 "DEBIT" "$CAT_HOME_GOODS" "Art supplies"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-08-22" "Barnes & Noble" 52.30 "DEBIT" "$CAT_BOOKS" "Books"
create_txn "$CREDIT_ID" "$CURRENT_YEAR-10-15" "Steam" 59.99 "DEBIT" "$CAT_GAMING" "Video games"

# ------------------------------
# TRANSFERS (Limited)
# ------------------------------
echo "   💸 Creating transfers..."
# Monthly savings - only 4 times per year
for month in 03 06 09 12; do
  create_transfer "$CHECKING_ID" "$SAVINGS_ID" 1000.00 "Quarterly savings"
done

# One cash withdrawal
create_transfer "$CHECKING_ID" "$CASH_ID" 200.00 "ATM withdrawal"

# Cash spending
create_txn "$CASH_ID" "$CURRENT_YEAR-04-15" "Farmers Market" 35.00 "DEBIT" "$CAT_GROCERIES" "Fresh produce"
create_txn "$CASH_ID" "$CURRENT_YEAR-07-20" "Food Truck" 18.00 "DEBIT" "$CAT_RESTAURANTS" "Street food"

echo ""
echo "✅ Demo data setup complete!"
echo ""
echo "================================================"
echo "Demo Account Credentials:"
echo "   Email:    $DEMO_EMAIL"
echo "   Password: $DEMO_PASSWORD"
echo "================================================"
echo ""
echo "Created:"
echo "   • 5 accounts (Checking, Savings, Cash, Credit Card, Investment)"
echo "   • $TXN_COUNT transactions total"
echo "   • 12 months of realistic financial data"
echo "   • Multiple categories with proper assignments"
echo "   • Line items on select transactions"
echo ""
echo "To delete and recreate: npm run db:demo"
echo "To delete only: bash scripts/setup-demo-data.sh --delete"
echo ""
