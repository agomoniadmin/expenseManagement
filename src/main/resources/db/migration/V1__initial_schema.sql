-- Personal Expense Management System - Initial Schema

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    primary_region VARCHAR(20) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'USER',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    user_region VARCHAR(20) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    institution VARCHAR(255),
    currency VARCHAR(3) DEFAULT 'USD',
    current_balance DECIMAL(15,2) DEFAULT 0,
    available_balance DECIMAL(15,2),
    credit_limit DECIMAL(15,2),
    interest_rate DECIMAL(5,4),
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX idx_accounts_user ON accounts(user_id);

CREATE TABLE item_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    user_region VARCHAR(20),
    parent_id UUID,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7),
    budget_limit DECIMAL(15,2),
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_categories_user ON item_categories(user_id);
CREATE INDEX idx_categories_parent ON item_categories(parent_id);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_region VARCHAR(20) NOT NULL,
    account_id UUID NOT NULL REFERENCES accounts(id),
    transaction_date DATE NOT NULL,
    post_date DATE,
    merchant VARCHAR(255) NOT NULL,
    merchant_category_code VARCHAR(10),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    tax_amount DECIMAL(15,2),
    transaction_type VARCHAR(10) NOT NULL,
    category_id UUID,
    description TEXT,
    reference_number VARCHAR(100),
    import_source VARCHAR(50),
    import_hash VARCHAR(64),
    reconciliation_status VARCHAR(20) DEFAULT 'UNRECONCILED',
    reconciled_with_id UUID,
    transfer_link_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX idx_txn_account_date ON transactions(account_id, transaction_date);
CREATE INDEX idx_txn_user ON transactions(user_id);
CREATE INDEX idx_txn_hash ON transactions(import_hash);
CREATE INDEX idx_txn_reconciliation ON transactions(reconciliation_status);

CREATE TABLE line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    user_region VARCHAR(20) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    quantity DECIMAL(10,4) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2),
    category_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_line_items_txn ON line_items(transaction_id);
CREATE INDEX idx_line_items_category ON line_items(category_id);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    user_region VARCHAR(20) NOT NULL,
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    entry_date DATE NOT NULL,
    entry_type VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    running_balance DECIMAL(15,2) NOT NULL,
    counterparty_account_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ledger_account_date ON ledger_entries(account_id, entry_date);
CREATE INDEX idx_ledger_txn ON ledger_entries(transaction_id);

CREATE TABLE category_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    user_region VARCHAR(20) NOT NULL,
    pattern VARCHAR(255) NOT NULL,
    match_type VARCHAR(20) NOT NULL,
    category_id UUID NOT NULL,
    priority INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_mappings_user ON category_mappings(user_id, priority);

CREATE TABLE domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    user_region VARCHAR(20) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data TEXT NOT NULL,
    metadata TEXT,
    version INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_aggregate ON domain_events(aggregate_type, aggregate_id);
CREATE INDEX idx_events_type ON domain_events(event_type);
CREATE INDEX idx_events_created ON domain_events(created_at);

CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    user_region VARCHAR(20) NOT NULL,
    account_id UUID NOT NULL REFERENCES accounts(id),
    file_name VARCHAR(255),
    file_url TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    date_format VARCHAR(20),
    total_records INTEGER DEFAULT 0,
    imported_records INTEGER DEFAULT 0,
    duplicate_records INTEGER DEFAULT 0,
    matched_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    errors TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- Seed default system categories
INSERT INTO item_categories (id, name, icon, color, is_system, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Food', 'utensils', '#4CAF50', true, 1),
    ('00000000-0000-0000-0000-000000000002', 'Housing', 'home', '#2196F3', true, 2),
    ('00000000-0000-0000-0000-000000000003', 'Transportation', 'car', '#FF9800', true, 3),
    ('00000000-0000-0000-0000-000000000004', 'Entertainment', 'film', '#9C27B0', true, 4),
    ('00000000-0000-0000-0000-000000000005', 'Shopping', 'shopping-bag', '#E91E63', true, 5),
    ('00000000-0000-0000-0000-000000000006', 'Healthcare', 'heart', '#F44336', true, 6),
    ('00000000-0000-0000-0000-000000000007', 'Education', 'book', '#3F51B5', true, 7),
    ('00000000-0000-0000-0000-000000000008', 'Personal', 'user', '#607D8B', true, 8),
    ('00000000-0000-0000-0000-000000000009', 'Income', 'dollar-sign', '#4CAF50', true, 9),
    ('00000000-0000-0000-0000-000000000010', 'Transfer', 'repeat', '#795548', true, 10);

-- Subcategories
INSERT INTO item_categories (id, parent_id, name, icon, color, is_system, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Groceries', 'utensils', '#4CAF50', true, 1),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Restaurants', 'utensils', '#4CAF50', true, 2),
    ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Coffee', 'utensils', '#4CAF50', true, 3),
    ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000002', 'Rent/Mortgage', 'home', '#2196F3', true, 1),
    ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000002', 'Utilities', 'home', '#2196F3', true, 2),
    ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000002', 'Insurance', 'home', '#2196F3', true, 3),
    ('00000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000002', 'Maintenance', 'home', '#2196F3', true, 4),
    ('00000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000003', 'Gas', 'car', '#FF9800', true, 1),
    ('00000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000003', 'Public Transit', 'car', '#FF9800', true, 2),
    ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000003', 'Parking', 'car', '#FF9800', true, 3),
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000003', 'Car Maintenance', 'car', '#FF9800', true, 4),
    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000004', 'Movies', 'film', '#9C27B0', true, 1),
    ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000004', 'Music', 'film', '#9C27B0', true, 2),
    ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000004', 'Gaming', 'film', '#9C27B0', true, 3),
    ('00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000004', 'Sports', 'film', '#9C27B0', true, 4),
    ('00000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000005', 'Clothing', 'shopping-bag', '#E91E63', true, 1),
    ('00000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000005', 'Electronics', 'shopping-bag', '#E91E63', true, 2),
    ('00000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000005', 'Home Goods', 'shopping-bag', '#E91E63', true, 3),
    ('00000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000006', 'Doctor', 'heart', '#F44336', true, 1),
    ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000006', 'Pharmacy', 'heart', '#F44336', true, 2),
    ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000006', 'Health Insurance', 'heart', '#F44336', true, 3),
    ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000007', 'Tuition', 'book', '#3F51B5', true, 1),
    ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000007', 'Books', 'book', '#3F51B5', true, 2),
    ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000007', 'Courses', 'book', '#3F51B5', true, 3),
    ('00000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000008', 'Haircare', 'user', '#607D8B', true, 1),
    ('00000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000008', 'Gym', 'user', '#607D8B', true, 2),
    ('00000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000008', 'Subscriptions', 'user', '#607D8B', true, 3),
    ('00000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000009', 'Salary', 'dollar-sign', '#4CAF50', true, 1),
    ('00000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000009', 'Freelance', 'dollar-sign', '#4CAF50', true, 2),
    ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000009', 'Investments', 'dollar-sign', '#4CAF50', true, 3),
    ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000009', 'Refunds', 'dollar-sign', '#4CAF50', true, 4);
