import { createClient } from '@supabase/supabase-js';

// SEGURIDAD: Solo se usan variables públicas seguras en el cliente.
// NUNCA exponer SUPABASE_SERVICE_ROLE_KEY con el prefijo NEXT_PUBLIC_.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'soportes';
export const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB estricto
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('tu-proyecto.supabase.co')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Normaliza un texto para nombres de archivo limpios (sin acentos ni espacios)
 * Ej: "Hidrocapital C.A." -> "hidrocapital_ca"
 */
export function slugifyFileName(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 36);
}

/**
 * Genera una ruta cronológica estandarizada para evitar archivos basura
 * Formato: /{year}/{month}/{prefix}_{slug}_{timestamp}.{ext}
 * Ej: 2026/10/factura_hidrocapital_172988.pdf
 */
export function buildChronologicalStoragePath(
  year: number,
  month: number,
  prefix: 'factura' | 'evidencia' | 'proyecto' | 'nomina',
  conceptOrSupplier: string,
  extension: string
): string {
  const paddedMonth = String(month).padStart(2, '0');
  const cleanSlug = slugifyFileName(conceptOrSupplier || 'soporte');
  const shortTimestamp = String(Math.floor(Date.now() / 1000)).slice(-6);
  const cleanExt = extension.replace(/^\./, '').toLowerCase();
  return `${year}/${paddedMonth}/${prefix}_${cleanSlug}_${shortTimestamp}.${cleanExt}`;
}

/**
 * Valida que el archivo cumpla con el tipo MIME permitido y tamaño máximo (3 MB)
 */
export function validateFileConstraints(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Formato no permitido (${file.type || 'desconocido'}). Solo se aceptan PDF, JPG, PNG o WEBP.`,
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `El archivo pesa ${sizeMB} MB y supera el límite máximo permitido de 3.00 MB.`,
    };
  }
  return { valid: true };
}

/**
 * Compresión transparente de imágenes en el cliente (Navegador)
 * Convierte fotos pesadas de teléfono a formato WebP ligero (máx 1280px, calidad 0.78)
 * para ahorrar espacio en localStorage y en Supabase Storage, acelerando cargas en datos móviles.
 */
export async function compressImageClientSide(
  file: File,
  maxWidth = 1280,
  quality = 0.78
): Promise<{
  compressedFile: File;
  dataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
}> {
  const originalSizeKB = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen inválido.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('No se pudo inicializar el compresor gráfico.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const webpDataUrl = canvas.toDataURL('image/webp', quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir la imagen a WebP.'));
              return;
            }
            const cleanBase = slugifyFileName(file.name.replace(/\.[^/.]+$/, ''));
            const compressedFile = new File([blob], `${cleanBase}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            const compressedSizeKB = Math.round(compressedFile.size / 1024);
            resolve({
              compressedFile,
              dataUrl: webpDataUrl,
              originalSizeKB,
              compressedSizeKB,
            });
          },
          'image/webp',
          quality
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sube un soporte (PDF o Imagen WebP comprimida) con estructura cronológica
 * y elimina automáticamente el archivo anterior si se está reemplazando (Evita archivos huérfanos).
 */
