import { NextResponse } from 'next/server';

import { getCampaignMetricsDaily } from '@/services/ads/google/googleAds.service';
import { saveCampaignMetrics } from '@/services/ads/google/googleAds.repository';
import { saveMetaCampaignMetrics } from '@/services/ads/meta/metaAds.repository';

const GOOGLE_LOGIN_CUSTOMER_ID = '720-721-9221';
const GOOGLE_CUSTOMER_ID = '173-025-4242'; // pode virar env depois
const META_ACCOUNT_ID = 'act_1471558083175379';
const META_NUMERIC_ACCOUNT_ID = 1471558083175379;

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    // 🔐 (opcional) valida secret do cron
    const secret = req.headers.get('x-cron-secret');
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const googleRefreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
    const metaAccessToken = process.env.META_ADS_ACCESS_TOKEN;

    if (!googleRefreshToken || !metaAccessToken) {
      return NextResponse.json(
        { success: false, error: 'Tokens não configurados' },
        { status: 500 }
      );
    }

    const processedDays: string[] = [];

    // 🔁 Reprocessa D-1, D-2, D-3
    for (let i = 1; i <= 3; i++) {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - i);
      const date = formatDate(dateObj);

      /* ===============================
         🔵 GOOGLE ADS
      ================================ */
      const googleMetrics = await getCampaignMetricsDaily(
        GOOGLE_CUSTOMER_ID,
        GOOGLE_LOGIN_CUSTOMER_ID,
        googleRefreshToken,
        date
      );

      await saveCampaignMetrics(googleMetrics, date);

      /* ===============================
         🔴 META ADS
      ================================ */
      const metaUrl =
        `https://graph.facebook.com/v19.0/${META_ACCOUNT_ID}/insights` +
        `?level=campaign` +
        `&time_range[since]=${date}` +
        `&time_range[until]=${date}` +
        `&fields=campaign_id,campaign_name,impressions,clicks,spend,actions` +
        `&access_token=${metaAccessToken}`;

      const response = await fetch(metaUrl);
      const json = await response.json();

      if (json.data?.length) {
        const metrics = json.data.map((row: any) => {
          const leads = (row.actions ?? []).reduce(
            (total: number, action: any) => {
              const valid = [
                'lead',
                'onsite_conversion.messaging_conversation_started_7d',
                'messaging_conversation_started_7d',
              ];
              return valid.includes(action.action_type)
                ? total + Number(action.value || 0)
                : total;
            },
            0
          );

          return {
            platform: 'meta',
            mcc_customer_id: META_NUMERIC_ACCOUNT_ID,
            customer_id: META_NUMERIC_ACCOUNT_ID,
            campaign_id: row.campaign_id,
            campaign_name: row.campaign_name,
            campaign_status: 1,
            date,
            impressions: Number(row.impressions || 0),
            clicks: Number(row.clicks || 0),
            conversions: leads,
            cost: Number(row.spend || 0),
          };
        });

        await saveMetaCampaignMetrics(metrics);
      }

      processedDays.push(date);
    }

    return NextResponse.json({
      success: true,
      processedDays,
    });
  } catch (error: any) {
    console.error('ADS DAILY CLOSE ERROR', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
