import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "#6b7280" }}>Carregando…</div>}>
      <LoginClient />
    </Suspense>
  );
}
