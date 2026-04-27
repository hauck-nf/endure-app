import type { ReactNode } from "react";
import AthleteChrome from "./_components/AthleteChrome";

export default function AthleteLayout({ children }: { children: ReactNode }) {
  return <AthleteChrome>{children}</AthleteChrome>;
}