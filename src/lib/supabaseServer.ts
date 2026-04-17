import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  // IMPORTANTE: no seu Next, cookies() é async
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Em Server Components a gente não precisa setar cookie.
          // (Refresh automático pode ser tratado depois via middleware/route handler)
        },
      },
    }
  );
}
