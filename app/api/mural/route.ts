import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type MuralType = "AVISO" | "NOVIDADE" | "LEMBRETE";
type Priority = "BAIXA" | "MEDIA" | "ALTA";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type") as MuralType | null;
    const includeDone = searchParams.get("includeDone") === "true";
    const includeExpired = searchParams.get("includeExpired") === "true";

    const nowIso = new Date().toISOString();

    let query = supabaseAdmin
      .from("mural_posts")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (type) query = query.eq("type", type);
    if (!includeDone) query = query.eq("done", false);

    // ✅ Expiração automática: se expirou, não aparece
    if (!includeExpired) {
      query = query.or(`expires_at.is.null,expires_at.gt.${nowIso}`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // ✅ Só DIRETORIA cria
    const role = req.headers.get("x-user-role");
    if (role !== "DIRETORIA") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const type = body?.type as MuralType | undefined;
    const title = body?.title as string | undefined;
    const description = (body?.description ?? null) as string | null;
    const priority = (body?.priority ?? "BAIXA") as Priority;
    const pinned = Boolean(body?.pinned ?? false);
    const expires_at = (body?.expires_at ?? null) as string | null;

    // created_by: tenta do body, senão header
    const created_by = (body?.created_by ?? req.headers.get("x-user-id")) as string | null;

    if (!type || !title) {
      return NextResponse.json(
        { success: false, error: "type e title são obrigatórios" },
        { status: 400 }
      );
    }

    if (!created_by) {
      return NextResponse.json(
        { success: false, error: "Missing created_by / x-user-id" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("mural_posts")
      .insert({
        type,
        title,
        description,
        priority,
        pinned,
        expires_at,
        created_by,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Erro interno" },
      { status: 500 }
    );
  }
}