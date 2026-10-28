import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Endpoint ligero de Keep-Alive (/api/health)
 * Evita la pausa por inactividad de 7 días en el plan gratuito de Supabase
 * y sirve como monitor de salud para Vercel Cron Jobs y UptimeRobot.
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json(
      {
        ok: true,
        status: 'healthy',
        mode: 'localstorage-ready',
        condominium: 'Residencias DAN Torre A',
        message: 'Sistema activo en modo LocalStorage. Listo para conectar Supabase.',
        timestamp,
      },
      { status: 200 }
    );
  }

  try {
    // Ejecuta SELECT id FROM expenses LIMIT 1 para mantener despierta la instancia PostgreSQL
    const { data, error } = await supabase
      .from('expenses')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          status: 'db_warning',
          error: error.message,
          timestamp,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: 'healthy',
        mode: 'supabase-connected',
        records_checked: data?.length ?? 0,
        query: 'SELECT id FROM expenses LIMIT 1;',
        timestamp,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        status: 'error',
        error: err?.message || 'Unknown error',
        timestamp,
      },
      { status: 500 }
    );
  }
}
