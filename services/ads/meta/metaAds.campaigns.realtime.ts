import axios from 'axios';

export async function getMetaAdsCampaignsRealtime({
  adAccountId,
  accessToken,
  date,
}: {
  adAccountId: string;
  accessToken: string;
  date: string;
}) {
  const fields = [
    'campaign_id',
    'campaign_name',
    'clicks',
    'spend',
    'actions',
  ].join(',');

  const res = await axios.get(
    `https://graph.facebook.com/v19.0/${adAccountId}/insights`,
    {
      params: {
        access_token: accessToken,
        fields,
        level: 'adset', // 🔥 PONTO-CHAVE
        time_range: { since: date, until: date },
        action_breakdowns: 'action_type',
      },
    }
  );

  const grouped: Record<string, any> = {};

  for (const row of res.data.data ?? []) {
    const campaignId = row.campaign_id;

    if (!grouped[campaignId]) {
      grouped[campaignId] = {
        campaign_id: campaignId,
        campaign_name: row.campaign_name,
        platform: 'meta',
        clicks: 0,
        cost: 0,
        conversions: 0,
      };
    }

    grouped[campaignId].clicks += Number(row.clicks ?? 0);
    grouped[campaignId].cost += Number(row.spend ?? 0);

    const conversions = (row.actions ?? [])
      .filter((a: any) =>
        [
          'lead',
          'onsite_conversion.lead_grouped',
          'offsite_conversion.fb_pixel_lead',
          'complete_registration',
        ].includes(a.action_type)
      )
      .reduce((sum: number, a: any) => sum + Number(a.value ?? 0), 0);

    grouped[campaignId].conversions += conversions;
  }

  return Object.values(grouped);
}