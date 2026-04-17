"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateAthleteForm() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const res = await fetch("/api/admin/create-athlete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name, email, password }),
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    setLoading(false);

    if (!res.ok || !data?.ok) {
      const detail = data?.error ?? `HTTP ${res.status}`;
      setMsg(`Erro ao cadastrar: ${detail}`);
      return;
    }

    setMsg("Atleta cadastrado!");
    setName("");
    setEmail("");
    setPassword("");
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "fit-content",
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "#fff",
          fontWeight: 600,
          color: "#111827",
          cursor: "pointer",
        }}
      >
        {open ? "Fechar cadastro" : "Cadastrar atleta"}
      </button>

      {open ? (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, background: "#fff", maxWidth: 520 }}>
          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            <input
              placeholder="Nome"
              value={full_name}
              onChange={(e) => setName(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
            />
            <input
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
            />
            <input
              placeholder="Senha provisória (mín. 8)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
            />

            <button disabled={loading} style={{ padding: 10, borderRadius: 10, fontWeight: 700, cursor: "pointer" }} type="submit">
              {loading ? "Cadastrando..." : "Confirmar cadastro"}
            </button>

            {msg ? <div style={{ fontSize: 13, color: "#b91c1c" }}>{msg}</div> : null}
          </form>

          <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
            Dica: o atleta pode trocar a senha depois via “Esqueci minha senha”.
          </div>
        </div>
      ) : null}
    </div>
  );
}
