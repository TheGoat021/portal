import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function saveMetaCampaignMetrics(metrics: any[]) {
  if (!metrics || metrics.length === 0) {
    console.warn('[MetaAds] Nenhuma métrica para salvar');
    return;
  }

  // 🔒 Blindagem total (date + customer_id)
  const sanitized = metrics
    .filter(m => m.date)
    .map(m => {
      const date =
        typeof m.date === 'string'
          ? m.date
          : new Date(m.date).toISOString().split('T')[0];

      const customerId =
        m.customer_id ??
        m.mcc_customer_id ??
        null;

      return {
        ...m,
        date,
        customer_id: customerId
      };
    })
    // ⛔ remove qualquer coisa que ainda assim esteja inválida
    .filter(m => m.customer_id !== null);

  if (sanitized.length === 0) {
    console.warn('[MetaAds] Métricas inválidas após sanitização');
    return;
  }

  const { error } = await supabaseAdmin
    .from('ads_campaign_metrics')
    .upsert(sanitized, {
      onConflict: 'platform,campaign_id,date'
    });

  if (error) {
    console.error('[MetaAds] Erro ao salvar métricas', error);
    throw error;
  }
}
