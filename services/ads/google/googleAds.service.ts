import { googleAdsApi } from './googleAds.client';

/* =====================================================
   🔧 Utils
===================================================== */
function normalizeCustomerId(id: string) {
  return id.replace(/-/g, '');
}

/* =====================================================
   🧪 Teste simples da API (conta direta ou MCC)
===================================================== */
export async function testGoogleAdsApi(
  customerId: string,
  refreshToken: string
) {
  const customer = googleAdsApi.Customer({
    customer_id: normalizeCustomerId(customerId),
    refresh_token: refreshToken,
  });

  const query = `
    SELECT
      customer.id,
      customer.descriptive_name
    FROM customer
    LIMIT 1
  `;

  const [result] = await customer.query(query);
  return result;
}

/* =====================================================
   🏢 Listar contas filhas (MCC)
===================================================== */
export async function listChildAccounts(
  mccCustomerId: string,
  refreshToken: string
) {
  const mcc = googleAdsApi.Customer({
    customer_id: normalizeCustomerId(mccCustomerId),
    refresh_token: refreshToken,
  });

  const query = `
    SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.level,
      customer_client.manager,
      customer_client.status
    FROM customer_client
    WHERE customer_client.level = 1
  `;

  const results = await mcc.query(query);

  return results.map((row: any) => ({
    id: row.customer_client.id,
    name: row.customer_client.descriptive_name,
    isManager: row.customer_client.manager,
    status: row.customer_client.status,
  }));
}

/* =====================================================
   ⚡ Métricas gerais (Realtime / últimos 30 dias)
   👉 Aqui USAMOS MCC como customer
===================================================== */
export async function getCampaignMetrics(
  customerId: string,          // aqui pode ser MCC
  loginCustomerId: string,     // mantido por compatibilidade
  refreshToken: string
) {
  const customer = googleAdsApi.Customer({
    customer_id: normalizeCustomerId(customerId),
    refresh_token: refreshToken,
  });

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
  `;

  const results = await customer.query(query);

  return results.map((row: any) => ({
    campaignId: row.campaign.id,
    campaignName: row.campaign.name,
    status: row.campaign.status,
    impressions: row.metrics.impressions,
    clicks: row.metrics.clicks,
    cost: row.metrics.cost_micros / 1_000_000,
    conversions: row.metrics.conversions,
  }));
}

/* =====================================================
   📅 Métricas DIÁRIAS (cron / sync / histórico)
   👉 Aqui É OBRIGATÓRIO usar login_customer_id
===================================================== */
export async function getCampaignMetricsDaily(
  customerId: string,          // conta anunciante
  loginCustomerId: string,     // MCC
  refreshToken: string,
  date: string
) {
  const customer = googleAdsApi.Customer({
    customer_id: normalizeCustomerId(customerId),
    login_customer_id: normalizeCustomerId(loginCustomerId), // 🔥 FIX REAL
    refresh_token: refreshToken,
  });

  const query = `
    SELECT
      segments.date,
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date = '${date}'
  `;

  const results = await customer.query(query);

  return results.map((row: any) => ({
    platform: 'google',
    mcc_customer_id: Number(normalizeCustomerId(loginCustomerId)),
    customer_id: Number(normalizeCustomerId(customerId)),
    campaign_id: row.campaign.id,
    campaign_name: row.campaign.name,
    campaign_status: row.campaign.status,
    date: row.segments.date,
    impressions: Number(row.metrics.impressions ?? 0),
    clicks: Number(row.metrics.clicks ?? 0),
    cost: Number(row.metrics.cost_micros ?? 0) / 1_000_000,
    conversions: Number(row.metrics.conversions ?? 0),
  }));
}
