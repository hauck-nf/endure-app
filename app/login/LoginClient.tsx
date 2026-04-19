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

    const safeNext: string | null =
      nextUrl &&
      nextUrl.startsWith("/") &&
      !nextUrl.startsWith("/athlete/pending") &&
      !nextUrl.startsWith("/athlete/dashboard")
    ? nextUrl
    : null;

    if (
      safeNext &&
      (safeNext.startsWith("/athlete/request/") ||
      safeNext.startsWith("/athlete/questionnaire") ||
      safeNext.startsWith("/admin/"))
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
          background: "#fff1f2",
          border: "1px solid #fecdd3",
          color: "#be123c",
        }
      : msgTone === "success"
      ? {
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          color: "#166534",
        }
      : {
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          color: "#374151",
        };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,.10), transparent 28%), radial-gradient(circle at bottom right, rgba(15,23,42,.08), transparent 28%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 48%, #f8fafc 100%)",
        padding: "24px 20px",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          display: "grid",
          gridTemplateColumns: "1.08fr .92fr",
          gap: 28,
          alignItems: "stretch",
        }}
      >
        <section
          style={{
            position: "relative",
            padding: "16px 8px 16px 4px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid rgba(59,130,246,.18)",
              background: "rgba(239,246,255,.85)",
              color: "#1d4ed8",
              borderRadius: 999,
              padding: "9px 14px",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.3,
              width: "fit-content",
              boxShadow: "0 10px 24px rgba(29,78,216,.06)",
              backdropFilter: "blur(6px)",
            }}
          >
            Plataforma de avaliação socioemocional em atletas
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 22,
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,.96) 0%, rgba(241,245,249,.96) 100%)",
                border: "1px solid rgba(229,231,235,.9)",
                boxShadow: "0 16px 40px rgba(15,23,42,.08)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <img
                src="/endure_logo.png"
                alt="ENDURE"
                style={{ width: 30, height: 30, objectFit: "contain" }}
              />
            </div>

            <div>
              <div
                style={{
                  fontWeight: 900,
                  letterSpacing: 1,
                  fontSize: 24,
                  color: "#0f172a",
                }}
              >
                ENDURE
              </div>
              <div style={{ color: "#64748b", fontSize: 14 }}>
                Avaliação socioemocional em atletas
              </div>
            </div>
          </div>

          <h1
            style={{
              margin: "24px 0 14px",
              fontSize: "clamp(2.25rem, 4.8vw, 4.35rem)",
              lineHeight: 1.02,
              letterSpacing: -1.8,
              color: "#0f172a",
              maxWidth: 760,
            }}
          >
            Avaliação socioemocional com rigor científico e aplicação prática.
          </h1>

          <p
            style={{
              maxWidth: 700,
              color: "#475569",
              fontSize: 18,
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            A ENDURE reúne uma bateria de avaliação construída para investigar
            dimensões psicológicas empiricamente relacionadas ao desempenho em
            atletas, transformando avaliação em inteligência aplicada para
            monitoramento, pesquisa e desenvolvimento humano no contexto
            esportivo.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 14,
              marginTop: 30,
            }}
          >
            {[
              {
                title: "Rigor psicométrico",
                text: "Construída com base em princípios técnicos sólidos e foco em qualidade de medida.",
              },
              {
                title: "Aplicação prática",
                text: "Útil para acompanhamento, tomada de decisão e integração com a rotina esportiva.",
              },
              {
                title: "Leitura estruturada",
                text: "Histórico, relatórios e resultados organizados em um só ambiente.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  position: "relative",
                  background: "rgba(255,255,255,.78)",
                  border: "1px solid rgba(226,232,240,.9)",
                  borderRadius: 22,
                  padding: 18,
                  boxShadow: "0 18px 44px rgba(15,23,42,.06)",
                  backdropFilter: "blur(8px)",
                  minHeight: 148,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    background:
                      "linear-gradient(180deg, rgba(15,23,42,.06) 0%, rgba(59,130,246,.10) 100%)",
                    border: "1px solid rgba(203,213,225,.8)",
                    marginBottom: 14,
                  }}
                />
                <div
                  style={{
                    fontWeight: 800,
                    color: "#0f172a",
                    fontSize: 15,
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#64748b",
                    fontSize: 14,
                    lineHeight: 1.65,
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 22,
              maxWidth: 700,
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            Desenvolvida para atletas e equipe técnica, a plataforma organiza
            avaliações, histórico e acesso aos resultados em uma experiência
            simples, clara e confiável.
          </div>
        </section>

        <section
          style={{
            width: "100%",
            background: "rgba(255,255,255,.92)",
            border: "1px solid rgba(226,232,240,.95)",
            borderRadius: 28,
            boxShadow: "0 28px 70px rgba(15,23,42,.12)",
            overflow: "hidden",
            backdropFilter: "blur(10px)",
            alignSelf: "center",
          }}
        >
          <div
            style={{
              padding: 24,
              borderBottom: "1px solid #e5e7eb",
              background:
                "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 11px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                color: "#334155",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              Acesso seguro
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                marginTop: 14,
                color: "#0f172a",
              }}
            >
              {mode === "login" ? "Entrar na plataforma" : "Redefinir senha"}
            </div>

            <div
              style={{
                color: "#64748b",
                marginTop: 8,
                lineHeight: 1.7,
                fontSize: 15,
                maxWidth: 420,
              }}
            >
              {mode === "login"
                ? "Use seu email e senha para acessar sua área de avaliações, histórico e relatórios."
                : "Informe seu email para receber o link de redefinição de senha."}
            </div>
          </div>

          <div style={{ padding: 24, display: "grid", gap: 18 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                background: "#f1f5f9",
                padding: 6,
                borderRadius: 18,
                border: "1px solid #e2e8f0",
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
                  height: 46,
                  borderRadius: 14,
                  border: "1px solid transparent",
                  background:
                    mode === "login"
                      ? "linear-gradient(180deg, #111827 0%, #0f172a 100%)"
                      : "transparent",
                  color: mode === "login" ? "#fff" : "#0f172a",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow:
                    mode === "login"
                      ? "0 12px 28px rgba(15,23,42,.14)"
                      : "none",
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
                  height: 46,
                  borderRadius: 14,
                  border: "1px solid transparent",
                  background:
                    mode === "reset"
                      ? "linear-gradient(180deg, #111827 0%, #0f172a 100%)"
                      : "transparent",
                  color: mode === "reset" ? "#fff" : "#0f172a",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow:
                    mode === "reset"
                      ? "0 12px 28px rgba(15,23,42,.14)"
                      : "none",
                }}
              >
                Redefinir senha
              </button>
            </div>

            <form
              onSubmit={mode === "login" ? onLogin : onReset}
              style={{ display: "grid", gap: 14 }}
            >
              <label style={{ display: "grid", gap: 7 }}>
                <span
                  style={{
                    fontSize: 13,
                    color: "#475569",
                    fontWeight: 800,
                  }}
                >
                  Email
                </span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  style={{
                    height: 52,
                    padding: "0 16px",
                    borderRadius: 16,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    outline: "none",
                    fontSize: 15,
                    color: "#0f172a",
                    boxShadow: "inset 0 1px 2px rgba(15,23,42,.03)",
                  }}
                />
              </label>

              {mode === "login" && (
                <label style={{ display: "grid", gap: 7 }}>
                  <span
                    style={{
                      fontSize: 13,
                      color: "#475569",
                      fontWeight: 800,
                    }}
                  >
                    Senha
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    style={{
                      height: 52,
                      padding: "0 16px",
                      borderRadius: 16,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      outline: "none",
                      fontSize: 15,
                      color: "#0f172a",
                      boxShadow: "inset 0 1px 2px rgba(15,23,42,.03)",
                    }}
                  />
                </label>
              )}

              <button
                disabled={loading}
                type="submit"
                style={{
                  height: 52,
                  borderRadius: 16,
                  border: "1px solid #0f172a",
                  background: loading
                    ? "#334155"
                    : "linear-gradient(180deg, #111827 0%, #0f172a 100%)",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 15,
                  cursor: loading ? "wait" : "pointer",
                  boxShadow: "0 16px 34px rgba(15,23,42,.16)",
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
                    borderRadius: 16,
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  {msg}
                </div>
              ) : null}
            </form>

            <div
              style={{
                display: "grid",
                gap: 12,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: "#0f172a",
                  fontSize: 14,
                }}
              >
                Navegação orientada
              </div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                Se você abriu um link direto de avaliação, faça login para voltar
                automaticamente ao fluxo correto.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}