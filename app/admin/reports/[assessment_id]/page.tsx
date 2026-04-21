import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

async function firstSignedUrl(supabaseAdmin: any, bucket: string, candidates: string[]) {
  for (const c of candidates) {
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(c, 60 * 10);
    if (!error && data?.signedUrl) return { signedUrl: data.signedUrl, usedPath: c };
  }
  return null;
}

export default async function AdminReportRedirectPage({
  params,
}: {
  params: Promise<{ assessment_id: string }>;
}) {
  const supabase = await createClient();

  // 1) logado
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // 2) admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", auth.user.id)
    .single();

  if (profile?.role !== "admin") redirect("/login");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const bucket = process.env.SUPABASE_REPORTS_BUCKET || "reports";
  const supabaseAdmin = createSupabaseAdmin(url, serviceKey);


  // 3) buscar pdf_path
  const { assessment_id: assessmentId } = await params;

  
  if (!assessmentId) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Relatório indisponível</h1>
        <div style={{ color: "#6b7280" }}>
          Não recebi <code>assessment_id</code> na rota.
        </div>
      </div>
    );
  }
const { data: rep, error: repErr } = await supabaseAdmin.from("assessment_reports")
    .select("pdf_path")
    .eq("assessment_id", assessmentId)
    .single();

  if (repErr) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Relatório indisponível</h1>
        <div style={{ color: "#6b7280" }}>
          Erro ao consultar <code>assessment_reports</code>: <code>{repErr.message}</code>
          <br />
          bucket: <code>{bucket}</code>
          <br />
          service key: <code>{serviceKey ? serviceKey.slice(0, 8) + "…" : "(vazia)"}</code>
        </div>
      </div>
    );
  }

  if (!rep?.pdf_path) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Relatório indisponível</h1>
        <div style={{ color: "#6b7280" }}>
          Não encontrei <code>pdf_path</code> para este assessment_id.
          <br />
          assessment_id: <code>{assessmentId}</code>
        </div>
      </div>
    );
  }
  // pdf_path pode vir só como UUID, ou já como path
  let raw = String(rep.pdf_path).trim();

  // Se vier como "bucket/arquivo", remove o prefixo do bucket
  if (raw.startsWith(bucket + "/")) raw = raw.slice(bucket.length + 1);

  // 4) tentar variações comuns
  const candidates = [
    raw,
    `${raw}.pdf`,
    `${raw}/report.pdf`,
    `${raw}/relatorio.pdf`,
    `${raw}/output.pdf`,
  ];

  // tenta também caso raw já tenha ".pdf" mas com espaços etc
  const signed1 = await firstSignedUrl(supabaseAdmin, bucket, candidates);
  if (signed1?.signedUrl) redirect(signed1.signedUrl);

  // 5) fallback: listar objetos com prefixo raw (para achar o pdf real)
  // tenta listar na raiz com prefix=raw
  const { data: listA } = await supabaseAdmin.storage.from(bucket).list("", {
    search: raw, // supabase usa "search" como filtro por substring (não é prefix perfeito, mas ajuda)
    limit: 50,
  });

  // tenta listar dentro de "raw/" (se raw for uma pasta)
  const { data: listB } = await supabaseAdmin.storage.from(bucket).list(raw, { limit: 50 });

  const all = [
    ...(listA ?? []).map((x) => ({ name: x.name, in: "" })),
    ...(listB ?? []).map((x) => ({ name: x.name, in: raw })),
  ];

  // escolhe o primeiro .pdf encontrado
  const pdf = all.find((x) => String(x.name).toLowerCase().endsWith(".pdf"));

  if (pdf) {
    const path = pdf.in ? `${pdf.in}/${pdf.name}` : pdf.name;
    const signed2 = await firstSignedUrl(supabaseAdmin, bucket, [path]);
    if (signed2?.signedUrl) redirect(signed2.signedUrl);
  }

  // 6) se falhou, mostra debug amigável
  return (
    <div style={{ padding: 24 }}>
      <h1>Não consegui abrir o PDF</h1>
      <div style={{ marginTop: 8, color: "#6b7280" }}>
        bucket: <code>{bucket}</code>
        <br />
        pdf_path (db): <code>{String(rep.pdf_path)}</code>
        <br />
        tentativas: <code>{candidates.join(" | ")}</code>
      </div>
      <div style={{ marginTop: 12, color: "#6b7280" }}>
        Se você me disser o nome do bucket real e como o arquivo está salvo (ex.: <code>uuid.pdf</code> ou <code>uuid/report.pdf</code>),
        eu deixo isso 100% direto.
      </div>
    </div>
  );
}


