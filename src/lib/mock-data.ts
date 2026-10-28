import {
  CondominiumInfo,
  UserProfile,
  MonthlyPeriod,
  ExpenseCategory,
  Expense,
  UnitReceipt,
  CondoProject,
} from '@/types/condo';

export const CONDOMINIUM_DATA: CondominiumInfo = {
  id: 'residencias-dan-torre-a',
  name: 'Residencias DAN Torre A',
  tax_id: 'J-29495522-3',
  address:
    'Esquina de Puente Junin a Pescador, Av. Oeste 14, Parroquia San Juan, Caracas, Distrito Capital.',
  total_units: 72,
  reserve_fund_usd: 6480.0,
  bank_balance_usd: 4920.5,
};

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-propietario-01',
    email: 'propietario@residenciasdan.com',
    full_name: 'Propietario — Apartamento 14-A',
    role: 'propietario',
    unit_number: 'Apto 14-A',
  },
  {
    id: 'usr-junta-01',
    email: 'junta.torrea@residenciasdan.com',
    full_name: 'Junta de Condominio — Torre A',
    role: 'junta',
    unit_number: 'Junta Directiva',
  },
];

export const INITIAL_CATEGORIES: ExpenseCategory[] = [
  {
    id: 'cat-01',
    name: 'Mantenimiento de Ascensores y Bombas',
    color_hex: '#1e3a8a',
  },
  {
    id: 'cat-02',
    name: 'Servicios Públicos (Hidrocapital, Corpoelec, Aseo)',
    color_hex: '#0f766e',
  },
  {
    id: 'cat-03',
    name: 'Conserjería e Insumos de Limpieza',
    color_hex: '#334155',
  },
  {
    id: 'cat-04',
    name: 'Vigilancia, Accesos y Portones',
    color_hex: '#4338ca',
  },
  {
    id: 'cat-05',
    name: 'Reparaciones Generales y Áreas Comunes',
    color_hex: '#b45309',
  },
];

export const INITIAL_PERIODS: MonthlyPeriod[] = [
  {
    id: 'per-2026-10',
    year: 2026,
    month: 10,
    label: 'Octubre 2026',
    status: 'published',
    exchange_rate_bs: 54.85,
    total_income_usd: 3180.0,
    total_expense_usd: 2880.0, // Exactamente $40.00 USD por apartamento ($2,880 / 72 = $40.00)
    accounts_receivable_usd: 2012.2, // Total acumulado en cuentas por cobrar de los 20 apartamentos con recibos pendientes
    solvent_units_count: 52,
    receivable_units_count: 20,
    published_by: 'Junta de Condominio — Residencias DAN Torre A',
    published_at: '2026-10-16',
    notes:
      'Relación de ingresos y gastos de Octubre 2026 cerrada y soportada con sus respectivas facturas.',
  },
  {
    id: 'per-2026-09',
    year: 2026,
    month: 9,
    label: 'Septiembre 2026',
    status: 'published',
    exchange_rate_bs: 53.20,
    total_income_usd: 3090.0,
    total_expense_usd: 2736.0, // $2,736 / 72 = $38.00 USD por apartamento
    accounts_receivable_usd: 1640.0,
    solvent_units_count: 56,
    receivable_units_count: 16,
    published_by: 'Junta de Condominio — Residencias DAN Torre A',
    published_at: '2026-09-29',
    notes: 'Corte contable de Septiembre 2026 conciliado contra cuenta bancaria del condominio.',
  },
  {
    id: 'per-2026-08',
    year: 2026,
    month: 8,
    label: 'Agosto 2026',
    status: 'published',
    exchange_rate_bs: 52.10,
    total_income_usd: 2940.0,
    total_expense_usd: 2592.0, // $2,592 / 72 = $36.00 USD por apartamento
    accounts_receivable_usd: 1390.0,
    solvent_units_count: 58,
    receivable_units_count: 14,
    published_by: 'Junta de Condominio — Residencias DAN Torre A',
    published_at: '2026-08-30',
    notes: 'Relación mensual de Agosto 2026.',
  },
  {
    id: 'per-2026-11',
    year: 2026,
    month: 11,
    label: 'Noviembre 2026 (En Carga)',
    status: 'draft',
    exchange_rate_bs: 55.40,
    total_income_usd: 1420.0,
    total_expense_usd: 1296.0, // $1,296 / 72 = $18.00 USD parcial
    accounts_receivable_usd: 2180.0,
    solvent_units_count: 34,
    receivable_units_count: 38,
    notes: 'Relación en proceso de carga por la Junta de Condominio.',
  },
  {
    id: 'per-2025-12',
    year: 2025,
    month: 12,
    label: 'Diciembre 2025',
    status: 'published',
    exchange_rate_bs: 48.50,
    total_income_usd: 2810.0,
    total_expense_usd: 2448.0, // $2,448 / 72 = $34.00 USD por apartamento
    accounts_receivable_usd: 1120.0,
    solvent_units_count: 60,
    receivable_units_count: 12,
    published_by: 'Junta de Condominio — Residencias DAN Torre A',
    published_at: '2025-12-29',
    notes: 'Cierre anual de Diciembre 2025.',
  },
];

