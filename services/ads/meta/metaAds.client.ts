import axios from 'axios';

const META_API_VERSION = 'v19.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaAdsClientParams {
  adAccountId: string; // act_XXXXXXXX
  accessToken: string;
  date: string; // YYYY-MM-DD
}

export interface MetaCampaignInsight {
  campaign_id: string;
  campaign_name: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number; // leads
}

export async function fetchMetaCampaignInsightsDaily({
  adAccountId,
  accessToken,
  date,
}: MetaAdsClientParams): Promise<MetaCampaignInsight[]> {
  const url = `${META_BASE_URL}/${adAccountId}/insights`;

  const response = await axios.get(url, {
    params: {
      level: 'campaign',
      time_range: {
        since: date,
        until: date,
      },
      fields: [
        'campaign_id',
        'campaign_name',
        'impressions',
        'clicks',
        'spend',
        'actions',
      ].join(','),
      limit: 500,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = response.data?.data ?? [];

  return data.map((row: any) => {
    const actions = row.actions ?? [];

    const leadAction = actions.find(
      (a: any) => a.action_type === 'lead'
    );

    return {
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      spend: Number(row.spend ?? 0),
      conversions: Number(leadAction?.value ?? 0),
    };
  });
}