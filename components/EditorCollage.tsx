"use client";

import { useEffect, useRef, useState } from "react";
import { urlsFirmadas } from "@/lib/db";
import type { EstadoCanasta, Producto } from "@/lib/tipos";

type PiezaFuente = { nombre: string; src: string; esFondo?: boolean };

function rnd(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function EditorCollage({
  items,
  productos,
  cajaFondoPath,
  onGuardar,
  onCerrar,
}: {
  items: EstadoCanasta["items"];
  productos: Producto[];
  cajaFondoPath: string;
  onGuardar: (dataUrl: string) => void;
  onCerrar: () => void;
}) {
  const lienzoRef = useRef<HTMLDivElement>(null);
  const zTope = useRef(100);
  const zFondo = useRef(-1);
  const [cargando, setCargando] = useState(true);
  const [piezas, setPiezas] = useState<PiezaFuente[]>([]);
  const [sinFoto, setSinFoto] = useState<string[]>([]);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      const porCod = new Map(productos.map((p) => [p.cod, p]));
      const rutas: string[] = [];
      if (cajaFondoPath) rutas.push(cajaFondoPath);
      items.forEach((i) => {
        const p = porCod.get(i.cod);
        if (p?.foto_url) rutas.push(p.foto_url);
      });

      let mapa: Record<string, string> = {};
      try {
        mapa = await urlsFirmadas(rutas);
      } catch {
        mapa = {};
      }
      if (cancelado) return;

      const faltantes: string[] = [];
      const lista: PiezaFuente[] = [];
      if (cajaFondoPath && mapa[cajaFondoPath]) {
        lista.push({ nombre: "Caja", src: mapa[cajaFondoPath], esFondo: true });
      }
      items.forEach((i) => {
        const p = porCod.get(i.cod);
        const url = p?.foto_url ? mapa[p.foto_url] : undefined;
        const veces = Math.max(1, Math.round(i.cantidad) || 1);
        if (!url) {
          faltantes.push(i.nombre);
          return;
        }
        for (let k = 0; k < veces; k++) lista.push({ nombre: i.nombre, src: url });
      });

      setPiezas(lista);
      setSinFoto(faltantes);
      setCargando(false);
    }
    cargar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cargando) nuevoAcomodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando]);

  function aplicarTransform(el: HTMLElement) {
    el.style.transform = `translate(-50%, -50%) rotate(${el.dataset.rot}deg)`;
  }

  function deseleccionarTodas() {
    lienzoRef.current?.querySelectorAll(".pieza.seleccionada").forEach((p) => p.classList.remove("seleccionada"));
  }

  function pintar(acomodo: (PiezaFuente & { xPct: number; yPct: number; rot: number; sizePct: number; zIndex: number })[]) {
    const lienzo = lienzoRef.current;
    if (!lienzo) return;
    lienzo.innerHTML = "";
    zTope.current = 100;
    zFondo.current = -1;

    acomodo.forEach((p) => {
      const el = document.createElement("div");
      el.className = "pieza-ec";
      el.style.zIndex = String(p.zIndex);
      el.style.left = p.xPct + "%";
      el.style.top = p.yPct + "%";
      el.style.width = p.sizePct + "%";
      el.dataset.rot = String(p.rot);
      el.dataset.size = String(p.sizePct);
      el.title = p.nombre;
      el.style.transform = `translate(-50%, -50%) rotate(${p.rot}deg)`;

      const img = document.createElement("img");
      img.src = p.src;
      img.crossOrigin = "anonymous";
      img.draggable = false;
      el.appendChild(img);

      const barra = document.createElement("div");
      barra.className = "barra-ec";
      const btnDerecho = document.createElement("button");
      btnDerecho.type = "button";
      btnDerecho.textContent = "Derecho";
      btnDerecho.addEventListener("pointerdown", (e) => e.stopPropagation());
      btnDerecho.addEventListener("click", () => {
        el.dataset.rot = "0";
        aplicarTransform(el);
      });
      const btnAdelante = document.createElement("button");
      btnAdelante.type = "button";
      btnAdelante.textContent = "Adelante";
      btnAdelante.addEventListener("pointerdown", (e) => e.stopPropagation());
      btnAdelante.addEventListener("click", () => {
        zTope.current += 1;
        el.style.zIndex = String(zTope.current);
      });
      const btnAtras = document.createElement("button");
      btnAtras.type = "button";
      btnAtras.textContent = "Atrás";
      btnAtras.addEventListener("pointerdown", (e) => e.stopPropagation());
      btnAtras.addEventListener("click", () => {
        zFondo.current -= 1;
        el.style.zIndex = String(zFondo.current);
      });
      barra.append(btnDerecho, btnAdelante, btnAtras);
      el.appendChild(barra);

      const manijaRotar = document.createElement("div");
      manijaRotar.className = "manija-ec manija-rotar-ec";
      el.appendChild(manijaRotar);
      const manijaResize = document.createElement("div");
      manijaResize.className = "manija-ec manija-resize-ec";
      el.appendChild(manijaResize);

      lienzo.appendChild(el);
      habilitarArrastre(el);
      habilitarRotar(el, manijaRotar);
      habilitarResize(el, manijaResize);
    });
  }

  function habilitarArrastre(el: HTMLElement) {
    el.addEventListener("pointerdown", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest(".manija-ec") || target.closest(".barra-ec")) return;
      e.preventDefault();
      deseleccionarTodas();
      el.classList.add("seleccionada");
      el.setPointerCapture(e.pointerId);
      const inicio = { x: e.clientX, y: e.clientY };
      let movido = false;
      zTope.current += 1;
      el.style.zIndex = String(zTope.current);

      const mover = (ev: PointerEvent) => {
        if (Math.abs(ev.clientX - inicio.x) > 3 || Math.abs(ev.clientY - inicio.y) > 3) movido = true;
        if (!movido) return;
        el.classList.add("arrastrando");
        const rect = lienzoRef.current!.getBoundingClientRect();
        let xPct = ((ev.clientX - rect.left) / rect.width) * 100;
        let yPct = ((ev.clientY - rect.top) / rect.height) * 100;
        xPct = Math.max(0, Math.min(100, xPct));
        yPct = Math.max(0, Math.min(100, yPct));
        el.style.left = xPct + "%";
        el.style.top = yPct + "%";
      };
      const soltar = () => {
        el.classList.remove("arrastrando");
        el.removeEventListener("pointermove", mover);
        el.removeEventListener("pointerup", soltar);
      };
      el.addEventListener("pointermove", mover);
      el.addEventListener("pointerup", soltar);
    });
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      const actual = parseFloat(el.dataset.size || "20");
      const nuevo = Math.max(8, Math.min(90, actual + (e.deltaY < 0 ? 1.6 : -1.6)));
      el.dataset.size = String(nuevo);
      el.style.width = nuevo + "%";
    }, { passive: false });
  }

  function habilitarRotar(el: HTMLElement, manija: HTMLElement) {
    manija.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      manija.setPointerCapture(e.pointerId);
      const mover = (ev: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angulo = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
        el.dataset.rot = angulo.toFixed(1);
        aplicarTransform(el);
      };
      const soltar = () => {
        manija.removeEventListener("pointermove", mover);
        manija.removeEventListener("pointerup", soltar);
      };
      manija.addEventListener("pointermove", mover);
      manija.addEventListener("pointerup", soltar);
    });
  }

  function habilitarResize(el: HTMLElement, manija: HTMLElement) {
    manija.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      manija.setPointerCapture(e.pointerId);
      const mover = (ev: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(ev.clientX - cx, ev.clientY - cy);
        const ladoPx = dist * Math.SQRT2;
        const lienzoRect = lienzoRef.current!.getBoundingClientRect();
        let nuevoPct = (ladoPx / lienzoRect.width) * 100;
        nuevoPct = Math.max(8, Math.min(90, nuevoPct));
        el.dataset.size = String(nuevoPct);
        el.style.width = nuevoPct + "%";
      };
      const soltar = () => {
        manija.removeEventListener("pointermove", mover);
        manija.removeEventListener("pointerup", soltar);
      };
      manija.addEventListener("pointermove", mover);
      manija.addEventListener("pointerup", soltar);
    });
  }

  function generarAcomodo() {
    const productosSolo = piezas.filter((p) => !p.esFondo);
    const fondo = piezas.find((p) => p.esFondo);
    const n = productosSolo.length;

    const resultado: (PiezaFuente & { xPct: number; yPct: number; rot: number; sizePct: number; zIndex: number })[] = [];
    if (fondo) {
      resultado.push({ ...fondo, zIndex: 0, xPct: 50, yPct: 40, rot: 0, sizePct: 58 });
    }

    // Los productos van en fila abajo, en orden, uno a continuación del otro.
    const sizePct = Math.max(9, Math.min(20, 84 / Math.max(n, 1)));
    productosSolo.forEach((p, i) => {
      const xPct = n === 1 ? 50 : 8 + i * (84 / (n - 1));
      resultado.push({
        ...p,
        zIndex: i + 1,
        xPct,
        yPct: 86,
        rot: rnd(-4, 4),
        sizePct,
      });
    });
    return resultado;
  }

  function nuevoAcomodo() {
    if (!piezas.length) return;
    pintar(generarAcomodo());
  }

  function guardar() {
    deseleccionarTodas();
    const lienzo = lienzoRef.current;
    if (!lienzo) return;
    const ANCHO = 1200, ALTO = 900;
    const cv = document.createElement("canvas");
    cv.width = ANCHO;
    cv.height = ALTO;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#EAF3FE";
    ctx.fillRect(0, 0, ANCHO, ALTO);

    const nodos = Array.from(lienzo.querySelectorAll<HTMLElement>(".pieza-ec")).sort(
      (a, b) => (parseInt(a.style.zIndex) || 0) - (parseInt(b.style.zIndex) || 0)
    );
    nodos.forEach((el) => {
      const img = el.querySelector("img");
      if (!img) return;
      const xPct = parseFloat(el.style.left);
      const yPct = parseFloat(el.style.top);
      const sizePct = parseFloat(el.dataset.size || "20");
      const rot = parseFloat(el.dataset.rot || "0");
      ctx.save();
      ctx.translate((xPct / 100) * ANCHO, (yPct / 100) * ALTO);
      ctx.rotate((rot * Math.PI) / 180);
      const sizePx = (sizePct / 100) * ANCHO;
      ctx.drawImage(img, -sizePx / 2, -sizePx / 2, sizePx, sizePx);
      ctx.restore();
    });

    onGuardar(cv.toDataURL("image/png"));
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(8,35,74,.55)", zIndex: 200, display: "grid", placeItems: "center", padding: 20 }}>
      <style>{`
        .pieza-ec{position:absolute;left:50%;top:50%;cursor:grab;filter:drop-shadow(0 6px 10px rgba(8,35,74,.20));touch-action:none;width:20%;aspect-ratio:1/1}
        .pieza-ec img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none}
        .pieza-ec.arrastrando{cursor:grabbing}
        .pieza-ec:hover{outline:1.5px solid var(--celeste-borde);outline-offset:3px;border-radius:6px}
        .pieza-ec.seleccionada{outline:1.5px solid var(--azul);outline-offset:4px;border-radius:6px;z-index:998 !important}
        .manija-ec{position:absolute;display:none}
        .pieza-ec.seleccionada .manija-ec{display:block}
        .manija-rotar-ec{top:-30px;left:50%;transform:translateX(-50%);width:16px;height:16px;border-radius:50%;background:var(--azul);border:2px solid #fff;box-shadow:0 1px 4px rgba(8,35,74,.4);cursor:grab}
        .manija-resize-ec{bottom:-7px;right:-7px;width:14px;height:14px;border-radius:4px;background:var(--azul);border:2px solid #fff;box-shadow:0 1px 4px rgba(8,35,74,.4);cursor:nwse-resize}
        .barra-ec{position:absolute;display:none;gap:5px;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:var(--navy);border-radius:999px;padding:4px;white-space:nowrap}
        .pieza-ec.seleccionada .barra-ec{display:flex}
        .barra-ec button{border:0;background:transparent;color:#fff;font-size:10.5px;font-weight:600;padding:5px 9px;border-radius:999px;cursor:pointer;font-family:inherit}
        .barra-ec button:hover{background:rgba(255,255,255,.15)}
      `}</style>
      <div className="card" style={{ width: "min(920px, 100%)", maxHeight: "90vh", overflow: "auto" }}>
        <div className="card-h">
          <h2>Armar foto de la canasta</h2>
          <button className="btn chico plano" onClick={onCerrar}>Cerrar</button>
        </div>
        <div className="card-b">
          {cargando ? (
            <p style={{ color: "var(--texto-suave)", fontSize: 13 }}>Cargando fotos...</p>
          ) : !piezas.length ? (
            <p style={{ color: "var(--texto-suave)", fontSize: 13 }}>
              Ninguno de los productos de esta canasta tiene foto todavía. Agrégales fotos en la pestaña Catálogo primero.
            </p>
          ) : (
            <>
              <div
                ref={lienzoRef}
                onPointerDown={(e) => {
                  if (e.target === lienzoRef.current) deseleccionarTodas();
                }}
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4/3",
                  background: "var(--celeste-suave)",
                  border: "1.5px dashed var(--celeste-borde)",
                  borderRadius: 11,
                  overflow: "hidden",
                  touchAction: "none",
                  userSelect: "none",
                }}
              />
              {sinFoto.length > 0 && (
                <p style={{ marginTop: 10, fontSize: 11.5, color: "var(--alerta)" }}>
                  Sin foto todavía, no aparecen: {sinFoto.join(", ")}.
                </p>
              )}
              <p style={{ marginTop: 10, fontSize: 11.5, color: "var(--texto-suave)" }}>
                Arrastra para mover. Haz clic en una pieza para girarla, cambiar su tamaño, o mandarla adelante/atrás.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button className="btn primario" onClick={guardar}>Guardar y usar esta foto</button>
                <button className="btn" onClick={nuevoAcomodo}>Generar de nuevo</button>
                <button className="btn plano" onClick={onCerrar}>Cancelar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
