#!/bin/bash
# Reset test database by truncating all user data tables
# Preserves schema and Flyway migration history

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-expense_mgmt}"
DB_USER="${DB_USER:-expense_user}"
DB_PASSWORD="${DB_PASSWORD:-expense_pass}"

# Skip confirmation if --force or -f flag is passed, or if FORCE_RESET=1
FORCE=false
for arg in "$@"; do
  if [[ "$arg" == "--force" || "$arg" == "-f" ]]; then
    FORCE=true
    break
  fi
done

if [[ "$FORCE_RESET" == "1" ]]; then
  FORCE=true
fi

echo ""
echo "⚠️  WARNING: This will DELETE ALL DATA from the database!"
echo ""
echo "   Database: $DB_NAME"
echo "   Host:     $DB_HOST:$DB_PORT"
echo "   User:     $DB_USER"
echo ""

if [[ "$FORCE" != true ]]; then
  read -p "Are you sure you want to reset the database? Type 'yes' to confirm: " confirmation
  if [[ "$confirmation" != "yes" ]]; then
    echo "❌ Database reset cancelled."
    exit 1
  fi
fi

echo ""
echo "🔄 Resetting test database..."

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
-- Disable triggers temporarily for faster truncation
SET session_replication_role = 'replica';

-- Truncate all user data tables (order matters due to foreign keys)
TRUNCATE TABLE
    line_items,
    ledger_entries,
    domain_events,
    transactions,
    category_mappings,
    categories,
    import_profiles,
    accounts,
    users
CASCADE;

-- Re-seed system categories from Flyway migration V1
-- (Categories are seeded by V1__initial_schema.sql, we need to re-insert them)

