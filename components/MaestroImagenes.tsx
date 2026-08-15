"use client";

import { useState } from "react";
import { extraerImagenesDePptx, type ImagenExtraida } from "@/lib/pptx";
import { subirFotoProducto } from "@/lib/db";
import type { Producto } from "@/lib/tipos";

type Fila = ImagenExtraida & { productoId: string; guardada: boolean };

export default function MaestroImagenes({
  productos,
  onFotoSubida,
  onCerrar,
  avisar,
}: {
  productos: Producto[];
  onFotoSubida: (productoId: string, path: string) => void;
  onCerrar: () => void;
  avisar: (m: string) => void;
}) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardandoTodo, setGuardandoTodo] = useState(false);

  async function elegirArchivo(file: File) {
    setCargando(true);
    try {
      const imagenes = await extraerImagenesDePptx(file);
      if (!imagenes.length) {
        avisar("No se encontraron imágenes dentro de ese archivo");
      }
      setFilas(imagenes.map((im) => ({ ...im, productoId: "", guardada: false })));
    } catch {
      avisar("No se pudo leer ese PowerPoint");
    } finally {
      setCargando(false);
    }
  }

  function asignar(i: number, productoId: string) {
    setFilas((fs) => fs.map((f, ix) => (ix === i ? { ...f, productoId } : f)));
  }

  async function guardarUna(i: number) {
    const fila = filas[i];
    const producto = productos.find((p) => p.id === fila.productoId);
    if (!producto) return;
    try {
      const archivo = new File([fila.blob], fila.nombreArchivo, { type: fila.blob.type });
      const path = await subirFotoProducto(producto, archivo);
      onFotoSubida(producto.id, path);
      setFilas((fs) => fs.map((f, ix) => (ix === i ? { ...f, guardada: true } : f)));
    } catch {
      avisar(`No se pudo guardar la foto de ${producto.nombre}`);
    }
  }

  async function guardarTodas() {
    setGuardandoTodo(true);
    const pendientes = filas
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f.productoId && !f.guardada);
    for (const { i } of pendientes) {
      await guardarUna(i);
    }
    setGuardandoTodo(false);
    avisar("Listo, se guardaron las fotos asignadas");
  }

  const asignadas = filas.filter((f) => f.productoId && !f.guardada).length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(8,35,74,.55)", zIndex: 200, display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: "min(760px, 100%)", maxHeight: "90vh", overflow: "auto" }}>
        <div className="card-h">
          <h2>Maestro de imágenes</h2>
          <button className="btn chico plano" onClick={onCerrar}>Cerrar</button>
        </div>
        <div className="card-b">
          {!filas.length ? (
            <>
              <p style={{ fontSize: 12.5, color: "var(--texto-suave)", marginTop: 0 }}>
                Sube un PowerPoint con fotos de productos. Voy a sacar cada imagen de adentro para que elijas a qué producto de tu catálogo corresponde.
              </p>
              <input
                type="file"
                accept=".pptx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) elegirArchivo(f);
                }}
              />
              {cargando && <p style={{ fontSize: 12.5, color: "var(--texto-suave)" }}>Leyendo el archivo...</p>}
            </>
          ) : (
            <>
              <p style={{ fontSize: 12.5, color: "var(--texto-suave)", marginTop: 0 }}>
                Se encontraron {filas.length} imágenes. Elige el producto de cada una (las que dejes sin elegir se ignoran).
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginTop: 10 }}>
                {filas.map((f, i) => (
                  <div key={i} className="card" style={{ padding: 10, opacity: f.guardada ? 0.55 : 1 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <img src={f.url} alt={f.nombreArchivo} style={{ width: 52, height: 52, objectFit: "contain", background: "#fff", border: "1px solid var(--linea)", borderRadius: 7 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <select
                          value={f.productoId}
                          disabled={f.guardada}
                          onChange={(e) => asignar(i, e.target.value)}
                          style={{ fontSize: 12 }}
                        >
                          <option value="">Elegir producto...</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>{p.cod} — {p.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {f.guardada && <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--ok)" }}>Guardada</p>}
                    {!f.guardada && f.productoId && (
                      <button className="btn chico" style={{ marginTop: 6, width: "100%" }} onClick={() => guardarUna(i)}>
                        Guardar esta
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <button className="btn primario" onClick={guardarTodas} disabled={!asignadas || guardandoTodo}>
                  {guardandoTodo ? "Guardando..." : `Guardar todas las asignadas (${asignadas})`}
                </button>
                <button className="btn plano" onClick={onCerrar}>Listo, cerrar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
