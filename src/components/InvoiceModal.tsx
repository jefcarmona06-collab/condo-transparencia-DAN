'use client';

import React, { useState, useEffect } from 'react';
import { Expense, CondominiumInfo, UserRole, AuditStatus } from '@/types/condo';
import {
  downloadInvoicePdf,
  getSupplierInvoicePdfUrl,
  formatNumberVe,
} from '@/lib/pdf-generator';
import {
  X,
  Download,
  CheckCircle2,
  FileText,
  ExternalLink,
  Calculator,
  Camera,
  Eye,
  ImageIcon,
} from 'lucide-react';

interface InvoiceModalProps {
  expense: Expense | null;
  condominium: CondominiumInfo;
  userRole: UserRole;
  initialTab?: 'pdf' | 'evidence';
  onClose: () => void;
  onUpdateAudit?: (expenseId: string, status: AuditStatus, comment: string) => void;
}

export default function InvoiceModal({
  expense,
  condominium,
  userRole,
  initialTab = 'pdf',
  onClose,
  onUpdateAudit,
}: InvoiceModalProps) {
  const [auditNote, setAuditNote] = useState(expense?.audit_comment || '');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [activeView, setActiveView] = useState<'pdf' | 'evidence'>(
    initialTab === 'evidence' && expense?.evidence_image_url ? 'evidence' : 'pdf'
  );

  useEffect(() => {
    if (!expense) {
      setPdfPreviewUrl('');
      return;
    }
    setAuditNote(expense.audit_comment || '');
    setActiveView(
      initialTab === 'evidence' && expense.evidence_image_url ? 'evidence' : 'pdf'
    );
    const url = getSupplierInvoicePdfUrl(expense, condominium);
    setPdfPreviewUrl(url);

    return () => {
      if (
        url &&
        url.startsWith('blob:') &&
        url !== expense.invoice_url
      ) {
        URL.revokeObjectURL(url);
      }
    };
  }, [expense, condominium, initialTab]);

  if (!expense) return null;

  const unitShareUsd = +(expense.amount / condominium.total_units).toFixed(2);
  const unitShareBs = +(unitShareUsd * expense.exchange_rate_bs).toFixed(2);
  const isOriginalUploadedPdf =
    expense.invoice_url.startsWith('blob:') ||
    expense.invoice_url.startsWith('data:');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#090d1a]/80 p-0 sm:p-3 backdrop-blur-sm">
      <div className="relative w-full max-w-[440px] max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Mobile Modal Header */}
        <div className="flex items-start justify-between gap-2 bg-[#0d111f] px-4 py-3.5 text-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2563eb]/25 text-blue-400 border border-blue-500/30">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs font-extrabold truncate">
                  Factura: {expense.invoice_number}
                </h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                  {isOriginalUploadedPdf ? 'PDF Original' : 'PDF Proveedor'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {expense.supplier_name} • {expense.supplier_tax_id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition shrink-0"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50">
          {/* Summary Card */}
          <div className="rounded-2xl bg-slate-100 border border-slate-300/80 p-3.5 shadow-md space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-500">
                Rubro Contable
              </span>
              <span className="font-extrabold text-slate-800 text-right">
                {expense.category_name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
              <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Total Factura
                </span>
                <strong className="text-slate-900 font-black font-mono text-xs block mt-0.5">
                  Bs. {formatNumberVe(expense.amount_bs)}
                </strong>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  ${formatNumberVe(expense.amount)} USD (Tasa {formatNumberVe(expense.exchange_rate_bs)})
                </span>
              </div>

              <div className="rounded-xl bg-indigo-50/90 p-2.5 border border-indigo-200">
                <span className="text-[10px] font-bold uppercase text-[#2563eb] flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  Cuota (÷ 72)
                </span>
                <strong className="text-[#2563eb] font-black font-mono text-xs block mt-0.5">
                  ${formatNumberVe(unitShareUsd)} USD
                </strong>
                <span className="text-[10px] font-mono font-bold text-slate-600">
                  Bs. {formatNumberVe(unitShareBs)} / apto
                </span>
              </div>
            </div>
          </div>

          {/* Selector de Vista: Factura PDF vs Foto Evidencia */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveView('pdf')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition ${
                activeView === 'pdf'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-[#2563eb]" />
              Factura PDF
            </button>
            <button
              type="button"
              onClick={() => setActiveView('evidence')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition ${
                activeView === 'evidence'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="h-3.5 w-3.5 text-emerald-600" />
              Foto Evidencia
              {expense.evidence_image_url ? (
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 font-extrabold">
                  Foto
                </span>
              ) : (
                <span className="text-[9px] font-normal text-slate-400">(0)</span>
              )}
            </button>
          </div>

          {activeView === 'pdf' ? (
            <>
              {/* Action Buttons PDF */}
              <div className="grid grid-cols-2 gap-2.5">
                {pdfPreviewUrl && (
                  <a
                    href={pdfPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3 py-2.5 text-xs font-extrabold text-slate-800 shadow-sm transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-[#2563eb]" />
                    Ver pantalla completa
                  </a>
                )}
                <button
                  onClick={() => downloadInvoicePdf(expense, condominium)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 px-3 py-2.5 text-xs font-extrabold text-white shadow-md shadow-blue-600/20 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar PDF
                </button>
              </div>

              {/* Embedded PDF Preview */}
              <div className="rounded-2xl overflow-hidden border border-slate-300 bg-slate-800 shadow-inner h-[310px]">
                {pdfPreviewUrl ? (
                  <iframe
                    src={pdfPreviewUrl}
                    title={`Factura PDF ${expense.invoice_number}`}
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-300">
                    Cargando documento PDF del proveedor...
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* VISTA FOTO DE EVIDENCIA */}
              {expense.evidence_image_url ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <a
                      href={expense.evidence_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3 py-2.5 text-xs font-extrabold text-slate-800 shadow-sm transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                      Ver imagen completa
                    </a>
                    <a
                      href={expense.evidence_image_url}
                      download={expense.evidence_image_name || `evidencia_${expense.invoice_number}.jpg`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar Foto
                    </a>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-slate-300 bg-slate-900 shadow-inner flex flex-col items-center justify-center p-3 min-h-[280px] max-h-[340px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={expense.evidence_image_url}
                      alt={expense.evidence_image_name || `Evidencia física de ${expense.description}`}
                      className="max-h-[250px] w-auto max-w-full rounded-xl object-contain shadow-lg"
                    />
                    <div className="mt-2 text-center">
                      <span className="inline-block rounded-lg bg-black/70 backdrop-blur-sm px-3 py-1 text-[11px] font-bold text-white border border-white/10">
                        📷 {expense.evidence_image_name || 'Evidencia física del material / repuesto comprado'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-800">
                    Sin foto física de evidencia registrada
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-[280px] mx-auto">
                    Este gasto está respaldado por la factura fiscal en PDF. Las fotos de evidencia son agregadas por la Junta al registrar compras de materiales o reparaciones físicas (ej. lámparas, repuestos de bombas).
                  </p>
                </div>
              )}
            </>
          )}

          {/* Junta Controls if activeRole === 'junta' */}
          {userRole === 'junta' && onUpdateAudit && (
            <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
              <span className="text-[11px] font-extrabold text-slate-700 block">
                Nota de verificación (Junta de Condominio):
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  placeholder="Observación sobre este soporte..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-[#2563eb] focus:outline-none"
                />
                <button
                  onClick={() =>
                    onUpdateAudit(
                      expense.id,
                      'verificado',
                      auditNote || 'Factura original en PDF verificada por la Junta.'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white transition shrink-0"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
