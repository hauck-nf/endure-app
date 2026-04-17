"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function signIn() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) return setMsg(error.message);

    // redireciona por role
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return setMsg("Falha ao obter usuário.");

    const { data: prof, error: e2 } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (e2 || !prof?.role) return setMsg("Falha ao obter role em profiles.");

    if (prof.role === "admin") router.push("/admin");
    else if (prof.role === "coach") router.push("/coach");
    else router.push("/athlete");
  }

  async function signUp() {
    setMsg(null);
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
    });
    setMsg(error ? error.message : "Conta criada! Agora faça login.");
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "system-ui" }}>
      <h2>Login</h2>

      <label>Email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <label>Senha</label>
      <input
        value={pass}
        type="password"
        onChange={(e) => setPass(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 14 }}
      />

      <button onClick={signIn} style={{ width: "100%", padding: 10, marginBottom: 8 }}>
        Entrar
      </button>

      <button onClick={signUp} style={{ width: "100%", padding: 10 }}>
        Criar conta
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}