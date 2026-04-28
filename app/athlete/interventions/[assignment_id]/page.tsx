"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Block = {
  id: string;
  type: "text" | "image" | "steps" | "textarea" | "likert" | "checkbox";
  title?: string;
  body?: string;
  image_url?: string;
  caption?: string;
  alt?: string;
  items?: string[];
  label?: string;
  required?: boolean;
  min?: number;
  max?: number;
  min_label?: string;
  max_label?: string;
};

type Assignment = {
  assignment_id: string;
  title_snapshot: string;
  content_snapshot: any;
  linked_assessment_snapshot: any;
  status: string;
  due_at: string | null;
};

function getTokenFromLocalStorage() {
  if (typeof window === "undefined") return "";

  try {
    const raw = localStorage.getItem("endure-auth");
    const parsed = raw ? JSON.parse(raw) : null;

    return (
      parsed?.access_token ??
      parsed?.session?.access_token ??
      parsed?.currentSession?.access_token ??
      parsed?.state?.session?.access_token ??
      parsed?.state?.access_token ??
      ""
    );
  } catch {
    return "";
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getTokenFromLocalStorage();

  return {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  };
}

function cardStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: "rgba(255,255,255,.94)",
    border: "1px solid rgba(226,232,240,.92)",
    borderRadius: 28,
    padding: 22,
    boxShadow: "0 22px 60px rgba(15,23,42,.08)",
    backdropFilter: "blur(10px)",
    minWidth: 0,
    boxSizing: "border-box",
    ...extra,
  };
}

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 46,
    padding: "0 13px",
    borderRadius: 14,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    ...extra,
  };
}

function textareaStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 120,
    padding: "12px 13px",
    borderRadius: 14,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: 14,
    lineHeight: 1.55,
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    ...extra,
  };
}

function miniLabelStyle(): React.CSSProperties {
  return {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

function primaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "0 16px",
    borderRadius: 14,
    border: disabled ? "1px solid #e5e7eb" : "1px solid #111827",
    background: disabled ? "#f8fafc" : "#111827",
    color: disabled ? "#94a3b8" : "#ffffff",
    fontWeight: 900,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  };
}

function secondaryButtonStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 850,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    textDecoration: "none",
  };
}

