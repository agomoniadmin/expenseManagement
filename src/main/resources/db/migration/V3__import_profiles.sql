CREATE TABLE import_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    account_id      UUID NOT NULL REFERENCES accounts(id),
    profile_name    VARCHAR(100) NOT NULL,
    date_column     VARCHAR(100) NOT NULL,
    merchant_column VARCHAR(100) NOT NULL,
    amount_column   VARCHAR(100) NOT NULL,
    type_column     VARCHAR(100),
    date_format     VARCHAR(50) NOT NULL DEFAULT 'MM/dd/yyyy',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_import_profile_user_account UNIQUE (user_id, account_id)
);

CREATE INDEX idx_import_profiles_user ON import_profiles(user_id);
