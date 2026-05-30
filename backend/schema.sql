-- Emergent / VyaparMind - Supabase Schema
-- Run this in the Supabase SQL Editor (https://app.supabase.com → SQL Editor)

-- ============== USERS ==============
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    business_name TEXT DEFAULT '',
    business_type TEXT DEFAULT '',
    language TEXT DEFAULT 'en',
    score INTEGER DEFAULT 0,
    plan TEXT DEFAULT NULL,
    plan_activated_at TIMESTAMPTZ DEFAULT NULL,
    plan_expires_at TIMESTAMPTZ DEFAULT NULL,
    plan_payment_id TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== TRANSACTIONS ==============
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'income' or 'expense'
    amount NUMERIC NOT NULL,
    category TEXT DEFAULT '',
    description TEXT DEFAULT '',
    party TEXT DEFAULT '',
    date TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== CONTACTS ==============
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    type TEXT DEFAULT 'customer',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== INVENTORY ==============
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    price NUMERIC DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    category TEXT DEFAULT '',
    low_stock_alert INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== UDHAR (Credit Book) ==============
CREATE TABLE IF NOT EXISTS udhar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    party TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT DEFAULT 'given', -- 'given' or 'received'
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    due_date TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== STAFF ==============
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    salary NUMERIC DEFAULT 0,
    join_date TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== STAFF PAYMENTS ==============
CREATE TABLE IF NOT EXISTS staff_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    month TEXT DEFAULT '',
    status TEXT DEFAULT 'paid',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== CONVERSATIONS ==============
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== BILLS ==============
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vendor TEXT DEFAULT '',
    amount NUMERIC DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    image_path TEXT DEFAULT '',
    ocr_text TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    date TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== INVOICES ==============
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    invoice_number TEXT DEFAULT '',
    customer_name TEXT DEFAULT '',
    customer_phone TEXT DEFAULT '',
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'draft',
    due_date TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== PAYMENT ORDERS ==============
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_id TEXT DEFAULT '',
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'created',
    plan TEXT DEFAULT '',
    payment_id TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== AUTOMATIONS ==============
CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT DEFAULT '',
    action_type TEXT DEFAULT '',
    config JSONB DEFAULT '{}'::jsonb,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== INSIGHTS ==============
CREATE TABLE IF NOT EXISTS insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT DEFAULT '',
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== SUBSCRIPTIONS ==============
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    payment_id TEXT DEFAULT '',
    starts_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== STORE PRODUCTS ==============
CREATE TABLE IF NOT EXISTS store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    description TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    category TEXT DEFAULT '',
    in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== STORE SETTINGS ==============
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    store_name TEXT DEFAULT '',
    store_url TEXT DEFAULT '',
    theme TEXT DEFAULT 'default',
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== ATTENDANCE ==============
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    staff_id UUID DEFAULT NULL,
    staff_name TEXT DEFAULT '',
    date TEXT DEFAULT '',
    status TEXT DEFAULT 'present',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== INDEXES for performance ==============
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_udhar_user ON udhar(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

-- ============== ROW LEVEL SECURITY (Optional but recommended) ==============
-- Enable RLS on all tables so users can only see their own data
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- (uncomment when ready to use Supabase Auth)
