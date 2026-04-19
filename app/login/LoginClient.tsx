"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type Mode = "login" | "reset";
type MsgTone = "default" | "error" | "success";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("login");
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<MsgTone>("default");
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setMsgTone("default");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      setLoading(false);
      setMsgTone("error");
      setMsg(data?.error ?? `Não foi possível entrar. HTTP ${res.status}.`);
      return;
    }

    const sessRes = await fetch("/api/auth/session");
    const sessJson: any = await sessRes.json().catch(() => ({}));
    if (!sessRes.ok || !sessJson?.ok) {
      setLoading(false);
      setMsgTone("error");
      setMsg(
        `Login realizado, mas não consegui recuperar a sessão do servidor: ${
          sessJson?.error ?? `HTTP ${sessRes.status}`
        }`
      );
      return;
    }

    await supabaseBrowser.auth.setSession({
      access_token: sessJson.access_token,
      refresh_token: sessJson.refresh_token,
    });

    const safeNext =
  nextUrl &&
  nextUrl.startsWith("/") &&
  !nextUrl.startsWith("/athlete/pending") &&
  !nextUrl.startsWith("/athlete/dashboard");

if (
  safeNext &&
  (
    safeNext.startsWith("/athlete/request/") ||
    safeNext.startsWith("/athlete/questionnaire") ||
    safeNext.startsWith("/admin/")
  )
) {
  setLoading(false);
  router.push(safeNext);
  router.refresh();
  return;
}

    const { data: sess } = await supabaseBrowser.auth.getSession();
    const userId = sess.session?.user?.id;

    if (!userId) {
      setLoading(false);
      router.push("/athlete/dashboard");
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

    if (role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/athlete/dashboard");
    }

    router.refresh();
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setMsgTone("default");
    setLoading(true);

    const redirectTo = `${window.location.origin}/update-password`;
    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo }
    );

    setLoading(false);

    if (error) {
      setMsgTone("error");
      setMsg(error.message);
      return;
    }

    setMsgTone("success");
    setMsg("Enviei um email com o link para redefinir sua senha.");
  }

  const messageStyle =
    msgTone === "error"
      ? {
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#b91c1c",
        }
      : msgTone === "success"
      ? {
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          color: "#166534",
        }
      : {
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          color: "#374151",
        };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #f8fafc 100%)",
        padding: 20,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1120,
          display: "grid",
          gridTemplateColumns: "1.05fr .95fr",
          gap: 24,
          alignItems: "stretch",
        }}
      >
        <section
          style={{
            padding: 12,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid #dbeafe",
              background: "#eff6ff",
              color: "#1d4ed8",
              borderRadius: 999,
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 700,
              width: "fit-content",
            }}
          >
            Plataforma segura e organizada
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
            <img
              src="/endure_logo.png"
              alt="ENDURE"
              style={{ width: 42, height: 42, objectFit: "contain" }}
            />
            <div>
              <div style={{ fontWeight: 900, letterSpacing: 0.8, fontSize: 22 }}>
                ENDURE
              </div>
              <div style={{ color: "#6b7280", fontSize: 14 }}>
                Avaliação socioemocional em atletas
              </div>
            </div>
          </div>

          <h1
            style={{
              margin: "22px 0 12px",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              lineHeight: 1.05,
              letterSpacing: -1.2,
            }}
          >
            Acompanhe o seu desenvolvimento socioemocional.
          </h1>

          <p
            style={{
              maxWidth: 620,
              color: "#4b5563",
              fontSize: 18,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Realize autoavaliações e receba seus relatórios com métricas detalhadas. Acompanhe o seu histórico socioemocional
            em um ambiente simples, confiável e feito para a rotina
            do atleta e da equipe técnica.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginTop: 28,
            }}
          >
            {[
              {
                title: "Relatórios",
                text: "Resultados organizados para leitura mais rápida.",
              },
              {
                title: "Histórico",
                text: "Acesse avaliações anteriores com facilidade.",
              },
              {
                title: "Fluxo claro",
                text: "Saiba exatamente o que está pendente e o que já foi concluído.",
              },
              
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "rgba(255,255,255,.72)",
                  border: "1px solid #e5e7eb",
                  borderRadius: 18,
                  padding: 16,
                  boxShadow: "0 14px 40px rgba(17,24,39,.05)",
                }}
              >
                <div style={{ fontWeight: 800 }}>{item.title}</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#6b7280",
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            width: "100%",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            boxShadow: "0 20px 50px rgba(17,24,39,.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 20,
              borderBottom: "1px solid #e5e7eb",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
              Acesso à plataforma
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>
              {mode === "login" ? "Entrar" : "Redefinir senha"}
            </div>
            <div style={{ color: "#6b7280", marginTop: 6, lineHeight: 1.6 }}>
              {mode === "login"
                ? "Use seu email e senha para acessar sua área."
                : "Informe seu email para receber o link de redefinição."}
            </div>
          </div>

          <div style={{ padding: 20, display: "grid", gap: 16 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                background: "#f3f4f6",
                padding: 6,
                borderRadius: 16,
              }}
            >
              <button
                onClick={() => {
                  setMode("login");
                  setMsg("");
                }}
                type="button"
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid transparent",
                  background: mode === "login" ? "#111827" : "transparent",
                  color: mode === "login" ? "#fff" : "#111827",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Entrar
              </button>

              <button
                onClick={() => {
                  setMode("reset");
                  setMsg("");
                }}
                type="button"
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid transparent",
                  background: mode === "reset" ? "#111827" : "transparent",
                  color: mode === "reset" ? "#fff" : "#111827",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Redefinir senha
              </button>
            </div>

            <form
              onSubmit={mode === "login" ? onLogin : onReset}
              style={{ display: "grid", gap: 12 }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 700 }}>
                  Email
                </span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  style={{
                    height: 48,
                    padding: "0 14px",
                    borderRadius: 14,
                    border: "1px solid #d1d5db",
                    outline: "none",
                    fontSize: 15,
                  }}
                />
              </label>

              {mode === "login" && (
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 700 }}>
                    Senha
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    style={{
                      height: 48,
                      padding: "0 14px",
                      borderRadius: 14,
                      border: "1px solid #d1d5db",
                      outline: "none",
                      fontSize: 15,
                    }}
                  />
                </label>
              )}

              <button
                disabled={loading}
                type="submit"
                style={{
                  height: 48,
                  borderRadius: 14,
                  border: "1px solid #111827",
                  background: loading ? "#374151" : "#111827",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading
                  ? "Processando..."
                  : mode === "login"
                  ? "Entrar"
                  : "Enviar link"}
              </button>

              {msg ? (
                <div
                  style={{
                    ...messageStyle,
                    padding: 14,
                    borderRadius: 14,
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  {msg}
                </div>
              ) : null}
            </form>

            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                padding: 14,
                color: "#6b7280",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Se você abriu um link direto de avaliação, faça login para voltar
              automaticamente ao fluxo correto.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}