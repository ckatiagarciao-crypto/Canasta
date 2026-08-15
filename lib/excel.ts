import ExcelJS from "exceljs";
import { calcular, pct, unidadesArmado, S } from "@/lib/calculo";
import type { EstadoCanasta } from "@/lib/tipos";

const NAVY = "FF08234A",
  AZUL = "FF1256D2",
  CELESTE = "FFEAF3FE",
  CELESTE2 = "FFCFE4FB",
  LINEA = "FFE1E9F4";
const MONEDA = '"S/ "#,##0.00';
const borde = {
  top: { style: "thin" as const, color: { argb: LINEA } },
  left: { style: "thin" as const, color: { argb: LINEA } },
  bottom: { style: "thin" as const, color: { argb: LINEA } },
  right: { style: "thin" as const, color: { argb: LINEA } },
};

function fondo(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}
function titulo(ws: ExcelJS.Worksheet, texto: string, cols: number) {
  ws.mergeCells(1, 1, 1, cols);
  const c = ws.getCell(1, 1);
  c.value = texto;
  c.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  fondo(c, NAVY);
  c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 30;
}
function metaFila(ws: ExcelJS.Worksheet, r: number, etiqueta: string, valor: string | number, cols = 3) {
  ws.mergeCells(r, 1, r, cols);
  const a = ws.getCell(r, 1);
  a.value = {
    richText: [
      { font: { bold: true, size: 10, color: { argb: "FF5D7292" } }, text: etiqueta.toUpperCase() + "    " },
      { font: { bold: true, size: 11, color: { argb: "FF0F2140" } }, text: String(valor == null || valor === "" ? "No especificado" : valor) },
    ],
  };
  a.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(r).height = 17;
}
function cabeceraTabla(ws: ExcelJS.Worksheet, r: number, cols: string[]) {
  cols.forEach((t, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = t;
    c.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    fondo(c, AZUL);
    c.alignment = { vertical: "middle", horizontal: i > 2 ? "right" : "left", indent: 1 };
    c.border = borde;
  });
  ws.getRow(r).height = 22;
}

