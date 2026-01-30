import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';

export async function requireDashboardAccess() {
  const cookieStore = cookies();

  const supabase = supabaseAdmin.auth.admin;

  const accessToken = cookieStore.get('sb-access-token')?.value;

  if (!accessToken) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: { user }, error } = await supabase.getUser(accessToken);

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('customer_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.customer_id) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return {
    user,
    customerId: profile.customer_id,
    role: profile.role,
  };
}
