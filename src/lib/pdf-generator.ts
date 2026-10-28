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

type RgbColor = [number, number, number];

function rgbFill(c: RgbColor): string {
  return `${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(3)} rg`;
}

function rgbStroke(c: RgbColor): string {
  return `${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(3)} RG`;
}

/**
 * Estima el ancho en puntos de un texto en Helvetica / Helvetica-Bold
 */
function estimateTextWidth(text: string, fontSize: number, bold = false): number {
  let units = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ('ilI.,:;!| '.includes(ch)) units += 0.28;
    else if ('ftrj1()-/'.includes(ch)) units += 0.35;
    else if ('mwMW@%'.includes(ch)) units += 0.82;
    else if (ch >= 'A' && ch <= 'Z') units += 0.68;
    else units += 0.54;
  }
  return units * fontSize * (bold ? 1.05 : 1.0);
}

/**
 * Dibuja un rectángulo con esquinas redondeadas en coordenadas PDF (x, y = esquina inferior izquierda)
 */
function pdfRoundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, w / 2, h / 2);
  const k = 0.55228475 * radius;
  const x2 = x + w;
  const y2 = y + h;
  return [
    `${(x + radius).toFixed(2)} ${y.toFixed(2)} m`,
    `${(x2 - radius).toFixed(2)} ${y.toFixed(2)} l`,
    `${(x2 - radius + k).toFixed(2)} ${y.toFixed(2)} ${x2.toFixed(2)} ${(y + radius - k).toFixed(2)} ${x2.toFixed(2)} ${(y + radius).toFixed(2)} c`,
    `${x2.toFixed(2)} ${(y2 - radius).toFixed(2)} l`,
    `${x2.toFixed(2)} ${(y2 - radius + k).toFixed(2)} ${(x2 - radius + k).toFixed(2)} ${y2.toFixed(2)} ${(x2 - radius).toFixed(2)} ${y2.toFixed(2)} c`,
    `${(x + radius).toFixed(2)} ${y2.toFixed(2)} l`,
    `${(x + radius - k).toFixed(2)} ${y2.toFixed(2)} ${x.toFixed(2)} ${(y2 - radius + k).toFixed(2)} ${x.toFixed(2)} ${(y2 - radius).toFixed(2)} c`,
    `${x.toFixed(2)} ${(y + radius).toFixed(2)} l`,
    `${x.toFixed(2)} ${(y + radius - k).toFixed(2)} ${(x + radius - k).toFixed(2)} ${y.toFixed(2)} ${(x + radius).toFixed(2)} ${y.toFixed(2)} c`,
    'h',
  ].join(' ');
}

function drawRoundedBox(
  cmds: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor?: RgbColor,
  strokeColor?: RgbColor,
  lineWidth = 1
) {
  cmds.push('q');
  if (fillColor) cmds.push(rgbFill(fillColor));
  if (strokeColor) {
    cmds.push(rgbStroke(strokeColor));
    cmds.push(`${lineWidth.toFixed(2)} w`);
  }
  cmds.push(pdfRoundedRectPath(x, y, w, h, r));
  if (fillColor && strokeColor) cmds.push('B');
  else if (fillColor) cmds.push('f');
  else if (strokeColor) cmds.push('S');
  cmds.push('Q');
}

/**
 * Dibuja una tarjeta con barra superior de color estilo App Móvil
 */
function drawAppCardWithTopAccent(
  cmds: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  bgFill: RgbColor,
  borderStroke: RgbColor,
  topAccentFill: RgbColor,
  accentHeight = 4.5
) {
  // Sombra sutil inferior
  drawRoundedBox(cmds, x + 1, y - 1.5, w, h, r, [0.90, 0.92, 0.95]);
  // Fondo principal y borde redondeado
  drawRoundedBox(cmds, x, y, w, h, r, bgFill, borderStroke, 1);

  // Recorte (clip) del mismo rectángulo redondeado para pintar la franja superior
  cmds.push('q');
  cmds.push(pdfRoundedRectPath(x, y, w, h, r));
  cmds.push('W n');
  cmds.push(rgbFill(topAccentFill));
  cmds.push(`${x.toFixed(2)} ${(y + h - accentHeight).toFixed(2)} ${w.toFixed(2)} ${accentHeight.toFixed(2)} re f`);
  cmds.push('Q');
}

