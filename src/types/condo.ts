export type UserRole = 'propietario' | 'junta';

export type PeriodStatus = 'draft' | 'published';

export type PaymentStatus = 'Pagado' | 'Cuenta por cobrar' | 'En verificación';

export type AuditStatus = 'verificado' | 'pendiente' | 'observado';

export type RecordStatus = 'activo' | 'anulado';

export type ProjectStatus = 'finalizado' | 'en_ejecucion' | 'planificado';

export interface CondoProject {
  id: string;
  title: string;
  category: string;
  description: string;
  completion_date: string; // YYYY-MM-DD
  status: ProjectStatus;
  total_cost_usd: number;
  total_cost_bs: number;
  exchange_rate_bs: number;
  unit_share_usd: number; // Costo / 72
  supplier_or_contractor: string;
  before_image_url?: string;
  after_image_url: string; // Foto de evidencia del proyecto finalizado
  after_image_name?: string;
  storage_path?: string;
  invoice_number?: string;
  created_at: string;
}

export interface CondominiumInfo {
  id: string;
  name: string;
  tax_id: string; // J-29495522-3
  address: string;
  total_units: number; // 72 apartamentos
  reserve_fund_usd: number;
  bank_balance_usd: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  unit_number: string;
}

export interface MonthlyPeriod {
  id: string;
  year: number;
  month: number;
  label: string; // Ej: "Octubre 2026"
  status: PeriodStatus;
  exchange_rate_bs: number; // Tasa BCV Bs/USD
  total_income_usd: number; // Ingresos recaudados en el mes
  total_expense_usd: number; // Gastos totales del mes (se dividen entre 72)
  accounts_receivable_usd: number; // Cuentas por cobrar del período
  solvent_units_count: number; // Aptos al día de 72
  receivable_units_count: number; // Aptos con cuentas por cobrar de 72
  notes?: string;
  published_by?: string;
  published_at?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  color_hex: string;
}

export interface Expense {
  id: string;
  period_id: string;
  category_id: string;
  category_name: string;
  supplier_name: string;
  supplier_tax_id: string; // RIF
  description: string;
  amount: number; // Monto total USD ($)
  exchange_rate_bs: number;
  amount_bs: number; // Monto total Bs.
  unit_share_usd: number; // Monto / 72 apartamentos
  unit_share_bs: number; // (Monto / 72) * tasa
  expense_date: string; // YYYY-MM-DD
  invoice_url: string;
  invoice_number: string;
  control_number: string;
  evidence_image_url?: string; // Foto de evidencia física (ej. lámpara, bomba, repuesto)
  evidence_image_name?: string;
  storage_path?: string; // Ruta cronológica ej: 2026/10/factura_hidrocapital_172988.pdf
  evidence_storage_path?: string; // Ruta cronológica ej: 2026/10/evidencia_hidrocapital_172988.webp
  record_status?: RecordStatus; // Inmutabilidad contable: 'activo' | 'anulado'
  annulled_reason?: string;
  annulled_at?: string;
  audit_status: AuditStatus;
  audit_comment?: string;
  created_at: string;
}

export interface ReceiptLineItem {
  id: string;
  concept: string;
  category: 'Gasto Común del Mes' | 'Fondo de Reserva' | 'Cuota Especial' | 'Cargo Individual';
  tower_total_usd: number; // Monto total de la Torre A
  division_formula: string; // Ej: "Monto ÷ 72 aptos" o "Cargo directo"
  amount_usd: number; // Cuota por apartamento USD
  amount_bs: number; // Cuota por apartamento Bs.
  linked_expense_id?: string;
}

export interface UnitReceipt {
  id: string;
  period_id: string;
  period_label: string;
  user_id: string;
  owner_name: string;
  receipt_number: string;
  unit_number: string;
  common_expenses_usd: number; // Total Gastos Comunes / 72
  reserve_fund_usd: number; // Fondo de Reserva / 72
  special_fee_usd: number;
  total_usd: number;
  exchange_rate_bs: number;
  total_bs: number;
  payment_status: PaymentStatus;
  payment_reference?: string;
  paid_at?: string;
  due_date: string;
  items: ReceiptLineItem[];
}
