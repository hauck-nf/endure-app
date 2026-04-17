import { requireAthlete } from "@/src/lib/requireAthlete";
import AthleteShell from "./AthleteShell";

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  await requireAthlete();
  return <AthleteShell>{children}</AthleteShell>;
}
