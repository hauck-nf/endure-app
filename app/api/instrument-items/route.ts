import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export async function GET(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !serviceKey) {
      return json(500, { ok: false, error: "missing SUPABASE env vars" });
    }

    const supabaseAdmin = createSupabaseAdmin(url, serviceKey);

    const accessToken = getBearerToken(req);

    if (!accessToken) {
      return json(401, { ok: false, error: "not authenticated: missing bearer token" });
    }

    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.getUser(accessToken);

    if (userErr || !userData?.user) {
      return json(401, { ok: false, error: "not authenticated" });
    }

    const { data, error } = await supabaseAdmin
      .from("instrument_items")
      .select(
        "itemcode, quest_section, type, effect, scale, definition, key, item_text_port, instruction, opt1, opt2, opt3, opt4, opt5, opt6, opt7, opt8, opt9, opt10, opt11"
      )
      .order("quest_section", { ascending: true })
      .order("scale", { ascending: true })
      .order("itemcode", { ascending: true });

    if (error) {
      return json(500, {
        ok: false,
        error: `failed to load instrument_items: ${error.message}`,
      });
    }

    return json(200, {
      ok: true,
      items: data ?? [],
      count: data?.length ?? 0,
    });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? String(e) });
  }
}