export const INITIAL_EXPENSES: Expense[] = [
  // OCTUBRE 2026 — Total Gastos Comunes: $2,880.00 USD (Cuota parte = $40.00 USD por cada uno de los 72 apartamentos)
  {
    id: 'exp-10-01',
    period_id: 'per-2026-10',
    category_id: 'cat-01',
    category_name: 'Mantenimiento de Ascensores y Bombas',
    supplier_name: 'Tracción y Ascensores Libertador C.A.',
    supplier_tax_id: 'J-30491820-4',
    description:
      'Mantenimiento preventivo mensual de ascensores par e impar de Torre A, ajuste de puertas y revisión de frenos',
    amount: 792.0, // $11.00 por apto
    exchange_rate_bs: 54.85,
    amount_bs: 43441.2,
    unit_share_usd: 11.0,
    unit_share_bs: 603.35,
    expense_date: '2026-10-05',
    invoice_url: 'torre-a/2026-10/FAC-004821-ascensores.pdf',
    invoice_number: 'FAC-004821',
    control_number: '00-089124',
    audit_status: 'verificado',
    audit_comment: 'Servicio ejecutado y firmado por la Junta de Condominio.',
    created_at: '2026-10-05T10:00:00Z',
  },
  {
    id: 'exp-10-02',
    period_id: 'per-2026-10',
    category_id: 'cat-01',
    category_name: 'Mantenimiento de Ascensores y Bombas',
    supplier_name: 'Hidroneumáticos San Juan C.A.',
    supplier_tax_id: 'J-29810411-2',
    description:
      'Mantenimiento del sistema hidroneumático Torre A, cambio de presostato y revisión de bombas de agua',
    amount: 432.0, // $6.00 por apto
    exchange_rate_bs: 54.85,
    amount_bs: 23695.2,
    unit_share_usd: 6.0,
    unit_share_bs: 329.1,
    expense_date: '2026-10-08',
    invoice_url: 'torre-a/2026-10/FAC-001920-hidro.pdf',
    invoice_number: 'FAC-001920',
    control_number: '00-031902',
    audit_status: 'verificado',
    audit_comment: 'Garantía de repuestos por 90 días.',
    created_at: '2026-10-08T14:20:00Z',
  },
  {
    id: 'exp-10-03',
    period_id: 'per-2026-10',
    category_id: 'cat-02',
    category_name: 'Servicios Públicos (Hidrocapital, Corpoelec, Aseo)',
    supplier_name: 'Hidrocapital / Corpoelec / Supra Caracas',
    supplier_tax_id: 'G-20005912-1',
    description:
      'Facturación mensual de agua potable, electricidad de áreas comunes (pasillos, bombas y ascensores) y aseo urbano',
    amount: 576.0, // $8.00 por apto
    exchange_rate_bs: 54.85,
    amount_bs: 31593.6,
    unit_share_usd: 8.0,
    unit_share_bs: 438.8,
    expense_date: '2026-10-11',
    invoice_url: 'torre-a/2026-10/REC-SERVICIOS-102026.pdf',
    invoice_number: 'SER-2026-10',
    control_number: '00-771029',
    audit_status: 'verificado',
    audit_comment: 'Recibos pagados por banca en línea.',
    created_at: '2026-10-11T11:30:00Z',
  },
  {
    id: 'exp-10-04',
    period_id: 'per-2026-10',
    category_id: 'cat-03',
    category_name: 'Conserjería e Insumos de Limpieza',
    supplier_name: 'Distribuidora de Insumos El Centro C.A. / Mantenimiento Áreas',
    supplier_tax_id: 'J-40129384-6',
    description:
      'Servicio de limpieza de pasillos, escaleras, planta baja y suministro de cloro, desinfectante y bolsas industriales',
    amount: 504.0, // $7.00 por apto
    exchange_rate_bs: 54.85,
    amount_bs: 27644.4,
    unit_share_usd: 7.0,
    unit_share_bs: 383.95,
    expense_date: '2026-10-12',
    invoice_url: 'torre-a/2026-10/FAC-009281-limpieza.pdf',
    invoice_number: 'FAC-009281',
    control_number: '00-441092',
    audit_status: 'verificado',
    created_at: '2026-10-12T15:10:00Z',
  },
  {
    id: 'exp-10-05',
    period_id: 'per-2026-10',
    category_id: 'cat-04',
    category_name: 'Vigilancia, Accesos y Portones',
    supplier_name: 'Herrería y Automatismos Junín C.A.',
    supplier_tax_id: 'J-31649201-8',
    description:
      'Mantenimiento de portón vehicular Av. Oeste 14, cerradura electromagnética peatonal y control de acceso',
    amount: 360.0, // $5.00 por apto
    exchange_rate_bs: 54.85,
    amount_bs: 19746.0,
    unit_share_usd: 5.0,
    unit_share_bs: 274.25,
    expense_date: '2026-10-14',
    invoice_url: 'torre-a/2026-10/FAC-002109-porton.pdf',
    invoice_number: 'FAC-002109',
    control_number: '00-118290',
    evidence_image_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%231e293b"/><rect x="20" y="20" width="560" height="360" rx="16" fill="%230f172a" stroke="%2310b981" stroke-width="2"/><rect x="180" y="100" width="240" height="130" rx="12" fill="%23334155" stroke="%2364748b" stroke-width="3"/><circle cx="230" cy="165" r="24" fill="%2310b981" opacity="0.9"/><rect x="280" y="135" width="110" height="14" rx="4" fill="%23e2e8f0"/><rect x="280" y="160" width="80" height="10" rx="3" fill="%2394a3b8"/><rect x="280" y="180" width="95" height="10" rx="3" fill="%2394a3b8"/><text x="300" y="280" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="16" font-weight="bold">FOTO EVIDENCIA: RECEPTOR Y CONTROL DE ACCESO</text><text x="300" y="310" text-anchor="middle" fill="%2334d399" font-family="sans-serif" font-size="13" font-weight="bold">Residencias DAN Torre A — Port%C3%B3n Av. Oeste 14</text><text x="300" y="338" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="11">Factura FAC-002109 • Herrer%C3%ADa Jun%C3%ADn C.A.</text></svg>',
    evidence_image_name: 'Foto_Motor_Control_Porton.jpg',
    audit_status: 'verificado',
    created_at: '2026-10-14T16:00:00Z',
  },
  {
    id: 'exp-10-06',
    period_id: 'per-2026-10',
    category_id: 'cat-05',
    category_name: 'Reparaciones Generales y Áreas Comunes',
    supplier_name: 'Ferretería y Suministros Eléctricos San Juan C.A.',
    supplier_tax_id: 'J-30918273-0',
    description:
      'Sustitución de luminarias LED en pasillos de pisos 1 al 12 y brekers de tablero de servicios generales',
    amount: 216.0, // $3.00 por apto
    exchange_rate_bs: 54.85,
    amount_bs: 11847.6,
    unit_share_usd: 3.0,
    unit_share_bs: 164.55,
    expense_date: '2026-10-15',
    invoice_url: 'torre-a/2026-10/FAC-015402-electricidad.pdf',
    invoice_number: 'FAC-015402',
    control_number: '00-552019',
    evidence_image_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%231e293b"/><rect x="20" y="20" width="560" height="360" rx="16" fill="%230f172a" stroke="%2338bdf8" stroke-width="2"/><circle cx="300" cy="150" r="60" fill="%23fef08a" opacity="0.95"/><rect x="288" y="55" width="24" height="40" fill="%2394a3b8" rx="4"/><line x1="300" y1="20" x2="300" y2="55" stroke="%23cbd5e1" stroke-width="4"/><text x="300" y="270" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="16" font-weight="bold">FOTO EVIDENCIA: LUMINARIAS LED 18W INSTALADAS</text><text x="300" y="300" text-anchor="middle" fill="%2338bdf8" font-family="sans-serif" font-size="13" font-weight="bold">Residencias DAN Torre A — Pasillos Pisos 1 al 12</text><text x="300" y="328" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="11">Factura FAC-015402 • Ferreter%C3%ADa San Juan C.A.</text></svg>',
    evidence_image_name: 'Foto_Lamparas_LED_Pisos_Torre_A.jpg',
    audit_status: 'verificado',
    created_at: '2026-10-15T12:00:00Z',
  },

  // SEPTIEMBRE 2026 — Total Gastos Comunes: $2,736.00 USD ($38.00 por apartamento)
  {
    id: 'exp-09-01',
    period_id: 'per-2026-09',
    category_id: 'cat-01',
    category_name: 'Mantenimiento de Ascensores y Bombas',
    supplier_name: 'Tracción y Ascensores Libertador C.A.',
    supplier_tax_id: 'J-30491820-4',
    description: 'Mantenimiento mensual de ascensores Torre A y sustitución de zapatas guías',
    amount: 1080.0,
    exchange_rate_bs: 53.20,
    amount_bs: 57456.0,
    unit_share_usd: 15.0,
    unit_share_bs: 798.0,
    expense_date: '2026-09-07',
    invoice_url: 'torre-a/2026-09/FAC-004690-ascensores.pdf',
    invoice_number: 'FAC-004690',
    control_number: '00-088901',
    audit_status: 'verificado',
    created_at: '2026-09-07T10:00:00Z',
  },
  {
    id: 'exp-09-02',
    period_id: 'per-2026-09',
    category_id: 'cat-02',
    category_name: 'Servicios Públicos (Hidrocapital, Corpoelec, Aseo)',
    supplier_name: 'Hidrocapital / Corpoelec / Supra Caracas',
    supplier_tax_id: 'G-20005912-1',
    description: 'Servicios públicos áreas comunes Torre A (Septiembre 2026)',
    amount: 576.0,
    exchange_rate_bs: 53.20,
    amount_bs: 30643.2,
    unit_share_usd: 8.0,
    unit_share_bs: 425.6,
    expense_date: '2026-09-12',
    invoice_url: 'torre-a/2026-09/REC-SERVICIOS-092026.pdf',
    invoice_number: 'SER-2026-09',
    control_number: '00-770811',
    audit_status: 'verificado',
    created_at: '2026-09-12T11:00:00Z',
  },
  {
    id: 'exp-09-03',
    period_id: 'per-2026-09',
    category_id: 'cat-03',
    category_name: 'Conserjería e Insumos de Limpieza',
    supplier_name: 'Distribuidora de Insumos El Centro C.A.',
    supplier_tax_id: 'J-40129384-6',
    description: 'Mantenimiento y limpieza de áreas comunes Torre A',
    amount: 504.0,
    exchange_rate_bs: 53.20,
    amount_bs: 26812.8,
    unit_share_usd: 7.0,
    unit_share_bs: 372.4,
    expense_date: '2026-09-15',
    invoice_url: 'torre-a/2026-09/FAC-009102-limpieza.pdf',
    invoice_number: 'FAC-009102',
    control_number: '00-440810',
    audit_status: 'verificado',
    created_at: '2026-09-15T14:00:00Z',
  },
  {
    id: 'exp-09-04',
    period_id: 'per-2026-09',
    category_id: 'cat-05',
    category_name: 'Reparaciones Generales y Áreas Comunes',
    supplier_name: 'Plomería e Impermeabilizaciones Caracas C.A.',
    supplier_tax_id: 'J-31209481-5',
    description: 'Destape y mantenimiento de bajante de aguas de lluvia planta baja Torre A',
    amount: 576.0,
    exchange_rate_bs: 53.20,
    amount_bs: 30643.2,
    unit_share_usd: 8.0,
    unit_share_bs: 425.6,
    expense_date: '2026-09-20',
    invoice_url: 'torre-a/2026-09/FAC-003112-plomeria.pdf',
    invoice_number: 'FAC-003112',
    control_number: '00-219041',
    audit_status: 'verificado',
    created_at: '2026-09-20T16:00:00Z',
  },

  // NOVIEMBRE 2026 (Borrador en carga por la Junta)
  {
    id: 'exp-11-01',
    period_id: 'per-2026-11',
    category_id: 'cat-01',
    category_name: 'Mantenimiento de Ascensores y Bombas',
    supplier_name: 'Tracción y Ascensores Libertador C.A.',
    supplier_tax_id: 'J-30491820-4',
    description: 'Mantenimiento preventivo mensual de ascensores Torre A (Noviembre 2026)',
    amount: 792.0,
    exchange_rate_bs: 55.40,
    amount_bs: 43876.8,
    unit_share_usd: 11.0,
    unit_share_bs: 609.4,
    expense_date: '2026-11-04',
    invoice_url: 'torre-a/2026-11/FAC-004950-ascensores.pdf',
    invoice_number: 'FAC-004950',
    control_number: '00-089510',
    audit_status: 'verificado',
    created_at: '2026-11-04T09:30:00Z',
  },
  {
    id: 'exp-11-02',
    period_id: 'per-2026-11',
    category_id: 'cat-03',
    category_name: 'Conserjería e Insumos de Limpieza',
    supplier_name: 'Distribuidora de Insumos El Centro C.A.',
    supplier_tax_id: 'J-40129384-6',
    description: 'Adelanto compra de insumos de limpieza y mantenimiento de áreas comunes',
    amount: 504.0,
    exchange_rate_bs: 55.40,
    amount_bs: 27921.6,
    unit_share_usd: 7.0,
    unit_share_bs: 387.8,
    expense_date: '2026-11-06',
    invoice_url: 'torre-a/2026-11/FAC-009410-limpieza.pdf',
    invoice_number: 'FAC-009410',
    control_number: '00-441500',
    audit_status: 'pendiente',
    created_at: '2026-11-06T11:15:00Z',
  },

  // AGOSTO 2026 — Total Gastos Comunes: $2,592.00 USD ($36.00 por apartamento)
  {
    id: 'exp-08-01',
    period_id: 'per-2026-08',
    category_id: 'cat-01',
    category_name: 'Mantenimiento de Ascensores y Bombas',
    supplier_name: 'Tracción y Ascensores Libertador C.A.',
    supplier_tax_id: 'J-30491820-4',
    description: 'Mantenimiento preventivo mensual de ascensores Torre A (Agosto 2026)',
    amount: 936.0,
    exchange_rate_bs: 52.10,
    amount_bs: 48765.6,
    unit_share_usd: 13.0,
    unit_share_bs: 677.3,
    expense_date: '2026-08-06',
    invoice_url: 'torre-a/2026-08/FAC-004512-ascensores.pdf',
    invoice_number: 'FAC-004512',
    control_number: '00-088120',
    audit_status: 'verificado',
    created_at: '2026-08-06T10:00:00Z',
  },
  {
    id: 'exp-08-02',
    period_id: 'per-2026-08',
    category_id: 'cat-02',
    category_name: 'Servicios Públicos (Hidrocapital, Corpoelec, Aseo)',
    supplier_name: 'Hidrocapital / Corpoelec / Supra Caracas',
    supplier_tax_id: 'G-20005912-1',
    description: 'Servicios públicos áreas comunes Torre A (Agosto 2026)',
    amount: 576.0,
    exchange_rate_bs: 52.10,
    amount_bs: 30009.6,
    unit_share_usd: 8.0,
    unit_share_bs: 416.8,
    expense_date: '2026-08-11',
    invoice_url: 'torre-a/2026-08/REC-SERVICIOS-082026.pdf',
    invoice_number: 'SER-2026-08',
    control_number: '00-770410',
    audit_status: 'verificado',
    created_at: '2026-08-11T11:00:00Z',
  },
  {
    id: 'exp-08-03',
    period_id: 'per-2026-08',
    category_id: 'cat-03',
    category_name: 'Conserjería e Insumos de Limpieza',
    supplier_name: 'Distribuidora de Insumos El Centro C.A.',
    supplier_tax_id: 'J-40129384-6',
    description: 'Mantenimiento y limpieza de áreas comunes Torre A (Agosto 2026)',
    amount: 504.0,
    exchange_rate_bs: 52.10,
    amount_bs: 26258.4,
    unit_share_usd: 7.0,
    unit_share_bs: 364.7,
    expense_date: '2026-08-15',
    invoice_url: 'torre-a/2026-08/FAC-008910-limpieza.pdf',
    invoice_number: 'FAC-008910',
    control_number: '00-440210',
    audit_status: 'verificado',
    created_at: '2026-08-15T14:00:00Z',
  },
  {
    id: 'exp-08-04',
    period_id: 'per-2026-08',
    category_id: 'cat-04',
    category_name: 'Vigilancia, Accesos y Portones',
    supplier_name: 'Herrería y Automatismos Junín C.A.',
    supplier_tax_id: 'J-31649201-8',
    description: 'Ajuste de brazos hidráulicos y cerradura peatonal Torre A',
    amount: 576.0,
    exchange_rate_bs: 52.10,
    amount_bs: 30009.6,
    unit_share_usd: 8.0,
    unit_share_bs: 416.8,
    expense_date: '2026-08-21',
    invoice_url: 'torre-a/2026-08/FAC-001980-porton.pdf',
    invoice_number: 'FAC-001980',
    control_number: '00-117900',
    audit_status: 'verificado',
    created_at: '2026-08-21T16:00:00Z',
  },

  // DICIEMBRE 2025 — Total Gastos Comunes: $2,448.00 USD ($34.00 por apartamento)
  {
    id: 'exp-1225-01',
    period_id: 'per-2025-12',
    category_id: 'cat-01',
    category_name: 'Mantenimiento de Ascensores y Bombas',
    supplier_name: 'Tracción y Ascensores Libertador C.A.',
    supplier_tax_id: 'J-30491820-4',
    description: 'Mantenimiento preventivo mensual de ascensores Torre A (Diciembre 2025)',
    amount: 864.0,
    exchange_rate_bs: 48.50,
    amount_bs: 41904.0,
    unit_share_usd: 12.0,
    unit_share_bs: 582.0,
    expense_date: '2025-12-08',
    invoice_url: 'torre-a/2025-12/FAC-003910-ascensores.pdf',
    invoice_number: 'FAC-003910',
    control_number: '00-081200',
    audit_status: 'verificado',
    created_at: '2025-12-08T10:00:00Z',
  },
  {
    id: 'exp-1225-02',
    period_id: 'per-2025-12',
    category_id: 'cat-02',
    category_name: 'Servicios Públicos (Hidrocapital, Corpoelec, Aseo)',
    supplier_name: 'Hidrocapital / Corpoelec / Supra Caracas',
    supplier_tax_id: 'G-20005912-1',
    description: 'Servicios públicos áreas comunes Torre A (Diciembre 2025)',
    amount: 576.0,
    exchange_rate_bs: 48.50,
    amount_bs: 27936.0,
    unit_share_usd: 8.0,
    unit_share_bs: 388.0,
    expense_date: '2025-12-14',
    invoice_url: 'torre-a/2025-12/REC-SERVICIOS-122025.pdf',
    invoice_number: 'SER-2025-12',
    control_number: '00-765001',
    audit_status: 'verificado',
    created_at: '2025-12-14T11:00:00Z',
  },
  {
    id: 'exp-1225-03',
    period_id: 'per-2025-12',
    category_id: 'cat-03',
    category_name: 'Conserjería e Insumos de Limpieza',
    supplier_name: 'Distribuidora de Insumos El Centro C.A.',
    supplier_tax_id: 'J-40129384-6',
    description: 'Limpieza general e insumos de cierre de año Torre A (Diciembre 2025)',
    amount: 504.0,
    exchange_rate_bs: 48.50,
    amount_bs: 24444.0,
    unit_share_usd: 7.0,
    unit_share_bs: 339.5,
    expense_date: '2025-12-18',
    invoice_url: 'torre-a/2025-12/FAC-008100-limpieza.pdf',
    invoice_number: 'FAC-008100',
    control_number: '00-431900',
    audit_status: 'verificado',
    created_at: '2025-12-18T14:00:00Z',
  },
  {
    id: 'exp-1225-04',
    period_id: 'per-2025-12',
    category_id: 'cat-05',
    category_name: 'Reparaciones Generales y Áreas Comunes',
    supplier_name: 'Pinturas y Mantenimiento San Juan C.A.',
    supplier_tax_id: 'J-30819200-1',
    description: 'Pintura y reacondicionamiento de hall de entrada Planta Baja Torre A',
    amount: 504.0,
    exchange_rate_bs: 48.50,
    amount_bs: 24444.0,
    unit_share_usd: 7.0,
    unit_share_bs: 339.5,
    expense_date: '2025-12-22',
    invoice_url: 'torre-a/2025-12/FAC-001120-pintura.pdf',
    invoice_number: 'FAC-001120',
    control_number: '00-192011',
    audit_status: 'verificado',
    created_at: '2025-12-22T15:00:00Z',
  },
];

