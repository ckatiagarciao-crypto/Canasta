"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calcular, armadoSugerido, unidadesArmado, S, pct } from "@/lib/calculo";
import { comprimir } from "@/lib/imagen";
import { generarPDF } from "@/lib/pdf";
import { generarExcel } from "@/lib/excel";
import {
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  restaurarCatalogoBase,
  listarCanastas,
  guardarCanasta,
  eliminarCanasta,
  obtenerEmisor,
  guardarEmisor,
} from "@/lib/db";
import { CATEGORIAS, nuevoEstado, nuevoEmisor } from "@/lib/tipos";
import type { CanastaGuardada, Emisor, EstadoCanasta, ItemCanasta, Producto } from "@/lib/tipos";

type Tab = "armar" | "cotizacion" | "catalogo" | "historial";

export default function Costeador({
  productosIniciales,
  correoUsuaria,
}: {
  productosIniciales: Producto[];
  correoUsuaria: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("armar");
  const [productos, setProductos] = useState<Producto[]>(productosIniciales);
  const [st, setSt] = useState<EstadoCanasta>(nuevoEstado());
  const [emisor, setEmisor] = useState<Emisor>(nuevoEmisor());
  const [historial, setHistorial] = useState<CanastaGuardada[] | null>(null);
  const [toast, setToast] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [q, setQ] = useState("");
  const [qcat, setQcat] = useState("todas");

  function avisar(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  useEffect(() => {
    obtenerEmisor()
      .then(setEmisor)
      .catch(() => avisar("No se pudo cargar los datos de tu empresa"));
  }, []);

  const armadoEfectivo = useMemo(
    () => (st.armadoManual ? st.armado : armadoSugerido(st.items)),
    [st.armado, st.armadoManual, st.items]
  );
  const stCalculo = useMemo(() => ({ ...st, armado: armadoEfectivo }), [st, armadoEfectivo]);
  const c = useMemo(() => calcular(stCalculo), [stCalculo]);

  async function cargarHistorial() {
    try {
      const h = await listarCanastas();
      setHistorial(h);
    } catch {
      avisar("No se pudo cargar el historial");
    }
  }

  function cambiarTab(t: Tab) {
    setTab(t);
    if (t === "historial" && historial === null) cargarHistorial();
  }

  function agregarProducto(p: Producto) {
    setSt((s) => {
      const existe = s.items.find((i) => i.cod === p.cod);
      if (existe) {
        return { ...s, items: s.items.map((i) => (i.cod === p.cod ? { ...i, cantidad: i.cantidad + 1 } : i)) };
      }
      const nuevo: ItemCanasta = { cod: p.cod, nombre: p.nombre, proveedor: p.proveedor, precio_unitario: p.precio_unitario, cantidad: 1 };
      return { ...s, items: [...s.items, nuevo] };
    });
  }

  function actualizarItem(ix: number, cambios: Partial<ItemCanasta>) {
    setSt((s) => ({ ...s, items: s.items.map((i, j) => (j === ix ? { ...i, ...cambios } : i)) }));
  }

  function quitarItem(ix: number) {
    setSt((s) => ({ ...s, items: s.items.filter((_, j) => j !== ix) }));
  }

  function agregarOtro() {
    setSt((s) => ({ ...s, otros: [...s.otros, { concepto: "", monto: 0 }] }));
  }
  function actualizarOtro(ix: number, cambios: Partial<{ concepto: string; monto: number }>) {
    setSt((s) => ({ ...s, otros: s.otros.map((o, j) => (j === ix ? { ...o, ...cambios } : o)) }));
  }
  function quitarOtro(ix: number) {
    setSt((s) => ({ ...s, otros: s.otros.filter((_, j) => j !== ix) }));
  }

  function nuevaCanasta() {
    if (st.items.length && !confirm("Se limpiará la canasta actual. ¿Continuar?")) return;
    setSt(nuevoEstado());
    avisar("Canasta nueva lista");
  }

  async function guardarCanastaActual() {
    if (!st.items.length) return avisar("Agrega productos antes de guardar");
    if (!st.nombre.trim()) return avisar("Ponle un nombre a la canasta");
    setGuardando(true);
    try {
      const id = await guardarCanasta(stCalculo);
      setSt((s) => ({ ...s, id }));
      setHistorial(null);
      avisar("Canasta guardada");
    } catch {
      avisar("No se pudo guardar la canasta");
    } finally {
      setGuardando(false);
    }
  }

  function abrirCanasta(h: CanastaGuardada, comoCopia: boolean) {
    const copia: EstadoCanasta = { ...h };
    if (comoCopia) {
      copia.id = "";
      copia.nombre = h.nombre + " (copia)";
      copia.codigo = "";
    }
    setSt(copia);
    setTab("armar");
    avisar(comoCopia ? "Copia lista para editar" : "Canasta abierta");
  }

  async function borrarCanastaGuardada(id: string) {
    if (!confirm("¿Eliminar esta canasta guardada?")) return;
    try {
      await eliminarCanasta(id);
      setHistorial((h) => (h ? h.filter((x) => x.id !== id) : h));
      avisar("Canasta eliminada");
    } catch {
      avisar("No se pudo eliminar");
    }
  }

  async function subirFotoCanasta(file: File) {
    try {
      const url = await comprimir(file, 900, "image/jpeg");
      setSt((s) => ({ ...s, fotoUrl: url }));
      avisar("Foto cargada");
    } catch {
      avisar("No se pudo cargar la imagen");
    }
  }

  async function guardarCambiosEmisor(cambios: Partial<Emisor>) {
    const nuevo = { ...emisor, ...cambios };
    setEmisor(nuevo);
    try {
      const guardado = await guardarEmisor(nuevo);
      if (guardado.id !== nuevo.id) setEmisor(guardado);
    } catch {
      avisar("No se pudo guardar los datos de tu empresa");
    }
  }

  async function subirLogoEmisor(file: File) {
    try {
      const url = await comprimir(file, 700, "image/png");
      await guardarCambiosEmisor({ logoUrl: url });
      avisar("Logo cargado");
    } catch {
      avisar("No se pudo cargar el logo");
    }
  }

  async function descargarPDF() {
    try {
      await generarPDF(st, emisor);
      avisar("Cotización descargada");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo generar el PDF");
    }
  }
  async function descargarExcel() {
    try {
      await generarExcel(st);
      avisar("Excel descargado");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo generar el Excel");
    }
  }

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const catalogoFiltrado = useMemo(() => {
    const qq = q.toLowerCase().trim();
    return productos.filter(
      (p) => (qcat === "todas" || p.categoria === qcat) && (!qq || (p.nombre + " " + p.proveedor + " " + p.cod).toLowerCase().includes(qq))
    );
  }, [productos, q, qcat]);

  return (
    <div>
      <div className="top">
        <div className="top-in">
          <div className="marca">
            <div className="logo">CN</div>
            <div>
              <h1>Costeador de Canastas Navideñas</h1>
              <p>Del formulario al Excel en un clic</p>
            </div>
          </div>
          <button className="btn" onClick={nuevaCanasta}>Nueva canasta</button>
          <button className="btn" onClick={guardarCanastaActual} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar canasta"}
          </button>
          <button className="btn" onClick={descargarPDF}>Cotización PDF</button>
          <button className="btn primario" onClick={descargarExcel}>Descargar Excel</button>
          <Link href="/cuenta" className="btn chico plano" title={correoUsuaria}>{correoUsuaria}</Link>
          <button className="btn chico plano" onClick={cerrarSesion}>Salir</button>
        </div>
      </div>

      <div className="wrap">
        <div className="tabs" role="tablist">
          <button className="tab" role="tab" aria-selected={tab === "armar"} onClick={() => cambiarTab("armar")}>Armar canasta</button>
          <button className="tab" role="tab" aria-selected={tab === "cotizacion"} onClick={() => cambiarTab("cotizacion")}>Cotización</button>
          <button className="tab" role="tab" aria-selected={tab === "catalogo"} onClick={() => cambiarTab("catalogo")}>Catálogo</button>
          <button className="tab" role="tab" aria-selected={tab === "historial"} onClick={() => cambiarTab("historial")}>Historial</button>
        </div>

        {tab === "armar" && (
          <div className="grid">
            <div>
              <div className="card">
                <div className="card-h"><h2>Datos de la canasta</h2></div>
                <div className="card-b">
                  <div className="campos">
                    <div><label>Nombre de la canasta</label><input value={st.nombre} onChange={(e) => setSt((s) => ({ ...s, nombre: e.target.value }))} placeholder="Canasta Premium 2026" /></div>
                    <div><label>Código</label><input value={st.codigo} onChange={(e) => setSt((s) => ({ ...s, codigo: e.target.value }))} placeholder="CN-2026-001" /></div>
                    <div><label>Cliente</label><input value={st.cliente} onChange={(e) => setSt((s) => ({ ...s, cliente: e.target.value }))} placeholder="Opcional" /></div>
                    <div><label>Fecha</label><input type="date" value={st.fecha} onChange={(e) => setSt((s) => ({ ...s, fecha: e.target.value }))} /></div>
                    <div><label>Número de canastas</label><input className="num" type="number" min={1} step={1} value={st.unidades} onChange={(e) => setSt((s) => ({ ...s, unidades: Number(e.target.value) || 1 }))} /></div>
                    <div><label>Validez de la oferta</label><input value={st.validez} onChange={(e) => setSt((s) => ({ ...s, validez: e.target.value }))} placeholder="15 días" /></div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-h"><h2>Catálogo</h2><span className="hint">{catalogoFiltrado.length} de {productos.length} productos</span></div>
                <div className="card-b">
                  <div className="buscador">
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto, marca o proveedor" />
                    <select value={qcat} onChange={(e) => setQcat(e.target.value)}>
                      <option value="todas">Todas las categorías</option>
                      {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="cat-lista">
                    {catalogoFiltrado.length ? catalogoFiltrado.map((p) => (
                      <div key={p.id} className="cat-fila" tabIndex={0} role="button"
                        onClick={() => agregarProducto(p)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); agregarProducto(p); } }}>
                        <span className="cod">{p.cod}</span>
                        <span className="nom">{p.nombre}<small>{p.proveedor} · {p.categoria}</small></span>
                        <span className="pre">{S(p.precio_unitario)}</span>
                        <span className="mas">+</span>
                      </div>
                    )) : <div className="vacio"><strong>Sin resultados</strong>Prueba con otra palabra o cambia la categoría.</div>}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-h"><h2>Contenido de la canasta</h2><span className="hint">{st.items.length ? st.items.length + " productos" : ""}</span></div>
                {!st.items.length ? (
                  <div className="vacio"><strong>Todavía no hay productos</strong>Elige del catálogo de arriba para empezar a costear.</div>
                ) : (
                  <>
                    <div className="card-b" style={{ paddingTop: 14 }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: 66 }}>Código</th><th>Producto</th>
                            <th className="num" style={{ width: 86 }}>Cant.</th>
                            <th className="num" style={{ width: 108 }}>P. unit.</th>
                            <th className="num" style={{ width: 104 }}>Subtotal</th><th style={{ width: 34 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {st.items.map((i, ix) => (
                            <tr key={ix}>
                              <td style={{ color: "var(--azul)", fontWeight: 650, fontSize: 11.5 }}>{i.cod}</td>
                              <td>{i.nombre}<small style={{ display: "block", color: "var(--texto-suave)", fontSize: 11.5 }}>{i.proveedor}</small></td>
                              <td className="num"><input className="w-cant num" type="number" min={0} step={1} value={i.cantidad} onChange={(e) => actualizarItem(ix, { cantidad: Math.max(0, Number(e.target.value) || 0) })} /></td>
                              <td className="num"><input className="w-pre num" type="number" min={0} step={0.01} value={i.precio_unitario} onChange={(e) => actualizarItem(ix, { precio_unitario: Math.max(0, Number(e.target.value) || 0) })} /></td>
                              <td className="num" style={{ fontWeight: 600 }}>{S(i.precio_unitario * i.cantidad)}</td>
                              <td><button className="quitar" onClick={() => quitarItem(ix)} title="Quitar">×</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="total-pie" style={{ borderRadius: "0 0 var(--r) var(--r)" }}>
                      <span>Costo de productos por canasta, con IGV</span><b>{S(c.items)}</b>
                    </div>
                  </>
                )}
              </div>

              <div className="card">
                <div className="card-h"><h2>Armado y gastos</h2><span className="hint">{unidadesArmado(st.items)} ítems en la canasta · sugerido {S(armadoSugerido(st.items))}</span></div>
                <div className="card-b">
                  <div className="campos">
                    <div>
                      <label>Costo de armado por canasta</label>
                      <select value={String(armadoEfectivo)} onChange={(e) => setSt((s) => ({ ...s, armado: Number(e.target.value) || 5, armadoManual: true }))}>
                        <option value="5">S/ 5.00 · hasta 8 ítems</option>
                        <option value="10">S/ 10.00 · de 9 a 15 ítems</option>
                        <option value="15">S/ 15.00 · 16 ítems a más</option>
                      </select>
                    </div>
                    <div>
                      <label>Gastos administrativos (5%)</label>
                      <input className="num" readOnly value={S(c.admin)} style={{ background: "var(--celeste-suave)", borderColor: "var(--celeste-borde)", fontWeight: 600 }} />
                    </div>
                  </div>
                  <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--texto-suave)" }}>El 5% se calcula sobre el costo de productos más el armado. Se actualiza solo.</p>
                </div>
              </div>

              <div className="card">
                <div className="card-h"><h2>Otros costos por canasta</h2><span className="hint">Flete, etiqueta, tarjeta. Montos con IGV</span></div>
                <div className="card-b">
                  {st.otros.map((o, ix) => (
                    <div className="fila-otros" key={ix}>
                      <input placeholder="Armado, flete, etiqueta" value={o.concepto} onChange={(e) => actualizarOtro(ix, { concepto: e.target.value })} />
                      <input className="num" type="number" min={0} step={0.01} value={o.monto} onChange={(e) => actualizarOtro(ix, { monto: Math.max(0, Number(e.target.value) || 0) })} />
                      <button className="quitar" onClick={() => quitarOtro(ix)} title="Quitar">×</button>
                    </div>
                  ))}
                  <button className="btn chico" onClick={agregarOtro}>Agregar concepto</button>
                </div>
              </div>
            </div>

            <div className="sticky">
              <div className="card">
                <div className="card-h"><h2>Precio y margen</h2></div>
                <div className="card-b" style={{ marginBottom: 0 }}>
                  <div className="campos" style={{ marginBottom: 16 }}>
                    <div>
                      <label>Margen</label>
                      <input className="num" type="number" min={0} max={95} step={0.5} value={st.margen} onChange={(e) => setSt((s) => ({ ...s, margen: Number(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <label>Calculado sobre</label>
                      <select value={st.tipoMargen} onChange={(e) => setSt((s) => ({ ...s, tipoMargen: e.target.value as "costo" | "venta" }))}>
                        <option value="costo">Costo (markup)</option>
                        <option value="venta">Precio de venta</option>
                      </select>
                    </div>
                    <div>
                      <label>Descuento al cliente</label>
                      <input className="num" type="number" min={0} max={100} step={0.5} value={st.descuento} onChange={(e) => setSt((s) => ({ ...s, descuento: Number(e.target.value) || 0 }))} />
                    </div>
                  </div>
                  <label className="switch"><input type="checkbox" checked={st.factura} onChange={(e) => setSt((s) => ({ ...s, factura: e.target.checked }))} /> Emito factura, uso crédito fiscal del IGV</label>
                </div>
                <div className="card-b" style={{ borderTop: "1px solid var(--linea)", paddingBottom: 0 }}>
                  <BarraPrecio c={c} />
                  <ul className="cascada">
                    <FilaCascada et={"Productos" + (st.factura ? " sin IGV" : "")} vl={S(c.itemsBase)} />
                    <FilaCascada et="Armado" vl={S(c.armado)} tag={unidadesArmado(st.items) + " ítems"} />
                    <FilaCascada et="Gastos administrativos 5%" vl={S(c.admin)} />
                    {c.otros > 0 && <FilaCascada et={"Otros costos" + (st.factura ? " sin IGV" : "")} vl={S(c.otrosBase)} />}
                    <FilaCascada et="Costo total por canasta" vl={S(c.costo)} />
                    <FilaCascada et="Utilidad antes de impuesto" vl={S(c.utilidad)} tag={pct(c.margenEfectivo) + " sobre venta"} />
                    <FilaCascada et="Impuesto a la renta 10%" vl={"- " + S(c.ir)} />
                    <FilaCascada et="Utilidad neta" vl={S(c.utilidadNeta)} tag={pct(c.margenNeto) + " sobre venta"} />
                    <FilaCascada et="Precio de venta sin IGV" vl={S(c.ventaFinal)} />
                    {st.factura && <FilaCascada et="IGV 18%" vl={S(c.precioFinal - c.ventaFinal)} />}
                    <FilaCascada et="Precio al cliente" vl={S(c.precioCliente)} tag="antes de descuento" />
                    {c.montoDcto > 0 && <FilaCascada et={"Descuento " + pct(st.descuento)} vl={"- " + S(c.montoDcto)} />}
                    <li className="final"><span className="et">Precio final por canasta</span><span className="vl">{S(c.precioFinal)}</span></li>
                  </ul>
                </div>
                <div className="total-pie"><span>Total por {c.unidades} {c.unidades === 1 ? "canasta" : "canastas"}</span><b>{S(c.totalFinal)}</b></div>
              </div>
              {st.items.length > 0 && (
                c.margenNeto < 10 ? (
                  <div className="aviso"><b>Margen neto en {pct(c.margenNeto)}.</b> Después del descuento y del impuesto a la renta te quedan {S(c.utilidadNeta)} por canasta. Revisa el descuento o cambia productos por versiones más económicas.</div>
                ) : (
                  <div className="aviso bien"><b>Utilidad neta {S(c.totalNeta)}</b> por {c.unidades} {c.unidades === 1 ? "canasta" : "canastas"}, con margen neto de {pct(c.margenNeto)} sobre venta. El impuesto a la renta del pedido suma {S(c.totalIr)}.</div>
                )
              )}
            </div>
          </div>
        )}

        {tab === "cotizacion" && (
          <TabCotizacion st={st} setSt={setSt} emisor={emisor} c={c}
            onSubirFoto={subirFotoCanasta} onSubirLogo={subirLogoEmisor}
            onCambiarEmisor={guardarCambiosEmisor} onDescargarPDF={descargarPDF} />
        )}

        {tab === "catalogo" && (
          <TabCatalogo productos={productos} setProductos={setProductos} avisar={avisar} />
        )}

        {tab === "historial" && (
          <TabHistorial historial={historial} onAbrir={abrirCanasta} onEliminar={borrarCanastaGuardada} />
        )}
      </div>

      <div className={"toast" + (toast ? " ver" : "")}>{toast}</div>
    </div>
  );
}

function BarraPrecio({ c }: { c: ReturnType<typeof calcular> }) {
  const base = Math.max(c.precioCliente, 0.0001);
  const seg: [number, string][] = [
    [(c.costo / base) * 100, "var(--navy)"],
    [Math.max(c.utilidadNeta, 0) / base * 100, "var(--celeste)"],
    [(c.ir / base) * 100, "#6B7FA0"],
    [(c.igv / base) * 100, "#B9D9F7"],
    [(c.montoDcto / base) * 100, "#F0C000"],
  ];
  return (
    <>
      <div className="barra">
        {seg.map((s, i) => <span key={i} style={{ width: Math.max(s[0], 0) + "%", background: s[1] }} />)}
      </div>
      <div className="leyenda">
        <span><i style={{ background: "var(--navy)" }} />Costo</span>
        <span><i style={{ background: "var(--celeste)" }} />Utilidad neta</span>
        <span><i style={{ background: "#6B7FA0" }} />Renta</span>
        <span><i style={{ background: "#B9D9F7" }} />IGV</span>
        <span><i style={{ background: "#F0C000" }} />Descuento</span>
      </div>
    </>
  );
}

function FilaCascada({ et, vl, tag }: { et: string; vl: string; tag?: string }) {
  return (
    <li><span className="et">{et}</span>{tag && <span className="tag">{tag}</span>}<span className="vl">{vl}</span></li>
  );
}

function TabCotizacion({
  st, setSt, emisor, c, onSubirFoto, onSubirLogo, onCambiarEmisor, onDescargarPDF,
}: {
  st: EstadoCanasta;
  setSt: React.Dispatch<React.SetStateAction<EstadoCanasta>>;
  emisor: Emisor;
  c: ReturnType<typeof calcular>;
  onSubirFoto: (f: File) => void;
  onSubirLogo: (f: File) => void;
  onCambiarEmisor: (cambios: Partial<Emisor>) => void;
  onDescargarPDF: () => void;
}) {
  return (
    <div className="grid">
      <div>
        <div className="card">
          <div className="card-h"><h2>Datos de la cotización</h2><span className="hint">Empresa, fecha y validez se toman de Armar canasta</span></div>
          <div className="card-b">
            <div className="campos">
              <div><label>Número de cotización</label><input value={st.numeroCot} onChange={(e) => setSt((s) => ({ ...s, numeroCot: e.target.value }))} placeholder="2025-0211" /></div>
              <div><label>RUC del cliente</label><input value={st.rucCliente} onChange={(e) => setSt((s) => ({ ...s, rucCliente: e.target.value }))} placeholder="20538290310" /></div>
              <div><label>Contacto</label><input value={st.contacto} onChange={(e) => setSt((s) => ({ ...s, contacto: e.target.value }))} placeholder="Nombre y apellido" /></div>
              <div><label>Teléfono del contacto</label><input value={st.telefono} onChange={(e) => setSt((s) => ({ ...s, telefono: e.target.value }))} placeholder="977 634 180" /></div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h2>Condiciones comerciales</h2><span className="hint">Una condición por línea</span></div>
          <div className="card-b"><textarea rows={5} value={st.condiciones} onChange={(e) => setSt((s) => ({ ...s, condiciones: e.target.value }))} /></div>
        </div>

        <div className="card">
          <div className="card-h"><h2>Foto de la canasta</h2><span className="hint">Se guarda con la canasta</span></div>
          <div className="card-b">
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSubirFoto(f); }} />
            <div style={{ marginTop: 12 }}>
              {st.fotoUrl ? (
                <div className="miniatura"><img src={st.fotoUrl} alt="Foto de la canasta" /><button className="btn chico" onClick={() => setSt((s) => ({ ...s, fotoUrl: "" }))}>Quitar foto</button></div>
              ) : <p style={{ margin: 0, fontSize: 12.5, color: "var(--texto-suave)" }}>Sin foto. La cotización se genera igual, con el detalle en una sola columna.</p>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h2>Datos del emisor</h2><span className="hint">Se guardan para todas tus cotizaciones</span></div>
          <div className="card-b">
            <div className="campos">
              <div><label>Razón comercial</label><input value={emisor.razon} onChange={(e) => onCambiarEmisor({ razon: e.target.value })} placeholder="Altum Vida" /></div>
              <div><label>RUC</label><input value={emisor.ruc} onChange={(e) => onCambiarEmisor({ ruc: e.target.value })} placeholder="10108801994" /></div>
              <div><label>Teléfonos</label><input value={emisor.telefonos} onChange={(e) => onCambiarEmisor({ telefonos: e.target.value })} placeholder="970 418 062 · 985 319 051" /></div>
              <div><label>Correo</label><input value={emisor.correo} onChange={(e) => onCambiarEmisor({ correo: e.target.value })} placeholder="correo@empresa.com" /></div>
              <div><label>Color de la cotización</label>
                <select value={emisor.color} onChange={(e) => onCambiarEmisor({ color: e.target.value as "verde" | "azul" })}>
                  <option value="verde">Verde</option><option value="azul">Azul</option>
                </select>
              </div>
              <div><label>Logo</label><input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSubirLogo(f); }} /></div>
            </div>
            <div style={{ marginTop: 12 }}>
              {emisor.logoUrl ? (
                <div className="miniatura"><img src={emisor.logoUrl} alt="Logo" /><button className="btn chico" onClick={() => onCambiarEmisor({ logoUrl: "" })}>Quitar logo</button></div>
              ) : <p style={{ margin: 0, fontSize: 12.5, color: "var(--texto-suave)" }}>Sin logo. Se imprime la razón comercial en su lugar.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky">
        <div className="card">
          <div className="card-h"><h2>Vista previa del contenido</h2></div>
          <div className="card-b">
            {st.items.length ? (
              <>
                <div style={{ fontSize: 12, color: "var(--texto-suave)", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 650 }}>{st.nombre || "Canasta sin nombre"}</div>
                <div style={{ display: "flex", gap: 18, margin: "8px 0 14px", fontVariantNumeric: "tabular-nums" }}>
                  <div><div style={{ fontSize: 11, color: "var(--texto-suave)" }}>Cantidad</div><b>{c.unidades}</b></div>
                  <div><div style={{ fontSize: 11, color: "var(--texto-suave)" }}>P. unitario</div><b>{S(c.precioFinal)}</b></div>
                  <div><div style={{ fontSize: 11, color: "var(--texto-suave)" }}>Total</div><b style={{ color: "var(--azul)" }}>{S(c.totalFinal)}</b></div>
                </div>
                <ul className="prev-lista">{st.items.map((i, ix) => <li key={ix}><b>{i.cantidad}</b><span>{i.nombre}</span></li>)}</ul>
              </>
            ) : <div className="vacio" style={{ padding: "20px 0" }}><strong>Todavía no hay productos</strong>Arma la canasta y vuelve a esta pestaña.</div>}
            <button className="btn primario" style={{ width: "100%", marginTop: 16 }} onClick={onDescargarPDF}>Descargar PDF de la cotización</button>
            <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--texto-suave)" }}>El PDF sale en una hoja A4 con el logo, los datos del cliente, el detalle de la canasta y las condiciones. No muestra costos ni márgenes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabCatalogo({
  productos, setProductos, avisar,
}: {
  productos: Producto[];
  setProductos: React.Dispatch<React.SetStateAction<Producto[]>>;
  avisar: (m: string) => void;
}) {
  const [nom, setNom] = useState("");
  const [prov, setProv] = useState("");
  const [cat, setCat] = useState(CATEGORIAS[0]);
  const [caja, setCaja] = useState(1);
  const [pcaja, setPcaja] = useState(0);
  const [punit, setPunit] = useState(0);

  async function agregar() {
    if (!nom.trim()) return avisar("Escribe el nombre del producto");
    const pref: Record<string, string> = { "Panetones": "PAN", "Vinos y espumantes": "VIN", "Licores": "LIC", "Chocolates y dulces": "CHO", "Galletas y snacks": "GAL", "Abarrotes": "ABA", "Conservas": "CON", "Lácteos": "LAC", "Gourmet": "GOU", "Empaque y bases": "EMP" };
    const p = pref[cat] || "GEN";
    const n = productos.filter((x) => x.cod.startsWith(p)).length + 1;
    const cajaVal = Math.max(1, caja || 1);
    let punitVal = punit || 0;
    if (!punitVal && pcaja) punitVal = +(pcaja / cajaVal).toFixed(2);
    try {
      const creado = await crearProducto({ cod: p + "-" + String(n).padStart(2, "0"), nombre: nom.trim(), proveedor: prov.trim() || "Sin proveedor", categoria: cat, caja: cajaVal, precio_caja: pcaja, precio_unitario: punitVal });
      setProductos((ps) => [...ps, creado].sort((a, b) => a.cod.localeCompare(b.cod)));
      setNom(""); setProv(""); setCaja(1); setPcaja(0); setPunit(0);
      avisar("Producto agregado al catálogo");
    } catch {
      avisar("No se pudo agregar el producto");
    }
  }

  async function editar(p: Producto, campo: "precio_caja" | "precio_unitario", valor: number) {
    const cambios: Partial<Producto> = { [campo]: Math.max(0, valor) };
    if (campo === "precio_caja" && p.caja > 0) cambios.precio_unitario = +(Math.max(0, valor) / p.caja).toFixed(2);
    setProductos((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...cambios } : x)));
    try {
      await actualizarProducto(p.id, cambios);
    } catch {
      avisar("No se pudo guardar el cambio de precio");
    }
  }

  async function eliminar(p: Producto) {
    if (!confirm("¿Eliminar este producto del catálogo?")) return;
    try {
      await eliminarProducto(p.id);
      setProductos((ps) => ps.filter((x) => x.id !== p.id));
      avisar("Producto eliminado");
    } catch {
      avisar("No se pudo eliminar el producto");
    }
  }

  async function restaurar() {
    if (!confirm("Se recuperarán los productos y precios originales, y se perderán los que hayas agregado. ¿Continuar?")) return;
    try {
      const base = await restaurarCatalogoBase();
      setProductos(base.sort((a, b) => a.cod.localeCompare(b.cod)));
      avisar("Catálogo restaurado");
    } catch {
      avisar("No se pudo restaurar el catálogo");
    }
  }

  return (
    <div className="card">
      <div className="card-h"><h2>Mantenimiento del catálogo</h2><span className="hint">Los cambios se guardan para las tres</span></div>
      <div className="card-b">
        <div className="campos" style={{ marginBottom: 14 }}>
          <div style={{ gridColumn: "span 2" }}><label>Producto</label><input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nombre del producto" /></div>
          <div><label>Proveedor</label><input value={prov} onChange={(e) => setProv(e.target.value)} placeholder="Proveedor" /></div>
          <div><label>Categoría</label><select value={cat} onChange={(e) => setCat(e.target.value)}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label>Unidades por caja</label><input className="num" type="number" min={1} step={1} value={caja} onChange={(e) => setCaja(Number(e.target.value) || 1)} /></div>
          <div><label>Precio caja con IGV</label><input className="num" type="number" min={0} step={0.01} value={pcaja || ""} onChange={(e) => setPcaja(Number(e.target.value) || 0)} placeholder="0.00" /></div>
          <div><label>Precio unitario con IGV</label><input className="num" type="number" min={0} step={0.01} value={punit || ""} onChange={(e) => setPunit(Number(e.target.value) || 0)} placeholder="0.00" /></div>
        </div>
        <button className="btn primario chico" onClick={agregar}>Agregar al catálogo</button>{" "}
        <button className="btn chico" onClick={restaurar}>Restaurar catálogo original</button>
      </div>
      <div className="card-b" style={{ paddingTop: 0, maxHeight: 480, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 66 }}>Código</th><th>Producto</th><th>Proveedor</th>
              <th className="num" style={{ width: 76 }}>x Caja</th>
              <th className="num" style={{ width: 118 }}>Precio caja</th>
              <th className="num" style={{ width: 118 }}>P. unitario</th><th style={{ width: 34 }}></th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id}>
                <td style={{ color: "var(--azul)", fontWeight: 650, fontSize: 11.5 }}>{p.cod}</td>
                <td>{p.nombre}<small style={{ display: "block", color: "var(--texto-suave)", fontSize: 11.5 }}>{p.categoria}</small></td>
                <td style={{ color: "var(--texto-suave)" }}>{p.proveedor}</td>
                <td className="num">{p.caja}</td>
                <td className="num"><input className="num" type="number" min={0} step={0.01} defaultValue={p.precio_caja.toFixed(2)} onBlur={(e) => editar(p, "precio_caja", Number(e.target.value) || 0)} /></td>
                <td className="num"><input className="num" type="number" min={0} step={0.01} defaultValue={p.precio_unitario.toFixed(2)} onBlur={(e) => editar(p, "precio_unitario", Number(e.target.value) || 0)} /></td>
                <td><button className="quitar" onClick={() => eliminar(p)} title="Eliminar">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabHistorial({
  historial, onAbrir, onEliminar,
}: {
  historial: CanastaGuardada[] | null;
  onAbrir: (h: CanastaGuardada, comoCopia: boolean) => void;
  onEliminar: (id: string) => void;
}) {
  return (
    <div className="card">
      <div className="card-h"><h2>Canastas guardadas</h2><span className="hint">Abre una para editarla o duplícala para crear una variante</span></div>
      <div className="card-b">
        {historial === null ? (
          <div className="vacio">Cargando...</div>
        ) : !historial.length ? (
          <div className="vacio"><strong>Aún no guardan ninguna canasta</strong>Arma una y usa Guardar canasta para tenerla lista la próxima vez.</div>
        ) : (
          historial.map((h) => (
            <div className="hist" key={h.id}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="h-nom">{h.nombre || "Sin nombre"} <span className="chip">{h.codigo || "sin código"}</span></div>
                <div className="h-met">{h.items.length} productos · {h.unidades} {h.unidades === 1 ? "canasta" : "canastas"} · guardada el {new Date(h.creadaEn).toLocaleDateString("es-PE")}</div>
              </div>
              <button className="btn chico" onClick={() => onAbrir(h, false)}>Abrir</button>
              <button className="btn chico" onClick={() => onAbrir(h, true)}>Duplicar</button>
              <button className="btn chico plano" onClick={() => onEliminar(h.id)}>Eliminar</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
