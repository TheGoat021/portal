import { NextResponse } from 'next/server';
import { GoogleAdsApi } from 'google-ads-api';

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
});

export async function GET() {
  try {
    const customer = client.Customer({
      customer_id: '1730254242', // 👈 ID fixo só para teste
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    });

    // 🔥 QUERY MAIS SIMPLES POSSÍVEL (NÃO QUEBRA)
    const query = `
      SELECT
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM customer
      WHERE segments.date DURING TODAY
    `;

    const rows = await customer.query(query);

    return NextResponse.json({
      success: true,
      rows,
    });
  } catch (err: any) {
    console.error('GOOGLE REALTIME TEST ERROR', err);
    return NextResponse.json(
      {
        success: false,
        message: err.message,
        details: err.response?.data ?? null,
      },
      { status: 500 }
    );
  }
}