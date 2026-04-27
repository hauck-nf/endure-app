import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabaseServer";

export const dynamic = "force-dynamic";

type AssessmentRow = {
  assessment_id: string;
  athlete_id: string;
  submitted_at: string | null;
  created_at: string | null;
  instrument_version: string | null;
  status: string | null;
};

type ScoreRow = {
  assessment_id: string;
  scores_json: any;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não encontrada.");
  }

  if (!key) {
    throw new Error(
      "Chave service_role não encontrada. Configure SUPABASE_SERVICE_ROLE_KEY no .env.local e na Vercel."
    );
  }

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function scoreMapInfo(scoresJson: any) {
  if (!scoresJson) {
    return {
      has_scores_json: false,
      format: "none",
      keys_count: 0,
      sample_keys: [],
    };
  }

  if (scoresJson.factors_by_key && typeof scoresJson.factors_by_key === "object") {
    const keys = Object.keys(scoresJson.factors_by_key);

    return {
      has_scores_json: true,
      format: "factors_by_key",
      keys_count: keys.length,
      sample_keys: keys.slice(0, 8),
    };
  }

  if (Array.isArray(scoresJson.factors)) {
    const keys = scoresJson.factors
      .map((f: any) => String(f?.scale ?? f?.score_scale ?? "").trim())
      .filter(Boolean);

    return {
      has_scores_json: true,
      format: "factors",
      keys_count: keys.length,
      sample_keys: keys.slice(0, 8),
    };
  }

  if (scoresJson.scales && typeof scoresJson.scales === "object") {
    const keys = Object.keys(scoresJson.scales);

    return {
      has_scores_json: true,
      format: "scales",
      keys_count: keys.length,
      sample_keys: keys.slice(0, 8),
    };
  }

  const keys = Object.keys(scoresJson ?? {});

  return {
    has_scores_json: true,
    format: "unknown",
    keys_count: keys.length,
    sample_keys: keys.slice(0, 8),
  };
}

export async function GET(req: NextRequest) {
  try {
    const authClient = await createClient();

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const admin = getAdminClient();

    const url = new URL(req.url);
    const requestedAthleteId = url.searchParams.get("athlete_id");

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { ok: false, error: `Erro ao ler perfil: ${profileError.message}` },
        { status: 500 }
      );
    }

    const role = String(profile?.role ?? "");

    const { data: ownAthlete, error: ownAthleteError } = await admin
      .from("athletes")
      .select("athlete_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownAthleteError) {
      return NextResponse.json(
        {
          ok: false,
          error: `Erro ao resolver atleta do usuário: ${ownAthleteError.message}`,
        },
        { status: 500 }
      );
    }

    let athleteId = requestedAthleteId || ownAthlete?.athlete_id || null;

    if (!athleteId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Não encontrei athlete_id na URL nem um cadastro de atleta vinculado ao usuário logado.",
        },
        { status: 400 }
      );
    }

    if (role !== "admin" && athleteId !== ownAthlete?.athlete_id) {
      return NextResponse.json(
        { ok: false, error: "Acesso não autorizado a este atleta." },
        { status: 403 }
      );
    }

    const { data: athlete, error: athleteError } = await admin
      .from("athletes")
      .select("athlete_id, full_name, email, user_id")
      .eq("athlete_id", athleteId)
      .maybeSingle();

    if (athleteError || !athlete?.athlete_id) {
      return NextResponse.json(
        {
          ok: false,
          error: athleteError?.message ?? "Atleta não encontrado.",
        },
        { status: 404 }
      );
    }

    const { data: assessmentsData, error: assessmentsError } = await admin
      .from("assessments")
      .select("assessment_id, athlete_id, submitted_at, created_at, instrument_version, status")
      .eq("athlete_id", athleteId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: true });

    if (assessmentsError) {
      return NextResponse.json(
        {
          ok: false,
          error: `Erro ao buscar avaliações: ${assessmentsError.message}`,
        },
        { status: 500 }
      );
    }

    const assessments = ((assessmentsData ?? []) as AssessmentRow[]).filter(
      (a) => !!a.assessment_id
    );

    const assessmentIds = assessments.map((a) => a.assessment_id);

    let scoresByAssessment: Record<string, ScoreRow> = {};

    if (assessmentIds.length > 0) {
      const { data: scoresData, error: scoresError } = await admin
        .from("assessment_scores")
        .select("assessment_id, scores_json")
        .in("assessment_id", assessmentIds);

      if (scoresError) {
        return NextResponse.json(
          {
            ok: false,
            error: `Erro ao buscar escores: ${scoresError.message}`,
          },
          { status: 500 }
        );
      }

      for (const s of (scoresData ?? []) as ScoreRow[]) {
        if (s.assessment_id) {
          scoresByAssessment[s.assessment_id] = s;
        }
      }
    }

    const rows = assessments.map((a) => {
      const score = scoresByAssessment[a.assessment_id];

      return {
        assessment_id: a.assessment_id,
        submitted_at: a.submitted_at,
        created_at: a.created_at,
        instrument_version: a.instrument_version,
        status: a.status,
        readiness_score: null,
        scores_json: score?.scores_json ?? null,
      };
    });

    const firstScoreJson = rows.find((r) => r.scores_json)?.scores_json ?? null;

    return NextResponse.json({
      ok: true,
      athlete,
      rows,
      debug: {
        role,
        user_id: user.id,
        requested_athlete_id: requestedAthleteId,
        resolved_athlete_id: athleteId,
        assessments_count: assessments.length,
        assessment_ids: assessmentIds,
        scores_count: Object.keys(scoresByAssessment).length,
        score_assessment_ids: Object.keys(scoresByAssessment),
        first_score_json: scoreMapInfo(firstScoreJson),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "Erro inesperado ao montar dashboard.",
      },
      { status: 500 }
    );
  }
}