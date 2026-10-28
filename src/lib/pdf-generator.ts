import { CondominiumInfo, Expense, MonthlyPeriod } from '@/types/condo';
import { DebtBracketSummary, ReceivableAccountItem } from '@/lib/mock-data';

/**
 * Formatea cualquier número utilizando puntos (.) para los miles y comas (,) para los decimales.
 * Ejemplo: 14820.5 -> "14.820,50"
 */
export function formatNumberVe(value: number, decimals = 2): string {
  const num = Number(value || 0);
  const isNegative = num < 0;
  const fixed = Math.abs(num).toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const formatted = decimals > 0 ? `${withThousands},${decPart}` : withThousands;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Sanitiza texto para codificación estándar PDF WinAnsi (soporta tildes y ñ)
 */
function sanitizePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/÷/g, '/')
    .replace(/•/g, '-');
}

interface PdfLine {
  text: string;
  size?: number;
  bold?: boolean;
  indent?: number;
  gapBefore?: number;
}

/**
 * Construye los bytes de un PDF 1.4 a partir de líneas estructuradas
 */
function buildPdfBytesFromLines(lines: PdfLine[]): Uint8Array {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  let cursorY = pageHeight - 50;
  const contentCommands: string[] = [];

  // Barra superior azul/indigo institucional
  contentCommands.push('0.07 0.10 0.18 rg');
  contentCommands.push(`40 ${pageHeight - 36} ${pageWidth - 80} 6 re f`);
  contentCommands.push('0 0 0 rg');

  for (const item of lines) {
    const fontSize = item.size || 10;
    const fontKey = item.bold ? '/F2' : '/F1';
    const x = 45 + (item.indent || 0);
    cursorY -= (item.gapBefore ?? 5) + fontSize;

    if (cursorY < 42) break;

    if (item.text === '---LINE---') {
      contentCommands.push('0.82 0.85 0.89 RG 0.8 w');
      contentCommands.push(`45 ${cursorY + 4} m ${pageWidth - 45} ${cursorY + 4} l S`);
      continue;
    }

    const safe = sanitizePdfText(item.text);
    contentCommands.push(`BT ${fontKey} ${fontSize} Tf ${x} ${cursorY} Td (${safe}) Tj ET`);
  }

  const streamContent = contentCommands.join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj`,
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj',
    `6 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }

  return bytes;
}

/**
 * Genera los bytes de un documento PDF 1.4 válido que representa la factura emitida por el proveedor
 */
