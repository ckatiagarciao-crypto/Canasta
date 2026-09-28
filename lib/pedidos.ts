import { utilidadNetaDeVenta } from "./calculo";
import type { Pedido, Producto } from "./tipos";

export type ModoCompra = "confirmados" | "todo";

export function precioAplicado(p: Pedido): number {
  return p.precioPactado ?? p.precioCatalogo;
}

export function totalPedido(p: Pedido): number {
  return p.cantidad * precioAplicado(p);
}

export function costoPedido(p: Pedido): number {
  return p.cantidad * p.costoUnitario;
}

export function utilidadPedido(p: Pedido): number {
  return utilidadNetaDeVenta(totalPedido(p), costoPedido(p), p.factura);
}

export function cuentaParaCompra(p: Pedido, modo: ModoCompra): boolean {
  if (modo === "todo") return p.estado !== "Anulado";
  return p.estado === "Confirmado" || p.estado === "Entregado";
}

export type ResumenModelo = {
  clave: string;
  nombre: string;
  nivel: string;
  cotizadas: number;
  confirmadas: number;
  entregadas: number;
  total: number;
  paraCompra: number;
  venta: number;
  costo: number;
  utilidad: number;
};

export function resumenPorModelo(pedidos: Pedido[], modo: ModoCompra): ResumenModelo[] {
  const mapa = new Map<string, ResumenModelo>();
  for (const p of pedidos) {
    const clave = p.canastaId || p.canastaNombre;
    let r = mapa.get(clave);
    if (!r) {
      r = { clave, nombre: p.canastaNombre, nivel: p.nivel, cotizadas: 0, confirmadas: 0, entregadas: 0, total: 0, paraCompra: 0, venta: 0, costo: 0, utilidad: 0 };
      mapa.set(clave, r);
    }
    if (p.estado === "Cotizado") r.cotizadas += p.cantidad;
    if (p.estado === "Confirmado") r.confirmadas += p.cantidad;
    if (p.estado === "Entregado") r.entregadas += p.cantidad;
    if (cuentaParaCompra(p, modo)) r.paraCompra += p.cantidad;
    if (p.estado !== "Anulado") {
      r.total += p.cantidad;
      r.venta += totalPedido(p);
      r.costo += costoPedido(p);
      r.utilidad += utilidadPedido(p);
    }
  }
  return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export type LineaCompra = {
  cod: string;
  nombre: string;
  proveedor: string;
  categoria: string;
  necesarias: number;
  porCaja: number;
  cajas: number;
  recibes: number;
  sobrante: number;
  precioUnitario: number;
  costoNecesario: number;
  costoCompra: number;
};

export type ResumenProveedor = { proveedor: string; cajas: number; costoCompra: number };

// Igual que la hoja REQUERIMIENTO DE PRODUCTOS: explota los pedidos contra el
// contenido de cada canasta y redondea a cajas completas del proveedor.
export function requerimiento(pedidos: Pedido[], productos: Producto[], modo: ModoCompra): { lineas: LineaCompra[]; proveedores: ResumenProveedor[] } {
  const necesarias = new Map<string, { nombre: string; proveedor: string; precio: number; und: number }>();
  for (const p of pedidos) {
    if (!cuentaParaCompra(p, modo)) continue;
    for (const i of p.items) {
      const actual = necesarias.get(i.cod) ?? { nombre: i.nombre, proveedor: i.proveedor, precio: i.precio_unitario, und: 0 };
      actual.und += p.cantidad * (Number(i.cantidad) || 0);
      necesarias.set(i.cod, actual);
    }
  }

  const lineas: LineaCompra[] = [];
  for (const [cod, n] of necesarias) {
    if (n.und <= 0) continue;
    const prod = productos.find((x) => x.cod === cod);
    const porCaja = Math.max(1, Math.round(Number(prod?.caja) || 1));
    const precioUnitario = prod ? Number(prod.precio_unitario) : n.precio;
    const cajas = Math.ceil(n.und / porCaja);
    const recibes = cajas * porCaja;
    lineas.push({
      cod,
      nombre: prod?.nombre ?? n.nombre,
      proveedor: prod?.proveedor ?? n.proveedor,
      categoria: prod?.categoria ?? "",
      necesarias: n.und,
      porCaja,
      cajas,
      recibes,
      sobrante: recibes - n.und,
      precioUnitario,
      costoNecesario: n.und * precioUnitario,
      costoCompra: recibes * precioUnitario,
    });
  }
  lineas.sort((a, b) => a.cod.localeCompare(b.cod));

  const porProveedor = new Map<string, ResumenProveedor>();
  for (const l of lineas) {
    const r = porProveedor.get(l.proveedor) ?? { proveedor: l.proveedor, cajas: 0, costoCompra: 0 };
    r.cajas += l.cajas;
    r.costoCompra += l.costoCompra;
    porProveedor.set(l.proveedor, r);
  }
  const proveedores = [...porProveedor.values()].sort((a, b) => b.costoCompra - a.costoCompra);
  return { lineas, proveedores };
}
