"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type Mode = "login" | "reset";
type MsgTone = "default" | "error" | "success";

const shellStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(59,130,246,.08), transparent 28%), radial-gradient(circle at bottom right, rgba(15,23,42,.06), transparent 28%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 48%, #f8fafc 100%)",
  padding: "20px 16px 32px",
  display: "grid",
  placeItems: "center",
};

const wrapperStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1120,
  display: "grid",
  gap: 18,
};

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 24,
  padding: 22,
  boxShadow: "0 18px 48px rgba(15,23,42,.06)",
};

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
    <div style={shellStyle}>
      <div style={wrapperStyle}>
        <section
          style={{
            ...panelStyle,
            background:
              "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
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
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.3,
            }}
          >
            Plataforma de avaliação socioemocional em atletas
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 18,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,.96) 0%, rgba(241,245,249,.96) 100%)",
                boxShadow: "0 12px 30px rgba(15,23,42,.08)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <img
                src="/endure_logo.png"
                alt="ENDURE"
                style={{ width: 26, height: 26, objectFit: "contain" }}
              />
            </div>

            <div>
              <div
                style={{
                  fontWeight: 900,
                  letterSpacing: 0.8,
                  fontSize: 22,
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
              margin: "18px 0 12px",
              fontSize: "clamp(2rem, 7vw, 3.2rem)",
              lineHeight: 1.05,
              letterSpacing: -1.2,
              color: "#0f172a",
              maxWidth: 760,
            }}
          >
            Acesse a plataforma com clareza, segurança e praticidade.
          </h1>

          <p
            style={{
              margin: 0,
              color: "#475569",
              fontSize: 16,
              lineHeight: 1.8,
              maxWidth: 760,
            }}
          >
            A ENDURE organiza avaliações, histórico e resultados em uma
            experiência pensada para atletas e equipe técnica, com foco em
            usabilidade, leitura estruturada e aplicação prática.
          </p>

          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 18,
            }}
          >
            {[
              {
                title: "Rigor psicométrico",
                text: "Construída com base em princípios técnicos sólidos.",
              },
              {
                title: "Fluxo intuitivo",
                text: "Pendências, histórico e resultados organizados em um só ambiente.",
              },
              {
                title: "Aplicação prática",
                text: "Uma plataforma útil para monitoramento, pesquisa e desenvolvimento.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 18,
                  padding: 16,
                  background: "#ffffff",
                }}
              >
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
                    marginTop: 6,
                    color: "#64748b",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={panelStyle}>
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
            }}
          >
            {mode === "login"
              ? "Use seu email e senha para acessar sua área."
              : "Informe seu email para receber o link de redefinição de senha."}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              background: "#f1f5f9",
              padding: 6,
              borderRadius: 18,
              border: "1px solid #e2e8f0",
              marginTop: 18,
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
              }}
            >
              Redefinir senha
            </button>
          </div>

          <form
            onSubmit={mode === "login" ? onLogin : onReset}
            style={{
              display: "grid",
              gap: 14,
              marginTop: 18,
            }}
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
                  ...getMessageStyle(msgTone),
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
              marginTop: 18,
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
        </section>
      </div>
    </div>
  );
}