import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const platform = searchParams.get('platform') ?? 'google';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros inválidos' },
        { status: 400 }
      );
    }

    if (platform === 'google' && !customerId) {
      return NextResponse.json(
        { success: false, error: 'customerId é obrigatório para Google' },
        { status: 400 }
      );
    }

    if (!['google', 'meta'].includes(platform)) {
      return NextResponse.json(
        { success: false, error: 'Plataforma inválida' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('ads_campaign_metrics')
      .select('date, conversions')
      .eq('platform', platform)
      .gte('date', startDate)
      .lte('date', endDate);

    // 🔧 customer_id só é válido para Google
    if (platform === 'google') {
      query = query.eq('customer_id', Number(customerId));
    }

    const { data, error } = await query;
    if (error) throw error;

    const grouped: Record<string, number> = {};

    (data ?? []).forEach((row: any) => {
      const value = Number(row.conversions ?? 0);
      grouped[row.date] = (grouped[row.date] ?? 0) + value;
    });

    const trend = Object.entries(grouped)
      .map(([date, conversions]) => ({
        date,
        conversions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data: trend,
    });
  } catch (err: any) {
    console.error('TREND ERROR', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
