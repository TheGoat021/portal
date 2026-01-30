import { GoogleAdsApi } from 'google-ads-api';

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
});

/**
 * 🔥 Google Ads Campaigns Realtime (POR CAMPANHA)
 * - SEM loginCustomerId
 * - SEM date
 * - Usa DURING TODAY
 * ⚠️ Pode retornar array vazio se não houver entrega hoje
 */
export async function getGoogleAdsCampaignsRealtime({
  customerId,
  refreshToken,
}: {
  customerId: string;
  refreshToken: string;
}) {
  const customer = client.Customer({
    customer_id: customerId,
    refresh_token: refreshToken,
  });

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      segments.date,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date DURING TODAY
  `;

  const rows = await customer.query(query);

  return rows.map((row: any) => ({
    campaign_id: row.campaign.id,
    campaign_name: row.campaign.name,
    platform: 'google',
    clicks: Number(row.metrics?.clicks ?? 0),
    cost: Number(row.metrics?.cost_micros ?? 0) / 1_000_000,
    // 🔒 conversões sempre inteiras
    conversions: Math.floor(Number(row.metrics?.conversions ?? 0)),
  }));
}