import jsPDF from "jspdf";
import { calcular, S } from "@/lib/calculo";
import { medirImagen } from "@/lib/imagen";
import type { EstadoCanasta, Emisor } from "@/lib/tipos";

const PALETAS = {
  verde: { fuerte: [21, 84, 42], suave: [46, 125, 50], pie: [138, 158, 140], franja: [241, 244, 238] },
  azul: { fuerte: [8, 35, 74], suave: [18, 86, 210], pie: [141, 158, 181], franja: [238, 244, 252] },
} as const;

export async function generarPDF(st: EstadoCanasta, emisor: Emisor) {
  if (!st.items.length) throw new Error("Agrega productos antes de generar la cotización");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const P = PALETAS[emisor.color || "verde"];
  const c = calcular(st);
  const W = 210,
    L = 16,
    R = 194;
  const fecha = st.fecha ? st.fecha.split("-").reverse().join("/") : "";

  doc.setFillColor(P.franja[0], P.franja[1], P.franja[2]);
  doc.rect(0, 0, W, 297, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(L - 6, 34, W - 2 * (L - 6), 232, "F");

  let y = 14;
  if (emisor.logoUrl) {
    const dim = await medirImagen(emisor.logoUrl);
    if (dim) {
      const h = Math.min(20, (55 * dim.h) / dim.w),
        w = (h * dim.w) / dim.h;
      doc.addImage(emisor.logoUrl, "PNG", (W - w) / 2, y, w, h);
      y += h + 6;
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(P.pie[0], P.pie[1], P.pie[2]);
    doc.text((emisor.razon || "TU LOGO AQUÍ").toUpperCase(), W / 2, y + 11, { align: "center" });
    y += 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
  doc.text("COTIZACIÓN " + (st.numeroCot || st.codigo || ""), W / 2, y + 8, { align: "center" });
  y += 20;

  const datos: [string, string][] = [
    ["EMPRESA", st.cliente || ""],
    ["RUC", st.rucCliente || ""],
    ["CONTACTO", st.contacto || ""],
    ["TELÉFONO", st.telefono || ""],
    ["FECHA", fecha],
  ];
  datos.forEach((d) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
    doc.text(d[0], L + 4, y);
    doc.setFontSize(10.5);
    doc.setTextColor(35, 35, 35);
    doc.text(String(d[1]), L + 46, y);
    y += 7.4;
  });

  y += 5;
  const cols = [L, 104, 134, 164, R];
  doc.setFillColor(P.fuerte[0], P.fuerte[1], P.fuerte[2]);
  doc.rect(L, y, R - L, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("PRODUCTO", L + (cols[1] - L) / 2, y + 9.5, { align: "center" });
  doc.text("CANT", (cols[1] + cols[2]) / 2, y + 9.5, { align: "center" });
  doc.setFontSize(8.6);
  doc.text("PRECIO", (cols[2] + cols[3]) / 2, y + 6.4, { align: "center" });
  doc.text("UNITARIO", (cols[2] + cols[3]) / 2, y + 11.4, { align: "center" });
  doc.text("PRECIO", (cols[3] + cols[4]) / 2, y + 6.4, { align: "center" });
  doc.text("TOTAL", (cols[3] + cols[4]) / 2, y + 11.4, { align: "center" });
  y += 15;

  doc.setDrawColor(P.fuerte[0], P.fuerte[1], P.fuerte[2]);
  doc.setLineWidth(0.3);
  doc.rect(L, y, R - L, 12);
  cols.slice(1, 4).forEach((x) => doc.line(x, y, x, y + 12));
  doc.setTextColor(35, 35, 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const nomCanasta = doc.splitTextToSize(String(st.nombre || "Canasta navideña").toUpperCase(), cols[1] - L - 8)[0];
  doc.text(nomCanasta, L + 4, y + 7.8);
  doc.text(String(c.unidades), (cols[1] + cols[2]) / 2, y + 7.8, { align: "center" });
  doc.text(S(c.precioFinal), (cols[2] + cols[3]) / 2, y + 7.8, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(S(c.totalFinal), (cols[3] + cols[4]) / 2, y + 7.8, { align: "center" });
  y += 22;

  const hayFoto = !!st.fotoUrl;
  const yTope = 234;
  const altoDisponibleFoto = yTope - y;

  let anchoFoto = 0;
  let altoFoto = 0;
  let dimFoto: { w: number; h: number } | null = null;
  if (hayFoto) {
    dimFoto = await medirImagen(st.fotoUrl);
    if (dimFoto) {
      // La foto ocupa la mayor parte del ancho de la hoja; la lista de
      // productos queda angosta a la derecha.
      const anchoMax = 128;
      const escala = Math.min(anchoMax / dimFoto.w, altoDisponibleFoto / dimFoto.h);
      anchoFoto = dimFoto.w * escala;
      altoFoto = dimFoto.h * escala;
      doc.addImage(st.fotoUrl, "JPEG", L + 2, y, anchoFoto, altoFoto);
    }
  }

  const xLista = hayFoto && dimFoto ? L + 2 + anchoFoto + 8 : L + 8;
  const anchoLista = R - xLista - 2;
  let yLista = y;
  let fs = st.items.length > 20 ? 8 : st.items.length > 14 ? 8.8 : 9.6;
  let lh = fs * 0.62;
  if (y + st.items.length * lh > yTope) {
    lh = Math.max(3.4, (yTope - y) / st.items.length);
    fs = Math.max(6.4, Math.min(fs, lh / 0.62));
  }

  st.items.forEach((i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fs);
    doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
    doc.text("•", xLista, yLista);
    doc.setTextColor(35, 35, 35);
    doc.text(String(i.cantidad), xLista + 4, yLista);
    const lineas = doc.splitTextToSize(String(i.nombre), anchoLista - 11);
    doc.text(lineas[0], xLista + 9.5, yLista);
    yLista += lh;
    if (lineas.length > 1) {
      doc.text(lineas.slice(1).join(" "), xLista + 9.5, yLista);
      yLista += lh;
    }
  });

  let yCond = hayFoto ? Math.max(y + altoFoto + 10, yLista + 12) : yLista + 12;
  if (yCond > 236) yCond = 236;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(35, 35, 35);
  doc.text("Condiciones Comerciales:", L + 2, yCond);
  yCond += 6.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  (st.condiciones || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6)
    .forEach((cond) => {
      doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
      doc.text("•", L + 3, yCond);
      doc.setTextColor(50, 50, 50);
      doc.text(cond, L + 8, yCond);
      yCond += 6;
    });

  const yPie = 272;
  doc.setDrawColor(P.pie[0], P.pie[1], P.pie[2]);
  doc.setLineWidth(0.2);
  doc.line(L, yPie - 6, R, yPie - 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(P.pie[0], P.pie[1], P.pie[2]);
  if (emisor.telefonos) doc.text("Teléfono: " + emisor.telefonos, L, yPie);
  if (emisor.correo) doc.text("E-mail: " + emisor.correo, L, yPie + 5);
  if (emisor.razon) doc.text("Razón comercial: " + emisor.razon, R, yPie, { align: "right" });
  if (emisor.ruc) doc.text("RUC: " + emisor.ruc, R, yPie + 5, { align: "right" });

  const nom = "Cotización " + (st.numeroCot || st.codigo || st.nombre || "canasta");
  doc.save(nom.replace(/[\\/:*?"<>|]/g, "") + ".pdf");
}
