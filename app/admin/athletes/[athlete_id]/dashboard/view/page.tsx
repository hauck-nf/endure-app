import { redirect } from "next/navigation";

export default async function AdminAthleteDashboardViewRedirectPage({
  params,
}: {
  params: Promise<{ athlete_id: string }>;
}) {
  const { athlete_id } = await params;

  redirect(`/admin/athletes/${athlete_id}/dashboard`);
}