import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Atualiza cookies na request (para uso durante o ciclo atual)
            request.cookies.set(name, value);
            // Garante que a resposta também carregue os cookies atualizados
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Importante: isso atualiza/valida a sessão quando necessário
  await supabase.auth.getUser();

  return response;
}

// Não aplicar middleware em assets estáticos
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
