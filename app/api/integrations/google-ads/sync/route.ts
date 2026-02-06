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
    console.log('[GOOGLE ADS SYNC] Execução iniciada');

    /* ===============================
       🔐 SEGURANÇA CRON (OBRIGATÓRIO)
    ================================ */
    const { searchParams } = new URL(req.url);

    const secret =
      req.headers.get('x-cron-secret') ||
      searchParams.get('secret');

    if (!secret) {
      console.error('[GOOGLE ADS SYNC] Secret ausente');
      return NextResponse.json(
        { success: false, error: 'Secret missing' },
        { status: 401 }
      );
    }

    if (secret !== process.env.CRON_SECRET) {
      console.error('[GOOGLE ADS SYNC] Secret inválido');
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
      console.error('[GOOGLE ADS SYNC] Variáveis de ambiente ausentes');
      return NextResponse.json(
        {
          success: false,
          error: 'Variáveis Google Ads não configuradas'
        },
        { status: 500 }
      );
    }

    /* ===============================
       📅 DATA (query ou ontem)
    ================================ */
    const dateParam = searchParams.get('date');
    const date = dateParam ?? getYesterday();

    console.log('[GOOGLE ADS SYNC] Data processada:', date);

    /* ===============================
       🚀 BUSCA + SALVA
    ================================ */
    const metrics = await getCampaignMetricsDaily(
      customerId,
      loginCustomerId,
      refreshToken,
      date
    );

    console.log(
      '[GOOGLE ADS SYNC] Campanhas encontradas:',
      metrics.length
    );

    await saveCampaignMetrics(metrics, date);

    console.log('[GOOGLE ADS SYNC] Salvamento concluído');

    return NextResponse.json({
      success: true,
      date,
      fetched: metrics.length
    });
  } catch (error: any) {
    console.error('[GOOGLE ADS SYNC ERROR]', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
