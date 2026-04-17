"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

export default function AthleteHomePage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Carregando…");

  useEffect(() => {
    (async () => {
      // mobile-safe
      const { data: sess } = await supabaseBrowser.auth.getSession();
      if (!sess.session) {
        router.replace("/login?next=/athlete");
        return;
      }

      // não precisa checar role aqui para evitar roundtrips
      router.replace("/athlete/pending");
    })();
  }, [router]);

  return <div style={{ padding: 16, color: "#6b7280" }}>{msg}</div>;
}
