import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function saveCampaignMetrics(
  metrics: any[],
  date: string
) {
  if (!metrics || metrics.length === 0) {
    console.warn('[GoogleAds] Nenhuma métrica para salvar');
    return;
  }

  const sanitized = metrics.map(m => ({
    ...m,

    // 📅 data controlada pelo sync
    date,

    // 🔥 NORMALIZAÇÃO (campo CORRETO da tabela)
    cost: m.costMicros
      ? Number(m.costMicros) / 1_000_000
      : Number(m.cost ?? 0),

    impressions: Number(m.impressions ?? 0),
    clicks: Number(m.clicks ?? 0),
    conversions: Number(m.conversions ?? 0),
  }));

  const { error } = await supabaseAdmin
    .from('ads_campaign_metrics')
    .upsert(sanitized, {
      onConflict: 'platform,campaign_id,date',
    });

  if (error) {
    console.error('[GoogleAds] Erro ao salvar métricas', error);
    throw error;
  }
}