-- Parent categories
INSERT INTO categories (id, name, icon, color, parent_id, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111101', 'Housing', 'home', '#4F46E5', NULL, NOW(), NOW()),
('11111111-1111-1111-1111-111111111102', 'Transportation', 'car', '#059669', NULL, NOW(), NOW()),
('11111111-1111-1111-1111-111111111103', 'Food & Dining', 'utensils', '#DC2626', NULL, NOW(), NOW()),
('11111111-1111-1111-1111-111111111104', 'Utilities', 'bolt', '#D97706', NULL, NOW(), NOW()),
('11111111-1111-1111-1111-111111111105', 'Healthcare', 'heart', '#DB2777', NULL, NOW(), NOW()),
('11111111-1111-1111-1111-111111111106', 'Entertainment', 'film', '#7C3AED', NULL, NOW(), NOW()),
('11111111-1111-1111-1111-111111111107', 'Shopping', 'shopping-bag', '#2563EB', NULL, NOW(), NOW()),
('11111111-1111-1111-1111-111111111108', 'Personal Care', 'smile', '#EC4899', NULL, NOW(), NOW()),
('11111111-1111-1111-1111-111111111109', 'Education', 'book', '#8B5CF6', NULL, NOW(), NOW()),
('11111111-1111-1111-1111-111111111110', 'Income', 'dollar-sign', '#10B981', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Child categories for Housing
INSERT INTO categories (id, name, icon, color, parent_id, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222201', 'Rent/Mortgage', 'home', '#4F46E5', '11111111-1111-1111-1111-111111111101', NOW(), NOW()),
('22222222-2222-2222-2222-222222222202', 'Property Tax', 'file-text', '#4F46E5', '11111111-1111-1111-1111-111111111101', NOW(), NOW()),
('22222222-2222-2222-2222-222222222203', 'Home Insurance', 'shield', '#4F46E5', '11111111-1111-1111-1111-111111111101', NOW(), NOW()),
('22222222-2222-2222-2222-222222222204', 'Home Maintenance', 'tool', '#4F46E5', '11111111-1111-1111-1111-111111111101', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Child categories for Transportation
INSERT INTO categories (id, name, icon, color, parent_id, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222205', 'Gas/Fuel', 'droplet', '#059669', '11111111-1111-1111-1111-111111111102', NOW(), NOW()),
('22222222-2222-2222-2222-222222222206', 'Car Payment', 'credit-card', '#059669', '11111111-1111-1111-1111-111111111102', NOW(), NOW()),
('22222222-2222-2222-2222-222222222207', 'Car Insurance', 'shield', '#059669', '11111111-1111-1111-1111-111111111102', NOW(), NOW()),
('22222222-2222-2222-2222-222222222208', 'Public Transit', 'train', '#059669', '11111111-1111-1111-1111-111111111102', NOW(), NOW()),
('22222222-2222-2222-2222-222222222209', 'Parking', 'map-pin', '#059669', '11111111-1111-1111-1111-111111111102', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Child categories for Food & Dining
INSERT INTO categories (id, name, icon, color, parent_id, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222210', 'Groceries', 'shopping-cart', '#DC2626', '11111111-1111-1111-1111-111111111103', NOW(), NOW()),
('22222222-2222-2222-2222-222222222211', 'Restaurants', 'utensils', '#DC2626', '11111111-1111-1111-1111-111111111103', NOW(), NOW()),
('22222222-2222-2222-2222-222222222212', 'Coffee Shops', 'coffee', '#DC2626', '11111111-1111-1111-1111-111111111103', NOW(), NOW()),
('22222222-2222-2222-2222-222222222213', 'Food Delivery', 'truck', '#DC2626', '11111111-1111-1111-1111-111111111103', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Child categories for Utilities
INSERT INTO categories (id, name, icon, color, parent_id, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222214', 'Electricity', 'zap', '#D97706', '11111111-1111-1111-1111-111111111104', NOW(), NOW()),
('22222222-2222-2222-2222-222222222215', 'Water', 'droplet', '#D97706', '11111111-1111-1111-1111-111111111104', NOW(), NOW()),
('22222222-2222-2222-2222-222222222216', 'Internet', 'wifi', '#D97706', '11111111-1111-1111-1111-111111111104', NOW(), NOW()),
('22222222-2222-2222-2222-222222222217', 'Phone', 'phone', '#D97706', '11111111-1111-1111-1111-111111111104', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Child categories for Healthcare
INSERT INTO categories (id, name, icon, color, parent_id, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222218', 'Doctor Visits', 'user-md', '#DB2777', '11111111-1111-1111-1111-111111111105', NOW(), NOW()),
('22222222-2222-2222-2222-222222222219', 'Pharmacy', 'pills', '#DB2777', '11111111-1111-1111-1111-111111111105', NOW(), NOW()),
('22222222-2222-2222-2222-222222222220', 'Health Insurance', 'shield', '#DB2777', '11111111-1111-1111-1111-111111111105', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Child categories for Entertainment
INSERT INTO categories (id, name, icon, color, parent_id, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222221', 'Streaming Services', 'tv', '#7C3AED', '11111111-1111-1111-1111-111111111106', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'Movies & Events', 'ticket', '#7C3AED', '11111111-1111-1111-1111-111111111106', NOW(), NOW()),
('22222222-2222-2222-2222-222222222223', 'Hobbies', 'palette', '#7C3AED', '11111111-1111-1111-1111-111111111106', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Child categories for Shopping
INSERT INTO categories (id, name, icon, color, parent_id, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222224', 'Clothing', 'shirt', '#2563EB', '11111111-1111-1111-1111-111111111107', NOW(), NOW()),
('22222222-2222-2222-2222-222222222225', 'Electronics', 'cpu', '#2563EB', '11111111-1111-1111-1111-111111111107', NOW(), NOW()),
('22222222-2222-2222-2222-222222222226', 'Home Goods', 'home', '#2563EB', '11111111-1111-1111-1111-111111111107', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Child categories for Personal Care
INSERT INTO categories (id, name, icon, color, parent_id, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222227', 'Haircuts', 'scissors', '#EC4899', '11111111-1111-1111-1111-111111111108', NOW(), NOW()),
('22222222-2222-2222-2222-222222222228', 'Gym/Fitness', 'activity', '#EC4899', '11111111-1111-1111-1111-111111111108', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Child categories for Education
INSERT INTO categories (id, name, icon, color, parent_id, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222229', 'Tuition', 'graduation-cap', '#8B5CF6', '11111111-1111-1111-1111-111111111109', NOW(), NOW()),
('22222222-2222-2222-2222-222222222230', 'Books & Supplies', 'book-open', '#8B5CF6', '11111111-1111-1111-1111-111111111109', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Child categories for Income
INSERT INTO categories (id, name, icon, color, parent_id, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222231', 'Salary', 'briefcase', '#10B981', '11111111-1111-1111-1111-111111111110', NOW(), NOW()),
('22222222-2222-2222-2222-222222222232', 'Freelance', 'edit', '#10B981', '11111111-1111-1111-1111-111111111110', NOW(), NOW()),
('22222222-2222-2222-2222-222222222233', 'Investments', 'trending-up', '#10B981', '11111111-1111-1111-1111-111111111110', NOW(), NOW()),
('22222222-2222-2222-2222-222222222234', 'Gifts', 'gift', '#10B981', '11111111-1111-1111-1111-111111111110', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Re-enable triggers
SET session_replication_role = 'origin';

EOF

echo "Database reset complete!"
