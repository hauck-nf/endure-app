"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mode, setMode] = useState<"login" | "reset">("login");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const { data, error } = await supabaseBrowser.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      setMsg(`LOGIN ERROR: ${error.message}`);
      return;
    }

    const { data: sess } = await supabaseBrowser.auth.getSession();
    if (!sess.session) {
      setLoading(false);
      setMsg("LOGIN OK, mas não consegui obter session. Tente novamente.");
      return;
    }

    const userId = data.user?.id ?? sess.session.user.id;

    const { data: profile, error: pErr } = await supabaseBrowser
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .single();

    setLoading(false);

    if (pErr) {
      setMsg(`LOGIN OK, mas erro ao ler profiles.role: ${pErr.message}`);
      return;
    }

    const role = profile?.role ?? "unknown";
    setMsg(`LOGIN OK: role=${role}`);

    if (nextUrl && nextUrl.startsWith("/")) {
      router.push(nextUrl);
      router.refresh();
      return;
    }

    if (role === "admin") router.push("/admin/dashboard");
    else if (role === "coach") router.push("/coach/dashboard");
    else if (role === "athlete") router.push("/athlete");
    else router.push("/login");

    router.refresh();
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const redirectTo = `${window.location.origin}/update-password`;
    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim(), { redirectTo });

    setLoading(false);

    if (error) {
      setMsg(`RESET ERROR: ${error.message}`);
      return;
    }

    setMsg("RESET OK: Te enviei um email com o link para redefinir a senha.");
  }

  return (
    <div style={{ padding: 24, maxWidth: 460 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Login</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => { setMode("login"); setMsg(""); }}
          style={{ padding: "8px 10px", borderRadius: 10, fontWeight: 700, opacity: mode === "login" ? 1 : 0.6 }}
          type="button"
        >
          Entrar
        </button>
        <button
          onClick={() => { setMode("reset"); setMsg(""); }}
          style={{ padding: "8px 10px", borderRadius: 10, fontWeight: 700, opacity: mode === "reset" ? 1 : 0.6 }}
          type="button"
        >
          Esqueci minha senha
        </button>
      </div>

      <form onSubmit={mode === "login" ? onLogin : onReset} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Email</div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
        </label>

        {mode === "login" ? (
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Senha</div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
          </label>
        ) : null}

        <button disabled={loading} style={{ padding: 10, borderRadius: 10, fontWeight: 800 }} type="submit">
          {loading ? "Processando..." : mode === "login" ? "Entrar" : "Enviar link de redefinição"}
        </button>

        {msg ? (
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#fff", background: "#111", padding: 12, borderRadius: 10, border: "1px solid #222" }}>
            {msg}
          </pre>
        ) : null}
      </form>
    </div>
  );
}
