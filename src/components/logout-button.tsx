"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function signOut() {
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("Could not sign out. Please try again.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  return (
    <span className="logout-control">
      <button className="login-link logout-link" onClick={signOut} type="button">Log out</button>
      {error && <span className="logout-error" role="alert">{error}</span>}
    </span>
  );
}
