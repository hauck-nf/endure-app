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

      
      <footer className="login-footer">
        <div className="login-footer-brand">
          <span className="login-footer-line" />
          <span>ENDURE</span>
          <span className="login-footer-line" />
        </div>

        <div>Avaliação socioemocional para atletas de endurance</div>
        <div className="login-footer-author">
          Prof. Dr. Nelson Hauck Filho · hauck.nf@gmail.com
        </div>
      </footer>
<style jsx>{`
        .login-shell {
          min-height: calc(100vh - 110px);
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.15), transparent 30%),
            radial-gradient(circle at top right, rgba(249,115,22,.12), transparent 28%),
            linear-gradient(180deg, #f8fafc 0%, #eef2ff 52%, #f8fafc 100%);
          padding: 24px 16px 18px;
          display: grid;
          place-items: center;
          overflow: hidden;
        }

        .login-wrap {
          width: min(100%, 1180px);
          display: grid;
          gap: 18px;
          box-sizing: border-box;
        }

        .brand-panel,
        .form-panel {
          border-radius: 30px;
          padding: 24px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.10);
          box-sizing: border-box;
          min-width: 0;
        }

        .brand-panel {
          position: relative;
          overflow: hidden;
          min-height: 560px;
          background:
            radial-gradient(circle at 15% 10%, rgba(45,212,191,.24), transparent 28%),
            radial-gradient(circle at 100% 0%, rgba(249,115,22,.18), transparent 26%),
            linear-gradient(135deg, rgba(15,23,42,.98), rgba(30,41,59,.97));
          border: 1px solid rgba(148,163,184,.22);
          color: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .brand-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(15,23,42,.04), rgba(15,23,42,.70)),
            radial-gradient(circle at 45% 50%, rgba(255,255,255,.08), transparent 42%);
          pointer-events: none;
        }

        .brand-panel > * {
          position: relative;
          z-index: 1;
        }

        .form-panel {
          background: rgba(255,255,255,.94);
          border: 1px solid rgba(226,232,240,.92);
          backdrop-filter: blur(12px);
          align-self: center;
        }

        .badge,
        .secure-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.35px;
        }

        .badge {
          border: 1px solid rgba(153,246,228,.35);
          background: rgba(15,23,42,.38);
          color: #99f6e4;
          padding: 8px 12px;
          backdrop-filter: blur(8px);
          width: fit-content;
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
          gap: 13px;
          margin-top: 22px;
        }

        .logo-box {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.20);
          background: rgba(255,255,255,.96);
          box-shadow: 0 18px 38px rgba(0, 0, 0, 0.20);
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .logo-image {
          width: 31px;
          height: 31px;
          object-fit: contain;
        }

        .brand-name {
          font-weight: 950;
          letter-spacing: 1px;
          font-size: 23px;
          color: #ffffff;
        }

        .brand-subtitle {
          color: #cbd5e1;
          font-size: 14px;
          margin-top: 2px;
        }

        .hero-title {
          margin: 28px 0 14px;
          font-size: clamp(2.45rem, 6vw, 4.35rem);
          line-height: .96;
          letter-spacing: -1.8px;
          color: #ffffff;
          max-width: 850px;
          text-shadow: 0 2px 20px rgba(0,0,0,.22);
        }

        .hero-text {
          margin: 0;
          color: #dbeafe;
          font-size: 15.5px;
          line-height: 1.82;
          max-width: 780px;
        }

        .benefit-list {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 24px;
        }

        .benefit-card {
          border: 1px solid rgba(226,232,240,.16);
          border-radius: 20px;
          padding: 16px;
          background: rgba(255,255,255,.08);
          backdrop-filter: blur(10px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
        }

        .benefit-label {
          font-size: 12px;
          color: #99f6e4;
          font-weight: 900;
          letter-spacing: .25px;
          text-transform: uppercase;
        }

        .benefit-title {
          margin-top: 8px;
          font-weight: 950;
          font-size: 18px;
          color: #ffffff;
          line-height: 1.18;
          letter-spacing: -0.3px;
        }

        .benefit-text {
          margin: 10px 0 0;
          color: #cbd5e1;
          line-height: 1.62;
          font-size: 13.5px;
        }

        .form-title {
          font-size: 30px;
          font-weight: 950;
          margin-top: 14px;
          color: #0f172a;
          letter-spacing: -0.6px;
          line-height: 1.05;
        }

        .form-subtitle {
          color: #64748b;
          margin-top: 9px;
          line-height: 1.65;
          font-size: 15px;
        }

        .mode-switch {
          display: flex;
          gap: 8px;
          background: #f1f5f9;
          padding: 6px;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          margin-top: 20px;
        }

        .mode-btn {
          flex: 1;
          height: 44px;
          border-radius: 14px;
          border: 1px solid transparent;
          background: transparent;
          color: #0f172a;
          font-weight: 900;
          cursor: pointer;
          font-family: inherit;
        }

        .mode-btn.active {
          background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
          color: #ffffff;
          box-shadow: 0 14px 28px rgba(15,23,42,.16);
        }

        .form-grid {
          display: grid;
          gap: 14px;
          margin-top: 20px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .field-label {
          font-size: 13px;
          color: #475569;
          font-weight: 900;
        }

        .field-input {
          height: 52px;
          padding: 0 16px;
          border-radius: 16px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          outline: none;
          font-size: 15px;
          color: #0f172a;
          font-family: inherit;
          transition: border-color .15s ease, box-shadow .15s ease;
        }

        .field-input:focus {
          border-color: #14b8a6;
          box-shadow: 0 0 0 4px rgba(20,184,166,.12);
        }

        .submit-btn {
          height: 52px;
          border-radius: 16px;
          border: 1px solid #0f172a;
          background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
          color: #ffffff;
          font-weight: 950;
          font-size: 15px;
          cursor: pointer;
          font-family: inherit;
          box-shadow: 0 18px 34px rgba(15,23,42,.18);
          transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
        }

        .submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 22px 42px rgba(15,23,42,.22);
        }

        .submit-btn:disabled {
          background: #334155;
          cursor: wait;
          opacity: .82;
          transform: none;
          box-shadow: none;
        }

        .message-box {
          padding: 14px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.7;
          font-weight: 700;
        }

        .helper-box {
          display: grid;
          gap: 10px;
          border: 1px solid #e5e7eb;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.10), transparent 36%),
            #f8fafc;
          border-radius: 20px;
          padding: 16px;
          margin-top: 18px;
        }

        .helper-title {
          font-weight: 900;
          color: #0f172a;
          font-size: 14px;
        }

        .helper-text {
          color: #64748b;
          font-size: 13px;
          line-height: 1.65;
        }

        .login-footer {
          margin: 0 auto;
          padding: 18px 16px 26px;
          width: min(100%, 1180px);
          text-align: center;
          color: #64748b;
          font-size: 13px;
          line-height: 1.55;
        }

        .login-footer-brand {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 8px;
          color: #0f172a;
          font-weight: 950;
          letter-spacing: 0.2px;
        }

        .login-footer-line {
          width: 36px;
          height: 2px;
          border-radius: 999px;
          background: #0f172a;
          display: inline-block;
        }

        .login-footer-author {
          margin-top: 2px;
          font-weight: 700;
        }

        @media (min-width: 960px) {
          .login-shell {
            padding: 28px 24px 18px;
          }

          .login-wrap {
            grid-template-columns: minmax(0, 1.1fr) minmax(360px, .9fr);
            align-items: stretch;
          }

          .brand-panel,
          .form-panel {
            padding: 30px;
          }
        }

        @media (max-width: 959px) {
          .brand-panel {
            min-height: auto;
          }

          .benefit-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .login-shell {
            padding: 12px;
            place-items: start center;
          }

          .brand-panel,
          .form-panel {
            border-radius: 26px;
            padding: 20px;
          }

          .brand-panel {
            min-height: 520px;
          }

          .hero-title {
            font-size: 2.45rem;
            letter-spacing: -1.2px;
          }

          .hero-text {
            font-size: 14.5px;
            line-height: 1.72;
          }

          .benefit-card {
            padding: 14px;
          }

          .benefit-title {
            font-size: 17px;
          }

          .form-title {
            font-size: 28px;
          }

          .login-footer {
            padding-bottom: 22px;
          }
        }
      `}</style>
    </>
  );
}