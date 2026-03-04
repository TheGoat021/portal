import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Só DIRETORIA edita/fixa
    const role = req.headers.get("x-user-role");
    if (role !== "DIRETORIA") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // ✅ whitelist do que pode atualizar
    const payload: Record<string, any> = {};
    const allowed = ["type", "title", "description", "priority", "pinned", "done", "expires_at"];

    for (const key of allowed) {
      if (body && Object.prototype.hasOwnProperty.call(body, key)) {
        payload[key] = body[key];
      }
    }

    const { data, error } = await supabaseAdmin
      .from("mural_posts")
      .update(payload)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Só DIRETORIA remove
    const role = req.headers.get("x-user-role");
    if (role !== "DIRETORIA") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from("mural_posts")
      .delete()
      .eq("id", params.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Erro interno" },
      { status: 500 }
    );
  }
}