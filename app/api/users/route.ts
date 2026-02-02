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

  if (!email || !password || !role) {
    return NextResponse.json(
      { error: "Dados obrigatórios ausentes" },
      { status: 400 }
    );
  }

  const { data, error } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: data.user.id,
      email,
      role,
    });

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  try {
    const { userId, role, password } = await req.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId e role são obrigatórios" },
        { status: 400 }
      );
    }

    // 1️⃣ Atualiza o perfil/departamento
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    // 2️⃣ Atualiza senha (somente se enviada)
    if (password && password.length >= 6) {
      const { error: passwordError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
        });

      if (passwordError) {
        return NextResponse.json(
          { error: passwordError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno ao atualizar usuário" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json(
      { error: "userId é obrigatório" },
      { status: 400 }
    );
  }

  await supabaseAdmin.auth.admin.deleteUser(userId);
  await supabaseAdmin.from("profiles").delete().eq("id", userId);

  return NextResponse.json({ ok: true });
}
