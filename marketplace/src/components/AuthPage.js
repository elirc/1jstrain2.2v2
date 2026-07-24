"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client-api";

export default function AuthPageView() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "BUYER"
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      await apiRequest(path, {
        method: "POST",
        body: JSON.stringify(form)
      });

      setSuccess(mode === "login" ? "Logged in." : "Account created.");
      router.refresh();
      router.push("/");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="cols-2">
      <div className="card stack">
        <h1>{mode === "login" ? "Sign In" : "Create Account"}</h1>
        <p>Buyer, seller, and admin role-specific experiences are enabled after login.</p>

        <form className="stack" onSubmit={submit}>
          {mode === "register" ? (
            <div>
              <label>Name</label>
              <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
            </div>
          ) : null}

          <div>
            <label>Email</label>
            <input value={form.email} onChange={(event) => update("email", event.target.value)} required />
          </div>

          <div>
            <label>Password</label>
            <input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} required />
          </div>

          {mode === "register" ? (
            <div>
              <label>Role</label>
              <select value={form.role} onChange={(event) => update("role", event.target.value)}>
                <option value="BUYER">Buyer</option>
                <option value="SELLER">Seller</option>
              </select>
            </div>
          ) : null}

          {error ? <div className="alert error">{error}</div> : null}
          {success ? <div className="alert success">{success}</div> : null}

          <button type="submit">{mode === "login" ? "Login" : "Register"}</button>
        </form>

        <button type="button" className="button ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
        </button>
      </div>

      <div className="card stack">
        <h2>Demo Accounts</h2>
        <p>Admin: admin@market.dev / Admin123!</p>
        <p>Seller: seller@market.dev / Seller123!</p>
        <p>Buyer: buyer@market.dev / Buyer123!</p>
      </div>
    </section>
  );
}

