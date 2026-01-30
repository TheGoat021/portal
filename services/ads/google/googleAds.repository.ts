import { supabaseAdmin } from '@/lib/supabaseAdmin';

const GOOGLE_CUSTOMER_ID = process.env.GOOGLE_CUSTOMER_ID
  ? Number(process.env.GOOGLE_CUSTOMER_ID)
  : null;

export async function saveCampaignMetrics(metrics: any[]) {
  if (!metrics || metrics.length === 0) {
    console.warn('[GoogleAds] Nenhuma métrica para salvar');
    return;
  }

  if (!GOOGLE_CUSTOMER_ID) {
    throw new Error('GOOGLE_CUSTOMER_ID não configurado');
  }

  const sanitized = metrics
    .filter(m => m.date)
    .map(m => {
      const date =
        typeof m.date === 'string'
          ? m.date
          : new Date(m.date).toISOString().split('T')[0];

      return {
        ...m,
        date,
        // 🔒 BLINDAGEM FINAL
        customer_id: GOOGLE_CUSTOMER_ID
      };
    });

  const { error } = await supabaseAdmin
    .from('ads_campaign_metrics')
    .upsert(sanitized, {
      onConflict: 'platform,campaign_id,date'
    });

  if (error) {
    console.error('[GoogleAds] Erro ao salvar métricas', error);
    throw error;
  }
}
