import { NextResponse } from 'next/server';
import { listChildAccounts } from '@/services/ads/google/googleAds.service';

export async function GET() {
  try {
    const mccCustomerId = '7207219221'; // seu MCC
    const refreshToken = '1//0hkI1m2yyze4TCgYIARAAGBESNwF-L9IrkWOcEKQuMGOl3tTupWZT9HYjsbqbIxKHGctPvWwZ6sNpRQIsT18qO7tIDKpsQ2iXDWE'; // depois vem do banco

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