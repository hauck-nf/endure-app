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

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      setLoading(false);
      setMsg(`LOGIN ERROR: ${data?.error ?? `HTTP ${res.status}`}`);
      return;
    }

    const sessRes = await fetch("/api/auth/session");
    const sessJson: any = await sessRes.json().catch(() => ({}));
    if (!sessRes.ok || !sessJson?.ok) {
      setLoading(false);
      setMsg(`LOGIN OK, mas não consegui obter sessão do servidor: ${sessJson?.error ?? `HTTP ${sessRes.status}`}`);
      return;
    }

    await supabaseBrowser.auth.setSession({
      access_token: sessJson.access_token,
      refresh_token: sessJson.refresh_token,
    });

    if (nextUrl && nextUrl.startsWith("/")) {
      setLoading(false);
      router.push(nextUrl);
      router.refresh();
      return;
    }

    // fallback por role
    const { data: sess } = await supabaseBrowser.auth.getSession();
    const userId = sess.session?.user?.id;

    if (!userId) {
      setLoading(false);
      router.push("/athlete/pending");
      router.refresh();
      return;
    }

    const { data: profile } = await supabaseBrowser
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const role = profile?.role ?? "unknown";

    setLoading(false);

    if (role === "admin") router.push("/admin/dashboard");
    else if (role === "coach") router.push("/coach/dashboard");
    else router.push("/athlete/pending");

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
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16, background: "#f9fafb" }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 14px 40px rgba(17,24,39,.08)", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb", display: "flex", gap: 10, alignItems: "center" }}>
          <img src="/endure_logo.png" alt="ENDURE" style={{ width: 26, height: 26, objectFit: "contain" }} />
          <div style={{ display: "grid", lineHeight: 1.1 }}>
            <div style={{ fontWeight: 800, letterSpacing: 0.4 }}>ENDURE</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Acesso à plataforma</div>
          </div>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setMode("login"); setMsg(""); }}
              type="button"
              style={{
                flex: 1,
                height: 42,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: mode === "login" ? "#111827" : "#fff",
                color: mode === "login" ? "#fff" : "#111827",
                fontWeight: 800
              }}
            >
              Entrar
            </button>
            <button
              onClick={() => { setMode("reset"); setMsg(""); }}
              type="button"
              style={{
                flex: 1,
                height: 42,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: mode === "reset" ? "#111827" : "#fff",
                color: mode === "reset" ? "#fff" : "#111827",
                fontWeight: 800
              }}
            >
              Redefinir senha
            </button>
          </div>

          <form onSubmit={mode === "login" ? onLogin : onReset} style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Email</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={{ height: 44, padding: "0 12px", borderRadius: 12, border: "1px solid #e5e7eb", outline: "none" }}
              />
            </label>

            {mode === "login" ? (
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Senha</div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ height: 44, padding: "0 12px", borderRadius: 12, border: "1px solid #e5e7eb", outline: "none" }}
                />
              </label>
            ) : null}

            <button
              disabled={loading}
              style={{
                height: 44,
                borderRadius: 12,
                border: "1px solid #111827",
                background: "#111827",
                color: "#fff",
                fontWeight: 900
              }}
              type="submit"
            >
              {loading ? "Processando..." : mode === "login" ? "Entrar" : "Enviar link"}
            </button>

            {msg ? (
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#fff", background: "#111", padding: 12, borderRadius: 12, border: "1px solid #222" }}>
                {msg}
              </pre>
            ) : null}
          </form>

          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Dica: se você abriu um link de avaliação, faça login e volte automaticamente.
          </div>
        </div>
      </div>
    </div>
  );
}
