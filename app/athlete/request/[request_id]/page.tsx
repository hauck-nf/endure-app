import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    request_id: string;
  }>;
};

export default async function AthleteRequestRedirectPage({ params }: PageProps) {
  const { request_id } = await params;

  redirect(`/athlete/flow/${request_id}`);
}