export const INITIAL_RECEIPTS: UnitReceipt[] = [
  {
    id: 'rec-2026-10-14a',
    period_id: 'per-2026-10',
    period_label: 'Octubre 2026',
    user_id: 'usr-propietario-01',
    owner_name: 'Propietario Apartamento 14-A',
    receipt_number: 'DAN-A-2026-10-14A',
    unit_number: '14-A',
    common_expenses_usd: 40.0,
    reserve_fund_usd: 4.0,
    special_fee_usd: 8.8,
    total_usd: 52.8,
    exchange_rate_bs: 54.85,
    total_bs: 2896.08,
    payment_status: 'Pagado',
    payment_reference: 'PAGO-MOVIL-0102-884920',
    paid_at: '2026-10-18',
    due_date: '2026-10-25',
    items: [],
  },
];

// =============================================================================
// RELACIÓN DE APARTAMENTOS Y CUENTAS POR COBRAR (72 APARTAMENTOS)
// Nomenclatura: piso + número de apto + "-A" (Torre A). 4 apartamentos por piso.
// Ej.: piso 1, apto 4 => "14-A"; piso 10, apto 1 => "101-A"; piso 18, apto 4 => "184-A"
// =============================================================================
export type DebtBracketKey = 'ALL' | '0' | '1' | '2' | '3' | '4+';

