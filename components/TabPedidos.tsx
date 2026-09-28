"use client";

import { useMemo, useState } from "react";
import { S } from "@/lib/calculo";
import { crearPedidos, actualizarPedido, eliminarPedido } from "@/lib/db";
import { nivelPorCodigo } from "@/lib/niveles";
import { costoPedido, requerimiento, resumenPorModelo, totalPedido, utilidadPedido, type ModoCompra } from "@/lib/pedidos";
import { ESTADOS_PEDIDO, hoy } from "@/lib/tipos";
import type { CanastaGuardada, EstadoPedido, Pedido, Producto } from "@/lib/tipos";

const n0 = (n: number) => (Number(n) || 0).toLocaleString("es-PE");

export default function TabPedidos({
  pedidos, setPedidos, historial, productos, costoDeCanasta, avisar,
}: {
  pedidos: Pedido[] | null;
  setPedidos: React.Dispatch<React.SetStateAction<Pedido[] | null>>;
  historial: CanastaGuardada[] | null;
  productos: Producto[];
  costoDeCanasta: (h: CanastaGuardada) => { precio: number; costo: number };
  avisar: (m: string) => void;
}) {
  const [modo, setModo] = useState<ModoCompra>("confirmados");
  const [canastaId, setCanastaId] = useState("");
  const [cliente, setCliente] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [estado, setEstado] = useState<EstadoPedido>("Cotizado");

  const lista = useMemo(() => pedidos ?? [], [pedidos]);
  const modelos = useMemo(() => resumenPorModelo(lista, modo), [lista, modo]);
  const compras = useMemo(() => requerimiento(lista, productos, modo), [lista, productos, modo]);
  const vigentes = lista.filter((p) => p.estado !== "Anulado");

  async function agregar() {
    const h = historial?.find((x) => x.id === canastaId);
    if (!h) return avisar("Elige una canasta guardada");
    if (!cliente.trim()) return avisar("Escribe el cliente");
    const { precio, costo } = costoDeCanasta(h);
    try {
      const [creado] = await crearPedidos([
        {
          fecha: hoy(),
          cliente: cliente.trim(),
          cotizacionId: "",
          canastaId: h.id,
          canastaNombre: h.nombre,
          nivel: h.nivel,
          cantidad: Math.max(1, Math.round(cantidad) || 1),
          precioCatalogo: precio,
          precioPactado: null,
          costoUnitario: costo,
          items: h.items,
          estado,
        },
      ]);
      setPedidos((ps) => [creado, ...(ps ?? [])]);
      setCliente("");
      setCantidad(1);
      avisar("Pedido agregado");
    } catch {
      avisar("No se pudo agregar el pedido");
    }
  }

  async function cambiar(p: Pedido, cambios: Partial<Pedido>) {
    const nuevo = { ...p, ...cambios };
    setPedidos((ps) => (ps ? ps.map((x) => (x.id === p.id ? nuevo : x)) : ps));
    try {
      await actualizarPedido(nuevo);
    } catch {
      setPedidos((ps) => (ps ? ps.map((x) => (x.id === p.id ? p : x)) : ps));
      avisar("No se pudo guardar el cambio, se deshizo");
    }
  }

  async function borrar(p: Pedido) {
    if (!confirm("¿Eliminar este pedido? Si solo se cayó, mejor cámbialo a Anulado.")) return;
    try {
      await eliminarPedido(p.id);
      setPedidos((ps) => (ps ? ps.filter((x) => x.id !== p.id) : ps));
      avisar("Pedido eliminado");
    } catch {
      avisar("No se pudo eliminar");
    }
  }

  const selectorModo = (
    <select value={modo} onChange={(e) => setModo(e.target.value as ModoCompra)} style={{ maxWidth: 260 }}>
      <option value="confirmados">Confirmados y entregados</option>
      <option value="todo">Todo lo registrado (incluye cotizados)</option>
    </select>
  );

  return (
    <div>
      <div className="card">
        <div className="card-h"><h2>Registro de pedidos</h2><span className="hint">Una línea por canasta y cliente. Se guardan para las tres</span></div>
        <div className="card-b">
          <div className="campos" style={{ marginBottom: 12 }}>
            <div style={{ gridColumn: "span 2" }}>
              <label>Canasta</label>
              <select value={canastaId} onChange={(e) => setCanastaId(e.target.value)}>
                <option value="">{historial === null ? "Cargando canastas..." : "Elegir una canasta guardada..."}</option>
                {(historial ?? []).map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
              </select>
            </div>
            <div><label>Cliente</label><input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Empresa" /></div>
            <div><label>Cantidad</label><input className="num" type="number" min={1} step={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value) || 1)} /></div>
            <div>
              <label>Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoPedido)}>
                {ESTADOS_PEDIDO.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button className="btn primario chico" onClick={agregar}>Agregar pedido</button>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--texto-suave)" }}>
            También puedes crear pedidos desde una cotización guardada, con el botón &quot;Convertir en pedido&quot;. Deja el precio pactado vacío si cobras el de catálogo.
          </p>
        </div>
        <div className="card-b" style={{ paddingTop: 0, overflowX: "auto" }}>
          {pedidos === null ? (
            <div className="vacio">Cargando...</div>
          ) : !lista.length ? (
            <div className="vacio"><strong>Aún no hay pedidos</strong>Agrégalos aquí o conviértelos desde una cotización.</div>
          ) : (
            <table className="tabla-montos" style={{ minWidth: 1050 }}>
              <thead>
                <tr>
                  <th style={{ width: 128 }}>Fecha</th><th>Cliente</th><th>Canasta</th>
                  <th className="num" style={{ width: 80 }}>Cant.</th>
                  <th className="num">P. catálogo</th>
                  <th className="num" style={{ width: 104 }}>P. pactado</th>
                  <th className="num">Total c/IGV</th><th className="num">Costo</th><th className="num">Utilidad</th>
                  <th style={{ width: 136 }}>Estado</th><th style={{ width: 34 }}></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id} style={p.estado === "Anulado" ? { opacity: 0.5 } : undefined}>
                    <td><input type="date" value={p.fecha} onChange={(e) => cambiar(p, { fecha: e.target.value })} /></td>
                    <td><input defaultValue={p.cliente} onBlur={(e) => e.target.value !== p.cliente && cambiar(p, { cliente: e.target.value })} /></td>
                    <td>{p.canastaNombre}<small style={{ display: "block", color: "var(--texto-suave)", fontSize: 11.5 }}>{nivelPorCodigo(p.nivel)?.nombre ?? ""}</small></td>
                    <td className="num"><input className="w-cant num" type="number" min={1} step={1} defaultValue={p.cantidad} onBlur={(e) => { const v = Math.max(1, Math.round(Number(e.target.value)) || 1); if (v !== p.cantidad) cambiar(p, { cantidad: v }); }} /></td>
                    <td className="num">{S(p.precioCatalogo)}</td>
                    <td className="num"><input className="num" type="number" min={0} step={0.1} defaultValue={p.precioPactado ?? ""} placeholder="—" onBlur={(e) => { const v = e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0); if (v !== p.precioPactado) cambiar(p, { precioPactado: v }); }} /></td>
                    <td className="num" style={{ fontWeight: 600 }}>{S(totalPedido(p))}</td>
                    <td className="num">{S(costoPedido(p))}</td>
                    <td className="num">{S(utilidadPedido(p))}</td>
                    <td>
                      <select value={p.estado} onChange={(e) => cambiar(p, { estado: e.target.value as EstadoPedido })}>
                        {ESTADOS_PEDIDO.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td><button className="quitar" onClick={() => borrar(p)} title="Eliminar">×</button></td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={3}>Total sin anulados</td>
                  <td className="num">{n0(vigentes.reduce((a, p) => a + p.cantidad, 0))}</td>
                  <td></td><td></td>
                  <td className="num">{S(vigentes.reduce((a, p) => a + totalPedido(p), 0))}</td>
                  <td className="num">{S(vigentes.reduce((a, p) => a + costoPedido(p), 0))}</td>
                  <td className="num">{S(vigentes.reduce((a, p) => a + utilidadPedido(p), 0))}</td>
                  <td></td><td></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h2>Control por modelo</h2><span className="hint">Unidades de cada canasta según su estado</span></div>
        <div className="card-b" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ margin: 0 }}>Comprar en base a:</label>{selectorModo}
        </div>
        <div className="card-b" style={{ paddingTop: 0, overflowX: "auto" }}>
          {!modelos.length ? (
            <div className="vacio">Sin pedidos todavía.</div>
          ) : (
            <table className="tabla-montos" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Canasta</th><th>Nivel</th>
                  <th className="num">Cotizadas</th><th className="num">Confirmadas</th><th className="num">Entregadas</th>
                  <th className="num">Total</th><th className="num">Para compra</th>
                  <th className="num">Venta</th><th className="num">Costo</th><th className="num">Utilidad</th>
                </tr>
              </thead>
              <tbody>
                {modelos.map((m) => (
                  <tr key={m.clave}>
                    <td>{m.nombre}</td><td>{nivelPorCodigo(m.nivel)?.nombre ?? ""}</td>
                    <td className="num">{n0(m.cotizadas)}</td><td className="num">{n0(m.confirmadas)}</td><td className="num">{n0(m.entregadas)}</td>
                    <td className="num">{n0(m.total)}</td><td className="num" style={{ fontWeight: 700 }}>{n0(m.paraCompra)}</td>
                    <td className="num">{S(m.venta)}</td><td className="num">{S(m.costo)}</td><td className="num">{S(m.utilidad)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={2}>Total</td>
                  {(["cotizadas", "confirmadas", "entregadas", "total", "paraCompra"] as const).map((k) => (
                    <td key={k} className="num">{n0(modelos.reduce((a, m) => a + m[k], 0))}</td>
                  ))}
                  {(["venta", "costo", "utilidad"] as const).map((k) => (
                    <td key={k} className="num">{S(modelos.reduce((a, m) => a + m[k], 0))}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h2>Lista de compras</h2><span className="hint">Cajas a pedir a cada proveedor. Sobrante es lo que queda suelto por comprar caja completa</span></div>
        <div className="card-b" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ margin: 0 }}>Comprar en base a:</label>{selectorModo}
        </div>
        {!compras.lineas.length ? (
          <div className="card-b"><div className="vacio">No hay pedidos que cuenten para la compra con este filtro.</div></div>
        ) : (
          <>
            <div className="card-b" style={{ paddingTop: 0 }}>
              <table className="tabla-montos" style={{ maxWidth: 520 }}>
                <thead><tr><th>Proveedor</th><th className="num">Cajas</th><th className="num">Costo de compra</th></tr></thead>
                <tbody>
                  {compras.proveedores.map((r) => (
                    <tr key={r.proveedor}><td>{r.proveedor}</td><td className="num">{n0(r.cajas)}</td><td className="num">{S(r.costoCompra)}</td></tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}>
                    <td>Total</td>
                    <td className="num">{n0(compras.proveedores.reduce((a, r) => a + r.cajas, 0))}</td>
                    <td className="num">{S(compras.proveedores.reduce((a, r) => a + r.costoCompra, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="card-b" style={{ paddingTop: 0, overflowX: "auto" }}>
              <table className="tabla-montos" style={{ minWidth: 1050 }}>
                <thead>
                  <tr>
                    <th style={{ width: 66 }}>Código</th><th>Producto</th><th>Proveedor</th>
                    <th className="num">Und necesarias</th><th className="num">Und x caja</th><th className="num">Cajas a comprar</th>
                    <th className="num">Und que recibes</th><th className="num">Sobrante</th><th className="num">P. unit.</th>
                    <th className="num">Costo necesario</th><th className="num">Costo de compra</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.lineas.map((l) => (
                    <tr key={l.cod}>
                      <td style={{ color: "var(--azul)", fontWeight: 650, fontSize: 11.5 }}>{l.cod}</td>
                      <td>{l.nombre}</td><td style={{ color: "var(--texto-suave)" }}>{l.proveedor}</td>
                      <td className="num">{n0(l.necesarias)}</td><td className="num">{n0(l.porCaja)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>{n0(l.cajas)}</td>
                      <td className="num">{n0(l.recibes)}</td><td className="num">{n0(l.sobrante)}</td>
                      <td className="num">{S(l.precioUnitario)}</td><td className="num">{S(l.costoNecesario)}</td><td className="num">{S(l.costoCompra)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}>
                    <td colSpan={3}>Total</td>
                    <td className="num">{n0(compras.lineas.reduce((a, l) => a + l.necesarias, 0))}</td>
                    <td></td>
                    <td className="num">{n0(compras.lineas.reduce((a, l) => a + l.cajas, 0))}</td>
                    <td className="num">{n0(compras.lineas.reduce((a, l) => a + l.recibes, 0))}</td>
                    <td className="num">{n0(compras.lineas.reduce((a, l) => a + l.sobrante, 0))}</td>
                    <td></td>
                    <td className="num">{S(compras.lineas.reduce((a, l) => a + l.costoNecesario, 0))}</td>
                    <td className="num">{S(compras.lineas.reduce((a, l) => a + l.costoCompra, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