function drawText(
  cmds: string[],
  text: string,
  x: number,
  y: number,
  size: number,
  color: RgbColor,
  bold = false,
  align: 'left' | 'right' | 'center' = 'left'
) {
  const fontKey = bold ? '/F2' : '/F1';
  let finalX = x;
  if (align !== 'left') {
    const w = estimateTextWidth(text, size, bold);
    finalX = align === 'right' ? x - w : x - w / 2;
  }
  const safe = sanitizePdfText(text);
  cmds.push(
    `q ${rgbFill(color)} BT ${fontKey} ${size.toFixed(2)} Tf ${finalX.toFixed(2)} ${y.toFixed(2)} Td (${safe}) Tj ET Q`
  );
}

/**
 * Dibuja una etiqueta tipo píldora (badge) y devuelve su ancho
 */
function drawBadgePill(
  cmds: string[],
  text: string,
  x: number,
  y: number,
  height: number,
  fontSize: number,
  bgColor: RgbColor,
  textColor: RgbColor,
  bold = true,
  alignRight = false,
  borderColor?: RgbColor
): number {
  const textW = estimateTextWidth(text, fontSize, bold);
  const padX = 8;
  const pillW = textW + padX * 2;
  const drawX = alignRight ? x - pillW : x;
  drawRoundedBox(cmds, drawX, y, pillW, height, height / 2, bgColor, borderColor, 0.7);
  const textY = y + (height - fontSize) / 2 + 1.2;
  drawText(cmds, text, drawX + pillW / 2, textY, fontSize, textColor, bold, 'center');
  return pillW;
}

/**
 * Compila múltiples páginas de comandos PDF en un archivo PDF 1.4 válido
 */
