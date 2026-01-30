import { NextResponse } from 'next/server';
import {
  getCampaignMetricsDaily
} from '@/services/ads/google/googleAds.service';
import {
  saveCampaignMetrics
} from '@/services/ads/google/googleAds.repository';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const loginCustomerId = String(body.loginCustomerId);
    const customerId = String(body.customerId);

    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN as string;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_ADS_REFRESH_TOKEN não configurado' },
        { status: 500 }
      );
    }

    // 🔧 data explícita (hardcoded, como está hoje)
    const date = '2026-01-27';

    if (!loginCustomerId || !customerId) {
      return NextResponse.json(
        { success: false, error: 'loginCustomerId e customerId são obrigatórios' },
        { status: 400 }
      );
    }

    const metrics = await getCampaignMetricsDaily(
      customerId,
      loginCustomerId,
      refreshToken,
      date
    );

    await saveCampaignMetrics(metrics);

    return NextResponse.json({
      success: true,
      inserted: metrics.length
    });
  } catch (error: any) {
    console.error('[GOOGLE ADS SYNC ERROR]', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
