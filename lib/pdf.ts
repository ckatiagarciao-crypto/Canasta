import jsPDF from "jspdf";
import { S } from "@/lib/calculo";
import { medirImagen } from "@/lib/imagen";
import { firmantePorNombre } from "@/lib/firmantes";
import { nivelPorCodigo } from "@/lib/niveles";
import type { Emisor, Cotizacion } from "@/lib/tipos";

const PALETAS = {
  verde: { fuerte: [21, 84, 42], suave: [46, 125, 50], pie: [138, 158, 140], franja: [241, 244, 238] },
  azul: { fuerte: [8, 35, 74], suave: [18, 86, 210], pie: [141, 158, 181], franja: [238, 244, 252] },
} as const;

export async function generarCotizacionPDF(cot: Cotizacion, emisor: Emisor) {
  if (!cot.canastas.length) throw new Error("Agrega al menos una canasta a la cotización");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const P = PALETAS[emisor.color || "verde"];
  const L = 16,
    R = 194,
    ANCHO = R - L,
    PIE = 280;
  let y = 16;

  function nuevaPagina() {
    doc.addPage();
    y = 16;
  }
  function asegurarEspacio(alto: number) {
    if (y + alto > PIE) nuevaPagina();
  }
  function tituloSeccion(texto: string) {
    asegurarEspacio(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(P.fuerte[0], P.fuerte[1], P.fuerte[2]);
    doc.text(texto, L, y);
    y += 7;
  }

  // --- Encabezado ---
  if (emisor.logoUrl) {
    const dim = await medirImagen(emisor.logoUrl);
    if (dim) {
      const h = Math.min(14, (40 * dim.h) / dim.w),
        w = (h * dim.w) / dim.h;
      doc.addImage(emisor.logoUrl, "PNG", L, y, w, h);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
    doc.text(emisor.razon || "", L, y + 9);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
  doc.text("N°", 140, y + 4);
  doc.text("FECHA", 140, y + 9.5);
  doc.text("VALIDEZ", 140, y + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(35, 35, 35);
  const fecha = cot.fecha ? cot.fecha.split("-").reverse().join("/") : "";
  doc.text(cot.numeroCot || "", 156, y + 4);
  doc.text(fecha, 156, y + 9.5);
  doc.text(doc.splitTextToSize(cot.validez || "", 38)[0] || "", 156, y + 15);
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(P.fuerte[0], P.fuerte[1], P.fuerte[2]);
  doc.text("COTIZACIÓN", L, y);
  y += 9;

  // --- Datos del cliente ---
  const filasCliente: [string, string, string, string][] = [
    ["Empresa", cot.empresa, "RUC", cot.ruc],
    ["Contacto", cot.contacto, "Cargo", cot.cargo],
    ["Correo", cot.correo, "Teléfono", cot.telefono],
    ["Categoría", cot.categoria, "Campaña", cot.campana],
  ];
  const altoFila = 7.4;
  const yTablaCliente = y;
  doc.setDrawColor(P.pie[0], P.pie[1], P.pie[2]);
  doc.setLineWidth(0.25);
  doc.rect(L, y, ANCHO, altoFila * filasCliente.length);
  filasCliente.forEach((f, ix) => {
    const fy = yTablaCliente + ix * altoFila + altoFila * 0.68;
    if (ix > 0) doc.line(L, yTablaCliente + ix * altoFila, R, yTablaCliente + ix * altoFila);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
    doc.text(f[0].toUpperCase(), L + 3, fy);
    doc.text(f[2].toUpperCase(), 105, fy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(35, 35, 35);
    doc.text(doc.splitTextToSize(f[1] || "", 62)[0] || "", L + 27, fy);
    doc.text(doc.splitTextToSize(f[3] || "", 62)[0] || "", 127, fy);
  });
  doc.line(102, yTablaCliente, 102, yTablaCliente + altoFila * filasCliente.length);
  y = yTablaCliente + altoFila * filasCliente.length + 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  const intro = doc.splitTextToSize(
    "Estimado cliente, de acuerdo con su solicitud les presentamos nuestra propuesta de canastas navideñas para la campaña " +
      (cot.campana || "") +
      ". Cuidamos cada detalle del armado y la presentación.",
    ANCHO
  );
  doc.text(intro, L, y);
  y += intro.length * 4.6 + 6;

  // --- Resumen de la propuesta ---
  tituloSeccion("RESUMEN DE LA PROPUESTA");
  const colsR = [L, L + 12, 118, 142, R];
  const altoFilaR = 13;
  asegurarEspacio(9 + altoFilaR * cot.canastas.length);
  doc.setFillColor(P.fuerte[0], P.fuerte[1], P.fuerte[2]);
  doc.rect(L, y, ANCHO, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("N°", (colsR[0] + colsR[1]) / 2, y + 5.8, { align: "center" });
  doc.text("DESCRIPCIÓN", colsR[1] + 3, y + 5.8);
  doc.text("CANT.", (colsR[2] + colsR[3]) / 2, y + 5.8, { align: "center" });
  doc.text("P. UNIT. CON IGV", (colsR[3] + colsR[4]) / 2, y + 5.8, { align: "center" });
  y += 9;
  doc.setDrawColor(P.pie[0], P.pie[1], P.pie[2]);
  doc.setLineWidth(0.25);
  cot.canastas.forEach((it, ix) => {
    doc.rect(L, y, ANCHO, altoFilaR);
    colsR.slice(1, 4).forEach((x) => doc.line(x, y, x, y + altoFilaR));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(35, 35, 35);
    doc.text(String(ix + 1), (colsR[0] + colsR[1]) / 2, y + 6, { align: "center" });
    doc.text(doc.splitTextToSize(it.nombre.toUpperCase(), colsR[2] - colsR[1] - 6)[0] || "", colsR[1] + 3, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.6);
    doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
    const nivel = nivelPorCodigo(it.nivel);
    doc.text((nivel ? nivel.nombre + " · " : "") + it.items.length + " productos", colsR[1] + 3, y + 10.6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(35, 35, 35);
    doc.text(String(it.cantidad), (colsR[2] + colsR[3]) / 2, y + 8, { align: "center" });
    doc.text(S(it.precioUnitario), (colsR[3] + colsR[4]) / 2 - 8, y + 8, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(S(it.precioUnitario * it.cantidad), (colsR[3] + colsR[4]) / 2 + 12, y + 8, { align: "center" });
    y += altoFilaR;
  });
  y += 3;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.2);
  doc.setTextColor(120, 120, 120);
  doc.text("Los totales corresponden a cada opción por separado. La cantidad definitiva se confirma con la orden de compra.", L, y);
  y += 10;

  // --- Detalle de las canastas ---
  nuevaPagina();
  tituloSeccion("DETALLE DE LAS CANASTAS");
  for (const it of cot.canastas) {
    const nivel = nivelPorCodigo(it.nivel);
    const altoBloque = 62;
    asegurarEspacio(altoBloque);
    const yIni = y;
    doc.setFillColor(P.franja[0], P.franja[1], P.franja[2]);
    doc.rect(L, y, ANCHO, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(P.fuerte[0], P.fuerte[1], P.fuerte[2]);
    doc.text(("CANASTA " + it.nombre).toUpperCase(), L + 3, y + 5.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
    doc.text((nivel ? nivel.nombre + " · " : "") + it.items.length + " productos", L + 3, y + 9.8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(35, 35, 35);
    doc.text(S(it.precioUnitario) + " por unidad", R - 3, y + 7.4, { align: "right" });
    y += 12;

    const altoCuerpo = altoBloque - 12;
    doc.setDrawColor(P.pie[0], P.pie[1], P.pie[2]);
    doc.rect(L, y, ANCHO, altoCuerpo);

    const anchoFoto = 42;
    if (it.fotoUrl) {
      const dim = await medirImagen(it.fotoUrl);
      if (dim) {
        const escala = Math.min(anchoFoto / dim.w, (altoCuerpo - 4) / dim.h);
        const w = dim.w * escala,
          h = dim.h * escala;
        doc.addImage(it.fotoUrl, "JPEG", L + (anchoFoto - w) / 2 + 2, y + (altoCuerpo - h) / 2, w, h);
      }
    } else {
      doc.setDrawColor(P.pie[0], P.pie[1], P.pie[2]);
      doc.setLineDashPattern([1.2, 1], 0);
      doc.rect(L + 2, y + 3, anchoFoto - 2, altoCuerpo - 6);
      doc.setLineDashPattern([], 0);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(P.pie[0], P.pie[1], P.pie[2]);
      doc.text(doc.splitTextToSize("Espacio para la foto de la canasta", anchoFoto - 8), L + anchoFoto / 2, y + altoCuerpo / 2 - 3, { align: "center" });
    }
    doc.line(L + anchoFoto + 4, y, L + anchoFoto + 4, y + altoCuerpo);

    const listaTodos = [...it.items.map((p) => p.cantidad + "  " + p.nombre), "1  Caja navideña con tapa y precinto"];
    const xCol1 = L + anchoFoto + 8;
    const anchoCol = (ANCHO - anchoFoto - 12) / 2;
    const xCol2 = xCol1 + anchoCol + 4;
    const mitad = Math.ceil(listaTodos.length / 2);
    const filasCol = Math.max(mitad, listaTodos.length - mitad);
    const lh = Math.min(5.2, Math.max(3.6, (altoCuerpo - 6) / filasCol));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(Math.min(8.4, lh * 1.55));
    listaTodos.forEach((texto, ix) => {
      const col = ix < mitad ? 0 : 1;
      const fila = ix < mitad ? ix : ix - mitad;
      const x = col === 0 ? xCol1 : xCol2;
      const fy = y + 5 + fila * lh;
      doc.setTextColor(35, 35, 35);
      doc.text(doc.splitTextToSize(texto, anchoCol - 2)[0] || "", x, fy);
    });

    y = yIni + altoBloque + 6;
  }

  // --- Condiciones comerciales ---
  asegurarEspacio(20 + (cot.condiciones || "").split("\n").filter((s) => s.trim()).length * 5.4);
  tituloSeccion("CONDICIONES COMERCIALES");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.3);
  (cot.condiciones || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((linea) => {
      const partes = doc.splitTextToSize(linea, ANCHO - 6);
      asegurarEspacio(partes.length * 4.8 + 2);
      doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
      doc.text("•", L + 1, y);
      doc.setTextColor(50, 50, 50);
      doc.text(partes, L + 6, y);
      y += partes.length * 4.8 + 1.6;
    });
  y += 6;

  // --- Firma ---
  const firmante = firmantePorNombre(cot.firmante);
  asegurarEspacio(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  doc.text("Quedamos a su disposición para cualquier consulta o ajuste que requiera la propuesta.", L, y);
  y += 10;
  doc.text("Atentamente,", L, y);
  y += 9;
  if (firmante) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(P.fuerte[0], P.fuerte[1], P.fuerte[2]);
    doc.text(firmante.nombre, L, y);
    y += 5.6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.3);
    doc.setTextColor(60, 60, 60);
    doc.text("WhatsApp: " + firmante.telefono + "   ·   " + firmante.correo, L, y);
  }

  const nom = "Cotización " + (cot.numeroCot || cot.empresa || "canastas");
  doc.save(nom.replace(/[\\/:*?"<>|]/g, "") + ".pdf");
}
