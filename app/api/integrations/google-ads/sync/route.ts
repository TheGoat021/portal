import { NextResponse } from 'next/server';
import {
  getCampaignMetricsDaily
} from '@/services/ads/google/googleAds.service';
import {
  saveCampaignMetrics
} from '@/services/ads/google/googleAds.repository';

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    /* ===============================
       🔐 SEGURANÇA CRON (OBRIGATÓRIO)
    ================================ */
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    /* ===============================
       🔧 CONFIGURAÇÕES FIXAS
    ================================ */
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN as string;
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID as string;
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID as string;

    if (!refreshToken || !loginCustomerId || !customerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Variáveis Google Ads não configuradas'
        },
        { status: 500 }
      );
    }

    /* ===============================
       📅 DATA (ONTEM)
    ================================ */
    const date = getYesterday();

    /* ===============================
       🚀 BUSCA + SALVA
    ================================ */
    const metrics = await getCampaignMetricsDaily(
      customerId,
      loginCustomerId,
      refreshToken,
      date
    );

    await saveCampaignMetrics(metrics);

    return NextResponse.json({
      success: true,
      date,
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
