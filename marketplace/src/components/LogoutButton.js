"use client";

import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client-api";

export default function LogoutButton() {
  const router = useRouter();

  async function onLogout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      router.refresh();
      router.push("/");
    } catch {
      // noop
    }
  }

  return (
    <button type="button" className="button ghost" onClick={onLogout}>
      Logout
    </button>
  );
}

