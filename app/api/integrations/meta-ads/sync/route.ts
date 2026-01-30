import { NextResponse } from 'next/server';
import { saveMetaCampaignMetrics } from '@/services/ads/meta/metaAds.repository';

const META_API_VERSION = 'v19.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Extrai LEADS (WhatsApp) das actions da Meta
 */
function extractLeads(actions: any[] = []) {
  const leadActions = [
    'lead',
    'onsite_conversion.messaging_conversation_started_7d',
    'messaging_conversation_started_7d',
  ];

  return actions.reduce((total, action) => {
    if (leadActions.includes(action.action_type)) {
      return total + Number(action.value || 0);
    }
    return total;
  }, 0);
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // 🔹 padrão: ontem (cron)
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(Date.now() - 86400000);

    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(Date.now() - 86400000);

    const dates: string[] = [];
    for (
      let d = new Date(startDate.getTime());
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      dates.push(formatDate(d));
    }

    const adAccountId = 'act_1471558083175379';
    const numericAccountId = 1471558083175379;

    const accessToken = process.env.META_ADS_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'META_ADS_ACCESS_TOKEN não configurado' },
        { status: 500 }
      );
    }

    let inserted = 0;

    for (const date of dates) {
      const url =
        `${META_BASE_URL}/${adAccountId}/insights` +
        `?level=campaign` +
        `&time_range[since]=${date}` +
        `&time_range[until]=${date}` +
        `&fields=campaign_id,campaign_name,impressions,clicks,spend,actions` +
        `&access_token=${accessToken}`;

      const response = await fetch(url);
      const json = await response.json();

      if (json.error) {
        console.error('META API ERROR', json.error);
        continue;
      }

      if (!json.data || json.data.length === 0) {
        continue;
      }

      const metrics = json.data.map((row: any) => {
        const leads = extractLeads(row.actions);

        return {
          platform: 'meta',

          // mantém compatibilidade total com Google
          mcc_customer_id: numericAccountId,
          customer_id: numericAccountId,

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
      inserted += metrics.length;
    }

    return NextResponse.json({
      success: true,
      platform: 'meta',
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      inserted,
    });
  } catch (error: any) {
    console.error('META ADS SYNC ERROR', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
