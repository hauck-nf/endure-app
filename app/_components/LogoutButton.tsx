"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

export default function LogoutButton({
  className,
  onDone,
  label = "Sair",
}: {
  className?: string;
  onDone?: () => void;
  label?: string;
}) {
  const router = useRouter();

  async function doLogout() {
    try {
      await supabaseBrowser.auth.signOut();
    } finally {
      onDone?.();
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button type="button" onClick={doLogout} className={className} aria-label="Sair">
      {label}
      <span aria-hidden="true" className="chev">›</span>
    </button>
  );
}