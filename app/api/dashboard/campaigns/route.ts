export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

import { getMetaAdsCampaignsRealtime } from '@/services/ads/meta/metaAds.campaigns.realtime';
import { getGoogleAdsCampaignsRealtime } from '@/services/ads/google/googleAds.campaigns.realtime';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // YYYY-MM-DD
    const platform = searchParams.get('platform');

    if (!startDate || !endDate || !platform) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros inválidos' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const includesToday = startDate <= today && endDate >= today;

    /* ===============================
       1️⃣ BUSCA NO BANCO (HISTÓRICO)
    ================================ */
    let rows: any[] = [];

    if ((platform === 'google' || platform === 'all') && customerId) {
      const { data } = await supabaseAdmin
        .from('ads_campaign_metrics')
        .select(`
          campaign_id,
          campaign_name,
          platform,
          clicks,
          cost,
          conversions,
          date
        `)
        .eq('platform', 'google')
        .eq('customer_id', Number(customerId))
        .gte('date', startDate)
        .lte('date', endDate);

      rows.push(...(data ?? []));
    }

    if (platform === 'meta' || platform === 'all') {
      const { data } = await supabaseAdmin
        .from('ads_campaign_metrics')
        .select(`
          campaign_id,
          campaign_name,
          platform,
          clicks,
          cost,
          conversions,
          date
        `)
        .eq('platform', 'meta')
        .gte('date', startDate)
        .lte('date', endDate);

      rows.push(...(data ?? []));
    }

    /* ===============================
       2️⃣ AGREGAÇÃO ROBUSTA
    ================================ */
    const grouped: Record<string, any> = {};

    function addRow(row: any) {
      const safeId =
        row.campaign_id ??
        row.campaign_name;

      if (!safeId) return;

      const key = `${row.platform}-${safeId}`;

      if (!grouped[key]) {
        grouped[key] = {
          campaign_id: row.campaign_id ?? null,
          campaign_name: row.campaign_name ?? 'Campanha sem nome',
          platform: row.platform,
          clicks: 0,
          cost: 0,
          conversions: 0,
        };
      }

      grouped[key].clicks += Number(row.clicks ?? 0);
      grouped[key].cost += Number(row.cost ?? 0);
      grouped[key].conversions += Number(row.conversions ?? 0);
    }

    rows.forEach(addRow);

    /* ===============================
       3️⃣ REALTIME (SÓ HOJE)
    ================================ */
    if (includesToday) {
      try {
        if ((platform === 'google' || platform === 'all') && customerId) {
          const realtimeGoogle = await getGoogleAdsCampaignsRealtime({
            customerId,
            refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
          });

          realtimeGoogle.forEach(addRow);
        }

        if (platform === 'meta' || platform === 'all') {
          const realtimeMeta = await getMetaAdsCampaignsRealtime({
            adAccountId: 'act_1471558083175379',
            accessToken: process.env.META_ADS_ACCESS_TOKEN!,
            date: today,
          });

          realtimeMeta.forEach(addRow);
        }
      } catch (e) {
        console.error('REALTIME ERROR (IGNORADO)', e);
      }
    }

    /* ===============================
       4️⃣ FILTRO + RANKING
    ================================ */
    const campaigns = Object.values(grouped).filter(
      (c: any) =>
        c.cost > 0 ||
        c.clicks > 0 ||
        c.conversions > 0
    );

    return NextResponse.json({
      success: true,
      source: 'database+realtime',
      data: {
        campaigns: campaigns
          .sort((a: any, b: any) => b.cost - a.cost)
          .slice(0, 10),
        topCampaigns: campaigns
          .sort((a: any, b: any) => b.conversions - a.conversions)
          .slice(0, 5),
      },
    });
  } catch (error: any) {
    console.error('DASHBOARD CAMPAIGNS ERROR', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
