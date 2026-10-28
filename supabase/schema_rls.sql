-- =============================================================================
-- SISTEMA DE RENDICIÓN DE CUENTAS Y CONTROL ADMINISTRATIVO
-- CONDOMINIO: RESIDENCIAS DAN TORRE A
-- RIF: J-29495522-3
-- DIRECCIÓN: Esquina de Puente Junin a Pescador, Av. Oeste 14, Parroquia San Juan, Caracas, Distrito Capital.
-- UNIDADES: 72 Apartamentos en partes iguales (Fórmula: Monto Total / 72)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Datos del Condominio
CREATE TABLE condominium_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL DEFAULT 'Residencias DAN Torre A',
    tax_id VARCHAR(50) UNIQUE NOT NULL DEFAULT 'J-29495522-3',
    address TEXT NOT NULL DEFAULT 'Esquina de Puente Junin a Pescador, Av. Oeste 14, Parroquia San Juan, Caracas, Distrito Capital.',
    total_units INT NOT NULL DEFAULT 72,
    reserve_fund_usd NUMERIC(12,2) DEFAULT 0.00,
    bank_balance_usd NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Usuarios (Solo Propietarios y Junta de Condominio)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('propietario', 'junta')),
    unit_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Períodos Contables Mensuales (Relación de Ingresos, Gastos y Cuentas por Cobrar)
CREATE TABLE monthly_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    exchange_rate_bs NUMERIC(10,4) DEFAULT 1.0000,
    total_income_usd NUMERIC(12,2) DEFAULT 0.00,
    total_expense_usd NUMERIC(12,2) DEFAULT 0.00,
    unit_share_usd NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(total_expense_usd / 72.0, 2)) STORED,
    accounts_receivable_usd NUMERIC(12,2) DEFAULT 0.00, -- Cuentas por cobrar del período
    solvent_units_count INT DEFAULT 0,
    receivable_units_count INT DEFAULT 0,
    notes TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, month)
);

-- 4. Rubros de Gastos
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL
);

-- 5. Gastos y Soportes de Facturas (Cargados directamente por la Junta de Condominio)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES monthly_periods(id) ON DELETE CASCADE,
    category_id UUID REFERENCES expense_categories(id),
    supplier_name VARCHAR(255) NOT NULL,
    supplier_tax_id VARCHAR(50) NOT NULL,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL, -- Monto total Torre A en USD ($)
    exchange_rate_bs NUMERIC(10,4) NOT NULL DEFAULT 1.0000,
    amount_bs NUMERIC(14,2) GENERATED ALWAYS AS (ROUND(amount * exchange_rate_bs, 2)) STORED,
    unit_share_usd NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(amount / 72.0, 2)) STORED, -- Fórmula: Monto / 72 apartamentos
    expense_date DATE DEFAULT CURRENT_DATE,
    invoice_url TEXT,
    invoice_number VARCHAR(100),
    control_number VARCHAR(100),
    audit_status VARCHAR(25) DEFAULT 'verificado' CHECK (audit_status IN ('verificado', 'pendiente', 'observado')),
    audit_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Avisos de Cobro y Cuentas por Cobrar por Apartamento (72 unidades)
CREATE TABLE unit_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES monthly_periods(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    receipt_number VARCHAR(50) NOT NULL,
    unit_number VARCHAR(50) NOT NULL,
    common_expenses_usd NUMERIC(12,2) NOT NULL, -- Total Gastos / 72
    reserve_fund_usd NUMERIC(12,2) NOT NULL,
    special_fee_usd NUMERIC(12,2) DEFAULT 0.00,
    total_usd NUMERIC(12,2) NOT NULL,
    exchange_rate_bs NUMERIC(10,4) NOT NULL,
    total_bs NUMERIC(14,2) NOT NULL,
    payment_status VARCHAR(30) DEFAULT 'Cuenta por cobrar' CHECK (payment_status IN ('Pagado', 'Cuenta por cobrar', 'En verificación')),
    payment_reference VARCHAR(100),
    paid_at DATE,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(period_id, unit_number)
);

-- Habilitar Row-Level Security (RLS)
ALTER TABLE monthly_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_receipts ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso:
-- 1. Propietarios ven períodos publicados; la Junta de Condominio gestiona todos los períodos
CREATE POLICY periods_access_policy ON monthly_periods
    FOR SELECT
    USING (status = 'published' OR current_setting('app.current_user_role', true) = 'junta');

-- 2. Solo la Junta de Condominio puede registrar o modificar gastos y facturas
CREATE POLICY expenses_junta_write_policy ON expenses
    FOR ALL
    USING (current_setting('app.current_user_role', true) = 'junta');
