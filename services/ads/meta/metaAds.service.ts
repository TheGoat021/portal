import { fetchMetaCampaignInsightsDaily } from './metaAds.client';

interface MetaDailyServiceParams {
  adAccountId: string;      // act_XXXXXXXX
  accessToken: string;
  date: string;             // YYYY-MM-DD
}

export interface MetaCampaignMetric {
platform: 'meta';
campaign_id: string;
campaign_name: string;
date: string;
impressions: number;
clicks: number;
conversions: number; // ✅ padrão do sistema
cost: number;
}

export async function getMetaCampaignMetricsDaily({
  adAccountId,
  accessToken,
  date,
}: MetaDailyServiceParams): Promise<MetaCampaignMetric[]> {
  const insights = await fetchMetaCampaignInsightsDaily({
    adAccountId,
    accessToken,
    date,
  });

const numericAccountId = Number(adAccountId.replace('act_', ''));


return insights.map((row) => ({
  platform: 'meta',

  mcc_customer_id: numericAccountId,
  customer_id: numericAccountId,

  campaign_id: row.campaign_id,
  campaign_name: row.campaign_name,

  campaign_status: 1, // ✅ INTEGER, não string

  date,
  impressions: row.impressions,
  clicks: row.clicks,
  conversions: row.conversions,
  cost: row.spend,
}));
}