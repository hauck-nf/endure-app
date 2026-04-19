"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

export default function AthleteHomePage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabaseBrowser.auth.getSession();

      if (!sess.session) {
        router.replace("/login?next=/athlete/dashboard");
        return;
      }

      router.replace("/athlete/dashboard");
    })();
  }, [router]);

  return (
    <div style={{ padding: 16, color: "#6b7280" }}>
      Carregando dashboard...
    </div>
  );
}