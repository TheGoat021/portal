import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getGoogleAdsOverviewRealtime } from '@/services/ads/google/googleAds.realtime';
import { getMetaAdsOverviewRealtime } from '@/services/ads/meta/metaAds.realtime';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const platform = searchParams.get('platform') ?? 'google';

    if (!customerId || !startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'customerId, startDate and endDate are required',
        },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);

    const isGoogleRealtime =
      platform === 'google' &&
      startDate === today &&
      endDate === today;

    const isMetaRealtime =
      platform === 'meta' &&
      startDate === today &&
      endDate === today;

    /* ===============================
       🔎 EXISTE HOJE NO BANCO?
    ================================ */
    const { data: todayRows } = await supabaseAdmin
      .from('ads_campaign_metrics')
      .select('date')
      .eq('platform', platform)
      .eq('date', today)
      .limit(1);

    const hasTodayInDb = (todayRows ?? []).length > 0;

    /* ===============================
       🔥 REALTIME GOOGLE
    ================================ */
    if (isGoogleRealtime && !hasTodayInDb) {
      const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
      if (!refreshToken) {
        throw new Error('GOOGLE_ADS_REFRESH_TOKEN não configurado');
      }

      const realtimeData = await getGoogleAdsOverviewRealtime({
        googleCustomerId: customerId,
        loginCustomerId: '720-721-9221',
        refreshToken,
        startDate,
        endDate,
      });

      return NextResponse.json({
        success: true,
        source: 'google_ads_realtime',
        data: realtimeData,
      });
    }

    /* ===============================
       🔥 REALTIME META
    ================================ */
    if (isMetaRealtime && !hasTodayInDb) {
      const accessToken = process.env.META_ADS_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error('META_ADS_ACCESS_TOKEN não configurado');
      }

      const realtimeData = await getMetaAdsOverviewRealtime({
        adAccountId: 'act_1471558083175379',
        accessToken,
        date: today,
      });

      return NextResponse.json({
        success: true,
        source: 'meta_ads_realtime',
        data: realtimeData,
      });
    }

    /* ===============================
       🟦 BANCO (HISTÓRICO)
    ================================ */

    // FUNIL
    let funnelTotals = {
      impressions: 0,
      clicks: 0,
      leads: 0,
      sales: 0,
    };

    if (platform === 'google') {
      const { data: funnelRows, error: funnelError } =
        await supabaseAdmin
          .from('vw_funnel_dashboard')
          .select('*')
          .eq('customer_id', Number(customerId))
          .gte('date', startDate)
          .lte('date', endDate);

      if (funnelError) throw funnelError;

      const safeFunnelRows = funnelRows ?? [];

      funnelTotals = safeFunnelRows.reduce(
        (acc: any, row: any) => ({
          impressions: acc.impressions + row.impressions,
          clicks: acc.clicks + row.clicks,
          leads: acc.leads + row.leads,
          sales: acc.sales + row.sales,
        }),
        funnelTotals
      );
    }

    if (platform === 'meta') {
      const { data: rows, error } = await supabaseAdmin
        .from('ads_campaign_metrics')
        .select('impressions, clicks, conversions')
        .eq('platform', 'meta')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      const safeRows = rows ?? [];

      funnelTotals = safeRows.reduce(
        (acc: any, row: any) => ({
          impressions: acc.impressions + row.impressions,
          clicks: acc.clicks + row.clicks,
          leads: acc.leads + row.conversions,
          sales: 0,
        }),
        funnelTotals
      );
    }

    // KPIs
    let kpiQuery = supabaseAdmin
      .from('ads_campaign_metrics')
      .select('cost, clicks, impressions, conversions')
      .eq('platform', platform)
      .gte('date', startDate)
      .lte('date', endDate);

    if (platform === 'google') {
      kpiQuery = kpiQuery.eq('customer_id', Number(customerId));
    }

    const { data: kpiRows, error: kpiError } = await kpiQuery;
    if (kpiError) throw kpiError;

    const safeKpiRows = kpiRows ?? [];

    const kpisAgg = safeKpiRows.reduce(
      (acc: any, row: any) => ({
        cost: acc.cost + row.cost,
        clicks: acc.clicks + row.clicks,
        impressions: acc.impressions + row.impressions,
        conversions: acc.conversions + row.conversions,
      }),
      { cost: 0, clicks: 0, impressions: 0, conversions: 0 }
    );

    return NextResponse.json({
      success: true,
      source: 'database',
      data: {
        funnel: funnelTotals,
        kpis: {
          investimento: kpisAgg.cost,
          cpc: kpisAgg.clicks > 0 ? kpisAgg.cost / kpisAgg.clicks : 0,
          ctr:
            kpisAgg.impressions > 0
              ? kpisAgg.clicks / kpisAgg.impressions
              : 0,
          cpa:
            kpisAgg.conversions > 0
              ? kpisAgg.cost / kpisAgg.conversions
              : 0,
        },
      },
    });
  } catch (err: any) {
    console.error('DASHBOARD OVERVIEW ERROR', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
