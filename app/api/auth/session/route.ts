import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  let response = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Sem sessão" }, { status: 401 });
  }

  const s = data.session;
  return NextResponse.json({
    ok: true,
    access_token: s.access_token,
    refresh_token: s.refresh_token,
  });
}
