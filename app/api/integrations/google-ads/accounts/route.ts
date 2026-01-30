import { NextResponse } from 'next/server';
import { listChildAccounts } from '@/services/ads/google/googleAds.service';

export async function GET() {
  try {
    const mccCustomerId = '7207219221'; // seu MCC
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN!;
 // depois vem do banco

    const accounts = await listChildAccounts(
      mccCustomerId,
      refreshToken
    );

    return NextResponse.json({
      success: true,
      accounts,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}