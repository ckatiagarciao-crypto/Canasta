"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: clave,
    });
    setCargando(false);
    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#F5F8FC" }}>
      <form
        onSubmit={entrar}
        style={{
          width: 340,
          background: "#fff",
          border: "1px solid #E1E9F4",
          borderRadius: 14,
          padding: 28,
          boxShadow: "0 8px 24px rgba(8,35,74,.08)",
        }}
      >
        <h1 style={{ fontSize: 18, marginBottom: 4 }}>Costeador de Canastas</h1>
        <p style={{ fontSize: 13, color: "#5D7292", marginBottom: 20 }}>Ingresa con tu cuenta de equipo</p>

        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Correo</label>
        <input
          type="email"
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          style={{ width: "100%", padding: 10, border: "1px solid #E1E9F4", borderRadius: 9, marginBottom: 14 }}
        />

        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Contraseña</label>
        <input
          type="password"
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          style={{ width: "100%", padding: 10, border: "1px solid #E1E9F4", borderRadius: 9, marginBottom: 14 }}
        />

        {error && <p style={{ color: "#DC2626", fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          style={{
            width: "100%",
            padding: 11,
            borderRadius: 10,
            border: 0,
            background: "#1256D2",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {cargando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
