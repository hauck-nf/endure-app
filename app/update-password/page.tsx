"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Em links de recovery, o Supabase cria sessão automaticamente no browser.
  // Vamos apenas garantir que existe sessão antes de permitir update.
  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setMsg("Este link não gerou sessão válida. Tente solicitar a redefinição novamente.");
      }
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const { error } = await supabaseBrowser.auth.updateUser({ password });

    setLoading(false);
    if (error) return setMsg(error.message);

    setMsg("Senha atualizada! Agora você pode fazer login.");
    setTimeout(() => router.push("/login"), 800);
  }

  return (
    <div style={{ padding: 24, maxWidth: 460 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Definir nova senha</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Nova senha</div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
        </label>

        <button disabled={loading} style={{ padding: 10, borderRadius: 10, fontWeight: 800 }}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>

        {msg ? <div style={{ fontSize: 13, opacity: 0.95 }}>{msg}</div> : null}
      </form>
    </div>
  );
}