export const TOTAL_FLOORS = 18;
export const APARTMENTS_PER_FLOOR = 4;

export const buildUnitLabel = (floor: number, apt: number) => `${floor}${apt}-A`;

export type ReceivableStatus =
  | 'Cuenta por cobrar'
  | 'En verificación'
  | 'Convenio de pago'
  | 'Al día';

export interface ReceivableAccountItem {
  unit: string; // "14-A"
  floor: string; // "Piso 1"
  floor_number: number;
  apt_in_floor: number;
  pending_months: number;
  bracket: DebtBracketKey;
  last_period: string;
  amount_usd: number;
  status: ReceivableStatus;
}

interface DebtOverride {
  months: number;
  amount: number;
  period: string;
  status: ReceivableStatus;
}

const P1 = 'Octubre 2026';
const P2 = 'Septiembre - Octubre 2026';
const P3 = 'Agosto - Octubre 2026';

const DEBT_OVERRIDES: Record<string, DebtOverride> = {
  // 4 o más recibos (convenio de pago)
  '73-A': { months: 6, amount: 303.2, period: 'Mayo - Octubre 2026', status: 'Convenio de pago' },
  '114-A': { months: 4, amount: 224.0, period: 'Julio - Octubre 2026', status: 'Convenio de pago' },
  // 3 recibos
  '22-A': { months: 3, amount: 134.2, period: P3, status: 'Cuenta por cobrar' },
  '53-A': { months: 3, amount: 134.2, period: P3, status: 'Cuenta por cobrar' },
  '84-A': { months: 3, amount: 134.2, period: P3, status: 'Cuenta por cobrar' },
  '124-A': { months: 3, amount: 134.2, period: P3, status: 'Cuenta por cobrar' },
  // 2 recibos
  '14-A': { months: 2, amount: 94.6, period: P2, status: 'Cuenta por cobrar' },
  '31-A': { months: 2, amount: 94.6, period: P2, status: 'Cuenta por cobrar' },
  '62-A': { months: 2, amount: 94.6, period: P2, status: 'Cuenta por cobrar' },
  '93-A': { months: 2, amount: 94.6, period: P2, status: 'Cuenta por cobrar' },
  '104-A': { months: 2, amount: 94.6, period: P2, status: 'Cuenta por cobrar' },
  // 1 recibo
  '12-A': { months: 1, amount: 52.8, period: P1, status: 'Cuenta por cobrar' },
  '23-A': { months: 1, amount: 52.8, period: P1, status: 'Cuenta por cobrar' },
  '34-A': { months: 1, amount: 52.8, period: P1, status: 'En verificación' },
  '51-A': { months: 1, amount: 52.8, period: P1, status: 'Cuenta por cobrar' },
  '64-A': { months: 1, amount: 52.8, period: P1, status: 'Cuenta por cobrar' },
  '82-A': { months: 1, amount: 52.8, period: P1, status: 'Cuenta por cobrar' },
  '91-A': { months: 1, amount: 52.8, period: P1, status: 'En verificación' },
  '133-A': { months: 1, amount: 52.8, period: P1, status: 'Cuenta por cobrar' },
  '151-A': { months: 1, amount: 52.8, period: P1, status: 'Cuenta por cobrar' },
};

