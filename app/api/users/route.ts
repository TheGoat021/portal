import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { email, password, role } = await req.json();

  const { data, error } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabaseAdmin.from("profiles").insert({
    id: data.user.id,
    email,
    role,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { userId } = await req.json();

  await supabaseAdmin.auth.admin.deleteUser(userId);
  await supabaseAdmin.from("profiles").delete().eq("id", userId);

  return NextResponse.json({ ok: true });
}
