import type { EstadoCanasta } from "./tipos";

export const IGV = 0.18;
export const ADMIN = 0.05;
// Régimen Especial de Renta (RER): 1.5% sobre la venta, no sobre la utilidad.
export const RENTA = 0.015;

export function unidadesArmado(items: EstadoCanasta["items"]): number {
  return items.reduce((a, i) => a + (Number(i.cantidad) || 0), 0);
}

export function armadoSugerido(items: EstadoCanasta["items"]): number {
  const n = unidadesArmado(items);
  return n <= 8 ? 5 : n <= 15 ? 10 : 15;
}

export type ResultadoCalculo = {
  items: number;
  otros: number;
  armado: number;
  admin: number;
  itemsBase: number;
  otrosBase: number;
  desembolso: number;
  brutoConIGV: number;
  costo: number;
  venta: number;
  igv: number;
  precioCliente: number;
  montoDcto: number;
  precioFinal: number;
  ventaFinal: number;
  utilidad: number;
  ir: number;
  utilidadNeta: number;
  margenEfectivo: number;
  margenNeto: number;
  unidades: number;
  totalFinal: number;
  totalCosto: number;
  totalUtilidad: number;
  totalIr: number;
  totalNeta: number;
};

export function calcular(st: EstadoCanasta): ResultadoCalculo {
  const items = st.items.reduce((a, i) => a + (Number(i.precio_unitario) || 0) * (Number(i.cantidad) || 0), 0);
  const otros = st.otros.reduce((a, o) => a + (Number(o.monto) || 0), 0);
  const armado = Number(st.armado ?? 5) || 0;
  const itemsBase = st.factura ? items / (1 + IGV) : items;
  const otrosBase = st.factura ? otros / (1 + IGV) : otros;
  const admin = (itemsBase + armado) * ADMIN;
  const costo = itemsBase + otrosBase + armado + admin;
  const desembolso = items + otros + armado + admin;
  const m = Math.min(Math.max(Number(st.margen) || 0, 0), 95) / 100;
  let venta = st.tipoMargen === "venta" ? costo / (1 - m || 1) : costo * (1 + m);
  if (!isFinite(venta)) venta = costo;
  const igv = st.factura ? venta * IGV : 0;
  const precioCliente = venta + igv;
  const d = Math.min(Math.max(Number(st.descuento) || 0, 0), 100) / 100;
  const montoDcto = precioCliente * d;
  const precioFinalCrudo = precioCliente - montoDcto;
  // El precio que se cobra se redondea al décimo de sol superior (83.25 -> 83.30),
  // y de ahí para abajo todo se recalcula sobre ese precio ya redondeado, para que
  // el desglose siempre sume exactamente el precio final mostrado.
  const precioFinal = Math.ceil(precioFinalCrudo * 10) / 10;
  const ventaFinal = st.factura ? precioFinal / (1 + IGV) : precioFinal;
  const utilidad = ventaFinal - costo;
  const ir = Math.max(ventaFinal, 0) * RENTA;
  const utilidadNeta = utilidad - ir;
  const margenEfectivo = ventaFinal > 0 ? (utilidad / ventaFinal) * 100 : 0;
  const margenNeto = ventaFinal > 0 ? (utilidadNeta / ventaFinal) * 100 : 0;
  const u = Math.max(1, Math.round(Number(st.unidades) || 1));

  return {
    items,
    otros,
    armado,
    admin,
    itemsBase,
    otrosBase,
    desembolso,
    brutoConIGV: desembolso,
    costo,
    venta,
    igv,
    precioCliente,
    montoDcto,
    precioFinal,
    ventaFinal,
    utilidad,
    ir,
    utilidadNeta,
    margenEfectivo,
    margenNeto,
    unidades: u,
    totalFinal: precioFinal * u,
    totalCosto: costo * u,
    totalUtilidad: utilidad * u,
    totalIr: ir * u,
    totalNeta: utilidadNeta * u,
  };
}

export const S = (n: number) =>
  "S/ " + (Number(n) || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pct = (n: number) =>
  (Number(n) || 0).toLocaleString("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