export async function uploadCondoFile(
  file: File,
  options: {
    year?: number;
    month?: number;
    prefix?: 'factura' | 'evidencia' | 'proyecto' | 'nomina';
    conceptOrSupplier?: string;
    previousStoragePath?: string; // Si existe, se elimina antes de guardar el nuevo
  } = {}
): Promise<{ url: string | null; storagePath: string; error: string | null }> {
  const year = options.year || new Date().getFullYear();
  const month = options.month || new Date().getMonth() + 1;
  const prefix = options.prefix || 'factura';
  const concept = options.conceptOrSupplier || file.name;

  // Si es imagen, comprimir automáticamente antes de validar/subir
  let fileToProcess = file;
  let previewDataUrl: string | null = null;

  if (file.type.startsWith('image/')) {
    try {
      const compressed = await compressImageClientSide(file);
      fileToProcess = compressed.compressedFile;
      previewDataUrl = compressed.dataUrl;
    } catch {
      // Si falla la compresión, usar el archivo original
    }
  }

  const validation = validateFileConstraints(fileToProcess);
  if (!validation.valid) {
    return { url: null, storagePath: '', error: validation.error || 'Archivo inválido' };
  }

  const ext = fileToProcess.name.split('.').pop() || (fileToProcess.type === 'application/pdf' ? 'pdf' : 'webp');
  const storagePath = buildChronologicalStoragePath(year, month, prefix, concept, ext);

  if (!supabase) {
    // Modo LocalStorage: retornar DataURL para imágenes o Blob URL para PDFs
    const localUrl = previewDataUrl || URL.createObjectURL(fileToProcess);
    return { url: localUrl, storagePath, error: null };
  }

  try {
    // Control de reemplazos: eliminar archivo huérfano anterior si aplica
    if (options.previousStoragePath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([options.previousStoragePath]);
    }

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileToProcess, {
        cacheControl: '3600',
        contentType: fileToProcess.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error subiendo archivo a Supabase Storage:', uploadError);
      return { url: null, storagePath, error: uploadError.message };
    }

    // Generar URL firmada temporal (60 segundos) para el documento recién cargado
    const { data: signedData } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 60);

    return {
      url: signedData?.signedUrl || previewDataUrl || storagePath,
      storagePath,
      error: null,
    };
  } catch (err: any) {
    console.error('Excepción al subir archivo:', err);
    return {
      url: null,
      storagePath,
      error: err.message || 'Error desconocido al subir archivo',
    };
  }
}

/**
 * Genera una URL Firmada (Signed URL) con tiempo de expiración corto (60 segundos por defecto)
 * desde el bucket privado de Supabase para evitar que enlaces sensibles queden expuestos.
 */
export async function getSignedDocumentUrl(
  storagePathOrUrl: string,
  expiresInSeconds = 60
): Promise<string> {
  if (!storagePathOrUrl) return '';

  // Si es un DataURL o Blob local (modo localStorage), devolver directamente
  if (
    storagePathOrUrl.startsWith('data:') ||
    storagePathOrUrl.startsWith('blob:') ||
    !supabase
  ) {
    return storagePathOrUrl;
  }

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePathOrUrl, expiresInSeconds);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch (err) {
    console.warn('No se pudo firmar la URL del documento:', err);
  }

  return storagePathOrUrl;
}

/**
 * Carga los gastos de un período desde Supabase (si está configurado)
 */
export async function getExpensesFromSupabase(periodId: string) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('period_id', periodId)
      .order('expense_date', { ascending: false });

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Guarda o actualiza un gasto en Supabase (sin borrado físico)
 */
export async function saveExpenseToSupabase(expense: any) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('expenses').upsert(expense).select();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Anula contablemente un gasto en Supabase (Inmutabilidad: UPDATE en lugar de DELETE)
 */
export async function annulExpenseInSupabase(expenseId: string, reason: string) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('expenses')
      .update({
        record_status: 'anulado',
        annulled_reason: reason,
        annulled_at: new Date().toISOString(),
      })
      .eq('id', expenseId)
      .select();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Carga los miembros del directorio de la junta desde Supabase
 */
export async function getBoardMembersFromSupabase() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('board_members')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Sincroniza los miembros de la junta en Supabase
 */
export async function syncBoardMembersToSupabase(members: any[]) {
  if (!supabase) return;
  try {
    await supabase
      .from('board_members')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('board_members').insert(
      members.map((m, idx) => ({
        name: m.name,
        role: m.role,
        category: m.category,
        apartment: m.apartment,
        initials: m.initials,
        order_index: idx + 1,
      }))
    );
  } catch (err) {
    console.error('Error sincronizando miembros con Supabase:', err);
  }
}

/**
 * Actualiza el saldo en banco en Supabase
 */
export async function updateBankBalanceInSupabase(balanceUsd: number) {
  if (!supabase) return;
  try {
    await supabase
      .from('condominium_info')
      .update({ bank_balance_usd: balanceUsd, updated_at: new Date().toISOString() })
      .eq('tax_id', 'J-29495522-3');
  } catch (err) {
    console.error('Error actualizando saldo en Supabase:', err);
  }
}
