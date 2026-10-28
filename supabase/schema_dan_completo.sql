-- =============================================================================
-- BASE DE DATOS OFICIAL BLINDADA: RESIDENCIAS DAN TORRE A
-- RIF: J-29495522-3 | 72 Apartamentos
-- Plataforma: Supabase (PostgreSQL + RLS + Bucket Privado con Signed URLs)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TABLA: DATOS DEL CONDOMINIO Y SALDO EN BANCO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS condominium_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL DEFAULT 'Residencias DAN Torre A',
    tax_id VARCHAR(50) UNIQUE NOT NULL DEFAULT 'J-29495522-3',
    address TEXT NOT NULL DEFAULT 'Esquina de Puente Junin a Pescador, Av. Oeste 14, Parroquia San Juan, Caracas, Distrito Capital.',
    total_units INT NOT NULL DEFAULT 72,
    reserve_fund_usd NUMERIC(12,2) DEFAULT 6480.00,
    bank_balance_usd NUMERIC(12,2) DEFAULT 4920.50,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO condominium_info (name, tax_id, address, total_units, reserve_fund_usd, bank_balance_usd)
VALUES (
    'Residencias DAN Torre A',
    'J-29495522-3',
    'Esquina de Puente Junin a Pescador, Av. Oeste 14, Parroquia San Juan, Caracas, Distrito Capital.',
    72,
    6480.00,
    4920.50
)
ON CONFLICT (tax_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. TABLA: USUARIOS AUTORIZADOS (PARA CONTROL DE ROLES UUID EN RLS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('propietario', 'junta', 'tesorero', 'auditor')),
    apartment VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. TABLA: CUENTAS BANCARIAS OFICIALES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(10) NOT NULL,
    account_type VARCHAR(50) NOT NULL DEFAULT 'Cuenta Corriente',
    account_number VARCHAR(50) NOT NULL,
    holder_name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO bank_accounts (bank_name, bank_code, account_type, account_number, holder_name, tax_id)
VALUES (
    'Banco Mercantil',
    '0105',
    'Cuenta Corriente',
    '0105-0024-81-1024356789',
    'Condominio Residencias DAN Torre A',
    'J-29495522-3'
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. TABLA: DIRECTORIO DE LA JUNTA DE CONDOMINIO (3 Principales y hasta 3 Suplentes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS board_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('principal', 'suplente')),
    apartment VARCHAR(50) NOT NULL,
    initials VARCHAR(10),
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO board_members (name, role, category, apartment, initials, order_index)
VALUES 
    ('Carlos Mendoza', 'Presidente', 'principal', '92-A', 'CM', 1),
    ('Elena Vásquez', 'Tesorera', 'principal', '41-A', 'EV', 2),
    ('Patricia Gómez', 'Secretaria', 'principal', '21-A', 'PG', 3),
    ('R. D''Alessandro', '1er Vocal Suplente', 'suplente', '63-A', 'RD', 4)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. TABLA: PERÍODOS MENSUALES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monthly_periods (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    exchange_rate_bs NUMERIC(10,2) NOT NULL DEFAULT 54.85,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published')),
    accounts_receivable_usd NUMERIC(12,2) DEFAULT 2219.40,
    solvent_units_count INT DEFAULT 52,
    receivable_units_count INT DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO monthly_periods (id, label, year, month, exchange_rate_bs, accounts_receivable_usd, solvent_units_count, receivable_units_count)
VALUES 
    ('per-2026-10', 'Octubre 2026', 2026, 10, 54.85, 2219.40, 52, 20),
    ('per-2026-09', 'Septiembre 2026', 2026, 9, 52.30, 1980.00, 50, 22),
    ('per-2026-08', 'Agosto 2026', 2026, 8, 49.90, 2110.00, 48, 24)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. TABLA: CATEGORÍAS DE GASTOS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color_hex VARCHAR(20) NOT NULL DEFAULT '#1d4ed8'
);

-- -----------------------------------------------------------------------------
-- 7. TABLA: GASTOS Y FACTURAS (INMUTABILIDAD CONTABLE: SIN BORRADO FÍSICO)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id VARCHAR(50) NOT NULL REFERENCES monthly_periods(id) ON DELETE RESTRICT,
    category_id VARCHAR(50),
    category_name VARCHAR(150) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_tax_id VARCHAR(50) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    control_number VARCHAR(100),
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    exchange_rate_bs NUMERIC(10,2) NOT NULL,
    amount_bs NUMERIC(14,2) NOT NULL,
    unit_share_usd NUMERIC(10,2) NOT NULL,
    unit_share_bs NUMERIC(12,2) NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    invoice_url TEXT,
    invoice_file_name VARCHAR(255),
    storage_path TEXT, -- Ej: 2026/10/factura_hidrocapital_172988.pdf
    evidence_url TEXT,
    evidence_file_name VARCHAR(255),
    evidence_storage_path TEXT, -- Ej: 2026/10/evidencia_hidrocapital_172988.webp
    record_status VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (record_status IN ('activo', 'anulado')),
    annulled_reason TEXT,
    annulled_at TIMESTAMPTZ,
    audit_status VARCHAR(30) DEFAULT 'verificado' CHECK (audit_status IN ('verificado', 'pendiente', 'observado')),
    audit_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger de Inmutabilidad Contable: Prohibir DELETE físico en facturas
CREATE OR REPLACE FUNCTION prevent_expense_physical_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operación bloqueada por integridad contable: No se permite borrar físicamente facturas. Cambie record_status a ''anulado''.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_expense_delete ON expenses;
CREATE TRIGGER trg_prevent_expense_delete
BEFORE DELETE ON expenses
FOR EACH ROW EXECUTE FUNCTION prevent_expense_physical_delete();

-- -----------------------------------------------------------------------------
-- 8. TABLA: PROYECTOS EJECUTADOS Y FINALIZADOS DEL CONDOMINIO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS condo_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    completion_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'finalizado' CHECK (status IN ('finalizado', 'en_ejecucion', 'planificado')),
    total_cost_usd NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_cost_bs NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    exchange_rate_bs NUMERIC(10,2) NOT NULL DEFAULT 54.85,
    unit_share_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    supplier_or_contractor VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(100),
    after_image_url TEXT NOT NULL,
    after_image_name VARCHAR(255),
    storage_path TEXT, -- Ej: 2026/10/proyecto_iluminacion_led_172891.webp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. TABLA: RELACIÓN DE DEUDA Y RECIBOS POR APARTAMENTO (72 UNIDADES)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receivables (
    apartment VARCHAR(20) PRIMARY KEY,
    pending_months INT NOT NULL DEFAULT 0,
    amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    period_range TEXT,
    status VARCHAR(50) DEFAULT 'Cuenta por cobrar',
    bracket VARCHAR(10) DEFAULT '0',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. SEGURIDAD: HABILITAR ROW LEVEL SECURITY (RLS) EN EL 100% DE LAS TABLAS
-- -----------------------------------------------------------------------------
ALTER TABLE condominium_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE condo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para validar si el usuario autenticado es Administrador / Tesorero de la Junta
CREATE OR REPLACE FUNCTION is_junta_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role IN ('junta', 'tesorero')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas de Lectura (SELECT): Permitidas para consulta de transparencia y keep-alive
CREATE POLICY "select_condominium_info" ON condominium_info FOR SELECT USING (true);
CREATE POLICY "select_bank_accounts" ON bank_accounts FOR SELECT USING (true);
CREATE POLICY "select_board_members" ON board_members FOR SELECT USING (true);
CREATE POLICY "select_monthly_periods" ON monthly_periods FOR SELECT USING (true);
CREATE POLICY "select_expense_categories" ON expense_categories FOR SELECT USING (true);
CREATE POLICY "select_expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "select_condo_projects" ON condo_projects FOR SELECT USING (true);
CREATE POLICY "select_receivables" ON receivables FOR SELECT USING (true);
CREATE POLICY "select_own_profile" ON user_profiles FOR SELECT USING (auth.uid() = id);

-- Políticas de Escritura (INSERT / UPDATE): Solo Junta / Tesorería (Sin permiso de DELETE en expenses)
CREATE POLICY "write_expenses_junta" ON expenses FOR INSERT WITH CHECK (is_junta_admin());
CREATE POLICY "update_expenses_junta" ON expenses FOR UPDATE USING (is_junta_admin());
CREATE POLICY "write_projects_junta" ON condo_projects FOR ALL USING (is_junta_admin());
CREATE POLICY "write_board_junta" ON board_members FOR ALL USING (is_junta_admin());
CREATE POLICY "write_bank_junta" ON bank_accounts FOR ALL USING (is_junta_admin());
CREATE POLICY "write_condo_junta" ON condominium_info FOR UPDATE USING (is_junta_admin());
CREATE POLICY "write_receivables_junta" ON receivables FOR ALL USING (is_junta_admin());
CREATE POLICY "write_periods_junta" ON monthly_periods FOR ALL USING (is_junta_admin());

-- -----------------------------------------------------------------------------
-- 11. BUCKET PRIVADO DE STORAGE ('soportes') CON RESTRICCIÓN MIME Y MÁXIMO 3 MB
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'soportes',
    'soportes',
    false, -- PRIVADO: Requiere URLs Firmadas (Signed URLs de 60s)
    3145728, -- Límite estricto de 3 MB (3 * 1024 * 1024 bytes)
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 3145728,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- Políticas RLS para el Bucket Privado 'soportes':
CREATE POLICY "Lectura mediante Signed URLs"
ON storage.objects FOR SELECT
USING (bucket_id = 'soportes');

CREATE POLICY "Subida exclusiva para Junta"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'soportes' AND is_junta_admin());

CREATE POLICY "Eliminación de reemplazos huérfanos para Junta"
ON storage.objects FOR DELETE
USING (bucket_id = 'soportes' AND is_junta_admin());