export default function AthleteInterventionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = String(params?.assignment_id ?? "");

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const blocks: Block[] = useMemo(() => {
    return Array.isArray(assignment?.content_snapshot?.blocks)
      ? assignment?.content_snapshot.blocks
      : [];
  }, [assignment]);

  async function load() {
    try {
      setErr("");
      setLoading(true);

      const res = await fetch(
        `/api/intervention-response?assignment_id=${encodeURIComponent(assignmentId)}`,
        {
          headers: authHeaders(),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Falha ao carregar intervenção.");
      }

      setAssignment(data.assignment);
      setAnswers(data.response?.response_json ?? {});
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao carregar intervenção.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (assignmentId) load();
  }, [assignmentId]);

  function updateAnswer(blockId: string, value: any) {
    setAnswers((prev) => ({
      ...prev,
      [blockId]: value,
    }));
  }

  function validateRequired() {
    const missing = blocks.filter((b) => {
      if (!b.required) return false;

      const value = answers[b.id];

      if (b.type === "checkbox") return value !== true;
      if (value === null || value === undefined) return true;
      if (typeof value === "string" && value.trim() === "") return true;

      return false;
    });

    return missing;
  }

  async function save(complete: boolean) {
    try {
      setBusy(true);
      setErr("");
      setMsg("");

      if (complete) {
        const missing = validateRequired();

        if (missing.length > 0) {
          throw new Error("Há campos obrigatórios ainda não respondidos.");
        }
      }

      const res = await fetch("/api/intervention-response", {
        method: "POST",
        headers: authHeaders({
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          assignment_id: assignmentId,
          response_json: answers,
          complete,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Falha ao salvar intervenção.");
      }

      if (complete) {
        setMsg(
          data.created_assessment_request
            ? "Intervenção concluída. Uma avaliação vinculada foi criada para você."
            : "Intervenção concluída com sucesso."
        );

        await load();
      } else {
        setMsg("Progresso salvo.");
        await load();
      }
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao salvar intervenção.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="intervention-detail-page">
      <style>{`
        .intervention-detail-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.14), transparent 30%),
            radial-gradient(circle at top right, rgba(249,115,22,.12), transparent 28%),
            #f8fafc;
          color: #0f172a;
          padding: 24px;
          overflow-x: hidden;
        }

        .shell {
          width: min(100%, 980px);
          margin: 0 auto;
          display: grid;
          gap: 16px;
          box-sizing: border-box;
        }

        .hero-title {
          margin: 8px 0 0;
          font-size: clamp(30px, 5vw, 42px);
          line-height: 1.03;
          letter-spacing: -1px;
          color: #ffffff;
        }

        .block {
          border: 1px solid #e5e7eb;
          border-radius: 22px;
          background: #ffffff;
          padding: 18px;
        }

        .block-title {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.3px;
        }

        .block-body {
          color: #334155;
          line-height: 1.75;
          white-space: pre-wrap;
        }

        .steps {
          margin: 12px 0 0;
          padding-left: 22px;
          color: #334155;
          line-height: 1.75;
        }

        .question-label {
          color: #0f172a;
          font-size: 16px;
          font-weight: 850;
          line-height: 1.45;
        }

        .likert-row {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .likert-btn {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #0f172a;
          font-weight: 900;
          cursor: pointer;
        }

        .likert-btn.selected {
          border-color: #111827;
          background: #111827;
          color: #ffffff;
        }

        .image-block img {
          max-width: 100%;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
          display: block;
          margin: 12px auto 0;
        }

        @media (max-width: 560px) {
          .intervention-detail-page {
            padding: 12px;
          }

          .hero-card,
          .content-card {
            padding: 18px !important;
            border-radius: 24px !important;
          }
        }
      `}</style>

      <div className="shell">
        <section
          className="hero-card"
          style={cardStyle({
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(15,23,42,.97), rgba(30,41,59,.95))",
            color: "#ffffff",
            overflow: "hidden",
            position: "relative",
          })}
        >
          <HeroDecor />

          <div style={{ position: "relative", zIndex: 1 }}>
            <p
              style={{
                margin: 0,
                color: "#99f6e4",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              Intervenção
            </p>

            <h1 className="hero-title">
              {assignment?.title_snapshot ?? "Intervenção"}
            </h1>

            <p
              style={{
                margin: "12px 0 0",
                maxWidth: 780,
                color: "#cbd5e1",
                lineHeight: 1.65,
              }}
            >
              Leia o conteúdo, realize a tarefa proposta e registre sua resposta.
            </p>
          </div>
        </section>

        <div>
          <Link href="/athlete/interventions" style={secondaryButtonStyle()}>
            Voltar para intervenções
          </Link>
        </div>

        {err ? (
          <section
            style={{
              padding: 14,
              borderRadius: 18,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              fontWeight: 800,
            }}
          >
            {err}
          </section>
        ) : null}

        {msg ? (
          <section
            style={{
              padding: 14,
              borderRadius: 18,
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#166534",
              fontWeight: 800,
            }}
          >
            {msg}
          </section>
        ) : null}

        <section style={cardStyle()} className="content-card">
          {loading ? (
            <p>Carregando...</p>
          ) : blocks.length === 0 ? (
            <p>Nenhum bloco de conteúdo encontrado.</p>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {blocks.map((block) => (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  value={answers[block.id]}
                  onChange={(value) => updateAnswer(block.id, value)}
                  disabled={assignment?.status === "completed"}
                />
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: 18,
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              disabled={busy || assignment?.status === "completed"}
              onClick={() => save(false)}
              style={secondaryButtonStyle()}
            >
              Salvar progresso
            </button>

            <button
              type="button"
              disabled={busy || assignment?.status === "completed"}
              onClick={() => save(true)}
              style={primaryButtonStyle(busy || assignment?.status === "completed")}
            >
              {assignment?.status === "completed" ? "Concluída" : "Concluir intervenção"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function BlockRenderer({
  block,
  value,
  onChange,
  disabled,
}: {
  block: Block;
  value: any;
  onChange: (value: any) => void;
  disabled: boolean;
}) {
  if (block.type === "text") {
    return (
      <section className="block">
        {block.title ? <h2 className="block-title">{block.title}</h2> : null}
        <div className="block-body">{block.body}</div>
      </section>
    );
  }

  if (block.type === "image") {
    return (
      <section className="block image-block">
        {block.title ? <h2 className="block-title">{block.title}</h2> : null}
        {block.image_url ? (
          <img src={block.image_url} alt={block.alt || block.caption || "Imagem da intervenção"} />
        ) : (
          <div className="block-body">Imagem não informada.</div>
        )}
        {block.caption ? (
          <p style={{ margin: "10px 0 0", color: "#64748b", textAlign: "center", fontSize: 13 }}>
            {block.caption}
          </p>
        ) : null}
      </section>
    );
  }

  if (block.type === "steps") {
    return (
      <section className="block">
        {block.title ? <h2 className="block-title">{block.title}</h2> : null}
        <ol className="steps">
          {(block.items ?? []).map((item, idx) => (
            <li key={`${block.id}-${idx}`}>{item}</li>
          ))}
        </ol>
      </section>
    );
  }

  if (block.type === "textarea") {
    return (
      <section className="block">
        <label className="question-label">
          {block.label}
          {block.required ? " *" : ""}
        </label>
        <textarea
          disabled={disabled}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={textareaStyle({ marginTop: 10 })}
        />
      </section>
    );
  }

  if (block.type === "likert") {
    const min = Number(block.min ?? 1);
    const max = Number(block.max ?? 5);
    const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    return (
      <section className="block">
        <div className="question-label">
          {block.label}
          {block.required ? " *" : ""}
        </div>

        <div className="likert-row">
          <span style={{ color: "#64748b", fontSize: 13 }}>{block.min_label}</span>

          {values.map((v) => (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onChange(v)}
              className={Number(value) === v ? "likert-btn selected" : "likert-btn"}
            >
              {v}
            </button>
          ))}

          <span style={{ color: "#64748b", fontSize: 13 }}>{block.max_label}</span>
        </div>
      </section>
    );
  }

  return (
    <section className="block">
      <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 850 }}>
        <input
          type="checkbox"
          disabled={disabled}
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        {block.label}
        {block.required ? " *" : ""}
      </label>
    </section>
  );
}

function HeroDecor() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          right: -80,
          top: -80,
          width: 260,
          height: 260,
          borderRadius: 999,
          background: "rgba(20,184,166,.22)",
        }}
      />

      <div
        style={{
          position: "absolute",
          right: 120,
          bottom: -110,
          width: 260,
          height: 260,
          borderRadius: 999,
          background: "rgba(249,115,22,.18)",
        }}
      />
    </>
  );
}