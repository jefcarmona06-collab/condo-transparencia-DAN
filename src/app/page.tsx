'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CONDOMINIUM_DATA,
  INITIAL_PERIODS,
  INITIAL_CATEGORIES,
  INITIAL_EXPENSES,
  INITIAL_PROJECTS,
  ACCOUNTS_RECEIVABLE_LIST,
  DEBT_GROUPS_SUMMARY,
  DebtBracketKey,
  ReceivableAccountItem,
  ReceivableStatus,
} from '@/lib/mock-data';
import {
  UserRole,
  MonthlyPeriod,
  Expense,
  AuditStatus,
  CondoProject,
  ProjectStatus,
} from '@/types/condo';
import {
  downloadInvoicePdf,
  downloadAccountsReceivableWhatsappPdf,
  downloadExpensesSummaryCardsPdf,
  formatNumberVe,
} from '@/lib/pdf-generator';
import InvoiceModal from '@/components/InvoiceModal';
import {
  isSupabaseConfigured,
  uploadCondoFile,
  compressImageClientSide,
  validateFileConstraints,
  buildChronologicalStoragePath,
  saveExpenseToSupabase,
  annulExpenseInSupabase,
  getExpensesFromSupabase,
  getBoardMembersFromSupabase,
  syncBoardMembersToSupabase,
  updateBankBalanceInSupabase,
} from '@/lib/supabase';
import {
  Building2,
  FileText,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Plus,
  Eye,
  RotateCcw,
  Users,
  ClipboardList,
  FilePlus2,
  Calculator,
  ChevronRight,
  Wallet,
  Layers,
  FileCheck,
  Lock,
  Share2,
  Copy,
  Check,
  Landmark,
  UserCheck,
  LayoutGrid,
  CircleDollarSign,
  TrendingUp,
  User,
  ArrowLeft,
  Smartphone,
  X,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Camera,
  Pencil,
  ImageIcon,
  Trash2,
  KeyRound,
  EyeOff,
  Ban,
  Database,
  FileSpreadsheet,
  HardDriveDownload,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

type ActiveTab =
  | 'dashboard'
  | 'cuentas_por_cobrar'
  | 'facturas_pdf'
  | 'proyectos'
  | 'junta_info'
  | 'carga_junta';

type CurrencyDisplay = 'both' | 'usd' | 'bs';

interface BoardMember {
  id: string;
  name: string;
  role: string;
  category: 'principal' | 'suplente';
  apartment: string;
  initials: string;
}

const PRINCIPAL_ROLE_OPTIONS = [
  'Presidente',
  'Presidenta',
  'Tesorero',
  'Tesorera',
  'Secretario',
  'Secretaria',
  '1er Principal',
  '2do Principal',
  '3er Principal',
];

const SUPLENTE_ROLE_OPTIONS = [
  '1er Vocal Suplente',
  '1era Vocal Suplente',
  '2do Vocal Suplente',
  '2da Vocal Suplente',
  '3er Vocal Suplente',
  '3era Vocal Suplente',
  'Vocal Suplente',
];

const getGenderOpposite = (role: string): { label: string; newRole: string } | null => {
  switch (role) {
    case 'Tesorera':
      return { label: 'Tesorero (masculino)', newRole: 'Tesorero' };
    case 'Tesorero':
      return { label: 'Tesorera (femenino)', newRole: 'Tesorera' };
    case 'Presidente':
      return { label: 'Presidenta (femenino)', newRole: 'Presidenta' };
    case 'Presidenta':
      return { label: 'Presidente (masculino)', newRole: 'Presidente' };
    case 'Secretaria':
      return { label: 'Secretario (masculino)', newRole: 'Secretario' };
    case 'Secretario':
      return { label: 'Secretaria (femenino)', newRole: 'Secretaria' };
    case '1er Vocal Suplente':
      return { label: '1era Vocal (femenino)', newRole: '1era Vocal Suplente' };
    case '1era Vocal Suplente':
      return { label: '1er Vocal (masculino)', newRole: '1er Vocal Suplente' };
    case '2do Vocal Suplente':
      return { label: '2da Vocal (femenino)', newRole: '2da Vocal Suplente' };
    case '2da Vocal Suplente':
      return { label: '2do Vocal (masculino)', newRole: '2do Vocal Suplente' };
    case '3er Vocal Suplente':
      return { label: '3era Vocal (femenino)', newRole: '3era Vocal Suplente' };
    case '3era Vocal Suplente':
      return { label: '3er Vocal (masculino)', newRole: '3er Vocal Suplente' };
    default:
      return null;
  }
};

const INITIAL_BOARD_MEMBERS: BoardMember[] = [
  { id: '1', name: 'Carlos Mendoza', role: 'Presidente', category: 'principal', apartment: '92-A', initials: 'CM' },
  { id: '2', name: 'Elena Vásquez', role: 'Tesorera', category: 'principal', apartment: '41-A', initials: 'EV' },
  { id: '3', name: 'Patricia Gómez', role: 'Secretaria', category: 'principal', apartment: '21-A', initials: 'PG' },
  { id: '4', name: "R. D'Alessandro", role: '1er Vocal Suplente', category: 'suplente', apartment: '63-A', initials: 'RD' },
];

interface BankAccountDetails {
  bankName: string;
  bankCode: string;
  accountType: string;
  accountNumber: string;
  holderName: string;
  taxId: string;
}

const DEFAULT_JUNTA_PIN = 'DAN2026';

const getStoredJuntaPin = (): string => {
  if (typeof window === 'undefined') return DEFAULT_JUNTA_PIN;
  return localStorage.getItem('dan_junta_pin') || DEFAULT_JUNTA_PIN;
};

export default function ResidenciasDanPortal() {
  // Por defecto, cualquier vecino entra en modo consulta (propietario)
  const [activeRole, setActiveRole] = useState<UserRole>('propietario');
  const [isJuntaAuthenticated, setIsJuntaAuthenticated] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authPasswordInput, setAuthPasswordInput] = useState<string>('');
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);

  // Estados para Cambiar la Clave de la Junta
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [currentPassInput, setCurrentPassInput] = useState<string>('');
  const [newPassInput, setNewPassInput] = useState<string>('');
  const [confirmPassInput, setConfirmPassInput] = useState<string>('');
  const [changePassError, setChangePassError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currencyMode, setCurrencyMode] = useState<CurrencyDisplay>('both');

  const [periods, setPeriods] = useState<MonthlyPeriod[]>(INITIAL_PERIODS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('per-2026-10');

  // Filters for Facturas (Relación de Gastos)
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Filter for Cuentas por Cobrar Debt Groups
  const [selectedDebtBracket, setSelectedDebtBracket] = useState<DebtBracketKey>('ALL');
  const [whatsappCopied, setWhatsappCopied] = useState(false);
  const [bankCopied, setBankCopied] = useState(false);

  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);

  // Modal for viewing Supplier PDF Invoice / Evidence
  const [selectedExpenseModal, setSelectedExpenseModal] = useState<Expense | null>(null);
  const [invoiceModalInitialTab, setInvoiceModalInitialTab] = useState<'pdf' | 'evidence'>('pdf');

  // Estados para Tasa Oficial de Cierre del Mes / Corte (Editable por la Junta)
  const [showEditRateModal, setShowEditRateModal] = useState<boolean>(false);
  const [tempClosingRateBs, setTempClosingRateBs] = useState<string>('54.85');
  const [recalculateExpensesWithClosingRate, setRecalculateExpensesWithClosingRate] = useState<boolean>(true);

  // Saldo Bancario Editable por la Junta
  const [bankBalanceUsd, setBankBalanceUsd] = useState<number>(CONDOMINIUM_DATA.bank_balance_usd);
  const [showEditBalanceModal, setShowEditBalanceModal] = useState<boolean>(false);
  const [tempBankBalanceUsd, setTempBankBalanceUsd] = useState<string>(
    CONDOMINIUM_DATA.bank_balance_usd.toString()
  );

  // Datos Bancarios Editables por la Junta
  const [bankDetails, setBankDetails] = useState<BankAccountDetails>({
    bankName: 'Banco Mercantil',
    bankCode: '0105',
    accountType: 'Cuenta Corriente',
    accountNumber: '0105-0021-34-1021456789',
    holderName: 'Condominio Residencias DAN Torre A',
    taxId: CONDOMINIUM_DATA.tax_id,
  });
  const [showEditBankModal, setShowEditBankModal] = useState<boolean>(false);
  const [tempBankDetails, setTempBankDetails] = useState<BankAccountDetails>({
    bankName: 'Banco Mercantil',
    bankCode: '0105',
    accountType: 'Cuenta Corriente',
    accountNumber: '0105-0021-34-1021456789',
    holderName: 'Condominio Residencias DAN Torre A',
    taxId: CONDOMINIUM_DATA.tax_id,
  });

  // Miembros de la Junta Directiva Editables por la Junta
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>(INITIAL_BOARD_MEMBERS);
  const [showEditMembersModal, setShowEditMembersModal] = useState<boolean>(false);
  const [tempBoardMembers, setTempBoardMembers] = useState<BoardMember[]>(INITIAL_BOARD_MEMBERS);

  // Estado de la relación de deuda de los 72 propietarios (actualizable por archivo en Junta)
  const [receivablesList, setReceivablesList] = useState<ReceivableAccountItem[]>(
    ACCOUNTS_RECEIVABLE_LIST
  );
  const [debtFileName, setDebtFileName] = useState<string>('');
  const [debtRelationText, setDebtRelationText] = useState<string>(
    `apartamento,recibos_pendientes,monto_usd,periodos,situacion
"73-A",6,303.20,"Abril a Septiembre 2026","Convenio de pago"
"114-A",4,224.00,"Junio a Septiembre 2026","Convenio de pago"
"22-A",3,134.20,"Julio a Septiembre 2026","Cuenta por cobrar"
"53-A",3,134.20,"Julio a Septiembre 2026","Cuenta por cobrar"
"84-A",3,134.20,"Julio a Septiembre 2026","Cuenta por cobrar"
"124-A",3,134.20,"Julio a Septiembre 2026","Cuenta por cobrar"
"14-A",2,94.60,"Agosto y Septiembre 2026","Cuenta por cobrar"
"31-A",2,94.60,"Agosto y Septiembre 2026","Cuenta por cobrar"
"62-A",2,94.60,"Agosto y Septiembre 2026","Cuenta por cobrar"
"93-A",2,94.60,"Agosto y Septiembre 2026","Cuenta por cobrar"
"104-A",2,94.60,"Agosto y Septiembre 2026","Cuenta por cobrar"
"12-A",1,52.80,"Septiembre 2026","Cuenta por cobrar"
"23-A",1,52.80,"Septiembre 2026","Cuenta por cobrar"
"34-A",1,52.80,"Septiembre 2026","En verificación"
"51-A",1,52.80,"Septiembre 2026","Cuenta por cobrar"
"64-A",1,52.80,"Septiembre 2026","Cuenta por cobrar"
"82-A",1,52.80,"Septiembre 2026","Cuenta por cobrar"
"91-A",1,52.80,"Septiembre 2026","En verificación"
"133-A",1,52.80,"Septiembre 2026","Cuenta por cobrar"
"151-A",1,52.80,"Septiembre 2026","Cuenta por cobrar"`
  );

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);

  // Registro individual de Factura en Bolívares + Tasa del Día + PDF del Proveedor + Evidencia Física (Solo Junta)
  const [newSupplier, setNewSupplier] = useState('');
  const [newRif, setNewRif] = useState('');
  const [newCategory, setNewCategory] = useState(INITIAL_CATEGORIES[0].name);
  const [newInvoiceNumber, setNewInvoiceNumber] = useState('');
  const [newControlNumber, setNewControlNumber] = useState('');
  const [newAmountBs, setNewAmountBs] = useState('');
  const [newExchangeRateBs, setNewExchangeRateBs] = useState('54.85');
  const [newDescription, setNewDescription] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [newEvidenceFileName, setNewEvidenceFileName] = useState('');
  const [newEvidenceFileUrl, setNewEvidenceFileUrl] = useState<string | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceCompressionInfo, setEvidenceCompressionInfo] = useState<string | null>(null);

  // Estado para Inmutabilidad Contable: Anulación de Facturas sin borrado físico
  const [annullingExpense, setAnnullingExpense] = useState<Expense | null>(null);
  const [annulReasonInput, setAnnulReasonInput] = useState<string>('');

  // Estados para el Modelo de Proyectos y Obras Finalizadas con Evidencia
  const [projects, setProjects] = useState<CondoProject[]>(INITIAL_PROJECTS);
  const [projectStatusFilter, setProjectStatusFilter] = useState<'ALL' | ProjectStatus>('ALL');
  const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);
  const [selectedProjectPreview, setSelectedProjectPreview] = useState<CondoProject | null>(null);

  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjCategory, setNewProjCategory] = useState('Electricidad e Iluminación');
  const [newProjSupplier, setNewProjSupplier] = useState('');
  const [newProjInvoice, setNewProjInvoice] = useState('');
  const [newProjAmountBs, setNewProjAmountBs] = useState('');
  const [newProjRateBs, setNewProjRateBs] = useState('54.85');
  const [newProjDate, setNewProjDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newProjStatus, setNewProjStatus] = useState<ProjectStatus>('finalizado');
  const [newProjDescription, setNewProjDescription] = useState('');
  const [newProjImageUrl, setNewProjImageUrl] = useState<string | null>(null);
  const [newProjImageName, setNewProjImageName] = useState('');
  const [newProjStoragePath, setNewProjStoragePath] = useState('');
  const [newProjCompressionInfo, setNewProjCompressionInfo] = useState<string | null>(null);

  // Estado de hidratación para persistencia automática en localStorage (Pre-Supabase en Vercel)
  const [isStorageHydrated, setIsStorageHydrated] = useState<boolean>(false);
  const [healthPingResult, setHealthPingResult] = useState<string | null>(null);

  // Hidratar todos los datos desde localStorage al cargar en el navegador
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedExpenses = localStorage.getItem('dan_v1_expenses');
      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));

      const savedPeriods = localStorage.getItem('dan_v1_periods');
      if (savedPeriods) setPeriods(JSON.parse(savedPeriods));

      const savedReceivables = localStorage.getItem('dan_v2_receivables');
      if (savedReceivables) setReceivablesList(JSON.parse(savedReceivables));

      const savedBalance = localStorage.getItem('dan_v1_bank_balance');
      if (savedBalance) setBankBalanceUsd(parseFloat(savedBalance));

      const savedBankDetails = localStorage.getItem('dan_v1_bank_details');
      if (savedBankDetails) setBankDetails(JSON.parse(savedBankDetails));

      const savedBoard = localStorage.getItem('dan_v1_board_members');
      if (savedBoard) setBoardMembers(JSON.parse(savedBoard));

      const savedProjects = localStorage.getItem('dan_v1_projects');
      if (savedProjects) setProjects(JSON.parse(savedProjects));
    } catch (err) {
      console.warn('Error hidratando localStorage:', err);
    } finally {
      setIsStorageHydrated(true);
    }
  }, []);

  // Guardar automáticamente cada cambio en localStorage
  useEffect(() => {
    if (!isStorageHydrated || typeof window === 'undefined') return;
    try {
      localStorage.setItem('dan_v1_expenses', JSON.stringify(expenses));
    } catch (e) {
      console.warn('Cuota de localStorage alcanzada en expenses:', e);
    }
  }, [expenses, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated || typeof window === 'undefined') return;
    try {
      localStorage.setItem('dan_v1_periods', JSON.stringify(periods));
      localStorage.setItem('dan_v2_receivables', JSON.stringify(receivablesList));
      localStorage.setItem('dan_v1_bank_balance', bankBalanceUsd.toString());
      localStorage.setItem('dan_v1_bank_details', JSON.stringify(bankDetails));
      localStorage.setItem('dan_v1_board_members', JSON.stringify(boardMembers));
      localStorage.setItem('dan_v1_projects', JSON.stringify(projects));
    } catch (e) {
      console.warn('Error guardando estado en localStorage:', e);
    }
  }, [
    periods,
    receivablesList,
    bankBalanceUsd,
    bankDetails,
    boardMembers,
    projects,
    isStorageHydrated,
  ]);

  // Restaurar sesión de la Junta si ya estaba autenticado en la pestaña
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem('dan_junta_session');
    if (saved === 'authenticated') {
      setIsJuntaAuthenticated(true);
      setActiveRole('junta');
    }
  }, []);

  // Registro de Service Worker PWA y captura de evento de instalación nativa
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Verificar si ya está corriendo como App Instalada (Standalone)
    const standaloneMatch =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneMatch);

    // Registrar Service Worker para permitir instalación PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowInstallModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPwaClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult?.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      return;
    }
    setShowInstallModal(true);
  };

  // Visible Periods: Propietarios see published periods; Junta sees published + draft
  const visiblePeriods = useMemo(() => {
    return periods.filter((p) => (activeRole === 'propietario' ? p.status === 'published' : true));
  }, [periods, activeRole]);

  const activePeriod: MonthlyPeriod = useMemo(() => {
    return (
      visiblePeriods.find((p) => p.id === selectedPeriodId) ||
      visiblePeriods[0] ||
      periods[0]
    );
  }, [visiblePeriods, selectedPeriodId, periods]);

  // Sincronización automática con Supabase si las credenciales están configuradas
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    getExpensesFromSupabase(activePeriod.id).then((data) => {
      if (data && data.length > 0) {
        setExpenses(data);
      }
    });

    getBoardMembersFromSupabase().then((data) => {
      if (data && data.length > 0) {
        setBoardMembers(data);
      }
    });
  }, [activePeriod.id]);

  const MONTH_NAMES: Record<number, string> = {
    1: 'Enero',
    2: 'Febrero',
    3: 'Marzo',
    4: 'Abril',
    5: 'Mayo',
    6: 'Junio',
    7: 'Julio',
    8: 'Agosto',
    9: 'Septiembre',
    10: 'Octubre',
    11: 'Noviembre',
    12: 'Diciembre',
  };

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(visiblePeriods.map((p) => p.year)));
    return years.sort((a, b) => b - a);
  }, [visiblePeriods]);

  const monthsInActiveYear = useMemo(() => {
    return visiblePeriods
      .filter((p) => p.year === activePeriod.year)
      .sort((a, b) => b.month - a.month);
  }, [visiblePeriods, activePeriod]);

  const handleYearChange = (newYear: number) => {
    const matchingMonth = visiblePeriods.find(
      (p) => p.year === newYear && p.month === activePeriod.month
    );
    if (matchingMonth) {
      setSelectedPeriodId(matchingMonth.id);
      setNewExchangeRateBs(matchingMonth.exchange_rate_bs.toFixed(2));
      setTempClosingRateBs(matchingMonth.exchange_rate_bs.toFixed(2));
      return;
    }
    const firstInYear = visiblePeriods
      .filter((p) => p.year === newYear)
      .sort((a, b) => b.month - a.month)[0];
    if (firstInYear) {
      setSelectedPeriodId(firstInYear.id);
      setNewExchangeRateBs(firstInYear.exchange_rate_bs.toFixed(2));
      setTempClosingRateBs(firstInYear.exchange_rate_bs.toFixed(2));
    }
  };

  const handleMonthChange = (newMonth: number) => {
    const match = visiblePeriods.find(
      (p) => p.year === activePeriod.year && p.month === newMonth
    );
    if (match) {
      setSelectedPeriodId(match.id);
      setNewExchangeRateBs(match.exchange_rate_bs.toFixed(2));
      setTempClosingRateBs(match.exchange_rate_bs.toFixed(2));
    }
  };

  const periodExpenses = useMemo(
    () => expenses.filter((e) => e.period_id === activePeriod?.id),
    [expenses, activePeriod]
  );

  const filteredExpenses = useMemo(() => {
    return periodExpenses.filter((exp) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        exp.supplier_name.toLowerCase().includes(q) ||
        exp.supplier_tax_id.toLowerCase().includes(q) ||
        exp.invoice_number.toLowerCase().includes(q) ||
        exp.description.toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === 'ALL' || exp.category_name === categoryFilter;

      return matchesQuery && matchesCategory;
    });
  }, [periodExpenses, searchQuery, categoryFilter]);

  // Resumen dinámico por grupo de deuda calculado desde receivablesList
  // Considerando que los recibos se emiten al cierre de cada mes (ej. en Octubre se cobra Septiembre; 2 recibos = Agosto y Septiembre)
  const dynamicDebtGroupsSummary = useMemo(() => {
    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const currentMonthNum = activePeriod?.month || 10; // 1..12
    const prev1 = monthNames[(currentMonthNum - 2 + 12) % 12]; // Ej. en Octubre (10) -> Septiembre
    const prev2 = monthNames[(currentMonthNum - 3 + 12) % 12]; // Ej. en Octubre (10) -> Agosto
    const prev3 = monthNames[(currentMonthNum - 4 + 12) % 12]; // Ej. en Octubre (10) -> Julio

    return DEBT_GROUPS_SUMMARY.map((meta) => {
      const units = receivablesList.filter((u) => u.bracket === meta.key);
      const subtotal = +units.reduce((acc, u) => acc + u.amount_usd, 0).toFixed(2);
      const dynamicSubtitle =
        meta.key === '0'
          ? 'Sin recibos pendientes de pago'
          : meta.key === '1'
          ? `Corresponde al recibo de ${prev1}`
          : meta.key === '2'
          ? `Acumulado ${prev2} y ${prev1}`
          : meta.key === '3'
          ? `Acumulado ${prev3} a ${prev1}`
          : 'Deuda de larga data';

      return {
        ...meta,
        subtitle: dynamicSubtitle,
        apartments_count: units.length,
        subtotal_usd: subtotal,
        amount_per_unit_usd: units.length ? +(subtotal / units.length).toFixed(2) : 0,
      };
    });
  }, [receivablesList, activePeriod]);

  // Excluye vecinos solventes y deja únicamente los que poseen deuda
  const debtOnlyList = useMemo(
    () => receivablesList.filter((item) => item.pending_months > 0),
    [receivablesList]
  );

  const filteredReceivables = useMemo(() => {
    if (selectedDebtBracket === 'ALL' || selectedDebtBracket === '0') {
      return debtOnlyList;
    }
    return debtOnlyList.filter((item) => item.bracket === selectedDebtBracket);
  }, [selectedDebtBracket, debtOnlyList]);

  // Inmutabilidad Contable: Solo sumar facturas en estado 'activo' (excluye 'anulado')
  const activePeriodExpenses = useMemo(
    () => periodExpenses.filter((item) => item.record_status !== 'anulado'),
    [periodExpenses]
  );

  // Total Gastos del Mes & Cuota por Apartamento (Monto / 72)
  const totalPeriodExpensesUsd = useMemo(
    () => activePeriodExpenses.reduce((sum, item) => sum + item.amount, 0),
    [activePeriodExpenses]
  );

  const sharePerApartmentUsd = useMemo(
    () => +(totalPeriodExpensesUsd / CONDOMINIUM_DATA.total_units).toFixed(2),
    [totalPeriodExpensesUsd]
  );

  // Proyectos filtrados
  const filteredProjects = useMemo(() => {
    if (projectStatusFilter === 'ALL') return projects;
    return projects.filter((p) => p.status === projectStatusFilter);
  }, [projects, projectStatusFilter]);

  // Chart: Gastos por Rubro Contable en el Período Activo (Solo gastos activos)
  const expensesByCategoryData = useMemo(() => {
    return INITIAL_CATEGORIES.map((cat) => {
      const totalRubro = activePeriodExpenses
        .filter((e) => e.category_id === cat.id || e.category_name === cat.name)
        .reduce((acc, item) => acc + item.amount, 0);
      return {
        name: cat.name,
        montoUsd: +totalRubro.toFixed(2),
        cuotaAptoUsd: +(totalRubro / CONDOMINIUM_DATA.total_units).toFixed(2),
        color: cat.color_hex,
      };
    }).filter((d) => d.montoUsd > 0);
  }, [activePeriodExpenses]);

  // Chart: Deuda acumulada por grupo de recibos (para Cuentas por Cobrar)
  const debtGroupsChartData = useMemo(() => {
    return dynamicDebtGroupsSummary
      .filter((g) => g.key !== '0')
      .map((g) => ({
        grupo: g.receipts_Label,
        titulo: g.title,
        Apartamentos: g.apartments_count,
        MontoAcumulado: g.subtotal_usd,
        color: g.bar_color,
      }));
  }, [dynamicDebtGroupsSummary]);

  // Formateo de moneda utilizando puntos (.) para miles y comas (,) para decimales
  const formatMoney = (usd: number, rateBs = activePeriod?.exchange_rate_bs || 54.85) => {
    const bs = usd * rateBs;
    const usdStr = `$${formatNumberVe(usd)}`;
    const bsStr = `Bs. ${formatNumberVe(bs)}`;

    if (currencyMode === 'usd') return { primary: usdStr, secondary: bsStr };
    if (currencyMode === 'bs') return { primary: bsStr, secondary: usdStr };
    return { primary: usdStr, secondary: bsStr };
  };

  // Switch Role Handler con protección de clave para la Junta de Condominio
  const handleRoleChange = (nextRole: UserRole) => {
    if (nextRole === 'junta') {
      if (isJuntaAuthenticated) {
        setActiveRole('junta');
      } else {
        setAuthPasswordInput('');
        setAuthErrorMsg(null);
        setShowAuthModal(true);
      }
    } else {
      setActiveRole('propietario');
      if (activeTab === 'carga_junta') {
        setActiveTab('junta_info');
      }
    }
  };

  // Verificación de la Clave de la Junta
  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const validPin = getStoredJuntaPin();
    if (authPasswordInput.trim() === validPin.trim()) {
      setIsJuntaAuthenticated(true);
      setActiveRole('junta');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('dan_junta_session', 'authenticated');
      }
      setShowAuthModal(false);
      setAuthPasswordInput('');
      setAuthErrorMsg(null);
      setFeedbackMsg('Acceso administrativo habilitado con éxito para la Junta de Condominio.');
    } else {
      setAuthErrorMsg('Clave incorrecta. Solo miembros autorizados de la Junta de Condominio pueden acceder.');
    }
  };

  // Bloquear / Cerrar Sesión de la Junta
  const handleLogoutJunta = () => {
    setIsJuntaAuthenticated(false);
    setActiveRole('propietario');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('dan_junta_session');
    }
    if (activeTab === 'carga_junta') {
      setActiveTab('junta_info');
    }
    setFeedbackMsg('Sesión de Junta cerrada. Has vuelto al modo consulta de vecino.');
  };

  // Modificar Clave de la Junta
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentSavedPin = getStoredJuntaPin();

    if (currentPassInput.trim() !== currentSavedPin.trim()) {
      setChangePassError('La clave actual ingresada es incorrecta.');
      return;
    }

    if (newPassInput.trim().length < 4) {
      setChangePassError('La nueva clave debe tener al menos 4 caracteres.');
      return;
    }

    if (newPassInput.trim() !== confirmPassInput.trim()) {
      setChangePassError('La confirmación de la nueva clave no coincide.');
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('dan_junta_pin', newPassInput.trim());
    }

    setShowChangePasswordModal(false);
    setCurrentPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
    setChangePassError(null);
    setFeedbackMsg('Clave de la Junta de Condominio modificada exitosamente.');
  };

  const handleUpdateAudit = (
    expenseId: string,
    status: AuditStatus,
    comment: string
  ) => {
    setExpenses((prev) =>
      prev.map((exp) =>
        exp.id === expenseId
          ? { ...exp, audit_status: status, audit_comment: comment }
          : exp
      )
    );
    setSelectedExpenseModal((prev) =>
      prev && prev.id === expenseId
        ? { ...prev, audit_status: status, audit_comment: comment }
        : prev
    );
  };

  // Copy Formatted WhatsApp Text Summary (for Junta de Condominio)
  const handleCopyWhatsappSummary = () => {
    const totalBs = formatNumberVe(
      activePeriod.accounts_receivable_usd * activePeriod.exchange_rate_bs
    );

    const text = [
      `*${CONDOMINIUM_DATA.name.toUpperCase()}*`,
      `RIF: ${CONDOMINIUM_DATA.tax_id}`,
      `*RESUMEN DE CUENTAS POR COBRAR (${activePeriod.label.toUpperCase()})*`,
      `----------------------------------`,
      `• *Vecinos Solventes (Al día):* ${activePeriod.solvent_units_count} de 72 aptos`,
      `• *Vecinos con Cuentas por Cobrar:* ${activePeriod.receivable_units_count} de 72 aptos`,
      `• *Total por Cobrar:* $${formatNumberVe(activePeriod.accounts_receivable_usd)} USD (Bs. ${totalBs})`,
      `----------------------------------`,
      `*DESGLOSE POR GRUPO DE RECIBOS:*`,
      ...dynamicDebtGroupsSummary
        .filter((g) => g.key !== '0')
        .map(
          (g) =>
            `- *${g.receipts_Label}:* ${g.apartments_count} vecinos ($${formatNumberVe(g.subtotal_usd)} USD)`
        ),
      `----------------------------------`,
      `_Se adjunta reporte detallado en PDF emitido por la Junta de Condominio._`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setWhatsappCopied(true);
    setTimeout(() => setWhatsappCopied(false), 3000);
  };

  // Copiar Datos Bancarios Oficiales (Sin número de teléfono)
  const handleCopyBankDetails = () => {
    const bankText = [
      `DATOS BANCARIOS OFICIALES — ${CONDOMINIUM_DATA.name.toUpperCase()}`,
      `Banco: ${bankDetails.bankName} (${bankDetails.bankCode})`,
      `Tipo de Cuenta: ${bankDetails.accountType}`,
      `Número de Cuenta: ${bankDetails.accountNumber}`,
      `Titular: ${bankDetails.holderName}`,
      `RIF: ${bankDetails.taxId}`,
    ].join('\n');

    navigator.clipboard.writeText(bankText);
    setBankCopied(true);
    setTimeout(() => setBankCopied(false), 3000);
  };

  // Guardar nuevo Saldo en Banco (Solo Junta)
  const handleSaveBankBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const newBal = parseFloat(tempBankBalanceUsd.replace(',', '.'));
    if (isNaN(newBal) || newBal < 0) {
      setFormErrorMsg('Por favor ingresa un monto válido de saldo en banco.');
      return;
    }
    setBankBalanceUsd(+newBal.toFixed(2));
    if (isSupabaseConfigured) {
      updateBankBalanceInSupabase(+newBal.toFixed(2));
    }
    setShowEditBalanceModal(false);
    setFeedbackMsg(`Saldo disponible en banco actualizado con éxito a $${formatNumberVe(newBal)} USD.`);
  };

  // Guardar Datos Bancarios (Solo Junta)
  const handleSaveBankDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempBankDetails.bankName || !tempBankDetails.accountNumber || !tempBankDetails.holderName) {
      setFormErrorMsg('Por favor completa todos los campos requeridos de los datos bancarios.');
      return;
    }
    setBankDetails({ ...tempBankDetails });
    setShowEditBankModal(false);
    setFeedbackMsg('Datos bancarios actualizados exitosamente.');
  };

  // Guardar Miembros de la Junta (Solo Junta)
  const handleSaveBoardMembers = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = tempBoardMembers
      .filter((m) => m.category === 'principal' || m.name.trim().length > 0)
      .map((m) => {
        const trimmedName = m.name.trim();
        const computedInitials = trimmedName
          ? trimmedName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0].toUpperCase())
              .join('')
          : 'JD';
        return {
          ...m,
          name: trimmedName,
          role: m.role.trim() || (m.category === 'principal' ? 'Miembro Principal' : 'Vocal Suplente'),
          apartment: m.apartment.trim(),
          initials: computedInitials,
        };
      });

    setBoardMembers(cleaned);
    if (isSupabaseConfigured) {
      syncBoardMembersToSupabase(cleaned);
    }
    setShowEditMembersModal(false);
    setFeedbackMsg('Directorio de miembros de la Junta actualizado exitosamente.');
  };

  // Aplicar Tasa Oficial de Cierre del Mes y Dolarizar Recibo (Solo Junta)
  const handleApplyClosingRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRole !== 'junta') return;
    setFormErrorMsg(null);
    setFeedbackMsg(null);

    const rate = parseFloat(tempClosingRateBs.replace(',', '.'));
    if (isNaN(rate) || rate <= 0) {
      setFormErrorMsg('Por favor ingresa una tasa de cierre válida (mayor a 0).');
      return;
    }

    const newRate = +rate.toFixed(2);

    // 1. Recalcular las facturas del período con la nueva tasa de corte
    let updatedExpensesList = expenses;
    if (recalculateExpensesWithClosingRate) {
      updatedExpensesList = expenses.map((exp) => {
        if (exp.period_id !== activePeriod.id) return exp;
        const newAmountUsd = +(exp.amount_bs / newRate).toFixed(2);
        const shareUsd = +(newAmountUsd / CONDOMINIUM_DATA.total_units).toFixed(2);
        const shareBs = +(exp.amount_bs / CONDOMINIUM_DATA.total_units).toFixed(2);
        return {
          ...exp,
          exchange_rate_bs: newRate,
          amount: newAmountUsd,
          unit_share_usd: shareUsd,
          unit_share_bs: shareBs,
          audit_comment: `Dolarizado al corte con tasa oficial de cierre de Bs. ${formatNumberVe(newRate)}/USD (${activePeriod.label})`,
        };
      });
      setExpenses(updatedExpensesList);
    }

    // 2. Calcular nuevo total de gastos en USD del mes
    const periodExp = updatedExpensesList.filter((e) => e.period_id === activePeriod.id);
    const newTotalExpensesUsd = +periodExp.reduce((sum, item) => sum + item.amount, 0).toFixed(2);

    // 3. Actualizar la tasa y total en el período
    setPeriods((prev) =>
      prev.map((p) =>
        p.id === activePeriod.id
          ? {
              ...p,
              exchange_rate_bs: newRate,
              total_expense_usd: newTotalExpensesUsd,
            }
          : p
      )
    );

    setNewExchangeRateBs(newRate.toFixed(2));
    setShowEditRateModal(false);

    const cuotaPerAptoUsd = +(newTotalExpensesUsd / CONDOMINIUM_DATA.total_units).toFixed(2);
    const cuotaPerAptoBs = +(cuotaPerAptoUsd * newRate).toFixed(2);

    setFeedbackMsg(
      `Tasa de cierre de ${activePeriod.label} fijada en Bs. ${formatNumberVe(
        newRate
      )}/USD.${
        recalculateExpensesWithClosingRate
          ? ` Se dolarizaron las ${periodExp.length} facturas del mes. Nueva cuota por apto (÷ 72): $${formatNumberVe(
              cuotaPerAptoUsd
            )} USD (Bs. ${formatNumberVe(cuotaPerAptoBs)}).`
          : ''
      }`
    );
  };

  // Cargar archivo CSV/Excel con la relación de deuda de los propietarios (Solo Junta)
  const handleDebtFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDebtFileName(file.name);
    setFormErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string' && content.trim().length > 0) {
        setDebtRelationText(content);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDownloadDebtTemplate = () => {
    const blob = new Blob([debtRelationText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Plantilla_Relacion_Deuda_Propietarios_Torre_A.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const handleApplyDebtRelation = () => {
    if (activeRole !== 'junta') return;
    setFormErrorMsg(null);
    setFeedbackMsg(null);

    const lines = debtRelationText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setFormErrorMsg(
        'El archivo de relación de deuda debe contener la cabecera y al menos un apartamento.'
      );
      return;
    }

    const debtOverrides = new Map<
      string,
      { months: number; amount: number; period: string; status: ReceivableStatus }
    >();

    for (let i = 1; i < lines.length; i++) {
      const cols =
        lines[i]
          .match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
          ?.map((m) => m.replace(/^"|"$/g, '').trim()) ||
        lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());

      if (cols.length < 3) {
        setFormErrorMsg(
          `Formato inválido en la línea ${i + 1}. Se espera: apartamento, recibos_pendientes, monto_usd, periodos, situacion.`
        );
        return;
      }

      const unitRaw = cols[0].toUpperCase();
      const months = parseInt(cols[1], 10);
      const amountUsd = parseFloat(cols[2]);
      const periodStr = cols[3] || activePeriod.label;
      const statusRaw = (cols[4] || 'Cuenta por cobrar') as ReceivableStatus;

      if (!unitRaw || isNaN(months) || months < 0 || isNaN(amountUsd) || amountUsd < 0) {
        setFormErrorMsg(`Datos numéricos inválidos en la línea ${i + 1} (${unitRaw}).`);
        return;
      }

      debtOverrides.set(unitRaw, {
        months,
        amount: +amountUsd.toFixed(2),
        period: periodStr,
        status: months === 0 ? 'Al día' : statusRaw,
      });
    }

    const updatedList: ReceivableAccountItem[] = ACCOUNTS_RECEIVABLE_LIST.map((baseItem) => {
      const override = debtOverrides.get(baseItem.unit.toUpperCase());
      const months = override ? override.months : 0;
      const bracket: DebtBracketKey =
        months <= 0 ? '0' : months === 1 ? '1' : months === 2 ? '2' : months === 3 ? '3' : '4+';

      return {
        ...baseItem,
        pending_months: months,
        bracket,
        last_period: override ? override.period : `Solvente hasta ${activePeriod.label}`,
        amount_usd: override ? override.amount : 0,
        status: override ? override.status : 'Al día',
      };
    });

    const newDebtorsCount = updatedList.filter((u) => u.pending_months > 0).length;
    const newSolventCount = CONDOMINIUM_DATA.total_units - newDebtorsCount;
    const newTotalReceivableUsd = +updatedList
      .reduce((acc, u) => acc + u.amount_usd, 0)
      .toFixed(2);

    setReceivablesList(updatedList);
    setPeriods((prev) =>
      prev.map((p) =>
        p.id === activePeriod.id
          ? {
              ...p,
              solvent_units_count: newSolventCount,
              receivable_units_count: newDebtorsCount,
              accounts_receivable_usd: newTotalReceivableUsd,
            }
          : p
      )
    );

    setFeedbackMsg(
      `Relación de deuda actualizada exitosamente${
        debtFileName ? ` desde "${debtFileName}"` : ''
      }: ${newDebtorsCount} apartamentos con cuentas por cobrar ($${formatNumberVe(
        newTotalReceivableUsd
      )} USD) y ${newSolventCount} apartamentos solventes.`
    );
  };

  // Cargar Factura en Bolívares + Tasa del Día + PDF del Proveedor Obligatorio (Solo Junta)
  const handleAddSingleExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRole !== 'junta') return;

    setFormErrorMsg(null);
    setFeedbackMsg(null);

    const amountBs = parseFloat(newAmountBs);
    const rateBs = parseFloat(newExchangeRateBs);

    if (
      !newSupplier ||
      !newRif ||
      isNaN(amountBs) ||
      amountBs <= 0 ||
      isNaN(rateBs) ||
      rateBs <= 0 ||
      !newInvoiceNumber
    ) {
      setFormErrorMsg(
        'Por favor completa todos los datos del proveedor, el monto en Bolívares y la tasa del día.'
      );
      return;
    }

    if (!uploadedFileUrl || !newFileName) {
      setFormErrorMsg(
        'Es obligatorio adjuntar el archivo PDF original de la factura entregada por el proveedor.'
      );
      return;
    }

    let finalInvoiceUrl = uploadedFileUrl;
    let finalEvidenceUrl = newEvidenceFileUrl;
    let invoiceStoragePath = buildChronologicalStoragePath(
      activePeriod.year,
      activePeriod.month,
      'factura',
      newSupplier,
      'pdf'
    );
    let evidenceStoragePath = newEvidenceFileUrl
      ? buildChronologicalStoragePath(
          activePeriod.year,
          activePeriod.month,
          'evidencia',
          newSupplier,
          'webp'
        )
      : undefined;

    if (invoiceFile) {
      const up = await uploadCondoFile(invoiceFile, {
        year: activePeriod.year,
        month: activePeriod.month,
        prefix: 'factura',
        conceptOrSupplier: newSupplier,
      });
      if (up.error) {
        setFormErrorMsg(up.error);
        return;
      }
      if (up.url) finalInvoiceUrl = up.url;
      if (up.storagePath) invoiceStoragePath = up.storagePath;
    }

    if (evidenceFile && isSupabaseConfigured) {
      const up = await uploadCondoFile(evidenceFile, {
        year: activePeriod.year,
        month: activePeriod.month,
        prefix: 'evidencia',
        conceptOrSupplier: newSupplier,
      });
      if (up.error) {
        setFormErrorMsg(up.error);
        return;
      }
      if (up.url) finalEvidenceUrl = up.url;
      if (up.storagePath) evidenceStoragePath = up.storagePath;
    }

    const amountUsd = +(amountBs / rateBs).toFixed(2);
    const matchedCat =
      INITIAL_CATEGORIES.find((c) => c.name === newCategory) || INITIAL_CATEGORIES[0];
    const shareUsd = +(amountUsd / CONDOMINIUM_DATA.total_units).toFixed(2);
    const shareBs = +(amountBs / CONDOMINIUM_DATA.total_units).toFixed(2);

    const created: Expense = {
      id: `exp-junta-${Date.now()}`,
      period_id: activePeriod.id,
      category_id: matchedCat.id,
      category_name: matchedCat.name,
      supplier_name: newSupplier,
      supplier_tax_id: newRif,
      description: newDescription || `Factura PDF adjunta (${invoiceStoragePath})`,
      amount: amountUsd,
      exchange_rate_bs: rateBs,
      amount_bs: +amountBs.toFixed(2),
      unit_share_usd: shareUsd,
      unit_share_bs: shareBs,
      expense_date: new Date().toISOString().slice(0, 10),
      invoice_url: finalInvoiceUrl,
      invoice_number: newInvoiceNumber,
      control_number:
        newControlNumber || `00-${Math.floor(100000 + Math.random() * 899999)}`,
      evidence_image_url: finalEvidenceUrl || undefined,
      evidence_image_name: evidenceStoragePath || newEvidenceFileName || undefined,
      storage_path: invoiceStoragePath,
      evidence_storage_path: evidenceStoragePath,
      record_status: 'activo',
      audit_status: 'verificado',
      audit_comment: `Soporte estandarizado (${invoiceStoragePath}) — Monto: Bs. ${formatNumberVe(
        amountBs
      )} (Tasa: Bs. ${formatNumberVe(rateBs)}/USD)${
        evidenceStoragePath ? ` • Evidencia comprimida WebP (${evidenceStoragePath})` : ''
      }`,
      created_at: new Date().toISOString(),
    };

    setExpenses((prev) => [created, ...prev]);

    if (isSupabaseConfigured) {
      saveExpenseToSupabase({
        period_id: created.period_id,
        category_id: created.category_id,
        category_name: created.category_name,
        supplier_name: created.supplier_name,
        supplier_tax_id: created.supplier_tax_id,
        invoice_number: created.invoice_number,
        control_number: created.control_number,
        description: created.description,
        amount: created.amount,
        exchange_rate_bs: created.exchange_rate_bs,
        amount_bs: created.amount_bs,
        unit_share_usd: created.unit_share_usd,
        unit_share_bs: created.unit_share_bs,
        invoice_url: finalInvoiceUrl,
        invoice_file_name: invoiceStoragePath,
        storage_path: invoiceStoragePath,
        evidence_url: finalEvidenceUrl,
        evidence_file_name: evidenceStoragePath,
        evidence_storage_path: evidenceStoragePath,
        record_status: 'activo',
        audit_status: created.audit_status,
        audit_comment: created.audit_comment,
      });
    }

    setInvoiceFile(null);
    setEvidenceFile(null);
    setEvidenceCompressionInfo(null);

    setNewSupplier('');
    setNewRif('');
    setNewInvoiceNumber('');
    setNewControlNumber('');
    setNewAmountBs('');
    setNewDescription('');
    setNewFileName('');
    setUploadedFileUrl(null);
    setNewEvidenceFileName('');
    setNewEvidenceFileUrl(null);
    setFeedbackMsg(
      `Factura ${created.invoice_number} guardada como "${invoiceStoragePath}" por Bs. ${formatNumberVe(
        amountBs
      )} ($${formatNumberVe(amountUsd)} USD). Cuota por apto (÷ 72): Bs. ${formatNumberVe(shareBs)} ($${formatNumberVe(
        shareUsd
      )} USD).`
    );
  };

  // Inmutabilidad Contable: Anular factura sin borrado físico (evita huecos en auditoría)
  const handleAnnulExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annullingExpense || activeRole !== 'junta') return;
    const reason = annulReasonInput.trim();
    if (reason.length < 5) {
      setFormErrorMsg('Debes especificar un motivo contable válido para anular la factura.');
      return;
    }

    const nowIso = new Date().toISOString();
    setExpenses((prev) =>
      prev.map((exp) =>
        exp.id === annullingExpense.id
          ? {
              ...exp,
              record_status: 'anulado',
              annulled_reason: reason,
              annulled_at: nowIso,
              audit_status: 'observado',
              audit_comment: `[ANULADO CONTABLEMENTE el ${nowIso.slice(0, 10)}]: ${reason}`,
            }
          : exp
      )
    );

    if (isSupabaseConfigured) {
      await annulExpenseInSupabase(annullingExpense.id, reason);
    }

    setFeedbackMsg(
      `Factura ${annullingExpense.invoice_number} marcada como ANULADA. El registro permanece inmutable para auditoría pero ya no suma al recibo del mes.`
    );
    setAnnullingExpense(null);
    setAnnulReasonInput('');
  };

  // Registrar Nuevo Proyecto con Evidencia Física Comprimida en WebP
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRole !== 'junta') return;

    const costBs = parseFloat(newProjAmountBs.replace(',', '.'));
    const rateBs = parseFloat(newProjRateBs.replace(',', '.'));

    if (!newProjTitle.trim() || !newProjSupplier.trim() || isNaN(costBs) || costBs <= 0 || isNaN(rateBs) || rateBs <= 0) {
      setFormErrorMsg('Por favor completa el título del proyecto, proveedor, monto en Bs. y tasa.');
      return;
    }

    if (!newProjImageUrl) {
      setFormErrorMsg('Es obligatorio adjuntar la foto de evidencia del proyecto finalizado.');
      return;
    }

    const costUsd = +(costBs / rateBs).toFixed(2);
    const shareUsd = +(costUsd / CONDOMINIUM_DATA.total_units).toFixed(2);
    const [projYear, projMonth] = newProjDate.split('-').map(Number);
    const computedStoragePath =
      newProjStoragePath ||
      buildChronologicalStoragePath(
        projYear || activePeriod.year,
        projMonth || activePeriod.month,
        'proyecto',
        newProjTitle,
        'webp'
      );

    const createdProj: CondoProject = {
      id: `proj-${Date.now()}`,
      title: newProjTitle.trim(),
      category: newProjCategory,
      description: newProjDescription.trim() || 'Obra ejecutada y verificada por la Junta de Condominio.',
      completion_date: newProjDate,
      status: newProjStatus,
      total_cost_usd: costUsd,
      total_cost_bs: +costBs.toFixed(2),
      exchange_rate_bs: rateBs,
      unit_share_usd: shareUsd,
      supplier_or_contractor: newProjSupplier.trim(),
      invoice_number: newProjInvoice.trim() || undefined,
      after_image_url: newProjImageUrl,
      after_image_name: newProjImageName || computedStoragePath,
      storage_path: computedStoragePath,
      created_at: new Date().toISOString(),
    };

    setProjects((prev) => [createdProj, ...prev]);
    setShowNewProjectModal(false);

    setNewProjTitle('');
    setNewProjSupplier('');
    setNewProjInvoice('');
    setNewProjAmountBs('');
    setNewProjDescription('');
    setNewProjImageUrl(null);
    setNewProjImageName('');
    setNewProjStoragePath('');
    setNewProjCompressionInfo(null);

    setFeedbackMsg(
      `Proyecto "${createdProj.title}" registrado con evidencia WebP (${computedStoragePath}).`
    );
  };

  // Estrategia de Respaldo 1: Exportar Libro Diario / Histórico de Gastos en CSV (Excel compatible con UTF-8 BOM)
  const handleExportHistoricalCsv = () => {
    const headers = [
      'ID_Registro',
      'Periodo',
      'Fecha_Gasto',
      'Estado_Contable',
      'Nro_Factura',
      'Nro_Control',
      'Proveedor',
      'RIF',
      'Rubro_Contable',
      'Descripcion',
      'Monto_Bs',
      'Tasa_BCV',
      'Monto_USD',
      'Cuota_Apto_USD_Div_72',
      'Ruta_Soporte_PDF',
      'Ruta_Evidencia_Foto',
      'Estatus_Auditoria',
      'Motivo_Anulacion_O_Nota',
    ];

    const rows = expenses.map((exp) => [
      exp.id,
      exp.period_id,
      exp.expense_date,
      (exp.record_status || 'activo').toUpperCase(),
      exp.invoice_number,
      exp.control_number,
      `"${(exp.supplier_name || '').replace(/"/g, '""')}"`,
      exp.supplier_tax_id,
      `"${(exp.category_name || '').replace(/"/g, '""')}"`,
      `"${(exp.description || '').replace(/"/g, '""')}"`,
      exp.amount_bs.toFixed(2),
      exp.exchange_rate_bs.toFixed(2),
      exp.amount.toFixed(2),
      exp.unit_share_usd.toFixed(2),
      exp.storage_path || exp.invoice_url || '',
      exp.evidence_storage_path || exp.evidence_image_name || '',
      exp.audit_status,
      `"${(exp.annulled_reason || exp.audit_comment || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `libro_contable_historico_dan_torre_a_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedbackMsg('Libro histórico de gastos exportado en formato CSV / Excel exitosamente.');
  };

  // Estrategia de Respaldo 2: Descargar Espejo Completo del Sistema en JSON para Google Drive
  const handleExportFullBackupJson = () => {
    const backupPayload = {
      condominium: CONDOMINIUM_DATA,
      exported_at: new Date().toISOString(),
      bank_balance_usd: bankBalanceUsd,
      bank_details: bankDetails,
      board_members: boardMembers,
      periods,
      expenses,
      projects,
      receivables: receivablesList,
    };

    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `respaldo_integral_residencias_dan_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedbackMsg('Respaldo integral (.JSON) descargado. Guárdalo en el Google Drive del condominio.');
  };

  // Probar en vivo el endpoint de Keep-Alive (/api/health)
  const handleTestKeepAlive = async () => {
    try {
      setHealthPingResult('Verificando /api/health...');
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthPingResult(
        `✓ Activo (${res.status}): Modo ${data.mode} • ${new Date(data.timestamp).toLocaleTimeString()}`
      );
    } catch {
      setHealthPingResult('Error al conectar con /api/health');
    }
  };

  // Estilo común para las tarjetas (fondo gris claro + sombra acentuada)
  const lightGrayCardClass =
    'rounded-2xl bg-slate-100 border border-slate-300/85 shadow-[0_12px_28px_-4px_rgba(15,23,42,0.16),0_4px_12px_-2px_rgba(15,23,42,0.10)]';

  const isJuntaSectionActive =
    activeTab === 'junta_info' || activeTab === 'carga_junta';

  return (
    <div className="min-h-screen bg-slate-200/80 text-slate-800 flex justify-center selection:bg-[#2563eb] selection:text-white">
      {/* =====================================================================
          CONTENEDOR PRINCIPAL DE APLICACIÓN MÓVIL (Max-width 440px)
         ===================================================================== */}
      <div className="w-full max-w-[440px] min-h-screen bg-white flex flex-col justify-between shadow-[0_0_50px_rgba(15,23,42,0.22)] border-x border-slate-300/80 relative pb-24">
        {/* ===================================================================
            CABECERA SUPERIOR MÓVIL (Sticky Top App Bar + Barra Única de Filtro)
           =================================================================== */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 pt-3 pb-2.5 space-y-2.5 shadow-sm">
          {/* Fila 1: Identidad del Condominio + Selector de Rol (Junta / Vecino) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-[#2563eb] shadow-sm">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-slate-900 truncate">
                    Residencias DAN
                  </span>
                  <span className="shrink-0 rounded-full bg-[#1d4ed8] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
                    TORRE A
                  </span>
                </div>
                <div className="text-[10px] font-mono font-bold text-slate-500">
                  RIF {CONDOMINIUM_DATA.tax_id}
                </div>
              </div>
            </div>

            {/* Selector de Rol estilo Píldora Móvil con candado y control de acceso */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                className={`flex items-center gap-1.5 rounded-full border pl-2.5 pr-1 py-1 transition ${
                  activeRole === 'junta'
                    ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                    : 'bg-indigo-50/90 border-indigo-100 text-slate-900'
                }`}
              >
                <div className="text-right">
                  <span
                    className={`block text-[8px] font-black uppercase tracking-wider leading-none ${
                      activeRole === 'junta' ? 'text-amber-700' : 'text-slate-400'
                    }`}
                  >
                    {activeRole === 'junta' ? 'ADMINISTRACIÓN' : 'SOLO CONSULTA'}
                  </span>
                  <select
                    aria-label="Cambiar Rol de Usuario"
                    value={activeRole}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="bg-transparent text-[11px] font-black focus:outline-none cursor-pointer pr-0.5"
                  >
                    <option value="propietario">Vecino Torre A</option>
                    <option value="junta">
                      {isJuntaAuthenticated ? 'Junta Directiva ✓' : 'Junta Directiva 🔒'}
                    </option>
                  </select>
                </div>
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${
                    activeRole === 'junta' ? 'bg-amber-600' : 'bg-[#1d4ed8]'
                  }`}
                >
                  {activeRole === 'junta' ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                </div>
              </div>

              {/* Botón rápido para bloquear / salir de sesión de Junta */}
              {activeRole === 'junta' && (
                <button
                  type="button"
                  onClick={handleLogoutJunta}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition shadow-xs"
                  title="Bloquear / Cerrar sesión de Junta"
                >
                  <Lock className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Fila 2: Única Barra de Filtrado (Mes y Año) + Moneda (USD / Bs.) + Tasa BCV */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            {/* Desplegables de Mes y Año */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 border border-slate-200/90 px-2.5 py-1.5 text-[11px] shadow-inner">
              <select
                aria-label="Seleccionar Mes"
                value={activePeriod?.month || 10}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                className="bg-transparent font-extrabold text-slate-800 focus:outline-none cursor-pointer"
              >
                {monthsInActiveYear.map((p) => (
                  <option key={p.id} value={p.month}>
                    {MONTH_NAMES[p.month]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Seleccionar Año"
                value={activePeriod?.year || 2026}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="bg-transparent font-black text-[#2563eb] focus:outline-none cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector USD / Bs. */}
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/90 text-[11px] font-extrabold">
              <button
                type="button"
                onClick={() => setCurrencyMode(currencyMode === 'usd' ? 'both' : 'usd')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  currencyMode === 'usd' || currencyMode === 'both'
                    ? 'bg-[#1d4ed8] text-white shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                USD
              </button>
              <button
                type="button"
                onClick={() => setCurrencyMode('bs')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  currencyMode === 'bs'
                    ? 'bg-[#1d4ed8] text-white shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                Bs.
              </button>
            </div>

            {/* Píldora Tasa BCV / Cierre del Mes */}
            {activeRole === 'junta' ? (
              <button
                type="button"
                onClick={() => {
                  setTempClosingRateBs(activePeriod.exchange_rate_bs.toString());
                  setRecalculateExpensesWithClosingRate(true);
                  setShowEditRateModal(true);
                }}
                title="Toca para definir la tasa de cierre y dolarizar el recibo"
                className="flex items-center gap-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1.5 text-[11px] font-extrabold text-emerald-900 shrink-0 shadow-xs transition"
              >
                <TrendingUp className="h-3.5 w-3.5 text-emerald-700" />
                <span className="font-mono">
                  BCV: Bs. {formatNumberVe(activePeriod.exchange_rate_bs)}
                </span>
                <Pencil className="h-2.5 w-2.5 text-emerald-800 ml-0.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1 rounded-xl bg-emerald-100/90 border border-emerald-200 px-2.5 py-1.5 text-[11px] font-extrabold text-emerald-900 shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-mono">
                  BCV: Bs. {formatNumberVe(activePeriod.exchange_rate_bs)}
                </span>
              </div>
            )}
          </div>

          {/* Barra de Instalación de App Móvil (PWA) para demostración con vecinos */}
          {!isStandalone && (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={handleInstallPwaClick}
                className="w-full flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#0f172a] px-3 py-2 text-[11px] font-extrabold text-white shadow-sm active:scale-[0.99] transition"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-sky-300 shrink-0" />
                  <span>Instalar App Móvil Residencias DAN Torre A</span>
                </div>
                <span className="rounded-lg bg-white/20 px-2 py-0.5 text-[10px] font-black text-white shrink-0">
                  Instalar
                </span>
              </button>
            </div>
          )}
        </header>

        {/* ===================================================================
            CONTENIDO MÓVIL DESPLAZABLE (MAIN)
           =================================================================== */}
        <main className="flex-1 px-3.5 py-4 space-y-4 overflow-x-hidden">
          {/* =================================================================
              PESTAÑA 1: DASHBOARD MÓVIL
             ================================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              {/* Tarjeta de Período y Fórmula (Monto ÷ 72) */}
              <div className={`${lightGrayCardClass} p-4 space-y-3 relative overflow-hidden`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0c2e36] text-teal-300 shadow-sm">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          GESTIÓN TORRE A
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[9px] font-extrabold ${
                            activePeriod.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {activePeriod.status === 'published' ? 'Corte Publicado' : 'En Carga'}
                        </span>
                      </div>
                      <h2 className="text-sm font-black text-slate-900 mt-0.5">
                        Relación Mensual — {activePeriod.label}
                      </h2>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('facturas_pdf')}
                    className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-[11px] font-extrabold text-[#1d4ed8] shadow-sm transition shrink-0"
                  >
                    Ver facturas
                  </button>
                </div>

                <div className="rounded-xl bg-white p-3 border border-slate-200/90 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Fórmula Aplicada (72 Aptos)
                    </span>
                    <strong className="font-extrabold text-slate-800">
                      Gasto Total ÷ 72 Apartamentos
                    </strong>
                  </div>
                  <div className="text-right font-mono">
                    <strong className="text-sm font-black text-[#1d4ed8] block">
                      ${formatNumberVe(sharePerApartmentUsd)} / apto
                    </strong>
                    <span className="text-[10px] font-bold text-slate-500">
                      {periodExpenses.length} soportes PDF
                    </span>
                  </div>
                </div>

                {/* Tasa Oficial de Cierre del Mes para Dolarización */}
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/90 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-[11px] font-bold text-slate-700">
                      Tasa de Cierre del Mes:
                    </span>
                    <strong className="font-mono font-black text-emerald-700">
                      Bs. {formatNumberVe(activePeriod.exchange_rate_bs)}
                    </strong>
                  </div>
                  {activeRole === 'junta' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTempClosingRateBs(activePeriod.exchange_rate_bs.toString());
                        setRecalculateExpensesWithClosingRate(true);
                        setShowEditRateModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#1d4ed8] hover:text-blue-800 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-xs transition"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                      Dolarizar al Corte
                    </button>
                  )}
                </div>
              </div>

              {/* KPI DESTACADO: SALDO DISPONIBLE EN BANCO */}
              <div className={`${lightGrayCardClass} p-4 flex items-center justify-between`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between pr-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
                      SALDO DISPONIBLE EN BANCO
                    </span>
                    {activeRole === 'junta' && (
                      <button
                        type="button"
                        onClick={() => {
                          setTempBankBalanceUsd(bankBalanceUsd.toString());
                          setShowEditBalanceModal(true);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#1d4ed8] hover:text-blue-800 bg-white hover:bg-blue-50 px-2 py-0.5 rounded-lg border border-slate-200 shadow-xs transition"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                        Editar Saldo
                      </button>
                    )}
                  </div>
                  <div className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">
                    {formatMoney(bankBalanceUsd).primary}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-1">
                    {formatMoney(bankBalanceUsd).secondary} • Cuenta {bankDetails.bankName.replace('Banco ', '')} Torre A
                  </div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm border border-emerald-100">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>

              {/* FILA 2 KPIs MÓVIL: APARTAMENTOS TORRE A + GASTOS TOTALES DEL MES */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`${lightGrayCardClass} p-3.5 flex flex-col justify-between`}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-600">
                      APARTAMENTOS
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#2563eb] border border-indigo-100 shadow-sm">
                      <Building2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
                    {CONDOMINIUM_DATA.total_units}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-1">
                    4 por piso (11-A al 184-A)
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('facturas_pdf')}
                  className={`${lightGrayCardClass} p-3.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-600">
                      GASTOS DEL MES
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-cyan-600 border border-cyan-100 shadow-sm">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-lg font-black text-slate-900 mt-2 tabular-nums">
                    {formatMoney(totalPeriodExpensesUsd).primary}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-1 truncate">
                    {formatMoney(totalPeriodExpensesUsd).secondary}
                  </div>
                </div>
              </div>

              {/* KPI CUOTA PARTE POR APARTAMENTO (MONTO ÷ 72) */}
              <div className={`${lightGrayCardClass} p-4 flex items-center justify-between`}>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
                    CUOTA PARTE POR APARTAMENTO (MONTO ÷ 72)
                  </span>
                  <div className="text-2xl font-black text-[#1d4ed8] mt-1 tabular-nums">
                    {formatMoney(sharePerApartmentUsd).primary}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-1">
                    Equivalente: {formatMoney(sharePerApartmentUsd).secondary} por apto
                  </div>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1d4ed8] shadow-sm border border-indigo-100">
                  <Calculator className="h-5 w-5" />
                </div>
              </div>

              {/* FILA 4 KPIs MÓVIL: VECINOS CON CUENTAS POR COBRAR AL LADO DE MONTO EN CUENTAS POR COBRAR */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setActiveTab('cuentas_por_cobrar')}
                  className={`${lightGrayCardClass} p-3.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-700 leading-tight">
                      VECINOS CON CUENTAS POR COBRAR
                    </span>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-rose-500 border border-rose-100 shadow-sm">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-rose-600 mt-2 tabular-nums">
                    {activePeriod.receivable_units_count}
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] font-extrabold mt-1">
                    <span className="text-amber-600">
                      {dynamicDebtGroupsSummary.find((g) => g.key === '1')?.apartments_count ?? 0} (1 rec)
                    </span>
                    <span className="text-[#2563eb]">
                      {dynamicDebtGroupsSummary.find((g) => g.key === '2')?.apartments_count ?? 0} (2 rec)
                    </span>
                    <span className="text-rose-600">
                      {(dynamicDebtGroupsSummary.find((g) => g.key === '3')?.apartments_count ?? 0) +
                        (dynamicDebtGroupsSummary.find((g) => g.key === '4+')?.apartments_count ?? 0)}{' '}
                      (3+ rec)
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('cuentas_por_cobrar')}
                  className={`${lightGrayCardClass} p-3.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-700 leading-tight">
                      MONTO EN CUENTAS POR COBRAR
                    </span>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 border border-amber-100 shadow-sm">
                      <ClipboardList className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-lg font-black text-slate-900 mt-2 tabular-nums">
                    {formatMoney(activePeriod.accounts_receivable_usd).primary}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-1 truncate">
                    {formatMoney(activePeriod.accounts_receivable_usd).secondary}
                  </div>
                </div>
              </div>

              {/* DESGLOSE DE FACTURAS DEL MES (MÓVIL) */}
              <div className={`${lightGrayCardClass} p-4 space-y-3`}>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wide text-slate-900">
                      Facturas del Mes ({activePeriod.label})
                    </h3>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Toca cualquier factura para ver o descargar su PDF
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('facturas_pdf')}
                    className="text-[11px] font-extrabold text-[#1d4ed8]"
                  >
                    Ver todas ({periodExpenses.length})
                  </button>
                </div>

                <div className="space-y-2.5">
                  {periodExpenses.map((exp) => {
                    const pctNum =
                      totalPeriodExpensesUsd > 0
                        ? (exp.amount / totalPeriodExpensesUsd) * 100
                        : 0;
                    const pctFormatted = formatNumberVe(pctNum, 1);
                    const aptoUsd = +(exp.amount / CONDOMINIUM_DATA.total_units).toFixed(2);
                    return (
                      <div
                        key={exp.id}
                        onClick={() => {
                          setSelectedExpenseModal(exp);
                          setInvoiceModalInitialTab('pdf');
                        }}
                        className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm active:bg-indigo-50/40 transition cursor-pointer space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[11px] font-extrabold text-[#1d4ed8]">
                                {exp.invoice_number}
                              </span>
                              {exp.evidence_image_url && (
                                <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2">
                                  <Camera className="h-2.5 w-2.5" />
                                  Foto
                                </span>
                              )}
                            </div>
                            <strong className="text-xs font-extrabold text-slate-900 block truncate">
                              {exp.supplier_name}
                            </strong>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadInvoicePdf(exp, CONDOMINIUM_DATA);
                            }}
                            title="Descargar Factura PDF del Proveedor"
                            className="rounded-lg bg-[#1d4ed8] p-1.5 text-white shadow-sm shrink-0"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-100">
                          <span className="font-black text-slate-900">
                            ${formatNumberVe(exp.amount)} USD
                          </span>
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-[#1d4ed8] border border-indigo-100">
                            ÷ 72 = ${formatNumberVe(aptoUsd)} / apto
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-[#1d4ed8] rounded-full"
                              style={{ width: `${pctNum.toFixed(1)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            {pctFormatted}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DISTRIBUCIÓN DE GASTOS POR RUBRO (MÓVIL) */}
              <div className={`${lightGrayCardClass} p-4 space-y-3`}>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wide text-slate-900">
                    Distribución por Rubro ({activePeriod.label})
                  </h3>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Participación por rubro y cuota por apartamento (÷ 72)
                  </p>
                </div>

                <div className="h-44 w-full bg-white rounded-xl p-2 border border-slate-200/80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategoryData}
                        dataKey="montoUsd"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={64}
                        paddingAngle={3}
                      >
                        {expensesByCategoryData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => `$${formatNumberVe(value)} USD`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 pt-1">
                  {expensesByCategoryData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-[11px] bg-white rounded-xl px-3 py-2 border border-slate-200/70"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-bold text-slate-700 truncate">{item.name}</span>
                      </div>
                      <div className="font-mono font-extrabold text-slate-900 shrink-0">
                        ${formatNumberVe(item.montoUsd)}{' '}
                        <span className="text-[#1d4ed8] font-bold">
                          (${formatNumberVe(item.cuotaAptoUsd)})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              PESTAÑA 2: COBRANZA / CUENTAS POR COBRAR (MÓVIL)
             ================================================================= */}
          {activeTab === 'cuentas_por_cobrar' && (
            <div className="space-y-4">
              {/* Barra exclusiva Junta de Condominio para exportar a WhatsApp */}
              {activeRole === 'junta' && (
                <div className={`${lightGrayCardClass} p-4 space-y-3 border-emerald-300/80`}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                      <Share2 className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                        HERRAMIENTA JUNTA DE CONDOMINIO
                      </span>
                      <h3 className="text-xs font-black text-slate-900">
                        Exportar Resumen para WhatsApp
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyWhatsappSummary}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-2.5 text-[11px] font-extrabold text-emerald-900 shadow-sm"
                    >
                      {whatsappCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-emerald-600" />
                          Copiar Texto
                        </>
                      )}
                    </button>

                    <button
                      onClick={() =>
                        downloadAccountsReceivableWhatsappPdf(
                          CONDOMINIUM_DATA,
                          activePeriod,
                          dynamicDebtGroupsSummary,
                          receivablesList
                        )
                      }
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-[11px] font-extrabold text-white shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Resumen PDF
                    </button>
                  </div>
                </div>
              )}

              {/* Resumen por Grupo de Deudas */}
              <div className={`${lightGrayCardClass} p-4 space-y-3.5`}>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Resumen por Grupo de Deudas
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                    72 apartamentos (4 por piso: <code className="font-bold">11-A</code> al{' '}
                    <code className="font-bold">184-A</code>)
                  </p>
                </div>

                {/* Contadores rápidos */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-sm">
                  <div>
                    <span className="text-[10px] font-sans font-bold text-slate-400 block">
                      Solventes
                    </span>
                    <strong className="text-emerald-600 font-black text-sm">
                      {activePeriod.solvent_units_count}/72
                    </strong>
                  </div>
                  <div className="border-x border-slate-200">
                    <span className="text-[10px] font-sans font-bold text-slate-400 block">
                      Con Deuda
                    </span>
                    <strong className="text-rose-600 font-black text-sm">
                      {activePeriod.receivable_units_count}/72
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans font-bold text-slate-400 block">
                      Por Cobrar
                    </span>
                    <strong className="text-slate-900 font-black text-xs">
                      ${formatNumberVe(activePeriod.accounts_receivable_usd)}
                    </strong>
                  </div>
                </div>

                {/* Tarjetas de Grupos de Deuda */}
                <div className="space-y-2.5">
                  {dynamicDebtGroupsSummary.map((group) => {
                    const isSelected = selectedDebtBracket === group.key;
                    const pctNum =
                      (group.apartments_count / CONDOMINIUM_DATA.total_units) * 100;
                    const pctOfBuilding = formatNumberVe(pctNum, 1);
                    const subtotalBs = group.subtotal_usd * activePeriod.exchange_rate_bs;

                    const theme =
                      group.key === '0'
                        ? {
                            cardBg:
                              'bg-gradient-to-br from-emerald-50 via-teal-50/70 to-white border-emerald-200',
                            topBar: 'bg-emerald-500',
                            badge: 'bg-emerald-600 text-white',
                            pctBadge: 'bg-emerald-100 text-emerald-800',
                            numberColor: 'text-emerald-950',
                            amountColor: 'text-emerald-700',
                            ring: 'ring-2 ring-emerald-500 border-emerald-500',
                          }
                        : group.key === '1'
                        ? {
                            cardBg:
                              'bg-gradient-to-br from-sky-50 via-blue-50/70 to-white border-sky-200',
                            topBar: 'bg-sky-500',
                            badge: 'bg-sky-600 text-white',
                            pctBadge: 'bg-sky-100 text-sky-800',
                            numberColor: 'text-sky-950',
                            amountColor: 'text-sky-700',
                            ring: 'ring-2 ring-sky-500 border-sky-500',
                          }
                        : group.key === '2'
                        ? {
                            cardBg:
                              'bg-gradient-to-br from-indigo-50 via-violet-50/70 to-white border-indigo-200',
                            topBar: 'bg-indigo-500',
                            badge: 'bg-indigo-600 text-white',
                            pctBadge: 'bg-indigo-100 text-indigo-800',
                            numberColor: 'text-indigo-950',
                            amountColor: 'text-indigo-700',
                            ring: 'ring-2 ring-indigo-500 border-indigo-500',
                          }
                        : group.key === '3'
                        ? {
                            cardBg:
                              'bg-gradient-to-br from-amber-50 via-orange-50/70 to-white border-amber-200',
                            topBar: 'bg-amber-500',
                            badge: 'bg-amber-500 text-white',
                            pctBadge: 'bg-amber-100 text-amber-900',
                            numberColor: 'text-amber-950',
                            amountColor: 'text-amber-700',
                            ring: 'ring-2 ring-amber-500 border-amber-500',
                          }
                        : {
                            cardBg:
                              'bg-gradient-to-br from-rose-50 via-pink-50/70 to-white border-rose-200',
                            topBar: 'bg-rose-500',
                            badge: 'bg-rose-600 text-white',
                            pctBadge: 'bg-rose-100 text-rose-800',
                            numberColor: 'text-rose-950',
                            amountColor: 'text-rose-700',
                            ring: 'ring-2 ring-rose-500 border-rose-500',
                          };

                    return (
                      <button
                        key={group.key}
                        onClick={() => {
                          if (group.key === '0') {
                            setSelectedDebtBracket('ALL');
                            return;
                          }
                          setSelectedDebtBracket(
                            selectedDebtBracket === group.key ? 'ALL' : group.key
                          );
                        }}
                        className={`w-full relative overflow-hidden text-left rounded-2xl p-3.5 border transition ${
                          theme.cardBg
                        } ${isSelected ? theme.ring : 'shadow-sm'}`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.topBar}`} />
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block rounded-lg px-2.5 py-0.5 text-[10px] font-extrabold ${theme.badge}`}
                            >
                              {group.receipts_Label}
                            </span>
                            <h3 className="text-xs font-black text-slate-900">{group.title}</h3>
                          </div>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-extrabold ${theme.pctBadge}`}
                          >
                            {pctOfBuilding}%
                          </span>
                        </div>

                        <div className="mt-2 flex items-end justify-between gap-2">
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span
                                className={`text-2xl font-black font-mono ${theme.numberColor}`}
                              >
                                {group.apartments_count}
                              </span>
                              <span className="text-[11px] font-extrabold text-slate-600">
                                apartamentos
                              </span>
                            </div>
                            <p className="text-[10px] font-medium text-slate-600">
                              {group.subtitle}
                            </p>
                          </div>

                          <div className="text-right font-mono">
                            <span className="text-[9px] font-sans font-extrabold uppercase text-slate-400 block">
                              Subtotal Grupo
                            </span>
                            <strong className={`text-xs font-black block ${theme.amountColor}`}>
                              ${formatNumberVe(group.subtotal_usd)} USD
                            </strong>
                            <span className="text-[10px] font-bold text-slate-500">
                              Bs. {formatNumberVe(subtotalBs)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gráfica de Cuentas por Cobrar por Grupo */}
              <div className={`${lightGrayCardClass} p-4 space-y-3`}>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Gráfica por Grupo de Recibos ($ USD)
                  </h3>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Monto acumulado según recibos pendientes
                  </p>
                </div>

                <div className="h-48 w-full bg-white rounded-xl p-2 border border-slate-200/80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={debtGroupsChartData}
                      margin={{ top: 8, right: 8, left: -12, bottom: 2 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="grupo"
                        tick={{ fontSize: 10, fill: '#334155', fontWeight: 800 }}
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#475569' }} unit="$" />
                      <Tooltip
                        formatter={(value: number) => [
                          `$${formatNumberVe(value)} USD`,
                          'Subtotal',
                        ]}
                      />
                      <Bar dataKey="MontoAcumulado" radius={[6, 6, 0, 0]}>
                        {debtGroupsChartData.map((entry, idx) => (
                          <Cell key={`cell-debt-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detalle de Apartamentos con Deuda (Excluye solventes) */}
              <div className={`${lightGrayCardClass} p-4 space-y-3`}>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Detalle de Apartamentos con Deuda (Piso + Apto + -A)
                  </h3>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Excluye vecinos solventes • Mostrando {filteredReceivables.length} apartamentos
                  </p>
                </div>

                {/* Filtros horizontales */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    onClick={() => setSelectedDebtBracket('ALL')}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                      selectedDebtBracket === 'ALL' || selectedDebtBracket === '0'
                        ? 'bg-[#1d4ed8] text-white'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    Todos ({debtOnlyList.length})
                  </button>
                  {dynamicDebtGroupsSummary
                    .filter((g) => g.key !== '0')
                    .map((g) => (
                      <button
                        key={g.key}
                        onClick={() => setSelectedDebtBracket(g.key)}
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                          selectedDebtBracket === g.key
                            ? 'bg-[#1d4ed8] text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        {g.receipts_Label} ({g.apartments_count})
                      </button>
                    ))}
                </div>

                {/* Tarjetas móviles de apartamentos con deuda */}
                <div className="space-y-2">
                  {filteredReceivables.map((item) => (
                    <div
                      key={item.unit}
                      className="rounded-xl bg-white p-3 border border-slate-200/90 shadow-sm flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">{item.unit}</span>
                          <span className="text-[10px] font-bold text-slate-400">
                            • {item.floor}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[9px] font-extrabold border ${
                              item.status === 'En verificación'
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : item.status === 'Convenio de pago'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                          {item.last_period} ({item.pending_months}{' '}
                          {item.pending_months === 1 ? 'recibo' : 'recibos'})
                        </p>
                      </div>

                      <div className="text-right font-mono shrink-0">
                        <strong className="text-xs font-black text-slate-900 block">
                          ${formatNumberVe(item.amount_usd)} USD
                        </strong>
                        <span className="text-[10px] font-bold text-slate-500">
                          Bs. {formatNumberVe(item.amount_usd * activePeriod.exchange_rate_bs)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              PESTAÑA 3: FACTURAS (FUSIÓN DE RELACIÓN DE GASTOS + FACTURAS PDF)
              Conserva el nombre "Facturas" y el diseño tipo tarjeta de "Relación de Gastos"
             ================================================================= */}
          {activeTab === 'facturas_pdf' && (
            <div className="space-y-4">
              {/* Cabecera de Facturas y Relación de Gastos */}
              <div className={`${lightGrayCardClass} p-4 space-y-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d4ed8]">
                      GESTIÓN GLOBAL • 72 APARTAMENTOS
                    </span>
                    <h2 className="text-base font-black text-slate-900 mt-0.5">
                      Relación de Gastos y Facturas — {activePeriod.label}
                    </h2>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                      Cada gasto está respaldado por su factura PDF original y se divide en partes
                      iguales (Monto ÷ 72)
                    </p>
                  </div>
                </div>

                {/* Resumen de Totales en 2 Columnas */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-white p-3 border border-slate-200/90">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                      Gasto Total Torre A
                    </span>
                    <strong className="text-base font-black font-mono text-slate-900 block mt-0.5">
                      ${formatNumberVe(totalPeriodExpensesUsd)} USD
                    </strong>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      Bs. {formatNumberVe(totalPeriodExpensesUsd * activePeriod.exchange_rate_bs)}
                    </span>
                  </div>

                  <div className="rounded-xl bg-indigo-50/90 p-3 border border-indigo-200">
                    <span className="text-[10px] font-extrabold uppercase text-[#1d4ed8] block">
                      Cuota Apto (÷ 72)
                    </span>
                    <strong className="text-base font-black font-mono text-[#1d4ed8] block mt-0.5">
                      ${formatNumberVe(sharePerApartmentUsd)} USD
                    </strong>
                    <span className="text-[10px] font-mono font-bold text-slate-600">
                      Bs. {formatNumberVe(sharePerApartmentUsd * activePeriod.exchange_rate_bs)}
                    </span>
                  </div>
                </div>

                {/* Buscador y filtro por rubro integrados */}
                <div className="space-y-2 pt-1">
                  <div className="relative">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar proveedor, RIF o N° factura..."
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-semibold focus:border-[#1d4ed8] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Filtrar por rubro"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      <option value="ALL">Todos los rubros contables</option>
                      {INITIAL_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    {(searchQuery || categoryFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setCategoryFilter('ALL');
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-2 text-[11px] font-extrabold text-[#1d4ed8] shrink-0"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                {activeRole === 'junta' && (
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        downloadExpensesSummaryCardsPdf(
                          CONDOMINIUM_DATA,
                          activePeriod,
                          periodExpenses
                        )
                      }
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-indigo-50/70 border border-indigo-200 px-4 py-2.5 text-xs font-extrabold text-[#1d4ed8] shadow-xs transition"
                    >
                      <Download className="h-4 w-4" />
                      Descargar Resumen PDF en Tarjetas ({activePeriod.label})
                    </button>

                    <button
                      onClick={() => setActiveTab('carga_junta')}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1d4ed8] hover:bg-blue-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition"
                    >
                      <Plus className="h-4 w-4" />
                      Registrar Nueva Factura en Bolívares
                    </button>
                  </div>
                )}
              </div>

              {/* Lista Móvil de Tarjetas de "Relación de Gastos" */}
              <div className="space-y-3">
                {filteredExpenses.map((exp) => {
                  const isAnnulled = exp.record_status === 'anulado';
                  const aptoUsd = exp.amount / CONDOMINIUM_DATA.total_units;
                  const aptoBs = exp.amount_bs / CONDOMINIUM_DATA.total_units;
                  return (
                    <div
                      key={exp.id}
                      onClick={() => setSelectedExpenseModal(exp)}
                      className={`${lightGrayCardClass} p-4 space-y-3 cursor-pointer active:scale-[0.99] transition ${
                        isAnnulled ? 'opacity-75 border-rose-300 bg-rose-50/40' : ''
                      }`}
                    >
                      {isAnnulled && (
                        <div className="rounded-xl bg-rose-100 border border-rose-300 px-3 py-2 text-[11px] font-bold text-rose-900 flex items-start gap-2">
                          <Ban className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black uppercase block">
                              REGISTRO ANULADO CONTABLEMENTE (NO SUMA AL RECIBO)
                            </span>
                            {exp.annulled_reason && (
                              <span className="text-[10px] font-semibold text-rose-800 block mt-0.5">
                                Motivo de auditoría: {exp.annulled_reason}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-xs font-black ${
                                isAnnulled ? 'line-through text-rose-700' : 'text-[#1d4ed8]'
                              }`}
                            >
                              {exp.invoice_number}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              • {exp.expense_date}
                            </span>
                          </div>
                          <h3
                            className={`text-sm font-black mt-0.5 ${
                              isAnnulled ? 'line-through text-slate-500' : 'text-slate-900'
                            }`}
                          >
                            {exp.supplier_name}
                          </h3>
                          <span className="text-[11px] font-mono font-semibold text-slate-500">
                            RIF: {exp.supplier_tax_id}
                          </span>
                          {exp.storage_path && (
                            <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                              Ruta: /{exp.storage_path}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {exp.evidence_image_url && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExpenseModal(exp);
                                setInvoiceModalInitialTab('evidence');
                              }}
                              className="rounded-lg bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 flex items-center gap-1 shadow-xs transition"
                            >
                              <Camera className="h-3 w-3 text-emerald-700" />
                              Foto Evidencia
                            </button>
                          )}
                          {isAnnulled ? (
                            <span className="rounded-lg bg-rose-200 border border-rose-300 px-2 py-0.5 text-[10px] font-extrabold text-rose-900 shrink-0">
                              ANULADO
                            </span>
                          ) : (
                            <span className="rounded-lg bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 shrink-0">
                              PDF Verificado
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 font-medium bg-white rounded-xl p-2.5 border border-slate-200/80 leading-snug">
                        {exp.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                          <span className="text-[9px] font-sans font-extrabold uppercase text-slate-400 block">
                            Monto Factura
                          </span>
                          <strong
                            className={`font-black block ${
                              isAnnulled ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            Bs. {formatNumberVe(exp.amount_bs)}
                          </strong>
                          <span className="text-[10px] text-slate-500">
                            ${formatNumberVe(exp.amount)} USD (Tasa{' '}
                            {formatNumberVe(exp.exchange_rate_bs)})
                          </span>
                        </div>

                        <div className="rounded-xl bg-indigo-50/90 p-2.5 border border-indigo-200">
                          <span className="text-[9px] font-sans font-extrabold uppercase text-[#1d4ed8] block">
                            Cuota Apto (÷ 72)
                          </span>
                          <strong
                            className={`font-black block ${
                              isAnnulled ? 'line-through text-slate-400' : 'text-[#1d4ed8]'
                            }`}
                          >
                            ${formatNumberVe(isAnnulled ? 0 : aptoUsd)} USD
                          </strong>
                          <span className="text-[10px] text-slate-600">
                            Bs. {formatNumberVe(isAnnulled ? 0 : aptoBs)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExpenseModal(exp);
                            setInvoiceModalInitialTab('pdf');
                          }}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-[11px] font-extrabold text-slate-800 shadow-sm transition"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#1d4ed8]" />
                          Ver Factura PDF
                        </button>
                        {exp.evidence_image_url ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExpenseModal(exp);
                              setInvoiceModalInitialTab('evidence');
                            }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-[11px] font-extrabold text-white shadow-md shadow-emerald-600/20 transition"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            Ver Foto ({exp.evidence_image_name?.split('.')[0] || 'Evidencia'})
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadInvoicePdf(exp, CONDOMINIUM_DATA);
                            }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1d4ed8] hover:bg-blue-700 px-3 py-2 text-[11px] font-extrabold text-white shadow-sm transition"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Descargar PDF
                          </button>
                        )}
                      </div>

                      {activeRole === 'junta' && !isAnnulled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnnullingExpense(exp);
                            setAnnulReasonInput('');
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-700 transition"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Anular Registro Contable (Sin Borrado Físico)
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              PESTAÑA 3B: PROYECTOS Y MEJORAS FINALIZADAS CON EVIDENCIA FOTOGRÁFICA
             ================================================================= */}
          {activeTab === 'proyectos' && (
            <div className="space-y-4">
              {feedbackMsg && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-extrabold text-emerald-900 flex items-center gap-2 shadow-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>{feedbackMsg}</span>
                </div>
              )}

              {/* Encabezado de Proyectos */}
              <div className={`${lightGrayCardClass} p-4 space-y-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d4ed8] block">
                      OBRAS Y MEJORAS DE LA COMUNIDAD
                    </span>
                    <h2 className="text-base font-black text-slate-900">
                      Proyectos Finalizados y Evidencias
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Registro fotográfico auditable de cada obra ejecutada en{' '}
                      {CONDOMINIUM_DATA.name}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1d4ed8] text-white shadow-sm">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                </div>

                {/* Resumen de obras */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-white p-3 border border-slate-200/90">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                      Obras Finalizadas
                    </span>
                    <strong className="text-base font-black font-mono text-emerald-700 block mt-0.5">
                      {projects.filter((p) => p.status === 'finalizado').length} Proyectos
                    </strong>
                    <span className="text-[10px] font-semibold text-slate-500">
                      100% con evidencia fotográfica
                    </span>
                  </div>

                  <div className="rounded-xl bg-indigo-50/90 p-3 border border-indigo-200">
                    <span className="text-[10px] font-extrabold uppercase text-[#1d4ed8] block">
                      Inversión Acumulada
                    </span>
                    <strong className="text-base font-black font-mono text-[#1d4ed8] block mt-0.5">
                      ${formatNumberVe(projects.reduce((s, p) => s + p.total_cost_usd, 0))} USD
                    </strong>
                    <span className="text-[10px] font-mono font-bold text-slate-600">
                      ${formatNumberVe(projects.reduce((s, p) => s + p.unit_share_usd, 0))} / Apto
                    </span>
                  </div>
                </div>

                {/* Filtros por Estado */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {(
                    [
                      { id: 'ALL', label: 'Todos' },
                      { id: 'finalizado', label: 'Finalizados' },
                      { id: 'en_ejecucion', label: 'En Ejecución' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setProjectStatusFilter(st.id)}
                      className={`rounded-xl py-2 text-[11px] font-extrabold transition ${
                        projectStatusFilter === st.id
                          ? 'bg-[#1d4ed8] text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {activeRole === 'junta' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFormErrorMsg(null);
                      setShowNewProjectModal(true);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition"
                  >
                    <Camera className="h-4 w-4" />
                    Registrar Proyecto Finalizado con Foto Evidencia
                  </button>
                ) : (
                  <div className="rounded-xl bg-white border border-slate-200/80 px-3 py-2 text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                    <span>¿Deseas cargar un nuevo proyecto finalizado?</span>
                    <button
                      type="button"
                      onClick={() => handleRoleChange('junta')}
                      className="font-extrabold text-[#1d4ed8] underline"
                    >
                      Modo Junta
                    </button>
                  </div>
                )}
              </div>

              {/* Lista de Tarjetas de Proyectos */}
              <div className="space-y-3.5">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className={`${lightGrayCardClass} overflow-hidden border border-slate-200/90`}
                  >
                    {/* Imagen de Evidencia del Proyecto Finalizado */}
                    <div
                      onClick={() => setSelectedProjectPreview(proj)}
                      className="relative h-48 w-full bg-slate-900 cursor-pointer group overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proj.after_image_url}
                        alt={proj.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase shadow-md ${
                            proj.status === 'finalizado'
                              ? 'bg-emerald-600 text-white'
                              : proj.status === 'en_ejecucion'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-700 text-white'
                          }`}
                        >
                          {proj.status === 'finalizado'
                            ? '✓ Proyecto Finalizado'
                            : proj.status === 'en_ejecucion'
                            ? 'En Ejecución'
                            : 'Planificado'}
                        </span>
                        <span className="rounded-full bg-slate-900/80 backdrop-blur-xs text-white px-2.5 py-1 text-[10px] font-bold">
                          {proj.category}
                        </span>
                      </div>
                      <div className="absolute bottom-2.5 right-2.5 rounded-xl bg-slate-900/80 backdrop-blur-xs text-white px-2.5 py-1 text-[10px] font-bold flex items-center gap-1">
                        <Eye className="h-3 w-3 text-emerald-400" />
                        Toca para ampliar evidencia
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span>Fecha culminación: {proj.completion_date}</span>
                          {proj.invoice_number && (
                            <span className="font-mono text-[#1d4ed8]">
                              Soporte: {proj.invoice_number}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-black text-slate-900 mt-0.5">
                          {proj.title}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                          Contratista / Responsable: {proj.supplier_or_contractor}
                        </p>
                      </div>

                      <p className="text-xs text-slate-700 bg-white rounded-xl p-3 border border-slate-200/80 leading-relaxed">
                        {proj.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                          <span className="text-[9px] font-sans font-extrabold uppercase text-slate-400 block">
                            Inversión Total Obra
                          </span>
                          <strong className="text-slate-900 font-black block">
                            ${formatNumberVe(proj.total_cost_usd)} USD
                          </strong>
                          <span className="text-[10px] text-slate-500">
                            Bs. {formatNumberVe(proj.total_cost_bs)}
                          </span>
                        </div>

                        <div className="rounded-xl bg-indigo-50/90 p-2.5 border border-indigo-200">
                          <span className="text-[9px] font-sans font-extrabold uppercase text-[#1d4ed8] block">
                            Impacto por Apto (÷ 72)
                          </span>
                          <strong className="text-[#1d4ed8] font-black block">
                            ${formatNumberVe(proj.unit_share_usd)} USD
                          </strong>
                          <span className="text-[10px] text-slate-600">
                            Bs. {formatNumberVe(proj.total_cost_bs / CONDOMINIUM_DATA.total_units)}
                          </span>
                        </div>
                      </div>

                      {proj.storage_path && (
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 bg-white rounded-lg px-2.5 py-1.5 border border-slate-200/70">
                          <span className="truncate">Archivo: /{proj.storage_path}</span>
                          <span className="text-emerald-700 font-bold shrink-0 ml-2">
                            WebP Optimizado
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
              PESTAÑA 4A: JUNTA DE CONDOMINIO Y PAGOS (MÓVIL)
              (Excluye números de teléfono, fotos, Tablón de comunicados y Reportar Pago)
             ================================================================= */}
          {activeTab === 'junta_info' && (
            <div className="space-y-4">
              {/* Selector rápido superior si es Junta Directiva */}
              {activeRole === 'junta' && (
                <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5 border border-slate-300/80 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setActiveTab('junta_info')}
                    className="rounded-xl bg-[#1d4ed8] text-white py-2 text-xs font-extrabold shadow-sm"
                  >
                    Info Junta y Pagos
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('carga_junta')}
                    className="rounded-xl bg-white text-slate-700 hover:bg-slate-50 py-2 text-xs font-extrabold border border-slate-200/80"
                  >
                    Cargar Facturas / Deuda
                  </button>
                </div>
              )}

              {/* TARJETA 1: PERÍODO VIGENTE JUNTA 2026 - 2027 */}
              <div className={`${lightGrayCardClass} p-4 space-y-4`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1d4ed8] text-white shadow-md shadow-blue-600/25">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d4ed8] block">
                        PERÍODO VIGENTE
                      </span>
                      <h2 className="text-lg font-black text-slate-900 leading-tight">
                        Junta 2026 - 2027
                      </h2>
                      <p className="text-xs font-semibold text-slate-600">
                        {CONDOMINIUM_DATA.name}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-[10px] font-extrabold text-emerald-800 shrink-0">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    Activa y Solvente
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-white p-3 border border-slate-200/90 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 block">
                      Identificación Fiscal
                    </span>
                    <strong className="text-xs font-black font-mono text-slate-900 mt-0.5 block">
                      {CONDOMINIUM_DATA.tax_id}
                    </strong>
                  </div>

                  <div className="rounded-xl bg-white p-3 border border-slate-200/90 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 block">
                      Elección Asamblea
                    </span>
                    <strong className="text-xs font-black text-slate-900 mt-0.5 block">
                      Acta N° 42 (Mayo 2026)
                    </strong>
                  </div>
                </div>
              </div>

              {/* TARJETA 2: DIRECTORIO DE MIEMBROS */}
              <div className={`${lightGrayCardClass} p-4 space-y-3.5`}>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Directorio de Miembros
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-600">
                      Representantes electos de la comunidad
                    </p>
                  </div>
                  {activeRole === 'junta' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTempBoardMembers([...boardMembers]);
                        setShowEditMembersModal(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-[11px] font-extrabold text-[#1d4ed8] shadow-sm hover:bg-slate-50 transition shrink-0"
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </button>
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-[#1d4ed8] shadow-sm">
                      <UserCheck className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Sección 1: Miembros Principales */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    MIEMBROS PRINCIPALES
                  </span>
                  {boardMembers
                    .filter((m) => m.category !== 'suplente')
                    .map((member, idx) => {
                      const bgColors = [
                        'bg-indigo-50 border-indigo-200 text-[#1d4ed8]',
                        'bg-emerald-50 border-emerald-200 text-emerald-700',
                        'bg-violet-50 border-violet-200 text-violet-700',
                      ];
                      return (
                        <div
                          key={member.id}
                          className="rounded-xl bg-white p-3.5 border border-slate-200/90 shadow-sm flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${
                                bgColors[idx % bgColors.length]
                              }`}
                            >
                              {member.initials || member.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-black text-slate-900">
                                {member.name}
                              </div>
                              <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                                {member.role} • <span className="font-mono text-slate-800">Apto. {member.apartment}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Sección 2: Vocales Suplentes */}
                <div className="space-y-2 pt-2 border-t border-slate-200/80">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    VOCALES SUPLENTES
                  </span>
                  {boardMembers.filter((m) => m.category === 'suplente').length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">
                      No hay suplentes registrados actualmente.
                    </p>
                  ) : (
                    boardMembers
                      .filter((m) => m.category === 'suplente')
                      .map((member) => (
                        <div
                          key={member.id}
                          className="rounded-xl bg-white p-3.5 border border-slate-200/90 shadow-sm flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black">
                              {member.initials || member.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-black text-slate-900">
                                {member.name}
                              </div>
                              <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                                {member.role} • <span className="font-mono text-slate-800">Apto. {member.apartment}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* TARJETA 3: CUENTAS PARA PAGOS */}
              <div className={`${lightGrayCardClass} p-4 space-y-3.5`}>
                <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-[#1d4ed8] shadow-sm">
                      <Landmark className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Cuentas para Pagos
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-600">
                        Exclusivas para condominio y alícuotas
                      </p>
                    </div>
                  </div>

                  {activeRole === 'junta' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTempBankDetails({ ...bankDetails });
                        setShowEditBankModal(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-[11px] font-extrabold text-[#1d4ed8] shadow-sm hover:bg-slate-50 transition shrink-0"
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </button>
                  ) : (
                    <span className="rounded-lg bg-indigo-100 px-2 py-1 text-[10px] font-extrabold text-[#1d4ed8] shrink-0">
                      Bs. / Ref. BCV
                    </span>
                  )}
                </div>

                <div className="rounded-xl bg-white p-3.5 border border-slate-200/90 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-[#1d4ed8]">{bankDetails.bankName}</span>
                    <span className="font-semibold text-slate-500">{bankDetails.accountType}</span>
                  </div>
                  <div className="text-sm font-black font-mono text-slate-900 tracking-tight">
                    {bankDetails.accountNumber}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    Titular: {bankDetails.holderName}
                  </div>
                </div>

                <div className="rounded-xl bg-white p-3.5 border border-slate-200/90 shadow-sm space-y-1.5">
                  <div className="text-[11px] font-extrabold text-emerald-700">
                    Datos Fiscales Bancarios ({bankDetails.bankCode})
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 block">
                        RIF / Identificación
                      </span>
                      <strong className="font-mono font-black text-slate-900">
                        {bankDetails.taxId}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 block">
                        Código Bancario
                      </span>
                      <strong className="font-mono font-black text-slate-900">
                        {bankDetails.bankCode}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyBankDetails}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2.5 text-xs font-extrabold text-[#1d4ed8] transition"
                >
                  {bankCopied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700">¡Datos bancarios copiados!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copiar Datos Bancarios</span>
                    </>
                  )}
                </button>
              </div>

              {/* TARJETA 4: ACCIONES ADMINISTRATIVAS */}
              <div className={`${lightGrayCardClass} p-4 space-y-3`}>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Acciones Administrativas
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Gestión y configuración de {CONDOMINIUM_DATA.name}
                  </p>
                </div>

                {activeRole === 'junta' ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('carga_junta')}
                      className="w-full rounded-xl bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-[#1d4ed8] p-3 flex items-center justify-between gap-3 text-left shadow-sm transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#1d4ed8]">
                          <FilePlus2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900">
                            Cargar Facturas y Relación de Deuda
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500">
                            Subir PDF de proveedores, fotos y saldo de 72 aptos
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#1d4ed8] shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTempClosingRateBs(activePeriod.exchange_rate_bs.toString());
                        setRecalculateExpensesWithClosingRate(true);
                        setShowEditRateModal(true);
                      }}
                      className="w-full rounded-xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-600 p-3 flex items-center justify-between gap-3 text-left shadow-sm transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900">
                            Fijar Tasa de Cierre y Dolarizar Recibo
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500">
                            Tasa de corte: Bs. {formatNumberVe(activePeriod.exchange_rate_bs)} • Dolarizar facturas del mes
                          </div>
                        </div>
                      </div>
                      <Pencil className="h-4 w-4 text-emerald-600 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTempBankBalanceUsd(bankBalanceUsd.toString());
                        setShowEditBalanceModal(true);
                      }}
                      className="w-full rounded-xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-600 p-3 flex items-center justify-between gap-3 text-left shadow-sm transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900">
                            Modificar Saldo Disponible en Banco
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500">
                            Actual: ${formatNumberVe(bankBalanceUsd)} USD
                          </div>
                        </div>
                      </div>
                      <Pencil className="h-4 w-4 text-emerald-600 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTempBankDetails({ ...bankDetails });
                        setShowEditBankModal(true);
                      }}
                      className="w-full rounded-xl bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-[#1d4ed8] p-3 flex items-center justify-between gap-3 text-left shadow-sm transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#1d4ed8]">
                          <Landmark className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900">
                            Modificar Datos Bancarios
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500">
                            {bankDetails.bankName} • N° {bankDetails.accountNumber}
                          </div>
                        </div>
                      </div>
                      <Pencil className="h-4 w-4 text-[#1d4ed8] shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTempBoardMembers([...boardMembers]);
                        setShowEditMembersModal(true);
                      }}
                      className="w-full rounded-xl bg-white hover:bg-violet-50/50 border border-slate-200 hover:border-violet-600 p-3 flex items-center justify-between gap-3 text-left shadow-sm transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                          <UserCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900">
                            Modificar Miembros de la Junta
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500">
                            Miembros Principales y Vocales Suplentes
                          </div>
                        </div>
                      </div>
                      <Pencil className="h-4 w-4 text-violet-700 shrink-0" />
                    </button>

                    {/* Botón para Cambiar la Clave de la Junta */}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPassInput('');
                        setNewPassInput('');
                        setConfirmPassInput('');
                        setChangePassError(null);
                        setShowChangePasswordModal(true);
                      }}
                      className="w-full rounded-xl bg-white hover:bg-slate-50 border border-slate-200 p-3 flex items-center justify-between gap-3 text-left shadow-sm transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900">
                            Cambiar Clave de la Junta
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500">
                            Modifica el PIN de acceso administrativo
                          </div>
                        </div>
                      </div>
                      <Pencil className="h-4 w-4 text-slate-600 shrink-0" />
                    </button>

                    {/* Botón para Bloquear / Salir del Modo Junta */}
                    <button
                      type="button"
                      onClick={handleLogoutJunta}
                      className="w-full rounded-xl bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200 py-2.5 px-3 flex items-center justify-center gap-2 text-xs font-bold text-rose-700 transition shadow-2xs"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Cerrar Sesión de Administración
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRoleChange('junta')}
                    className="w-full rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 p-3.5 flex items-center justify-between gap-3 text-left shadow-xs hover:border-[#1d4ed8] transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1d4ed8] text-white shadow-sm">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 group-hover:text-[#1d4ed8]">
                          ¿Eres miembro de la Junta?
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500">
                          Ingresa la clave de administración para cargar facturas y editar datos
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-[#1d4ed8] bg-white border border-blue-200 px-2.5 py-1 rounded-xl shadow-2xs shrink-0">
                      Ingresar Clave
                    </span>
                  </button>
                )}
              </div>

              {/* TARJETA 5: RESPALDO CONTABLE, CONTINUIDAD Y ALMACENAMIENTO (4 PILARES) */}
              <div className={`${lightGrayCardClass} p-4 space-y-3.5`}>
                <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Continuidad, Seguridad y Respaldos (3+ Años)
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-600">
                        Persistencia LocalStorage + Arquitectura Supabase Blindada
                      </p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-emerald-100 border border-emerald-200 px-2 py-1 text-[10px] font-extrabold text-emerald-800 shrink-0">
                    Activo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-200/90">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">
                      1. Keep-Alive Automático
                    </span>
                    <strong className="text-slate-900 font-black block mt-0.5">
                      Lun y Jue (09:00 UTC)
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      Endpoint /api/health
                    </span>
                  </div>

                  <div className="rounded-xl bg-white p-2.5 border border-slate-200/90">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">
                      2. Seguridad Contable
                    </span>
                    <strong className="text-slate-900 font-black block mt-0.5">
                      Sin Borrado Físico
                    </strong>
                    <span className="text-[10px] text-[#1d4ed8] font-semibold">
                      RLS 100% + URLs Firmadas
                    </span>
                  </div>

                  <div className="rounded-xl bg-white p-2.5 border border-slate-200/90">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">
                      3. Higiene Storage
                    </span>
                    <strong className="text-slate-900 font-black block mt-0.5">
                      /YYYY/MM/ • Máx 3 MB
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      Compresión WebP Cliente
                    </span>
                  </div>

                  <div className="rounded-xl bg-white p-2.5 border border-slate-200/90">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">
                      4. Persistencia Actual
                    </span>
                    <strong className="text-slate-900 font-black block mt-0.5">
                      LocalStorage + Nube
                    </strong>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Listo para Vercel
                    </span>
                  </div>
                </div>

                {/* Botones de Exportación y Verificación de Salud */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExportHistoricalCsv}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-xs font-extrabold text-slate-800 shadow-xs transition"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    Descargar Libro Histórico de Gastos (.CSV / Excel)
                  </button>

                  <button
                    type="button"
                    onClick={handleExportFullBackupJson}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2.5 text-xs font-extrabold text-[#1d4ed8] transition"
                  >
                    <HardDriveDownload className="h-4 w-4" />
                    Descargar Respaldo Espejo Completo (.JSON para Drive)
                  </button>

                  <button
                    type="button"
                    onClick={handleTestKeepAlive}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 text-[11px] font-extrabold text-emerald-800 transition"
                  >
                    <Activity className="h-3.5 w-3.5 text-emerald-600" />
                    Probar Pulso Keep-Alive (/api/health)
                  </button>

                  {healthPingResult && (
                    <div className="rounded-xl bg-slate-900 text-emerald-300 font-mono text-[10px] p-2.5 border border-slate-700">
                      {healthPingResult}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              PESTAÑA 4B: CARGA DE FACTURAS EN BOLÍVARES Y RELACIÓN DE DEUDA (SOLO JUNTA)
             ================================================================= */}
          {activeTab === 'carga_junta' && activeRole === 'junta' && (
            <div className="space-y-4">
              {/* Sub-navegación para volver a Info Junta */}
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5 border border-slate-300/80 shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveTab('junta_info')}
                  className="rounded-xl bg-white text-slate-700 hover:bg-slate-50 py-2 text-xs font-extrabold border border-slate-200/80 inline-flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Info Junta y Pagos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('carga_junta')}
                  className="rounded-xl bg-[#1d4ed8] text-white py-2 text-xs font-extrabold shadow-sm"
                >
                  Cargar Facturas / Deuda
                </button>
              </div>

              {feedbackMsg && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-extrabold text-emerald-900 flex items-center gap-2 shadow-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>{feedbackMsg}</span>
                </div>
              )}

              {formErrorMsg && (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3.5 text-xs font-extrabold text-rose-900 flex items-center gap-2 shadow-sm">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                  <span>{formErrorMsg}</span>
                </div>
              )}

              {/* FORMULARIO 1: REGISTRAR FACTURA EN BOLÍVARES + TASA DEL DÍA + PDF */}
              <div className={`${lightGrayCardClass} p-4 space-y-3.5`}>
                <div className="border-b border-slate-200 pb-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d4ed8]">
                    REGISTRO INDIVIDUAL DE GASTOS ({activePeriod.label.toUpperCase()})
                  </span>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">
                    Registrar Factura en Bolívares (Bs.) y PDF
                  </h3>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Ingresa el monto en Bolívares, la tasa del día y adjunta la factura PDF del
                    proveedor
                  </p>
                </div>

                <form onSubmit={handleAddSingleExpense} className="space-y-3 text-xs">
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">
                      Proveedor / Razón Social *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSupplier}
                      onChange={(e) => setNewSupplier(e.target.value)}
                      placeholder="Ej. Hidroneumáticos San Juan C.A."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:border-[#1d4ed8] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">
                        RIF del Proveedor *
                      </label>
                      <input
                        type="text"
                        required
                        value={newRif}
                        onChange={(e) => setNewRif(e.target.value)}
                        placeholder="J-29810411-2"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono focus:border-[#1d4ed8] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">
                        N° de Factura *
                      </label>
                      <input
                        type="text"
                        required
                        value={newInvoiceNumber}
                        onChange={(e) => setNewInvoiceNumber(e.target.value)}
                        placeholder="FAC-002150"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono focus:border-[#1d4ed8] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">
                      Rubro Contable del Gasto
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-semibold"
                    >
                      {INITIAL_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">
                        Monto en Bolívares (Bs.) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newAmountBs}
                        onChange={(e) => setNewAmountBs(e.target.value)}
                        placeholder="19746,00"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono font-bold text-slate-900 focus:border-[#1d4ed8] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">
                        Tasa del Día (Bs./USD) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newExchangeRateBs}
                        onChange={(e) => setNewExchangeRateBs(e.target.value)}
                        placeholder="54,85"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono font-bold text-emerald-700 focus:border-[#1d4ed8] focus:outline-none"
                      />
                    </div>
                  </div>

                  {newAmountBs &&
                    !isNaN(parseFloat(newAmountBs)) &&
                    parseFloat(newAmountBs) > 0 &&
                    newExchangeRateBs &&
                    !isNaN(parseFloat(newExchangeRateBs)) &&
                    parseFloat(newExchangeRateBs) > 0 && (
                      <div className="rounded-xl bg-indigo-50/90 p-3 border border-indigo-200 font-mono text-[11px] text-indigo-950 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-sans font-bold text-slate-700">
                            Equivalente USD:
                          </span>
                          <strong className="font-black text-slate-900">
                            $
                            {formatNumberVe(
                              parseFloat(newAmountBs) / parseFloat(newExchangeRateBs)
                            )}{' '}
                            USD
                          </strong>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-indigo-200/70">
                          <span className="font-sans font-bold text-slate-700">
                            Cuota Apto (÷ 72):
                          </span>
                          <strong className="font-black text-[#1d4ed8]">
                            Bs. {formatNumberVe(parseFloat(newAmountBs) / 72)} ($
                            {formatNumberVe(
                              parseFloat(newAmountBs) /
                                parseFloat(newExchangeRateBs) /
                                72
                            )}
                            )
                          </strong>
                        </div>
                      </div>
                    )}

                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">
                      Concepto / Descripción del Servicio
                    </label>
                    <input
                      type="text"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Detalle del trabajo o suministro facturado..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-extrabold text-slate-800 block">
                        Factura PDF Original del Proveedor *
                      </label>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        Máx. 3 MB (PDF)
                      </span>
                    </div>
                    <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#1d4ed8]/50 bg-white p-4 cursor-pointer text-center">
                      <FileCheck className="h-6 w-6 text-[#1d4ed8] mb-1" />
                      <span className="text-xs font-extrabold text-slate-800">
                        {newFileName
                          ? `PDF: ${newFileName}`
                          : 'Toca para adjuntar el PDF de la factura'}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Se renombrará automáticamente en formato /AAAA/MM/factura_proveedor.pdf
                      </span>
                      <input
                        type="file"
                        required
                        accept="application/pdf,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const check = validateFileConstraints(file);
                            if (!check.valid) {
                              setFormErrorMsg(check.error || 'Archivo inválido.');
                              e.target.value = '';
                              return;
                            }
                            setInvoiceFile(file);
                            setNewFileName(file.name);
                            setUploadedFileUrl(URL.createObjectURL(file));
                            setFormErrorMsg(null);
                          }
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {/* Foto de Evidencia Física / Trabajo Realizado (Opcional pero Recomendado) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-extrabold text-slate-800 block">
                        Foto de Evidencia Física / Trabajo (Opcional)
                      </label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Compresión WebP Automática
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Si se compró una lámpara, repuesto o se hizo una reparación física, adjunta aquí la foto. El sistema la comprime automáticamente a WebP ligero.
                    </p>
                    <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/50 bg-emerald-50/40 hover:bg-emerald-50/70 p-3.5 cursor-pointer text-center transition">
                      <Camera className="h-6 w-6 text-emerald-600 mb-1" />
                      <span className="text-xs font-extrabold text-slate-800">
                        {newEvidenceFileName
                          ? `Foto: ${newEvidenceFileName}`
                          : 'Toca para tomar foto física o elegir de la galería'}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        JPG, PNG, WEBP (Máx. 3 MB • Compresión automática en el teléfono)
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const compressed = await compressImageClientSide(file);
                            const check = validateFileConstraints(compressed.compressedFile);
                            if (!check.valid) {
                              setFormErrorMsg(check.error || 'La imagen supera los 3 MB.');
                              e.target.value = '';
                              return;
                            }
                            setEvidenceFile(compressed.compressedFile);
                            setNewEvidenceFileName(compressed.compressedFile.name);
                            setNewEvidenceFileUrl(compressed.dataUrl);
                            setEvidenceCompressionInfo(
                              `WebP optimizado: de ${compressed.originalSizeKB} KB a ${compressed.compressedSizeKB} KB`
                            );
                            setFormErrorMsg(null);
                          }
                        }}
                        className="sr-only"
                      />
                    </label>

                    {newEvidenceFileUrl && (
                      <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-white border border-emerald-200 shadow-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={newEvidenceFileUrl}
                            alt="Preview evidencia"
                            className="h-10 w-10 shrink-0 rounded-lg object-cover border border-emerald-300"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 truncate">
                              {newEvidenceFileName}
                            </p>
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              ✓ {evidenceCompressionInfo || 'Foto lista para registrar'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewEvidenceFileName('');
                            setNewEvidenceFileUrl(null);
                            setEvidenceCompressionInfo(null);
                          }}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 px-2 py-1 rounded-lg hover:bg-rose-50 transition shrink-0"
                        >
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] hover:bg-blue-700 px-4 py-3 text-xs font-extrabold text-white shadow-md transition"
                  >
                    <Upload className="h-4 w-4" />
                    Publicar Factura en {activePeriod.label}
                  </button>
                </form>
              </div>

              {/* FORMULARIO 2: CARGAR ARCHIVO CON LA RELACIÓN DE DEUDA DE LOS PROPIETARIOS */}
              <div className={`${lightGrayCardClass} p-4 space-y-3.5`}>
                <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                      CUENTAS POR COBRAR (72 APARTAMENTOS)
                    </span>
                    <h3 className="text-sm font-black text-slate-900 mt-0.5">
                      Cargar Archivo de Relación de Deuda
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadDebtTemplate}
                    className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-[10px] font-extrabold text-[#1d4ed8] shadow-sm shrink-0"
                  >
                    <Download className="h-3 w-3" />
                    Plantilla
                  </button>
                </div>

                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/50 bg-white p-3.5 cursor-pointer text-center">
                  <Users className="h-5 w-5 text-emerald-600 mb-1" />
                  <span className="text-xs font-extrabold text-slate-800">
                    {debtFileName
                      ? `Archivo: ${debtFileName}`
                      : 'Subir archivo CSV / TXT con relación de deuda'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    apartamento, recibos_pendientes, monto_usd, periodos, situacion
                  </span>
                  <input
                    type="file"
                    accept=".csv,.txt,text/csv"
                    onChange={handleDebtFileUpload}
                    className="sr-only"
                  />
                </label>

                <textarea
                  rows={6}
                  value={debtRelationText}
                  onChange={(e) => setDebtRelationText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 p-2.5 font-mono text-[10px] leading-relaxed focus:border-emerald-600 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleApplyDebtRelation}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-xs font-extrabold text-white shadow-md transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Actualizar Relación de Deuda de Propietarios
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ===================================================================
            BARRA DE NAVEGACIÓN INFERIOR MÓVIL CON LOS COLORES DEL MENÚ LATERAL
            (#0d111f y botones activos #4f5ef7)
           =================================================================== */}
        <nav
          aria-label="Navegación Principal Móvil"
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] z-40 bg-[#0d111f] text-slate-300 border-t border-slate-800/90 shadow-[0_-12px_32px_rgba(8,11,20,0.55)] select-none overflow-hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, rgba(79, 94, 247, 0.14) 0%, transparent 50%), radial-gradient(circle at 85% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)',
          }}
        >
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {/* 1. Dashboard */}
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-0.5 rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#4f5ef7] text-white font-extrabold shadow-md shadow-[#4f5ef7]/30'
                  : 'text-slate-300 font-bold hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-4 w-4" strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
              <span className="text-[10px] leading-none">Dashboard</span>
            </button>

            {/* 2. Cobranza (Con indicador rojo de notificación) */}
            <button
              type="button"
              onClick={() => setActiveTab('cuentas_por_cobrar')}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-0.5 rounded-xl transition-all ${
                activeTab === 'cuentas_por_cobrar'
                  ? 'bg-[#4f5ef7] text-white font-extrabold shadow-md shadow-[#4f5ef7]/30'
                  : 'text-slate-300 font-bold hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="relative">
                <CircleDollarSign
                  className="h-4 w-4"
                  strokeWidth={activeTab === 'cuentas_por_cobrar' ? 2.5 : 2}
                />
                {activePeriod.receivable_units_count > 0 && (
                  <span className="absolute -top-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#0d111f]" />
                )}
              </div>
              <span className="text-[10px] leading-none">Cobranza</span>
            </button>

            {/* 3. Facturas (Fusión de Relación de Gastos + Facturas PDF) */}
            <button
              type="button"
              onClick={() => setActiveTab('facturas_pdf')}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-0.5 rounded-xl transition-all ${
                activeTab === 'facturas_pdf'
                  ? 'bg-[#4f5ef7] text-white font-extrabold shadow-md shadow-[#4f5ef7]/30'
                  : 'text-slate-300 font-bold hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <FileText
                className="h-4 w-4"
                strokeWidth={activeTab === 'facturas_pdf' ? 2.5 : 2}
              />
              <span className="text-[10px] leading-none">Facturas</span>
            </button>

            {/* 4. Proyectos Finalizados con Evidencia */}
            <button
              type="button"
              onClick={() => setActiveTab('proyectos')}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-0.5 rounded-xl transition-all ${
                activeTab === 'proyectos'
                  ? 'bg-[#4f5ef7] text-white font-extrabold shadow-md shadow-[#4f5ef7]/30'
                  : 'text-slate-300 font-bold hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <ClipboardList
                className="h-4 w-4"
                strokeWidth={activeTab === 'proyectos' ? 2.5 : 2}
              />
              <span className="text-[10px] leading-none">Proyectos</span>
            </button>

            {/* 5. Junta */}
            <button
              type="button"
              onClick={() => setActiveTab('junta_info')}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-0.5 rounded-xl transition-all ${
                isJuntaSectionActive
                  ? 'bg-[#4f5ef7] text-white font-extrabold shadow-md shadow-[#4f5ef7]/30'
                  : 'text-slate-300 font-bold hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Lock className="h-4 w-4" strokeWidth={isJuntaSectionActive ? 2.5 : 2} />
              <span className="text-[10px] leading-none">Junta</span>
            </button>
          </div>
        </nav>

        {/* MODAL DE FACTURA PDF DEL PROVEEDOR ADAPTADO A MÓVIL */}
        <InvoiceModal
          expense={selectedExpenseModal}
          condominium={{
            ...CONDOMINIUM_DATA,
            bank_balance_usd: bankBalanceUsd,
            tax_id: bankDetails.taxId,
          }}
          userRole={activeRole}
          initialTab={invoiceModalInitialTab}
          onClose={() => {
            setSelectedExpenseModal(null);
            setInvoiceModalInitialTab('pdf');
          }}
          onUpdateAudit={handleUpdateAudit}
        />

        {/* MODAL DE INSTALACIÓN DE LA APP MÓVIL (PWA) */}
        {showInstallModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#090d1a]/80 p-0 sm:p-3 backdrop-blur-sm">
            <div className="relative w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1d4ed8] text-white shadow-md">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d4ed8] block">
                      APP MÓVIL INSTALABLE (PWA)
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      Instalar App — Residencias DAN Torre A
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="rounded-xl bg-slate-100 p-3.5 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 block">
                    1. En Teléfonos Android (Chrome):
                  </strong>
                  <p className="text-[11px] font-medium text-slate-600">
                    Toca el menú de 3 puntos <strong>(⋮)</strong> arriba a la derecha en Chrome y
                    selecciona <strong>&ldquo;Instalar aplicación&rdquo;</strong> o{' '}
                    <strong>&ldquo;Agregar a la pantalla principal&rdquo;</strong>.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100 p-3.5 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 block">
                    2. En iPhone / iPad (Safari):
                  </strong>
                  <p className="text-[11px] font-medium text-slate-600">
                    Toca el botón <strong>Compartir</strong> en la barra inferior de Safari y elige{' '}
                    <strong>&ldquo;Agregar a pantalla de inicio&rdquo;</strong>.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100 p-3.5 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 block">
                    3. En tu PC (Chrome o Edge):
                  </strong>
                  <p className="text-[11px] font-medium text-slate-600">
                    Haz clic en el icono de <strong>Instalar Residencias DAN Torre A</strong> que
                    aparece en el extremo derecho de la barra de direcciones (`localhost:3000`).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="w-full rounded-xl bg-[#1d4ed8] py-3 text-xs font-extrabold text-white shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* MODAL 1: MODIFICAR SALDO EN BANCO */}
        {showEditBalanceModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#090d1a]/80 p-0 sm:p-3 backdrop-blur-sm">
            <div className="relative w-full max-w-[420px] rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Actualizar Saldo en Banco
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Cuenta {bankDetails.bankName} Torre A
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditBalanceModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBankBalance} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">
                    Saldo Real en Banco ($ USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={tempBankBalanceUsd}
                      onChange={(e) => setTempBankBalanceUsd(e.target.value)}
                      placeholder="4920.50"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2.5 font-mono font-bold text-slate-900 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Equivalente en Bolívares: Bs.{' '}
                    {formatNumberVe(
                      (parseFloat(tempBankBalanceUsd) || 0) * (parseFloat(newExchangeRateBs) || 54.85)
                    )}{' '}
                    (a tasa {formatNumberVe(parseFloat(newExchangeRateBs) || 54.85)} Bs./USD)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditBalanceModal(false)}
                    className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 transition"
                  >
                    <Check className="h-4 w-4" />
                    Guardar Saldo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: MODIFICAR DATOS BANCARIOS */}
        {showEditBankModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#090d1a]/80 p-0 sm:p-3 backdrop-blur-sm">
            <div className="relative w-full max-w-[420px] max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-[#1d4ed8] border border-indigo-200">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Modificar Datos Bancarios
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Cuenta oficial para pagos de condominio
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditBankModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBankDetails} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">
                      Nombre del Banco *
                    </label>
                    <input
                      type="text"
                      required
                      value={tempBankDetails.bankName}
                      onChange={(e) =>
                        setTempBankDetails((p) => ({ ...p, bankName: e.target.value }))
                      }
                      placeholder="Banco Mercantil"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium focus:border-[#1d4ed8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">
                      Código Bancario *
                    </label>
                    <input
                      type="text"
                      required
                      value={tempBankDetails.bankCode}
                      onChange={(e) =>
                        setTempBankDetails((p) => ({ ...p, bankCode: e.target.value }))
                      }
                      placeholder="0105"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono font-bold focus:border-[#1d4ed8] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">
                    Tipo de Cuenta *
                  </label>
                  <select
                    value={tempBankDetails.accountType}
                    onChange={(e) =>
                      setTempBankDetails((p) => ({ ...p, accountType: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold"
                  >
                    <option value="Cuenta Corriente">Cuenta Corriente</option>
                    <option value="Cuenta de Ahorros">Cuenta de Ahorros</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">
                    Número de Cuenta (20 dígitos) *
                  </label>
                  <input
                    type="text"
                    required
                    value={tempBankDetails.accountNumber}
                    onChange={(e) =>
                      setTempBankDetails((p) => ({ ...p, accountNumber: e.target.value }))
                    }
                    placeholder="0105-0021-34-1021456789"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono font-bold focus:border-[#1d4ed8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">
                    Titular de la Cuenta *
                  </label>
                  <input
                    type="text"
                    required
                    value={tempBankDetails.holderName}
                    onChange={(e) =>
                      setTempBankDetails((p) => ({ ...p, holderName: e.target.value }))
                    }
                    placeholder="Condominio Residencias DAN Torre A"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium focus:border-[#1d4ed8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">
                    RIF / Identificación *
                  </label>
                  <input
                    type="text"
                    required
                    value={tempBankDetails.taxId}
                    onChange={(e) =>
                      setTempBankDetails((p) => ({ ...p, taxId: e.target.value }))
                    }
                    placeholder="J-29495522-3"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono font-bold focus:border-[#1d4ed8] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditBankModal(false)}
                    className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1d4ed8] hover:bg-blue-700 py-2.5 text-xs font-extrabold text-white shadow-md shadow-blue-600/20 transition"
                  >
                    <Check className="h-4 w-4" />
                    Guardar Datos
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: MODIFICAR MIEMBROS DE LA JUNTA */}
        {showEditMembersModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#090d1a]/80 p-0 sm:p-3 backdrop-blur-sm">
            <div className="relative w-full max-w-[440px] max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-[#1d4ed8] border border-indigo-200">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Directorio de la Junta
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Edita los nombres y apartamentos
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditMembersModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBoardMembers} className="space-y-4 text-xs">
                {/* GRUPO 1: MIEMBROS PRINCIPALES */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                        Miembros Principales (3)
                      </span>
                      <p className="text-[10px] text-slate-500">
                        Cargos estatutarios con opción de género o personalizados
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-[#1d4ed8] border border-blue-200">
                      3 Principales
                    </span>
                  </div>

                  {tempBoardMembers
                    .filter((m) => m.category === 'principal')
                    .map((m) => {
                      const genderToggle = getGenderOpposite(m.role);
                      const isStandardRole = PRINCIPAL_ROLE_OPTIONS.includes(m.role);
                      return (
                        <div
                          key={m.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5"
                        >
                          {/* Fila del Cargo con Selector y Botón Rápido de Género */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-[10px] font-black text-slate-700 uppercase tracking-wide">
                                Cargo / Título
                              </label>
                              {genderToggle && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempBoardMembers((prev) =>
                                      prev.map((item) =>
                                        item.id === m.id ? { ...item, role: genderToggle.newRole } : item
                                      )
                                    );
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-black text-[#1d4ed8] border border-blue-200 hover:bg-blue-100 transition shadow-2xs"
                                  title={`Cambiar cargo a ${genderToggle.newRole}`}
                                >
                                  ⇄ Cambiar a {genderToggle.label}
                                </button>
                              )}
                            </div>

                            <select
                              value={isStandardRole ? m.role : 'custom'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTempBoardMembers((prev) =>
                                  prev.map((item) =>
                                    item.id === m.id
                                      ? { ...item, role: val === 'custom' ? '' : val }
                                      : item
                                  )
                                );
                              }}
                              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-[#1d4ed8] focus:border-[#1d4ed8] focus:outline-none text-xs"
                            >
                              <optgroup label="Tesorería">
                                <option value="Tesorero">Tesorero (Masculino)</option>
                                <option value="Tesorera">Tesorera (Femenino)</option>
                              </optgroup>
                              <optgroup label="Presidencia">
                                <option value="Presidente">Presidente (Masculino / Neutro)</option>
                                <option value="Presidenta">Presidenta (Femenino)</option>
                              </optgroup>
                              <optgroup label="Secretaría">
                                <option value="Secretario">Secretario (Masculino)</option>
                                <option value="Secretaria">Secretaria (Femenino)</option>
                              </optgroup>
                              <optgroup label="Otros Cargos">
                                <option value="1er Principal">1er Miembro Principal</option>
                                <option value="2do Principal">2do Miembro Principal</option>
                                <option value="3er Principal">3er Miembro Principal</option>
                                <option value="custom">Otro cargo (Escribir personalizado)...</option>
                              </optgroup>
                            </select>

                            {/* Campo si seleccionó personalizar el cargo */}
                            {(!isStandardRole || m.role === '') && (
                              <input
                                type="text"
                                required
                                placeholder="Escribe el cargo (Ej: Tesorero, Administrador...)"
                                value={m.role}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTempBoardMembers((prev) =>
                                    prev.map((item) =>
                                      item.id === m.id ? { ...item, role: val } : item
                                    )
                                  );
                                }}
                                className="w-full rounded-xl border border-blue-300 bg-white px-2.5 py-1.5 font-semibold text-slate-900 focus:border-[#1d4ed8] focus:outline-none text-xs"
                              />
                            )}
                          </div>

                          {/* Nombre y Apartamento */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                                Nombre y Apellido
                              </label>
                              <input
                                type="text"
                                required
                                value={m.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTempBoardMembers((prev) =>
                                    prev.map((item) =>
                                      item.id === m.id ? { ...item, name: val } : item
                                    )
                                  );
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-900 focus:border-[#1d4ed8] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                                Apartamento
                              </label>
                              <input
                                type="text"
                                required
                                value={m.apartment}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTempBoardMembers((prev) =>
                                    prev.map((item) =>
                                      item.id === m.id ? { ...item, apartment: val } : item
                                    )
                                  );
                                }}
                                placeholder="14-A"
                                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono font-bold text-slate-900 text-center focus:border-[#1d4ed8] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* GRUPO 2: VOCALES SUPLENTES (HASTA 3) */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                        Vocales Suplentes
                      </span>
                      <p className="text-[10px] text-slate-500">
                        Hasta 3 vocales según Ley de Propiedad Horizontal
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {tempBoardMembers.filter((m) => m.category === 'suplente').length} de 3
                    </span>
                  </div>

                  {tempBoardMembers.filter((m) => m.category === 'suplente').length === 0 ? (
                    <div className="p-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                      <p className="text-xs text-slate-500 font-medium">
                        No hay vocales suplentes registrados actualmente.
                      </p>
                    </div>
                  ) : (
                    tempBoardMembers
                      .filter((m) => m.category === 'suplente')
                      .map((m) => {
                        const genderToggle = getGenderOpposite(m.role);
                        const isStandardRole = SUPLENTE_ROLE_OPTIONS.includes(m.role);
                        return (
                          <div
                            key={m.id}
                            className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-3 space-y-2.5"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-[10px] font-black text-amber-900 uppercase tracking-wide">
                                  Cargo Suplente
                                </label>
                                <div className="flex items-center gap-1.5">
                                  {genderToggle && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTempBoardMembers((prev) =>
                                          prev.map((item) =>
                                            item.id === m.id ? { ...item, role: genderToggle.newRole } : item
                                          )
                                        );
                                      }}
                                      className="inline-flex items-center gap-1 rounded-lg bg-amber-100/90 px-2 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300 hover:bg-amber-200 transition shadow-2xs"
                                      title={`Cambiar cargo a ${genderToggle.newRole}`}
                                    >
                                      ⇄ {genderToggle.label}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTempBoardMembers((prev) =>
                                        prev.filter((item) => item.id !== m.id)
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition"
                                    title="Quitar este suplente"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Quitar
                                  </button>
                                </div>
                              </div>

                              <select
                                value={isStandardRole ? m.role : 'custom'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTempBoardMembers((prev) =>
                                    prev.map((item) =>
                                      item.id === m.id
                                        ? { ...item, role: val === 'custom' ? '' : val }
                                        : item
                                    )
                                  );
                                }}
                                className="w-full rounded-xl border border-amber-200 bg-white px-2.5 py-1.5 font-bold text-amber-900 focus:border-amber-500 focus:outline-none text-xs"
                              >
                                <option value="1er Vocal Suplente">1er Vocal Suplente (Masculino / Neutro)</option>
                                <option value="1era Vocal Suplente">1era Vocal Suplente (Femenino)</option>
                                <option value="2do Vocal Suplente">2do Vocal Suplente (Masculino / Neutro)</option>
                                <option value="2da Vocal Suplente">2da Vocal Suplente (Femenino)</option>
                                <option value="3er Vocal Suplente">3er Vocal Suplente (Masculino / Neutro)</option>
                                <option value="3era Vocal Suplente">3era Vocal Suplente (Femenino)</option>
                                <option value="Vocal Suplente">Vocal Suplente (General)</option>
                                <option value="custom">Otro cargo (Escribir personalizado)...</option>
                              </select>

                              {(!isStandardRole || m.role === '') && (
                                <input
                                  type="text"
                                  required
                                  placeholder="Escribe el cargo del suplente..."
                                  value={m.role}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTempBoardMembers((prev) =>
                                      prev.map((item) =>
                                        item.id === m.id ? { ...item, role: val } : item
                                      )
                                    );
                                  }}
                                  className="w-full rounded-xl border border-amber-300 bg-white px-2.5 py-1.5 font-semibold text-slate-900 focus:border-amber-500 focus:outline-none text-xs"
                                />
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                                  Nombre y Apellido
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Ej: Roberto Pérez"
                                  value={m.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTempBoardMembers((prev) =>
                                      prev.map((item) =>
                                        item.id === m.id ? { ...item, name: val } : item
                                      )
                                    );
                                  }}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-900 focus:border-[#1d4ed8] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                                  Apartamento
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="63-A"
                                  value={m.apartment}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTempBoardMembers((prev) =>
                                      prev.map((item) =>
                                        item.id === m.id ? { ...item, apartment: val } : item
                                      )
                                    );
                                  }}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono font-bold text-slate-900 text-center focus:border-[#1d4ed8] focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}

                  {/* Botón para incorporar hasta 3 suplentes */}
                  {tempBoardMembers.filter((m) => m.category === 'suplente').length < 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentSuplentes = tempBoardMembers.filter(
                          (m) => m.category === 'suplente'
                        );
                        const roleNames = [
                          '1er Vocal Suplente',
                          '2do Vocal Suplente',
                          '3er Vocal Suplente',
                        ];
                        const roleLabel =
                          roleNames[currentSuplentes.length] ||
                          `Vocal Suplente ${currentSuplentes.length + 1}`;
                        setTempBoardMembers((prev) => [
                          ...prev,
                          {
                            id: `suplente-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                            name: '',
                            role: roleLabel,
                            category: 'suplente',
                            apartment: '',
                            initials: '',
                          },
                        ]);
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#1d4ed8]/50 bg-blue-50/60 hover:bg-blue-100/60 py-2.5 text-xs font-bold text-[#1d4ed8] transition"
                    >
                      <Plus className="h-4 w-4" />
                      + Incorporar Vocal Suplente
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditMembersModal(false)}
                    className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1d4ed8] hover:bg-blue-700 py-2.5 text-xs font-extrabold text-white shadow-md shadow-blue-600/20 transition"
                  >
                    <Check className="h-4 w-4" />
                    Guardar Directorio
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: FIJAR TASA DE CIERRE DEL MES Y DOLARIZAR RECIBO */}
        {showEditRateModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#090d1a]/80 p-0 sm:p-3 backdrop-blur-sm">
            <div className="relative w-full max-w-[440px] max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Tasa de Cierre — {activePeriod.label}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Corte contable y dolarización del recibo
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditRateModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleApplyClosingRate} className="space-y-3.5 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-extrabold text-slate-700 block">
                      Tasa Oficial de Cierre (Bs. / USD) *
                    </label>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      Actual: Bs. {formatNumberVe(activePeriod.exchange_rate_bs)}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={tempClosingRateBs}
                    onChange={(e) => setTempClosingRateBs(e.target.value)}
                    placeholder="54.85"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono font-black text-emerald-700 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Tasa del Banco Central de Venezuela (BCV) fijada al corte del mes para liquidar las cuotas.
                  </span>
                </div>

                {/* Opción de recalcular y dolarizar facturas del mes */}
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recalculateExpensesWithClosingRate}
                      onChange={(e) => setRecalculateExpensesWithClosingRate(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
                    />
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 block">
                        Dolarizar todas las facturas en Bolívares al corte
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                        Mantiene intacto el monto original en Bolívares (Bs.) de cada factura del proveedor y actualiza su saldo en dólares ($ USD) con esta tasa de cierre.
                      </p>
                    </div>
                  </label>

                  {/* Previsualización en vivo */}
                  {recalculateExpensesWithClosingRate &&
                    parseFloat(tempClosingRateBs) > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200 font-mono text-[11px] text-slate-800 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="font-sans text-slate-600">Facturas en Bolívares:</span>
                          <strong>{periodExpenses.length} facturas</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-sans text-slate-600">Total acumulado en Bs.:</span>
                          <strong>
                            Bs.{' '}
                            {formatNumberVe(
                              periodExpenses.reduce((acc, e) => acc + e.amount_bs, 0)
                            )}
                          </strong>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-slate-200/60">
                          <span className="font-sans">Total Dolarizado ($ USD):</span>
                          <strong>
                            $
                            {formatNumberVe(
                              periodExpenses.reduce((acc, e) => acc + e.amount_bs, 0) /
                                parseFloat(tempClosingRateBs)
                            )}{' '}
                            USD
                          </strong>
                        </div>
                        <div className="flex justify-between text-[#1d4ed8] font-bold">
                          <span className="font-sans">Nueva Cuota Apto (÷ 72):</span>
                          <strong>
                            $
                            {formatNumberVe(
                              periodExpenses.reduce((acc, e) => acc + e.amount_bs, 0) /
                                parseFloat(tempClosingRateBs) /
                                72
                            )}{' '}
                            USD
                          </strong>
                        </div>
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditRateModal(false)}
                    className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 transition"
                  >
                    <Check className="h-4 w-4" />
                    Aplicar Tasa de Cierre
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 5: AUTENTICACIÓN CLAVE JUNTA DE CONDOMINIO */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#090d1a]/80 p-0 sm:p-3 backdrop-blur-sm">
            <div className="relative w-full max-w-[420px] rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Acceso de la Junta
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Ingresa la clave para habilitar la edición de datos
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    setAuthPasswordInput('');
                    setAuthErrorMsg(null);
                  }}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleVerifyPassword} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Clave de Acceso Administrativo
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      required
                      autoFocus
                      placeholder="Ingresa la clave de la Junta"
                      value={authPasswordInput}
                      onChange={(e) => {
                        setAuthPasswordInput(e.target.value);
                        setAuthErrorMsg(null);
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-10 font-bold text-slate-900 focus:border-[#1d4ed8] focus:outline-none text-sm tracking-wide"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition"
                      title={showPasswordText ? 'Ocultar clave' : 'Mostrar clave'}
                    >
                      {showPasswordText ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Clave predeterminada inicial: <strong className="font-mono text-slate-800">DAN2026</strong> (puedes cambiarla una vez ingreses).
                  </p>
                </div>

                {authErrorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold leading-tight">
                      {authErrorMsg}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAuthModal(false);
                      setAuthPasswordInput('');
                      setAuthErrorMsg(null);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1d4ed8] hover:bg-blue-700 py-2.5 text-xs font-extrabold text-white shadow-md shadow-blue-600/20 transition"
                  >
                    <Check className="h-4 w-4" />
                    Habilitar Acceso
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 6: CAMBIAR CLAVE DE LA JUNTA */}
        {showChangePasswordModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#090d1a]/80 p-0 sm:p-3 backdrop-blur-sm">
            <div className="relative w-full max-w-[420px] rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 border border-slate-200 shadow-xs">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Cambiar Clave de la Junta
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Actualiza el PIN de acceso administrativo
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                    Clave Actual *
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassInput}
                    onChange={(e) => setCurrentPassInput(e.target.value)}
                    placeholder="Clave actual (ej: DAN2026)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-bold text-slate-900 focus:border-[#1d4ed8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                    Nueva Clave * (Mínimo 4 caracteres)
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassInput}
                    onChange={(e) => setNewPassInput(e.target.value)}
                    placeholder="Nueva clave de la Junta"
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-bold text-slate-900 focus:border-[#1d4ed8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                    Confirmar Nueva Clave *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassInput}
                    onChange={(e) => setConfirmPassInput(e.target.value)}
                    placeholder="Repite la nueva clave"
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-bold text-slate-900 focus:border-[#1d4ed8] focus:outline-none"
                  />
                </div>

                {changePassError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                    {changePassError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePasswordModal(false)}
                    className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1d4ed8] hover:bg-blue-700 py-2.5 text-xs font-extrabold text-white shadow-md transition"
                  >
                    <Check className="h-4 w-4" />
                    Guardar Clave
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 7: REGISTRAR PROYECTO FINALIZADO CON EVIDENCIA FOTOGRÁFICA */}
        {showNewProjectModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#090d1a]/80 p-0 sm:p-3 backdrop-blur-sm">
            <div className="relative w-full max-w-[440px] max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Registrar Proyecto con Evidencia
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Obra ejecutada en {CONDOMINIUM_DATA.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {formErrorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Título de la Obra o Proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjTitle}
                    onChange={(e) => setNewProjTitle(e.target.value)}
                    placeholder="Ej. Impermeabilización de Azotea Ala Norte"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-900 focus:border-[#1d4ed8] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Área / Rubro
                    </label>
                    <select
                      value={newProjCategory}
                      onChange={(e) => setNewProjCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-semibold text-slate-800"
                    >
                      <option value="Electricidad e Iluminación">Electricidad e Iluminación</option>
                      <option value="Hidroneumático y Bombas">Hidroneumático y Bombas</option>
                      <option value="Ascensores">Ascensores</option>
                      <option value="Impermeabilización y Fachada">Impermeabilización y Fachada</option>
                      <option value="Seguridad y Accesos">Seguridad y Accesos</option>
                      <option value="Áreas Sociales y Jardinería">Áreas Sociales y Jardinería</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Estado del Proyecto
                    </label>
                    <select
                      value={newProjStatus}
                      onChange={(e) => setNewProjStatus(e.target.value as ProjectStatus)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-semibold text-slate-800"
                    >
                      <option value="finalizado">Finalizado (Con Evidencia)</option>
                      <option value="en_ejecucion">En Ejecución</option>
                      <option value="planificado">Planificado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Contratista / Proveedor
                    </label>
                    <input
                      type="text"
                      value={newProjSupplier}
                      onChange={(e) => setNewProjSupplier(e.target.value)}
                      placeholder="Ej. Inversiones Lumina C.A."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      N° Factura Asociada
                    </label>
                    <input
                      type="text"
                      value={newProjInvoice}
                      onChange={(e) => setNewProjInvoice(e.target.value)}
                      placeholder="Ej. FAC-008941"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Costo Total (Bs.) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newProjAmountBs}
                      onChange={(e) => setNewProjAmountBs(e.target.value)}
                      placeholder="16180,75"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Fecha Culminación
                    </label>
                    <input
                      type="date"
                      value={newProjDate}
                      onChange={(e) => setNewProjDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Memoria Descriptiva / Trabajos Ejecutados *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newProjDescription}
                    onChange={(e) => setNewProjDescription(e.target.value)}
                    placeholder="Explica qué se instaló o reparó y el beneficio para la comunidad..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-extrabold text-slate-800 block">
                      Foto de Evidencia del Proyecto Finalizado *
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Auto-WebP
                    </span>
                  </div>
                  <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/60 bg-emerald-50/40 hover:bg-emerald-50/70 p-3.5 cursor-pointer text-center transition">
                    <Camera className="h-6 w-6 text-emerald-600 mb-1" />
                    <span className="text-xs font-extrabold text-slate-800">
                      {newProjImageName
                        ? `Evidencia: ${newProjImageName}`
                        : 'Toca para subir foto de la obra culminada'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      Se comprime automáticamente a WebP en el cliente (Máx. 3 MB)
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const compressed = await compressImageClientSide(file);
                          const check = validateFileConstraints(compressed.compressedFile);
                          if (!check.valid) {
                            setFormErrorMsg(check.error || 'Archivo inválido.');
                            return;
                          }
                          setNewProjImageName(compressed.compressedFile.name);
                          setNewProjImageUrl(compressed.dataUrl);
                          setNewProjStoragePath(
                            buildChronologicalStoragePath(
                              activePeriod.year,
                              activePeriod.month,
                              'proyecto',
                              newProjTitle || 'obra_dan',
                              'webp'
                            )
                          );
                          setNewProjCompressionInfo(
                            `Comprimido de ${compressed.originalSizeKB} KB a ${compressed.compressedSizeKB} KB (WebP)`
                          );
                          setFormErrorMsg(null);
                        }
                      }}
                      className="sr-only"
                    />
                  </label>

                  {newProjImageUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-emerald-200 bg-white p-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={newProjImageUrl}
                          alt="Vista previa proyecto"
                          className="h-12 w-16 object-cover rounded-lg border border-emerald-300 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate">
                            {newProjImageName}
                          </p>
                          <p className="text-[10px] font-semibold text-emerald-700">
                            ✓ {newProjCompressionInfo || 'Evidencia lista'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewProjImageUrl(null);
                          setNewProjImageName('');
                          setNewProjCompressionInfo(null);
                        }}
                        className="text-[11px] font-bold text-rose-600 px-2 py-1"
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewProjectModal(false)}
                    className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-extrabold text-white shadow-md transition"
                  >
                    <Check className="h-4 w-4" />
                    Publicar Proyecto
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 8: VISTA AMPLIADA DE EVIDENCIA FOTOGRÁFICA DE PROYECTO */}
        {selectedProjectPreview && (
          <div
            onClick={() => setSelectedProjectPreview(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#090d1a]/90 p-3 backdrop-blur-sm"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[440px] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="relative h-64 w-full bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedProjectPreview.after_image_url}
                  alt={selectedProjectPreview.title}
                  className="h-full w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setSelectedProjectPreview(null)}
                  className="absolute top-3 right-3 rounded-full bg-slate-900/80 text-white p-2 hover:bg-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                    Evidencia Fotográfica Verificada
                  </span>
                  <span className="font-mono text-[11px] font-bold text-slate-500">
                    {selectedProjectPreview.completion_date}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  {selectedProjectPreview.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {selectedProjectPreview.description}
                </p>
                <div className="rounded-xl bg-slate-100 p-2.5 border border-slate-200 flex items-center justify-between font-mono text-[11px]">
                  <span>
                    Inversión:{' '}
                    <strong className="text-slate-900">
                      ${formatNumberVe(selectedProjectPreview.total_cost_usd)} USD
                    </strong>
                  </span>
                  <span className="text-[#1d4ed8] font-bold">
                    Cuota Apto: ${formatNumberVe(selectedProjectPreview.unit_share_usd)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 9: ANULACIÓN CONTABLE INMUTABLE (SIN BORRADO FÍSICO) */}
        {annullingExpense && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#090d1a]/80 p-0 sm:p-3 backdrop-blur-sm">
            <div className="relative w-full max-w-[420px] rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
                    <Ban className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Anular Factura (Sin Borrado Físico)
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Inmutabilidad contable • Pilar 2 de Seguridad
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAnnullingExpense(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAnnulExpenseSubmit} className="space-y-3 text-xs">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900 space-y-1">
                  <strong className="font-black block">
                    ¿Por qué no se borra físicamente (DELETE)?
                  </strong>
                  <p className="leading-snug">
                    Por norma de auditoría de condominio, ningún gasto se elimina de la base de datos. Al anular la factura <strong>{annullingExpense.invoice_number}</strong> ({annullingExpense.supplier_name}), su monto deja de sumar al recibo de los 72 apartamentos pero queda trazabilidad del motivo.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Motivo de Anulación / Asiento de Ajuste *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={annulReasonInput}
                    onChange={(e) => setAnnulReasonInput(e.target.value)}
                    placeholder="Ej. Error de transcripción en el monto en Bs. Se cargó nuevamente bajo factura corregida."
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-semibold text-slate-900 focus:border-rose-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAnnullingExpense(null)}
                    className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-extrabold text-white shadow-md transition"
                  >
                    <Ban className="h-4 w-4" />
                    Confirmar Anulación
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
