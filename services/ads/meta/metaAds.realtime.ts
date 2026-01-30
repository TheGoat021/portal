export async function getMetaAdsOverviewRealtime({
  adAccountId,
  accessToken,
  date,
}: {
  adAccountId: string;
  accessToken: string;
  date: string;
}) {
  const url =
    `https://graph.facebook.com/v19.0/${adAccountId}/insights` +
    `?level=campaign` +
    `&time_range[since]=${date}` +
    `&time_range[until]=${date}` +
    `&fields=impressions,clicks,spend,actions` +
    `&access_token=${accessToken}`;

  const res = await fetch(url);
  const json = await res.json();

  const data = json.data ?? [];

  let impressions = 0;
  let clicks = 0;
  let cost = 0;
  let conversions = 0;

  data.forEach((row: any) => {
    impressions += Number(row.impressions || 0);
    clicks += Number(row.clicks || 0);
    cost += Number(row.spend || 0);

    row.actions?.forEach((a: any) => {
      if (
        a.action_type === 'lead' ||
        a.action_type ===
          'onsite_conversion.messaging_conversation_started_7d'
      ) {
        conversions += Number(a.value || 0);
      }
    });
  });

  return {
    funnel: {
      impressions,
      clicks,
      leads: conversions,
      sales: 0,
    },
    kpis: {
      investimento: cost,
      cpc: clicks > 0 ? cost / clicks : 0,
      ctr: impressions > 0 ? clicks / impressions : 0,
      cpa: conversions > 0 ? cost / conversions : 0,
    },
  };
}