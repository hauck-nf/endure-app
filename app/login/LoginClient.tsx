"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type Mode = "login" | "reset";
type MsgTone = "default" | "error" | "success";

function getMessageStyle(msgTone: MsgTone): React.CSSProperties {
  if (msgTone === "error") {
    return {
      background: "#fff1f2",
      border: "1px solid #fecdd3",
      color: "#be123c",
    };
  }

  if (msgTone === "success") {
    return {
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      color: "#166534",
    };
  }

  return {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#374151",
  };
}

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

  return (
    <>
      <div className="login-shell">
        <div className="login-wrap">
          <section className="brand-panel">
            <div className="badge">
              Plataforma de avaliação socioemocional em atletas
            </div>

            <div className="brand-header">
              <div className="logo-box">
                <img
                  src="/endure_logo.png"
                  alt="ENDURE"
                  className="logo-image"
                />
              </div>

              <div>
                <div className="brand-name">ENDURE</div>
                <div className="brand-subtitle">
                  Avaliação socioemocional em atletas
                </div>
              </div>
            </div>

            <h1 className="hero-title">
              Avaliação socioemocional com rigor científico e aplicação prática.
            </h1>

            <p className="hero-text">
              A ENDURE reúne uma bateria de avaliação construída para investigar
              dimensões psicológicas empiricamente relacionadas ao desempenho em
              atletas, transformando avaliação em inteligência aplicada para
              monitoramento, pesquisa e desenvolvimento humano no contexto
              esportivo.
            </p>

            <div className="benefit-list">
              <div className="benefit-card">
                <div className="benefit-label">Rigor psicométrico</div>
                <div className="benefit-title">
                  Construída com base em princípios técnicos sólidos
                </div>
                <p className="benefit-text">
                  A avaliação foi desenvolvida para oferecer qualidade de
                  medida, clareza interpretativa e utilidade no contexto
                  esportivo.
                </p>
              </div>

              <div className="benefit-card">
                <div className="benefit-label">Aplicação prática</div>
                <div className="benefit-title">
                  Um ambiente organizado para monitoramento e acompanhamento
                </div>
                <p className="benefit-text">
                  Histórico, pendências, respostas e relatórios ficam reunidos
                  em um fluxo simples, informativo e mais intuitivo para o uso
                  diário.
                </p>
              </div>

              <div className="benefit-card">
                <div className="benefit-label">Leitura estruturada</div>
                <div className="benefit-title">
                  Informação útil para atletas, equipe técnica e pesquisa
                </div>
                <p className="benefit-text">
                  A ENDURE foi pensada para transformar respostas em leitura
                  técnica aplicável, sem perder clareza na experiência do
                  usuário.
                </p>
              </div>
            </div>
          </section>

          <section className="form-panel">
            <div className="secure-badge">Acesso seguro</div>

            <div className="form-title">
              {mode === "login" ? "Entrar" : "Redefinir senha"}
            </div>

            <div className="form-subtitle">
              {mode === "login"
                ? "Use seu email e senha para acessar sua área."
                : "Informe seu email para receber o link de redefinição de senha."}
            </div>

            <div className="mode-switch">
              <button
                onClick={() => {
                  setMode("login");
                  setMsg("");
                }}
                type="button"
                className={mode === "login" ? "mode-btn active" : "mode-btn"}
              >
                Entrar
              </button>

              <button
                onClick={() => {
                  setMode("reset");
                  setMsg("");
                }}
                type="button"
                className={mode === "reset" ? "mode-btn active" : "mode-btn"}
              >
                Redefinir
              </button>
            </div>

            <form
              onSubmit={mode === "login" ? onLogin : onReset}
              className="form-grid"
            >
              <label className="field">
                <span className="field-label">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  className="field-input"
                />
              </label>

              {mode === "login" && (
                <label className="field">
                  <span className="field-label">Senha</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    className="field-input"
                  />
                </label>
              )}

              <button disabled={loading} type="submit" className="submit-btn">
                {loading
                  ? "Processando..."
                  : mode === "login"
                  ? "Entrar"
                  : "Enviar link"}
              </button>

              {msg ? (
                <div
                  className="message-box"
                  style={getMessageStyle(msgTone)}
                >
                  {msg}
                </div>
              ) : null}
            </form>

            <div className="helper-box">
              <div className="helper-title">Navegação orientada</div>
              <div className="helper-text">
                Se você abriu um link direto de avaliação, faça login para
                voltar automaticamente ao fluxo correto.
              </div>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        .login-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(59,130,246,.08), transparent 28%),
            radial-gradient(circle at bottom right, rgba(15,23,42,.06), transparent 28%),
            linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%);
          padding: 20px 16px 32px;
          display: grid;
          place-items: center;
        }

        .login-wrap {
          width: 100%;
          max-width: 1180px;
          display: grid;
          gap: 20px;
        }

        .brand-panel,
        .form-panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          padding: 22px;
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.06);
        }

        .brand-panel {
          background: linear-gradient(
            180deg,
            rgba(255,255,255,1) 0%,
            rgba(248,250,252,1) 100%
          );
        }

        .badge,
        .secure-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.3px;
        }

        .badge {
          border: 1px solid #dbeafe;
          background: #eff6ff;
          color: #1d4ed8;
          padding: 8px 12px;
        }

        .secure-badge {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          padding: 7px 11px;
        }

        .brand-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
        }

        .logo-box {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          background: linear-gradient(
            180deg,
            rgba(255,255,255,.96) 0%,
            rgba(241,245,249,.96) 100%
          );
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .logo-image {
          width: 26px;
          height: 26px;
          object-fit: contain;
        }

        .brand-name {
          font-weight: 900;
          letter-spacing: 0.8px;
          font-size: 22px;
          color: #0f172a;
        }

        .brand-subtitle {
          color: #64748b;
          font-size: 14px;
        }

        .hero-title {
          margin: 18px 0 12px;
          font-size: clamp(1.95rem, 6vw, 3.8rem);
          line-height: 1.05;
          letter-spacing: -1.2px;
          color: #0f172a;
          max-width: 820px;
        }

        .hero-text {
          margin: 0;
          color: #475569;
          font-size: 15px;
          line-height: 1.85;
          max-width: 760px;
        }

        .benefit-list {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .benefit-card {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 16px;
          background: #ffffff;
        }

        .benefit-label {
          font-size: 13px;
          color: #64748b;
        }

        .benefit-title {
          margin-top: 8px;
          font-weight: 900;
          font-size: 20px;
          color: #0f172a;
          line-height: 1.25;
        }

        .benefit-text {
          margin: 10px 0 0;
          color: #64748b;
          line-height: 1.75;
          font-size: 14px;
        }

        .form-title {
          font-size: 26px;
          font-weight: 900;
          margin-top: 14px;
          color: #0f172a;
        }

        .form-subtitle {
          color: #64748b;
          margin-top: 8px;
          line-height: 1.7;
          font-size: 15px;
        }

        .mode-switch {
          display: flex;
          gap: 8px;
          background: #f1f5f9;
          padding: 6px;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          margin-top: 18px;
        }

        .mode-btn {
          flex: 1;
          height: 44px;
          border-radius: 14px;
          border: 1px solid transparent;
          background: transparent;
          color: #0f172a;
          font-weight: 800;
          cursor: pointer;
        }

        .mode-btn.active {
          background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
          color: #ffffff;
        }

        .form-grid {
          display: grid;
          gap: 14px;
          margin-top: 18px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .field-label {
          font-size: 13px;
          color: #475569;
          font-weight: 800;
        }

        .field-input {
          height: 50px;
          padding: 0 16px;
          border-radius: 16px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          outline: none;
          font-size: 15px;
          color: #0f172a;
        }

        .submit-btn {
          height: 50px;
          border-radius: 16px;
          border: 1px solid #0f172a;
          background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
          color: #ffffff;
          font-weight: 900;
          font-size: 15px;
          cursor: pointer;
        }

        .submit-btn:disabled {
          background: #334155;
          cursor: wait;
        }

        .message-box {
          padding: 14px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.7;
        }

        .helper-box {
          display: grid;
          gap: 12px;
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          border-radius: 18px;
          padding: 16px;
          margin-top: 18px;
        }

        .helper-title {
          font-weight: 800;
          color: #0f172a;
          font-size: 14px;
        }

        .helper-text {
          color: #64748b;
          font-size: 13px;
          line-height: 1.7;
        }

        @media (min-width: 960px) {
          .login-shell {
            padding: 28px 24px 40px;
          }

          .login-wrap {
            grid-template-columns: 1.05fr 0.95fr;
            align-items: stretch;
          }

          .brand-panel,
          .form-panel {
            padding: 28px;
          }

          .form-panel {
            align-self: center;
          }
        }
      `}</style>
    </>
  );
}