function compileMultiPagePdf(
  pageStreams: string[],
  pageWidth = 595.28,
  pageHeight = 841.89
): Uint8Array {
  const objects: string[] = [];
  // 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

  // 2: Pages (se llenará luego de conocer los IDs)
  const pageCount = pageStreams.length;
  const firstPageObjId = 5;
  const pageKids: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    pageKids.push(`${firstPageObjId + i * 2} 0 R`);
  }
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageKids.join(' ')}] /Count ${pageCount} >>\nendobj`
  );

  // 3 y 4: Fuentes Helvetica y Helvetica-Bold
  objects.push(
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj'
  );
  objects.push(
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj'
  );

  for (let i = 0; i < pageCount; i++) {
    const pageObjId = firstPageObjId + i * 2;
    const contentObjId = pageObjId + 1;
    const stream = pageStreams[i];

    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj`
    );
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`
    );
  }

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

interface PdfLine {
  text: string;
  size?: number;
  bold?: boolean;
  indent?: number;
  gapBefore?: number;
}

/**
 * Construye los bytes de un PDF 1.4 a partir de líneas estructuradas (usado para facturas individuales)
 */
function buildPdfBytesFromLines(lines: PdfLine[]): Uint8Array {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  let cursorY = pageHeight - 50;
  const contentCommands: string[] = [];

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

  return compileMultiPagePdf([contentCommands.join('\n')], pageWidth, pageHeight);
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
    {
      text: 'DESCRIPCION DEL SERVICIO / SUMINISTRO FACTURADO:',
      size: 10,
      bold: true,
      gapBefore: 10,
    },
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

interface CardColorPalette {
  bgFill: RgbColor;
  borderStroke: RgbColor;
  topAccent: RgbColor;
  badgeBg: RgbColor;
  badgeText: RgbColor;
  pctBg: RgbColor;
  pctText: RgbColor;
  numberColor: RgbColor;
  amountColor: RgbColor;
}

function getDebtBracketPalette(key: string): CardColorPalette {
  switch (key) {
    case '0': // Vecinos al día (Esmeralda)
      return {
        bgFill: [0.945, 0.992, 0.965],
        borderStroke: [0.655, 0.953, 0.816],
        topAccent: [0.063, 0.725, 0.506],
        badgeBg: [0.020, 0.588, 0.412],
        badgeText: [1, 1, 1],
        pctBg: [0.820, 0.980, 0.898],
        pctText: [0.024, 0.373, 0.275],
        numberColor: [0.008, 0.173, 0.133],
        amountColor: [0.016, 0.471, 0.341],
      };
    case '1': // 1 recibo (Azul Cielo / Sky)
      return {
        bgFill: [0.941, 0.976, 1.0],
        borderStroke: [0.729, 0.902, 0.992],
        topAccent: [0.055, 0.647, 0.914],
        badgeBg: [0.008, 0.518, 0.780],
        badgeText: [1, 1, 1],
        pctBg: [0.878, 0.949, 0.996],
        pctText: [0.027, 0.349, 0.522],
        numberColor: [0.047, 0.184, 0.286],
        amountColor: [0.012, 0.412, 0.631],
      };
    case '2': // 2 recibos (Índigo / Violeta)
      return {
        bgFill: [0.945, 0.953, 1.0],
        borderStroke: [0.780, 0.824, 0.996],
        topAccent: [0.388, 0.400, 0.945],
        badgeBg: [0.310, 0.275, 0.898],
        badgeText: [1, 1, 1],
        pctBg: [0.878, 0.906, 1.0],
        pctText: [0.216, 0.188, 0.639],
        numberColor: [0.118, 0.106, 0.294],
        amountColor: [0.263, 0.220, 0.792],
      };
    case '3': // 3 recibos (Ámbar / Naranja)
      return {
        bgFill: [1.0, 0.984, 0.922],
        borderStroke: [0.992, 0.902, 0.541],
        topAccent: [0.961, 0.620, 0.043],
        badgeBg: [0.851, 0.467, 0.024],
        badgeText: [1, 1, 1],
        pctBg: [0.996, 0.953, 0.780],
        pctText: [0.471, 0.208, 0.059],
        numberColor: [0.271, 0.102, 0.012],
        amountColor: [0.706, 0.325, 0.035],
      };
    default: // 4+ recibos (Rosa / Rojo intenso)
      return {
        bgFill: [1.0, 0.949, 0.957],
        borderStroke: [0.996, 0.804, 0.827],
        topAccent: [0.957, 0.247, 0.369],
        badgeBg: [0.882, 0.114, 0.282],
        badgeText: [1, 1, 1],
        pctBg: [1.0, 0.894, 0.902],
        pctText: [0.624, 0.071, 0.224],
        numberColor: [0.298, 0.020, 0.098],
        amountColor: [0.745, 0.071, 0.235],
      };
  }
}

/**
 * Dibuja el encabezado estilo App Móvil en la parte superior de una página PDF
 */
function drawAppHeaderBanner(
  cmds: string[],
  condominium: CondominiumInfo,
  period: MonthlyPeriod,
  subtitleText: string,
  pageNumber: number,
  totalPages: number
): number {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 32;
  const contentW = pageWidth - marginX * 2;

  // Fondo general gris azulado claro estilo App (#f4f6fb)
  drawRoundedBox(cmds, 18, 18, pageWidth - 36, pageHeight - 36, 18, [0.957, 0.965, 0.984], [0.85, 0.88, 0.93], 1);

  // Tarjeta de Encabezado Superior Blanca (como el header de la App en la captura)
  const headerH = 82;
  const headerY = pageHeight - 30 - headerH;
  drawRoundedBox(cmds, marginX, headerY, contentW, headerH, 14, [1, 1, 1], [0.86, 0.89, 0.94], 1);

  // Ícono circular azul claro a la izquierda
  drawRoundedBox(cmds, marginX + 14, headerY + 38, 32, 32, 10, [0.918, 0.941, 1.0], [0.78, 0.84, 0.98], 0.8);
  drawText(cmds, 'DAN', marginX + 30, headerY + 50, 9.5, [0.114, 0.306, 0.847], true, 'center');

  // Nombre Residencias DAN + Píldora TORRE A + RIF
  drawText(cmds, condominium.name, marginX + 54, headerY + 57, 13, [0.059, 0.090, 0.165], true, 'left');
  drawBadgePill(
    cmds,
    'TORRE A',
    marginX + 235,
    headerY + 53,
    15,
    7.5,
    [0.114, 0.306, 0.847],
    [1, 1, 1],
    true
  );
  drawText(
    cmds,
    `RIF ${condominium.tax_id}  -  ${subtitleText}`,
    marginX + 54,
    headerY + 42,
    8.5,
    [0.392, 0.455, 0.545],
    true,
    'left'
  );

  // Píldora derecha de Administración Junta Directiva
  drawBadgePill(
    cmds,
    'JUNTA DIRECTIVA VERIFICADO',
    marginX + contentW - 14,
    headerY + 48,
    18,
    7.5,
    [1.0, 0.976, 0.902],
    [0.573, 0.251, 0.055],
    true,
    true,
    [0.961, 0.816, 0.545]
  );

  // Fila inferior del Header: Píldoras de Período | Moneda USD/Bs | Tasa BCV
  const pillRowY = headerY + 10;
  drawBadgePill(
    cmds,
    period.label,
    marginX + 14,
    pillRowY,
    20,
    8.5,
    [0.945, 0.961, 0.976],
    [0.059, 0.090, 0.165],
    true,
    false,
    [0.824, 0.855, 0.898]
  );

  drawBadgePill(
    cmds,
    'USD / Bs.',
    marginX + 108,
    pillRowY,
    20,
    8,
    [0.114, 0.306, 0.847],
    [1, 1, 1],
    true
  );

  drawBadgePill(
    cmds,
    `BCV: Bs. ${formatNumberVe(period.exchange_rate_bs)}`,
    marginX + 175,
    pillRowY,
    20,
    8.5,
    [0.898, 0.984, 0.941],
    [0.024, 0.471, 0.341],
    true,
    false,
    [0.655, 0.953, 0.816]
  );

  drawText(
    cmds,
    `Pag. ${pageNumber} de ${totalPages}  |  Emision: ${new Date().toLocaleDateString('es-VE')}`,
    marginX + contentW - 14,
    pillRowY + 6,
    8,
    [0.45, 0.50, 0.58],
    true,
    'right'
  );

  return headerY - 12;
}

/**
 * Exporta en PDF el Resumen Ejecutivo de Cuentas por Cobrar con el diseño visual idéntico a la App Móvil
 * (Tarjetas redondeadas con barra superior de color, badges, porcentajes y tarjetas por cada ítem)
 */
export function downloadAccountsReceivableWhatsappPdf(
  condominium: CondominiumInfo,
  period: MonthlyPeriod,
  debtGroups: DebtBracketSummary[],
  _receivables: ReceivableAccountItem[]
) {
  const pageWidth = 595.28;
  const marginX = 32;
  const contentW = pageWidth - marginX * 2;
  const totalBs = +(period.accounts_receivable_usd * period.exchange_rate_bs).toFixed(2);
  const emissionDate = new Date().toLocaleDateString('es-VE');
  const totalPages = 1;

  // =========================================================================
  // HOJA ÚNICA: TARJETAS DE RESUMEN POR GRUPO DE DEUDAS (SIN DETALLE POR APTO)
  // =========================================================================
  const p1: string[] = [];
  let cursorY = drawAppHeaderBanner(
    p1,
    condominium,
    period,
    'RESUMEN EJECUTIVO DE COBRANZA',
    1,
    totalPages
  );

  // Banda azul oscura estilo "Resumen por Grupo de Deudas (72 Apartamentos)"
  const bannerH = 30;
  cursorY -= bannerH;
  drawRoundedBox(p1, marginX, cursorY, contentW, bannerH, 10, [0.075, 0.133, 0.298]);
  drawText(
    p1,
    `RESUMEN POR GRUPO DE DEUDAS — ${period.label.toUpperCase()} (72 APARTAMENTOS)`,
    marginX + 14,
    cursorY + 10.5,
    9.5,
    [1, 1, 1],
    true,
    'left'
  );
  drawBadgePill(
    p1,
    '11-A al 184-A',
    marginX + contentW - 10,
    cursorY + 6,
    18,
    7.5,
    [0.180, 0.275, 0.545],
    [0.88, 0.93, 1.0],
    true,
    true
  );

  // Tarjeta triple de Contadores Rápidos (Solventes | Con Deuda | Total Por Cobrar)
  const kpiH = 52;
  cursorY -= kpiH + 10;
  drawRoundedBox(p1, marginX, cursorY, contentW, kpiH, 12, [1, 1, 1], [0.85, 0.88, 0.93], 1);

  const colW = contentW / 3;
  // Divisor 1 y 2
  p1.push('q 0.88 0.90 0.94 RG 1 w');
  p1.push(`${(marginX + colW).toFixed(2)} ${(cursorY + 8).toFixed(2)} m ${(marginX + colW).toFixed(2)} ${(cursorY + kpiH - 8).toFixed(2)} l S`);
  p1.push(`${(marginX + colW * 2).toFixed(2)} ${(cursorY + 8).toFixed(2)} m ${(marginX + colW * 2).toFixed(2)} ${(cursorY + kpiH - 8).toFixed(2)} l S`);
  p1.push('Q');

  const pctSolvent = formatNumberVe(
    (period.solvent_units_count / condominium.total_units) * 100,
    1
  );
  const pctDebt = formatNumberVe(
    (period.receivable_units_count / condominium.total_units) * 100,
    1
  );

  // Columna 1: Solventes
  drawText(p1, 'VECINOS SOLVENTES', marginX + colW * 0.5, cursorY + 36, 7.5, [0.45, 0.50, 0.58], true, 'center');
  drawText(
    p1,
    `${period.solvent_units_count} / ${condominium.total_units}`,
    marginX + colW * 0.5,
    cursorY + 19,
    14,
    [0.020, 0.588, 0.412],
    true,
    'center'
  );
  drawText(p1, `${pctSolvent}% al dia`, marginX + colW * 0.5, cursorY + 7, 7.5, [0.39, 0.45, 0.55], false, 'center');

  // Columna 2: Con Deuda
  drawText(p1, 'CON CUENTAS POR COBRAR', marginX + colW * 1.5, cursorY + 36, 7.5, [0.45, 0.50, 0.58], true, 'center');
  drawText(
    p1,
    `${period.receivable_units_count} / ${condominium.total_units}`,
    marginX + colW * 1.5,
    cursorY + 19,
    14,
    [0.882, 0.114, 0.282],
    true,
    'center'
  );
  drawText(p1, `${pctDebt}% con deuda`, marginX + colW * 1.5, cursorY + 7, 7.5, [0.39, 0.45, 0.55], false, 'center');

  // Columna 3: Total por Cobrar
  drawText(p1, 'MONTO TOTAL POR COBRAR', marginX + colW * 2.5, cursorY + 36, 7.5, [0.45, 0.50, 0.58], true, 'center');
  drawText(
    p1,
    `$${formatNumberVe(period.accounts_receivable_usd)} USD`,
    marginX + colW * 2.5,
    cursorY + 19,
    13,
    [0.059, 0.090, 0.165],
    true,
    'center'
  );
  drawText(
    p1,
    `Bs. ${formatNumberVe(totalBs)}`,
    marginX + colW * 2.5,
    cursorY + 7,
    8,
    [0.39, 0.45, 0.55],
    true,
    'center'
  );

  // Tarjetas de cada Grupo de Deuda (Idénticas a la foto adjunta)
  const cardH = 85;
  const cardGap = 10;

  for (const group of debtGroups) {
    cursorY -= cardH + cardGap;
    const palette = getDebtBracketPalette(group.key);
    const pctNum = (group.apartments_count / condominium.total_units) * 100;
    const pctStr = `${formatNumberVe(pctNum, 1)}%`;
    const groupBs = +(group.subtotal_usd * period.exchange_rate_bs).toFixed(2);

    drawAppCardWithTopAccent(
      p1,
      marginX,
      cursorY,
      contentW,
      cardH,
      14,
      palette.bgFill,
      palette.borderStroke,
      palette.topAccent,
      5
    );

    // Fila superior de la tarjeta: Badge izquierdo ("1 recibo") + Título ("Vecinos con 1 recibo") + Badge derecho ("12,5%")
    const topRowY = cursorY + cardH - 27;
    const badgeW = drawBadgePill(
      p1,
      group.receipts_Label,
      marginX + 16,
      topRowY,
      18,
      8.5,
      palette.badgeBg,
      palette.badgeText,
      true
    );

    drawText(
      p1,
      group.title,
      marginX + 16 + badgeW + 10,
      topRowY + 4.5,
      11.5,
      [0.059, 0.090, 0.165],
      true,
      'left'
    );

    drawBadgePill(
      p1,
      pctStr,
      marginX + contentW - 16,
      topRowY,
      18,
      8.5,
      palette.pctBg,
      palette.pctText,
      true,
      true
    );

    // Fila inferior izquierda: Número grande ("9") + "apartamentos" + subtítulo ("Corresponde al mes en curso")
    const countStr = String(group.apartments_count);
    drawText(
      p1,
      countStr,
      marginX + 16,
      cursorY + 25,
      23,
      palette.numberColor,
      true,
      'left'
    );
    const countW = estimateTextWidth(countStr, 23, true);
    drawText(
      p1,
      'apartamentos',
      marginX + 16 + countW + 6,
      cursorY + 26,
      10.5,
      [0.278, 0.333, 0.412],
      true,
      'left'
    );

    drawText(
      p1,
      group.subtitle,
      marginX + 16,
      cursorY + 10.5,
      8.8,
      [0.392, 0.455, 0.545],
      false,
      'left'
    );

    // Fila inferior derecha: "SUBTOTAL GRUPO" + "$475,20 USD" + "Bs. 26.064,72"
    drawText(
      p1,
      'SUBTOTAL GRUPO',
      marginX + contentW - 16,
      cursorY + 41,
      7.5,
      [0.580, 0.639, 0.722],
      true,
      'right'
    );
    drawText(
      p1,
      `$${formatNumberVe(group.subtotal_usd)} USD`,
      marginX + contentW - 16,
      cursorY + 25,
      13.5,
      palette.amountColor,
      true,
      'right'
    );
    drawText(
      p1,
      `Bs. ${formatNumberVe(groupBs)}`,
      marginX + contentW - 16,
      cursorY + 10.5,
      9.5,
      [0.392, 0.455, 0.545],
      true,
      'right'
    );
  }

  // Tarjeta inferior de Nota Importante sobre la Tasa de Cambio vigente al momento del pago
  const noteH = 48;
  cursorY -= noteH + 12;
  drawRoundedBox(
    p1,
    marginX,
    cursorY,
    contentW,
    noteH,
    11,
    [1.0, 0.984, 0.922],
    [0.961, 0.753, 0.259],
    1
  );
  drawText(
    p1,
    `NOTA IMPORTANTE SOBRE LA TASA DE CAMBIO (EMISION ${emissionDate}):`,
    marginX + 14,
    cursorY + 32,
    8.5,
    [0.573, 0.251, 0.055],
    true,
    'left'
  );
  drawText(
    p1,
    `La tasa utilizada en este resumen (Bs. ${formatNumberVe(period.exchange_rate_bs)} / USD) es referencial y corresponde unicamente al dia de su emision.`,
    marginX + 14,
    cursorY + 19,
    8.2,
    [0.35, 0.20, 0.05],
    false,
    'left'
  );
  drawText(
    p1,
    'Al momento de realizar los pagos, el monto en Bolivares debe calcularse a la tasa oficial vigente en ese momento.',
    marginX + 14,
    cursorY + 8,
    8.2,
    [0.35, 0.20, 0.05],
    true,
    'left'
  );

  const bytes = compileMultiPagePdf([p1.join('\n')], pageWidth, 841.89);
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

/**
 * Exporta en PDF el Resumen de Gastos y Recibo del Mes con diseño de tarjetas estilo App Móvil
 * (Tarjetas resúmenes de cada ítem/factura con su cuota parte ÷ 72)
 */
export function downloadExpensesSummaryCardsPdf(
  condominium: CondominiumInfo,
  period: MonthlyPeriod,
  expenses: Expense[]
) {
  const pageWidth = 595.28;
  const marginX = 32;
  const contentW = pageWidth - marginX * 2;

  const activeExpenses = expenses.filter((e) => e.record_status !== 'anulado');
  const totalUsd = activeExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalBs = totalUsd * period.exchange_rate_bs;
  const shareUsd = totalUsd / condominium.total_units;
  const shareBs = shareUsd * period.exchange_rate_bs;

  // Caben 5 tarjetas grandes de ítems en la Página 1 (debajo del resumen) y 6 por página adicional
  const firstPageCap = 5;
  const nextPageCap = 6;
  const remainingCount = Math.max(0, activeExpenses.length - firstPageCap);
  const extraPages = Math.ceil(remainingCount / nextPageCap);
  const totalPages = 1 + extraPages;

  const pageStreams: string[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const cmds: string[] = [];
    let cursorY = drawAppHeaderBanner(
      cmds,
      condominium,
      period,
      'RESUMEN DE GASTOS Y ALICUOTA POR ITEM',
      pageIdx + 1,
      totalPages
    );

    if (pageIdx === 0) {
      // Tarjeta Resumen General (2 columnas estilo App: Gasto Total Torre A | Cuota Apto ÷ 72)
      const summaryH = 62;
      cursorY -= summaryH;
      drawRoundedBox(cmds, marginX, cursorY, contentW, summaryH, 14, [1, 1, 1], [0.84, 0.88, 0.94], 1);

      const halfW = (contentW - 28) / 2;
      // Caja izquierda: Gasto Total Torre A
      drawRoundedBox(
        cmds,
        marginX + 10,
        cursorY + 8,
        halfW,
        summaryH - 16,
        10,
        [0.973, 0.980, 0.988],
        [0.88, 0.90, 0.94],
        0.8
      );
      drawText(
        cmds,
        'GASTO TOTAL TORRE A',
        marginX + 22,
        cursorY + 38,
        7.5,
        [0.45, 0.50, 0.58],
        true,
        'left'
      );
      drawText(
        cmds,
        `$${formatNumberVe(totalUsd)} USD`,
        marginX + 22,
        cursorY + 23,
        13.5,
        [0.059, 0.090, 0.165],
        true,
        'left'
      );
      drawText(
        cmds,
        `Bs. ${formatNumberVe(totalBs)}`,
        marginX + 22,
        cursorY + 12,
        8.5,
        [0.39, 0.45, 0.55],
        true,
        'left'
      );

      // Caja derecha: Cuota Apto (÷ 72)
      const rightBoxX = marginX + 18 + halfW;
      drawRoundedBox(
        cmds,
        rightBoxX,
        cursorY + 8,
        halfW,
        summaryH - 16,
        10,
        [0.933, 0.949, 1.0],
        [0.78, 0.83, 0.99],
        0.9
      );
      drawText(
        cmds,
        'CUOTA APTO (MONTO / 72)',
        rightBoxX + 12,
        cursorY + 38,
        7.5,
        [0.114, 0.306, 0.847],
        true,
        'left'
      );
      drawText(
        cmds,
        `$${formatNumberVe(shareUsd)} USD`,
        rightBoxX + 12,
        cursorY + 23,
        13.5,
        [0.114, 0.306, 0.847],
        true,
        'left'
      );
      drawText(
        cmds,
        `Bs. ${formatNumberVe(shareBs)}`,
        rightBoxX + 12,
        cursorY + 12,
        8.5,
        [0.25, 0.32, 0.45],
        true,
        'left'
      );

      cursorY -= 10;
    }

    // Banda título de sección
    const bandH = 26;
    cursorY -= bandH;
    drawRoundedBox(cmds, marginX, cursorY, contentW, bandH, 9, [0.075, 0.133, 0.298]);
    drawText(
      cmds,
      `TARJETAS RESUMEN DE CADA ITEM FACTURADO (${activeExpenses.length} SOPORTES VERIFICADOS)`,
      marginX + 14,
      cursorY + 9,
      8.8,
      [1, 1, 1],
      true,
      'left'
    );

    const sliceStart =
      pageIdx === 0 ? 0 : firstPageCap + (pageIdx - 1) * nextPageCap;
    const sliceEnd =
      pageIdx === 0 ? firstPageCap : sliceStart + nextPageCap;
    const pageExpenses = activeExpenses.slice(sliceStart, sliceEnd);

    const paletteCycle: CardColorPalette[] = [
      getDebtBracketPalette('1'), // Azul cielo
      getDebtBracketPalette('2'), // Índigo
      getDebtBracketPalette('0'), // Esmeralda
      getDebtBracketPalette('3'), // Ámbar
      getDebtBracketPalette('4+'), // Rosa
    ];

    const itemH = 92;
    const itemGap = 10;

    for (let i = 0; i < pageExpenses.length; i++) {
      const exp = pageExpenses[i];
      const globalIdx = sliceStart + i;
      const palette = paletteCycle[globalIdx % paletteCycle.length];

      cursorY -= itemH + itemGap;
      drawAppCardWithTopAccent(
        cmds,
        marginX,
        cursorY,
        contentW,
        itemH,
        13,
        palette.bgFill,
        palette.borderStroke,
        palette.topAccent,
        4.5
      );

      // Fila superior: Píldora N° Factura + Proveedor + RIF | Píldora Rubro a la derecha
      const topY = cursorY + itemH - 25;
      const invBadgeW = drawBadgePill(
        cmds,
        exp.invoice_number,
        marginX + 14,
        topY,
        17,
        8,
        palette.badgeBg,
        palette.badgeText,
        true
      );

      drawText(
        cmds,
        `${exp.supplier_name}  (${exp.supplier_tax_id})`,
        marginX + 14 + invBadgeW + 8,
        topY + 4.5,
        10.5,
        [0.059, 0.090, 0.165],
        true,
        'left'
      );

      drawBadgePill(
        cmds,
        exp.category_name.slice(0, 28),
        marginX + contentW - 14,
        topY,
        17,
        7.5,
        palette.pctBg,
        palette.pctText,
        true,
        true
      );

      // Fila central: Descripción en recuadro blanco interno
      const descText =
        exp.description.length > 88
          ? `${exp.description.slice(0, 85)}...`
          : exp.description;
      drawRoundedBox(
        cmds,
        marginX + 14,
        cursorY + 38,
        contentW - 28,
        22,
        7,
        [1, 1, 1],
        [0.88, 0.91, 0.95],
        0.7
      );
      drawText(
        cmds,
        descText,
        marginX + 22,
        cursorY + 46,
        8.5,
        [0.20, 0.25, 0.33],
        false,
        'left'
      );

      // Fila inferior: Izquierda Fecha + Monto Total Factura | Derecha Cuota Apto (÷ 72)
      const aptoUsd = exp.amount / condominium.total_units;
      const aptoBs = exp.amount_bs / condominium.total_units;

      drawText(
        cmds,
        `Fecha: ${exp.expense_date}   |   Total Factura: $${formatNumberVe(exp.amount)} USD (Bs. ${formatNumberVe(exp.amount_bs)})`,
        marginX + 14,
        cursorY + 14,
        8.8,
        [0.25, 0.31, 0.40],
        true,
        'left'
      );

      drawBadgePill(
        cmds,
        `Cuota Apto (/ 72): $${formatNumberVe(aptoUsd)} USD  |  Bs. ${formatNumberVe(aptoBs)}`,
        marginX + contentW - 14,
        cursorY + 9,
        20,
        8.2,
        [1, 1, 1],
        palette.amountColor,
        true,
        true,
        palette.borderStroke
      );
    }

    drawText(
      cmds,
      `Resumen oficial estilo App Movil - ${condominium.name} (${period.label})`,
      pageWidth / 2,
      28,
      8,
      [0.45, 0.50, 0.58],
      true,
      'center'
    );

    pageStreams.push(cmds.join('\n'));
  }

  const bytes = compileMultiPagePdf(pageStreams, pageWidth, 841.89);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Resumen_Tarjetas_Gastos_${period.label.replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

