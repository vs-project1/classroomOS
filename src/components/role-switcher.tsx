"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function RoleSwitcher({ currentRole }: { currentRole: string }) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const toggleRole = () => {
    const newRole = currentRole === "ADMIN" ? "STUDENT" : "ADMIN";
    document.cookie = `APP_ROLE=${newRole}; path=/`;
    router.refresh();
  };

  return (
    <button
      onClick={toggleRole}
      className="fixed bottom-4 right-4 z-50 bg-black text-white px-4 py-2 rounded-full shadow-lg font-mono text-sm opacity-50 hover:opacity-100 transition-opacity"
    >
      Swaping to {currentRole === "ADMIN" ? "STUDENT" : "ADMIN"}
    </button>
  );
}