const bracketFromMonths = (months: number): DebtBracketKey =>
  months <= 0 ? '0' : months === 1 ? '1' : months === 2 ? '2' : months === 3 ? '3' : '4+';

// Los 72 apartamentos de la Torre A (18 pisos x 4 apartamentos)
export const ACCOUNTS_RECEIVABLE_LIST: ReceivableAccountItem[] = (() => {
  const list: ReceivableAccountItem[] = [];
  for (let floor = 1; floor <= TOTAL_FLOORS; floor++) {
    for (let apt = 1; apt <= APARTMENTS_PER_FLOOR; apt++) {
      const unit = buildUnitLabel(floor, apt);
      const debt = DEBT_OVERRIDES[unit];
      list.push({
        unit,
        floor: `Piso ${floor}`,
        floor_number: floor,
        apt_in_floor: apt,
        pending_months: debt?.months ?? 0,
        bracket: bracketFromMonths(debt?.months ?? 0),
        last_period: debt?.period ?? 'Solvente hasta Octubre 2026',
        amount_usd: debt?.amount ?? 0,
        status: debt?.status ?? 'Al día',
      });
    }
  }
  return list;
})();

export interface DebtBracketSummary {
  key: DebtBracketKey;
  title: string;
  subtitle: string;
  apartments_count: number;
  receipts_Label: string;
  amount_per_unit_usd: number;
  subtotal_usd: number;
  action_note: string;
  bar_color: string;
  gradient_from: string;
  gradient_to: string;
}

