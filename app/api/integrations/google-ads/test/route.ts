import { NextResponse } from 'next/server';
import { testGoogleAdsApi } from '@/services/ads/google/googleAds.service';

export async function GET() {
  try {
    // 🔴 TEMPORÁRIO (depois vem do banco)
    const customerId = '7207219221';
    const refreshToken = '1//0hkI1m2yyze4TCgYIARAAGBESNwF-L9IrkWOcEKQuMGOl3tTupWZT9HYjsbqbIxKHGctPvWwZ6sNpRQIsT18qO7tIDKpsQ2iXDWE';

    const data = await testGoogleAdsApi(customerId, refreshToken);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}