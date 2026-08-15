"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CuentaPage() {
  const router = useRouter();
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function cambiarClave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (nueva.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (nueva !== repetir) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: nueva });
    setCargando(false);

    if (error) {
      setError("No se pudo cambiar la contraseña. Intenta de nuevo.");
      return;
    }
    setMensaje("Contraseña actualizada.");
    setNueva("");
    setRepetir("");
  }

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#F5F8FC" }}>
      <div
        style={{
          width: 360,
          background: "#fff",
          border: "1px solid #E1E9F4",
          borderRadius: 14,
          padding: 28,
          boxShadow: "0 8px 24px rgba(8,35,74,.08)",
        }}
      >
        <h1 style={{ fontSize: 18, marginBottom: 4 }}>Mi cuenta</h1>
        <p style={{ fontSize: 13, color: "#5D7292", marginBottom: 20 }}>Cambia tu contraseña</p>

        <form onSubmit={cambiarClave}>
          <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Nueva contraseña
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            style={{ width: "100%", padding: 10, border: "1px solid #E1E9F4", borderRadius: 9, marginBottom: 14 }}
          />

          <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Repetir contraseña
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
            style={{ width: "100%", padding: 10, border: "1px solid #E1E9F4", borderRadius: 9, marginBottom: 14 }}
          />

          {error && <p style={{ color: "#DC2626", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          {mensaje && <p style={{ color: "#0E9F6E", fontSize: 13, marginBottom: 12 }}>{mensaje}</p>}

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
              marginBottom: 10,
            }}
          >
            {cargando ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>

        <button
          type="button"
          onClick={cerrarSesion}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #E1E9F4",
            background: "#fff",
            color: "#5D7292",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