const GROUP_META: Array<
  Pick<
    DebtBracketSummary,
    'key' | 'title' | 'subtitle' | 'receipts_Label' | 'bar_color' | 'gradient_from' | 'gradient_to'
  > & {
    action_note: string;
  }
> = [
  {
    key: '0',
    title: 'Vecinos Solventes',
    subtitle: 'Sin recibos pendientes de pago',
    receipts_Label: '0 recibos',
    action_note: 'Al día con el condominio',
    bar_color: '#10b981',
    gradient_from: '#10b981',
    gradient_to: '#047857',
  },
  {
    key: '1',
    title: 'Vecinos con 1 recibo',
    subtitle: 'Corresponde al mes en curso',
    receipts_Label: '1 recibo',
    action_note: 'Recordatorio ordinario de pago',
    bar_color: '#0ea5e9',
    gradient_from: '#38bdf8',
    gradient_to: '#2563eb',
  },
  {
    key: '2',
    title: 'Vecinos con 2 recibos',
    subtitle: 'Acumulado Septiembre + Octubre',
    receipts_Label: '2 recibos',
    action_note: 'Aviso administrativo bimestral',
    bar_color: '#6366f1',
    gradient_from: '#818cf8',
    gradient_to: '#4338ca',
  },
  {
    key: '3',
    title: 'Vecinos con 3 recibos',
    subtitle: 'Acumulado Agosto a Octubre',
    receipts_Label: '3 recibos',
    action_note: 'Citación con la Junta de Condominio',
    bar_color: '#f59e0b',
    gradient_from: '#fbbf24',
    gradient_to: '#d97706',
  },
  {
    key: '4+',
    title: 'Vecinos con 4 o más recibos',
    subtitle: 'Deuda de larga data',
    receipts_Label: '4+ recibos',
    action_note: 'En convenio de pago con la Junta',
    bar_color: '#f43f5e',
    gradient_from: '#fb7185',
    gradient_to: '#9f1239',
  },
];