export function buildSupplierInvoicePdfBytes(
  expense: Expense,
  condominium: CondominiumInfo
): Uint8Array {
  const subtotalUsd = +(expense.amount / 1.16).toFixed(2);
  const ivaUsd = +(expense.amount - subtotalUsd).toFixed(2);
  const subtotalBs = +(subtotalUsd * expense.exchange_rate_bs).toFixed(2);
  const ivaBs = +(ivaUsd * expense.exchange_rate_bs).toFixed(2);
  const unitShareUsd = +(expense.amount / condominium.total_units).toFixed(2);
  const unitShareBs = +(expense.amount_bs / condominium.total_units).toFixed(2);

  return buildPdfBytesFromLines([
    { text: expense.supplier_name.toUpperCase(), size: 15, bold: true, gapBefore: 4 },
    { text: `RIF Proveedor: ${expense.supplier_tax_id}`, size: 10, bold: true },
    { text: 'DOCUMENTO FISCAL ORIGINAL EMITIDO POR EL PROVEEDOR', size: 9 },
    { text: '---LINE---', gapBefore: 8 },
    {
      text: `FACTURA NRO: ${expense.invoice_number}     |     NRO DE CONTROL: ${expense.control_number}`,
      size: 12,
      bold: true,
      gapBefore: 10,
    },
    { text: `Fecha de Emision: ${expense.expense_date}`, size: 10 },
    { text: '---LINE---', gapBefore: 8 },
    { text: 'DATOS DEL CLIENTE (CONDOMINIO):', size: 10, bold: true, gapBefore: 8 },
    { text: `Razon Social: ${condominium.name}`, size: 11, bold: true, indent: 8 },
    { text: `RIF: ${condominium.tax_id}`, size: 10, indent: 8 },
    { text: `Direccion Fiscal: ${condominium.address}`, size: 9, indent: 8 },
    { text: '---LINE---', gapBefore: 10 },
    { text: 'RUBRO CONTABLE:', size: 10, bold: true, gapBefore: 8 },
    { text: expense.category_name, size: 10, indent: 8 },
    { text: 'DESCRIPCION DEL SERVICIO / SUMINISTRO FACTURADO:', size: 10, bold: true, gapBefore: 10 },
    { text: expense.description, size: 10, indent: 8 },
    { text: '---LINE---', gapBefore: 12 },
    { text: 'RESUMEN DE FACTURACION:', size: 11, bold: true, gapBefore: 8 },
    {
      text: `Base Imponible:   $${formatNumberVe(subtotalUsd)} USD   (Bs. ${formatNumberVe(subtotalBs)})`,
      size: 10,
      indent: 8,
    },
    {
      text: `IVA Fiscal (16%): $${formatNumberVe(ivaUsd)} USD   (Bs. ${formatNumberVe(ivaBs)})`,
      size: 10,
      indent: 8,
    },
    {
      text: `Tasa de Cambio Referencial BCV: Bs. ${formatNumberVe(expense.exchange_rate_bs)} / USD`,
      size: 9,
      indent: 8,
    },
    {
      text: `TOTAL FACTURA PROVEEDOR: $${formatNumberVe(expense.amount)} USD   |   Bs. ${formatNumberVe(expense.amount_bs)}`,
      size: 13,
      bold: true,
      gapBefore: 12,
    },
    { text: '---LINE---', gapBefore: 10 },
    {
      text: `Nota Condominio (${condominium.name}): Cuota parte por apartamento (Monto / 72 aptos) = $${formatNumberVe(unitShareUsd)} USD (Bs. ${formatNumberVe(unitShareBs)})`,
      size: 9.5,
      bold: true,
      gapBefore: 8,
    },
  ]);
}

