import { googleAdsApi } from './googleAds.client';

type RealtimeParams = {
  googleCustomerId: string; // ID do Google Ads (string)
  loginCustomerId: string;  // MCC
  refreshToken: string;
  startDate: string;
  endDate: string;
};

export async function getGoogleAdsOverviewRealtime({
  googleCustomerId,
  loginCustomerId,
  refreshToken,
  startDate,
  endDate,
}: RealtimeParams) {
  const customer = googleAdsApi.Customer({
    customer_id: googleCustomerId.replace(/-/g, ''),
    login_customer_id: loginCustomerId.replace(/-/g, ''),
    refresh_token: refreshToken,
  });

  const query = `
    SELECT
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM customer
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
  `;

  const results = await customer.query(query);

  const totals = results.reduce(
    (acc: any, row: any) => ({
      impressions: acc.impressions + row.metrics.impressions,
      clicks: acc.clicks + row.metrics.clicks,
      leads: acc.leads + row.metrics.conversions,
      cost: acc.cost + row.metrics.cost_micros,
    }),
    { impressions: 0, clicks: 0, leads: 0, cost: 0 }
  );

  return {
    kpis: {
      investimento: totals.cost / 1_000_000,
      cpc:
        totals.clicks > 0
          ? totals.cost / totals.clicks / 1_000_000
          : 0,
      ctr:
        totals.impressions > 0
          ? (totals.clicks / totals.impressions) * 100
          : 0,
      cpa:
        totals.leads > 0
          ? totals.cost / totals.leads / 1_000_000
          : 0,
    },
    funnel: {
      impressions: totals.impressions,
      clicks: totals.clicks,
      leads: totals.leads,
      sales: 0, // vendas offline
    },
  };
}