// Resumen calculado directamente desde la relación de los 72 apartamentos
export const DEBT_GROUPS_SUMMARY: DebtBracketSummary[] = GROUP_META.map((meta) => {
  const units = ACCOUNTS_RECEIVABLE_LIST.filter((u) => u.bracket === meta.key);
  const subtotal = +units.reduce((acc, u) => acc + u.amount_usd, 0).toFixed(2);
  return {
    ...meta,
    apartments_count: units.length,
    subtotal_usd: subtotal,
    amount_per_unit_usd: units.length ? +(subtotal / units.length).toFixed(2) : 0,
  };
});

export const SAMPLE_CSV_TEMPLATE = `supplier_name,supplier_tax_id,category_name,description,amount_usd,invoice_number,control_number,expense_date
"Fumigaciones San Juan C.A.","J-30819201-4","Conserjería e Insumos de Limpieza","Fumigación general de ductos de basura y planta baja Torre A",288.00,"FAC-004912","00-099124","2026-10-17"
"Rebobinados y Motores El Paraíso C.A.","J-29481023-7","Mantenimiento de Ascensores y Bombas","Cambio de rodamientos y sello mecánico de bomba auxiliar N° 2",360.00,"FAC-019283","00-331029","2026-10-18"`;

export const INITIAL_PROJECTS: CondoProject[] = [
  {
    id: 'proj-01',
    title: 'Modernización de Iluminación LED en Pasillos (Pisos 1 al 18)',
    category: 'Electricidad e Iluminación',
    description:
      'Sustitución completa de 36 lámparas fluorescentes deterioradas por plafones LED de alta eficiencia energética (18W) con fotoceldas en áreas comunes y pasillos de la Torre A.',
    completion_date: '2026-10-14',
    status: 'finalizado',
    total_cost_usd: 360.0,
    total_cost_bs: 19746.0,
    exchange_rate_bs: 54.85,
    unit_share_usd: 5.0,
    supplier_or_contractor: 'Suministros Eléctricos Candelaria C.A.',
    invoice_number: 'FAC-008812',
    storage_path: '2026/10/proyecto_iluminacion_led_172891.webp',
    after_image_name: 'evidencia_luminarias_led_instaladas.webp',
    after_image_url:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#0f172a"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>
            <radialGradient id="glow" cx="50%" cy="35%" r="45%">
              <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95"/>
              <stop offset="45%" stop-color="#38bdf8" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="800" height="500" fill="url(#bg)"/>
          <circle cx="400" cy="175" r="240" fill="url(#glow)"/>
          <rect x="280" y="130" width="240" height="45" rx="22" fill="#ffffff" stroke="#38bdf8" stroke-width="4"/>
          <rect x="300" y="142" width="200" height="20" rx="10" fill="#e0f2fe"/>
          <rect x="60" y="380" width="680" height="80" rx="14" fill="#090d1a" opacity="0.85" stroke="#334155" stroke-width="2"/>
          <text x="90" y="415" fill="#10b981" font-family="sans-serif" font-size="18" font-weight="bold">✓ PROYECTO EJECUTADO Y VERIFICADO — RESIDENCIAS DAN TORRE A</text>
          <text x="90" y="442" fill="#e2e8f0" font-family="sans-serif" font-size="15">36 Plafones LED 18W instalados en pasillos • Octubre 2026 • Factura FAC-008812</text>
        </svg>
      `),
    created_at: '2026-10-14T16:30:00Z',
  },
  {
    id: 'proj-02',
    title: 'Rehabilitación de Bomba N° 1 y Presostato del Hidroneumático',
    category: 'Bombeo e Hidroneumático',
    description:
      'Cambio de sello mecánico de 2 pulgadas, rodamientos SKF, empacaduras de brida, manómetro de glicerina y calibración del pulmón hidroneumático principal en sótano.',
    completion_date: '2026-10-08',
    status: 'finalizado',
    total_cost_usd: 720.0,
    total_cost_bs: 39492.0,
    exchange_rate_bs: 54.85,
    unit_share_usd: 10.0,
    supplier_or_contractor: 'Hidroneumáticos San Martín C.A.',
    invoice_number: 'FAC-003910',
    storage_path: '2026/10/proyecto_bomba_hidroneumatico_172840.webp',
    after_image_name: 'evidencia_sala_bombas_operativa.webp',
    after_image_url:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
          <defs>
            <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#082f49"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
          <rect width="800" height="500" fill="url(#bg2)"/>
          <rect x="180" y="140" width="220" height="160" rx="24" fill="#0284c7" stroke="#38bdf8" stroke-width="5"/>
          <circle cx="290" cy="220" r="48" fill="#0369a1" stroke="#bae6fd" stroke-width="4"/>
          <rect x="440" y="110" width="160" height="210" rx="80" fill="#0369a1" stroke="#7dd3fc" stroke-width="5"/>
          <circle cx="520" cy="175" r="28" fill="#f8fafc" stroke="#0f172a" stroke-width="4"/>
          <line x1="520" y1="175" x2="538" y2="160" stroke="#ef4444" stroke-width="4"/>
          <rect x="60" y="380" width="680" height="80" rx="14" fill="#090d1a" opacity="0.88" stroke="#0284c7" stroke-width="2"/>
          <text x="90" y="415" fill="#38bdf8" font-family="sans-serif" font-size="18" font-weight="bold">✓ EVIDENCIA DE OBRA ENTREGADA — SALA DE BOMBAS TORRE A</text>
          <text x="90" y="442" fill="#e2e8f0" font-family="sans-serif" font-size="15">Bomba N° 1 operativa a 65 PSI constantes • Octubre 2026 • Factura FAC-003910</text>
        </svg>
      `),
    created_at: '2026-10-08T14:15:00Z',
  },
];