function buildSupplierInvoicePdfBlob(
  expense: Expense,
  condominium: CondominiumInfo
): Blob {
  const bytes = buildSupplierInvoicePdfBytes(expense, condominium);
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

/**
 * Obtiene un URL de archivo PDF para previsualizar en un <iframe>.
 */
export function getSupplierInvoicePdfUrl(
  expense: Expense,
  condominium: CondominiumInfo
): string {
  if (
    expense.invoice_url.startsWith('blob:') ||
    expense.invoice_url.startsWith('data:application/pdf')
  ) {
    return expense.invoice_url;
  }

  const blob = buildSupplierInvoicePdfBlob(expense, condominium);
  return URL.createObjectURL(blob);
}

/**
 * Descarga directamente el archivo PDF de la factura emitida por el proveedor
 */
export function downloadInvoicePdf(expense: Expense, condominium: CondominiumInfo) {
  const cleanSupplier = expense.supplier_name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const downloadName = `Factura_${expense.invoice_number}_${cleanSupplier}.pdf`;

  if (
    expense.invoice_url.startsWith('blob:') ||
    expense.invoice_url.startsWith('data:')
  ) {
    const link = document.createElement('a');
    link.href = expense.invoice_url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  const blob = buildSupplierInvoicePdfBlob(expense, condominium);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Exporta en PDF el Resumen Ejecutivo de Cuentas por Cobrar listo para ser enviado por WhatsApp
 * (Exclusivo para la Junta de Condominio)
 */
export function downloadAccountsReceivableWhatsappPdf(
  condominium: CondominiumInfo,
  period: MonthlyPeriod,
  debtGroups: DebtBracketSummary[],
  receivables: ReceivableAccountItem[]
) {
  const totalBs = +(period.accounts_receivable_usd * period.exchange_rate_bs).toFixed(2);
  const emissionDate = new Date().toLocaleDateString('es-VE');
  const pctSolvent = formatNumberVe(
    (period.solvent_units_count / condominium.total_units) * 100,
    1
  );
  const pctDebt = formatNumberVe(
    (period.receivable_units_count / condominium.total_units) * 100,
    1
  );

  const lines: PdfLine[] = [
    { text: `${condominium.name.toUpperCase()}  -  RIF: ${condominium.tax_id}`, size: 13, bold: true, gapBefore: 2 },
    { text: condominium.address, size: 8.5, gapBefore: 2 },
    { text: '---LINE---', gapBefore: 6 },
    {
      text: `REPORTE EJECUTIVO DE CUENTAS POR COBRAR (${period.label.toUpperCase()})`,
      size: 12,
      bold: true,
      gapBefore: 8,
    },
    {
      text: `Fecha de Emision: ${emissionDate}   |   Tasa BCV: Bs. ${formatNumberVe(period.exchange_rate_bs)} / USD   |   Total Unidades: ${condominium.total_units} Aptos`,
      size: 9,
      gapBefore: 4,
    },
    { text: '---LINE---', gapBefore: 6 },
    { text: '1. BALANCE GENERAL DE SOLVENCIA DEL EDIFICIO:', size: 10, bold: true, gapBefore: 6 },
    {
      text: `- Vecinos Solventes (Al dia): ${period.solvent_units_count} de ${condominium.total_units} apartamentos (${pctSolvent}%)`,
      size: 9.5,
      indent: 8,
      gapBefore: 4,
    },
    {
      text: `- Vecinos con Cuentas por Cobrar: ${period.receivable_units_count} de ${condominium.total_units} apartamentos (${pctDebt}%)`,
      size: 9.5,
      bold: true,
      indent: 8,
      gapBefore: 3,
    },
    {
      text: `- MONTO TOTAL POR COBRAR: $${formatNumberVe(period.accounts_receivable_usd)} USD   (Bs. ${formatNumberVe(totalBs)})`,
      size: 10.5,
      bold: true,
      indent: 8,
      gapBefore: 4,
    },
    { text: '---LINE---', gapBefore: 6 },
    { text: '2. RESUMEN POR GRUPO DE DEUDAS (CANTIDAD DE RECIBOS):', size: 10, bold: true, gapBefore: 6 },
  ];

  for (const g of debtGroups) {
    const groupBs = +(g.subtotal_usd * period.exchange_rate_bs).toFixed(2);
    lines.push({
      text: `* ${g.title} (${g.receipts_Label}): ${g.apartments_count} aptos  |  Subtotal: $${formatNumberVe(g.subtotal_usd)} USD (Bs. ${formatNumberVe(groupBs)})`,
      size: 9,
      bold: g.key !== '0',
      indent: 8,
      gapBefore: 3.5,
    });
  }

  lines.push({ text: '---LINE---', gapBefore: 6 });
  lines.push({
    text: '3. RELACION DE APARTAMENTOS CON RECIBOS PENDIENTES:',
    size: 10,
    bold: true,
    gapBefore: 6,
  });

  const pendingOnly = receivables.filter((r) => r.pending_months > 0);
  for (const item of pendingOnly) {
    const itemBs = +(item.amount_usd * period.exchange_rate_bs).toFixed(2);
    lines.push({
      text: `${item.unit} (${item.floor})  -  ${item.pending_months} recibo(s) [${item.last_period}]  ->  $${formatNumberVe(item.amount_usd)} USD (Bs. ${formatNumberVe(itemBs)}) - ${item.status}`,
      size: 8.2,
      indent: 6,
      gapBefore: 2.2,
    });
  }

  lines.push({ text: '---LINE---', gapBefore: 6 });
  lines.push({
    text: 'Emitido por la Junta de Condominio de Residencias DAN Torre A para difusion oficial via WhatsApp.',
    size: 8.5,
    bold: true,
    gapBefore: 4,
  });

  const bytes = buildPdfBytesFromLines(lines);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Resumen_Cuentas_por_Cobrar_${period.label.replace(/\s+/g, '_')}_WhatsApp.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
