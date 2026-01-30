import { NextResponse } from 'next/server';
import { getCampaignMetrics } from '@/services/ads/google/googleAds.service';

export async function GET() {
  try {
    const loginCustomerId = '720-721-9221'; // MCC
    const customerId = '1730254242';        // conta filha
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN!;


    const campaigns = await getCampaignMetrics(
      customerId,
      loginCustomerId,
      refreshToken
    );

    return NextResponse.json({
      success: true,
      campaigns,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}