export async function generarExcel(st: EstadoCanasta) {
  if (!st.items.length) throw new Error("Agrega productos antes de generar el Excel");

  const c = calcular(st);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Costeador de Canastas Navideñas";
  wb.created = new Date();
  const nombre = st.nombre || "Canasta sin nombre";
  const codigo = st.codigo || "sin código";
  const fechaTxt = st.fecha ? st.fecha.split("-").reverse().join("/") : "";

  const d = wb.addWorksheet("Detalle", { views: [{ showGridLines: false }] });
  d.columns = [{ width: 12 }, { width: 52 }, { width: 18 }, { width: 10 }, { width: 15 }, { width: 15 }];
  titulo(d, "COSTEO DE CANASTA NAVIDEÑA", 6);
  metaFila(d, 3, "Canasta", nombre);
  metaFila(d, 4, "Código", codigo);
  metaFila(d, 5, "Cliente", st.cliente || "No especificado");
  metaFila(d, 6, "Fecha", fechaTxt);
  metaFila(d, 7, "Número de canastas", c.unidades);

  let r = 9;
  cabeceraTabla(d, r, ["Código", "Producto", "Proveedor", "Cantidad", "P. unitario", "Subtotal"]);
  r++;
  st.items.forEach((i, ix) => {
    const fila = d.getRow(r);
    fila.values = [i.cod, i.nombre, i.proveedor, Number(i.cantidad), Number(i.precio_unitario), Number(i.precio_unitario) * Number(i.cantidad)];
    for (let col = 1; col <= 6; col++) {
      const cell = fila.getCell(col);
      cell.border = borde;
      cell.font = { size: 10 };
      if (ix % 2 === 1) fondo(cell, CELESTE);
      if (col >= 5) cell.numFmt = MONEDA;
      cell.alignment = { vertical: "middle", horizontal: col >= 4 ? "right" : "left", indent: 1 };
    }
    r++;
  });

  r++;
  d.mergeCells(r, 1, r, 6);
  const t = d.getCell(r, 1);
  t.value = "ARMADO Y OTROS COSTOS POR CANASTA";
  t.font = { bold: true, size: 10, color: { argb: "FF08234A" } };
  fondo(t, CELESTE2);
  t.alignment = { indent: 1, vertical: "middle" };
  d.getRow(r).height = 20;
  r++;

  const extras: [string, string, number][] = [
    ["Armado de la canasta", "Escala por " + unidadesArmado(st.items) + " ítems", c.armado],
    ["Gastos administrativos", "5% sobre productos y armado", c.admin],
    ...st.otros.map((o): [string, string, number] => [o.concepto || "Concepto sin nombre", "", Number(o.monto)]),
  ];
  extras.forEach((e, ix) => {
    const fila = d.getRow(r);
    fila.values = ["", e[0], e[1], "", "", e[2]];
    for (let col = 1; col <= 6; col++) {
      const cell = fila.getCell(col);
      cell.border = borde;
      cell.font = { size: 10 };
      if (ix % 2 === 1) fondo(cell, CELESTE);
      if (col === 6) {
        cell.numFmt = MONEDA;
        cell.alignment = { horizontal: "right", indent: 1 };
      } else cell.alignment = { horizontal: "left", indent: 1 };
      if (col === 3) cell.font = { size: 9, color: { argb: "FF5D7292" } };
    }
    r++;
  });

  r++;
  d.mergeCells(r, 1, r, 5);
  const tt = d.getCell(r, 1);
  tt.value = "COSTO TOTAL DESEMBOLSADO POR CANASTA";
  tt.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  fondo(tt, NAVY);
  tt.alignment = { horizontal: "right", indent: 1, vertical: "middle" };
  const tv = d.getCell(r, 6);
  tv.value = c.brutoConIGV;
  tv.numFmt = MONEDA;
  tv.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  fondo(tv, NAVY);
  tv.alignment = { horizontal: "right", indent: 1, vertical: "middle" };
  d.getRow(r).height = 24;

  const s = wb.addWorksheet("Resumen", { views: [{ showGridLines: false }] });
  s.columns = [{ width: 44 }, { width: 18 }, { width: 18 }, { width: 26 }];
  titulo(s, "RESUMEN DE COSTEO Y PRECIO", 4);
  metaFila(s, 3, "Canasta", nombre);
  metaFila(s, 4, "Código", codigo);
  metaFila(s, 5, "Número de canastas", c.unidades);

  let q = 7;
  cabeceraTabla(s, q, ["Concepto", "Por canasta", "Total", "Nota"]);
  q++;
  const sinIgvTxt = st.factura ? "Sin IGV, se usa el crédito fiscal" : "Incluye IGV";
  const lineas: [string, number, number, string][] = [
    ["Productos", c.itemsBase, c.itemsBase * c.unidades, sinIgvTxt],
    ["Armado", c.armado, c.armado * c.unidades, "Escala por " + unidadesArmado(st.items) + " ítems en la canasta"],
    ["Gastos administrativos", c.admin, c.admin * c.unidades, "5% sobre productos y armado"],
    ["Otros costos", c.otrosBase, c.otrosBase * c.unidades, st.otros.length ? sinIgvTxt : "Sin conceptos cargados"],
    ["Costo total por canasta", c.costo, c.totalCosto, "Base para calcular el margen"],
    ["Utilidad antes de impuesto", c.utilidad, c.totalUtilidad, "Margen " + pct(st.margen) + " sobre " + (st.tipoMargen === "venta" ? "venta" : "costo")],
    ["Impuesto a la renta 10%", -c.ir, -c.totalIr, "10% de la utilidad"],
    ["Utilidad neta", c.utilidadNeta, c.totalNeta, pct(c.margenNeto) + " sobre el precio de venta"],
    ["Precio de venta sin IGV", c.ventaFinal, c.ventaFinal * c.unidades, "Después del descuento"],
    ["IGV 18%", c.precioFinal - c.ventaFinal, (c.precioFinal - c.ventaFinal) * c.unidades, st.factura ? "Se traslada al cliente" : "No se discrimina"],
    ["Precio al cliente antes de descuento", c.precioCliente, c.precioCliente * c.unidades, "Precio de lista"],
    ["Descuento aplicado", -c.montoDcto, -c.montoDcto * c.unidades, pct(st.descuento) + " sobre el precio de lista"],
  ];
  const resaltar = ["Costo total por canasta", "Utilidad antes de impuesto", "Utilidad neta"];
  lineas.forEach((l, ix) => {
    const fila = s.getRow(q);
    fila.values = [l[0], l[1], l[2], l[3]];
    for (let col = 1; col <= 4; col++) {
      const cell = fila.getCell(col);
      cell.border = borde;
      cell.font = { size: 10 };
      if (ix % 2 === 1) fondo(cell, CELESTE);
      if (col === 2 || col === 3) {
        cell.numFmt = MONEDA;
        cell.alignment = { horizontal: "right", indent: 1 };
      } else cell.alignment = { horizontal: "left", indent: 1, wrapText: col === 4 };
      if (resaltar.includes(l[0])) cell.font = { size: 10, bold: true };
    }
    q++;
  });

  q++;
  (["Precio final al cliente", c.precioFinal, c.totalFinal, "Precio de venta con IGV y descuento"] as const).forEach((v, i) => {
    const cell = s.getCell(q, i + 1);
    cell.value = v;
    cell.font = { bold: true, size: i === 0 ? 12 : i < 3 ? 12 : 9, color: { argb: "FFFFFFFF" } };
    fondo(cell, NAVY);
    cell.border = borde;
    if (i === 1 || i === 2) {
      cell.numFmt = MONEDA;
      cell.alignment = { horizontal: "right", indent: 1, vertical: "middle" };
    } else cell.alignment = { horizontal: "left", indent: 1, vertical: "middle", wrapText: true };
  });
  s.getRow(q).height = 26;
  q += 2;
  const nota = s.getCell(q, 1);
  s.mergeCells(q, 1, q, 4);
  nota.value =
    "Margen efectivo antes de impuesto: " +
    pct(c.margenEfectivo) +
    " sobre el precio de venta. Margen neto después del impuesto a la renta: " +
    pct(c.margenNeto) +
    ". Utilidad neta del pedido: " +
    S(c.totalNeta) +
    " sobre " +
    c.unidades +
    (c.unidades === 1 ? " canasta." : " canastas.");
  nota.font = { size: 10, italic: true, color: { argb: "FF0B3A96" } };
  fondo(nota, CELESTE);
  nota.alignment = { indent: 1, vertical: "middle" };
  nota.border = borde;
  s.getRow(q).height = 24;

  const z = wb.addWorksheet("Cotización", { views: [{ showGridLines: false }] });
  z.columns = [{ width: 8 }, { width: 60 }, { width: 14 }, { width: 18 }];
  titulo(z, "COTIZACIÓN DE CANASTA NAVIDEÑA", 4);
  metaFila(z, 3, "Señores", st.cliente || "");
  metaFila(z, 4, "Canasta", nombre);
  metaFila(z, 5, "Código", codigo);
  metaFila(z, 6, "Fecha", fechaTxt);
  metaFila(z, 7, "Validez de la oferta", st.validez || "15 días");

  let y = 9;
  z.mergeCells(y, 1, y, 4);
  const sub = z.getCell(y, 1);
  sub.value = "CONTENIDO DE LA CANASTA";
  sub.font = { bold: true, size: 10, color: { argb: "FF08234A" } };
  fondo(sub, CELESTE2);
  sub.alignment = { indent: 1, vertical: "middle" };
  z.getRow(y).height = 20;
  y++;
  cabeceraTabla(z, y, ["Ítem", "Producto", "Cantidad", ""]);
  y++;
  st.items.forEach((i, ix) => {
    const fila = z.getRow(y);
    fila.values = [ix + 1, i.nombre, Number(i.cantidad), ""];
    for (let col = 1; col <= 4; col++) {
      const cell = fila.getCell(col);
      cell.border = borde;
      cell.font = { size: 10 };
      if (ix % 2 === 1) fondo(cell, CELESTE);
      cell.alignment = { horizontal: col === 1 || col === 3 ? "center" : "left", indent: col === 2 ? 1 : 0, vertical: "middle" };
    }
    y++;
  });

  y++;
  const resumen: [string, number][] = [
    ["Precio unitario por canasta", c.precioFinal],
    ["Cantidad de canastas", c.unidades],
    ["Total a pagar", c.totalFinal],
  ];
  resumen.forEach((l, ix) => {
    z.mergeCells(y, 1, y, 3);
    const a = z.getCell(y, 1),
      b = z.getCell(y, 4);
    a.value = l[0];
    b.value = l[1];
    const esTotal = ix === 2;
    a.font = { bold: true, size: esTotal ? 12 : 10, color: { argb: esTotal ? "FFFFFFFF" : "FF0F2140" } };
    b.font = { bold: true, size: esTotal ? 13 : 11, color: { argb: esTotal ? "FFFFFFFF" : "FF0F2140" } };
    fondo(a, esTotal ? NAVY : CELESTE);
    fondo(b, esTotal ? NAVY : CELESTE);
    a.alignment = { horizontal: "right", indent: 1, vertical: "middle" };
    b.alignment = { horizontal: "right", indent: 1, vertical: "middle" };
    a.border = borde;
    b.border = borde;
    if (ix !== 1) b.numFmt = MONEDA;
    z.getRow(y).height = esTotal ? 26 : 20;
    y++;
  });
  y++;
  z.mergeCells(y, 1, y, 4);
  const pie = z.getCell(y, 1);
  pie.value =
    (st.factura ? "Precios expresados en soles e incluyen IGV. " : "Precios expresados en soles. ") +
    "Oferta válida por " +
    (st.validez || "15 días") +
    ". Sujeta a disponibilidad de stock de campaña.";
  pie.font = { size: 9.5, italic: true, color: { argb: "FF5D7292" } };
  pie.alignment = { indent: 1, wrapText: true, vertical: "middle" };
  z.getRow(y).height = 26;

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Costeo " + (codigo !== "sin código" ? codigo + " " : "") + nombre.replace(/[\\/:*?"<>|]/g, "") + ".xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
