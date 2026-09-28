import jsPDF from "jspdf";
import { unidadesArmado } from "@/lib/calculo";
import { medirImagen } from "@/lib/imagen";
import { firmantePorNombre } from "@/lib/firmantes";
import { nivelPorCodigo } from "@/lib/niveles";
import type { Emisor, Cotizacion } from "@/lib/tipos";

type RGB = readonly [number, number, number];

// Colores tomados del Formato_de_cotizacion_corporativa_-_GC_Co.docx.
const NAVY: RGB = [8, 47, 78];
const TEXTO: RGB = [31, 42, 55];
const TENUE: RGB = [138, 155, 176];
const AZUL: RGB = [18, 86, 210];
const CELESTE: RGB = [234, 243, 254];
const BORDE: RGB = [213, 226, 239];
const SUBTITULO_BARRA: RGB = [207, 228, 251];
const NOTA: RGB = [93, 114, 146];
const BLANCO: RGB = [255, 255, 255];

const LOGO_POR_DEFECTO = "/cotizacion/logo-gc.png";
const FOTO_PRODUCTOS = "/cotizacion/productos-2026.jpg";

const monto = (n: number) =>
  (Number(n) || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function cargarImagen(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => res(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function formatoImagen(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

export async function generarCotizacionPDF(cot: Cotizacion, emisor: Emisor) {
  if (!cot.canastas.length) throw new Error("Agrega al menos una canasta a la cotización");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 20,
    R = 190,
    ANCHO = R - L,
    TOPE = 27,
    PIE = 278;
  let y = TOPE;

  const logo = emisor.logoUrl || (await cargarImagen(LOGO_POR_DEFECTO));
  const dimLogo = logo ? await medirImagen(logo) : null;
  const fotoProductos = await cargarImagen(FOTO_PRODUCTOS);
  const dimFotoProductos = fotoProductos ? await medirImagen(fotoProductos) : null;

  function nuevaPagina() {
    doc.addPage();
    y = TOPE;
  }
  function asegurarEspacio(alto: number) {
    if (y + alto > PIE) nuevaPagina();
  }
  function t(
    txt: string | string[],
    x: number,
    yy: number,
    color: RGB,
    tam: number,
    estilo: "normal" | "bold" | "italic" | "bolditalic" = "normal",
    align: "left" | "center" | "right" = "left"
  ) {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(txt, x, yy, { align });
  }
  function relleno(x: number, yy: number, w: number, h: number, color: RGB) {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x, yy, w, h, "F");
  }
  function borde(x: number, yy: number, w: number, h: number) {
    doc.setDrawColor(BORDE[0], BORDE[1], BORDE[2]);
    doc.setLineWidth(0.25);
    doc.rect(x, yy, w, h);
  }
  function tituloSeccion(txt: string, espacioSiguiente = 10) {
    asegurarEspacio(7 + espacioSiguiente);
    t(txt, L, y, NAVY, 10.5, "bold");
    y += 2;
    doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.setLineWidth(0.5);
    doc.line(L, y, R, y);
    y += 5;
  }
  function partir(txt: string, ancho: number, tam: number, estilo: "normal" | "bold" | "italic" = "normal"): string[] {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    return doc.splitTextToSize(txt || "", ancho);
  }
  function recortar(txt: string, ancho: number, tam: number, estilo: "normal" | "bold" | "italic" = "normal") {
    return partir(txt, ancho, tam, estilo)[0] || "";
  }

  // --- Encabezado: COTIZACIÓN y N° / Fecha / Validez ---
  t("COTIZACIÓN", L, y + 8, NAVY, 20, "bold");
  const fecha = cot.fecha ? cot.fecha.split("-").reverse().join("/") : "";
  const filasEnc: [string, string, RGB, "normal" | "italic"][] = [
    ["N°", cot.numeroCot, TEXTO, "normal"],
    ["Fecha:", fecha, TEXTO, "normal"],
    ["Validez:", cot.validez, TENUE, "italic"],
  ];
  filasEnc.forEach(([etq, valor, color, estilo], ix) => {
    const yy = y + 1 + ix * 4.8;
    doc.setFont("helvetica", estilo);
    doc.setFontSize(9);
    const w = doc.getTextWidth(valor || "");
    t(valor || "", R, yy, color, 9, estilo, "right");
    t(etq, R - w - 1.8, yy, NAVY, 9, "bold", "right");
  });
  y += 19;

  // --- Datos del cliente ---
  const filasCliente: [string, string, string, string][] = [
    ["Empresa", cot.empresa, "RUC", cot.ruc],
    ["Contacto", cot.contacto, "Cargo", cot.cargo],
    ["Correo", cot.correo, "Teléfono", cot.telefono],
    ["Categoría", cot.categoria, "Campaña", cot.campana],
  ];
  const altoFila = 6.4;
  const anchoEtq = 25;
  const mitadAncho = ANCHO / 2;
  filasCliente.forEach((f) => {
    [0, 1].forEach((lado) => {
      const x = L + lado * mitadAncho;
      relleno(x, y, anchoEtq, altoFila, CELESTE);
      borde(x, y, anchoEtq, altoFila);
      borde(x + anchoEtq, y, mitadAncho - anchoEtq, altoFila);
      t(f[lado * 2], x + 2, y + 4.3, NAVY, 9, "bold");
      t(recortar(f[lado * 2 + 1], mitadAncho - anchoEtq - 4, 9), x + anchoEtq + 2, y + 4.3, TEXTO, 9);
    });
    y += altoFila;
  });
  y += 10;

  const intro = partir(
    "Estimado cliente, de acuerdo con su solicitud les presentamos nuestra propuesta de canastas navideñas para la campaña " +
      (cot.campana || "") +
      ". Cuidamos cada detalle del armado y la presentación.",
    ANCHO,
    9.5
  );
  t(intro, L, y, TEXTO, 9.5);
  y += intro.length * 4.4 + 9;

  // --- Resumen de la propuesta ---
  tituloSeccion("RESUMEN DE LA PROPUESTA");
  const cols = [L, L + 10, L + 92, L + 110, L + 138, R];
  const centro = (i: number) => (cols[i] + cols[i + 1]) / 2;
  const altoEnc = 10;
  const altoFilaR = 11.5;
  asegurarEspacio(altoEnc + altoFilaR * Math.min(cot.canastas.length, 3));
  relleno(L, y, ANCHO, altoEnc, NAVY);
  t("N°", centro(0), y + 6.2, BLANCO, 9, "bold", "center");
  t("Descripción", cols[1] + 2.5, y + 6.2, BLANCO, 9, "bold");
  t("Cantidad", centro(2), y + 6.2, BLANCO, 9, "bold", "center");
  t(["P. Unit. con", "IGV (S/)"], centro(3), y + 4.3, BLANCO, 9, "bold", "center");
  t(["Total con", "IGV (S/)"], centro(4), y + 4.3, BLANCO, 9, "bold", "center");
  y += altoEnc;
  cot.canastas.forEach((it, ix) => {
    asegurarEspacio(altoFilaR);
    const nivel = nivelPorCodigo(it.nivel);
    relleno(cols[4], y, cols[5] - cols[4], altoFilaR, CELESTE);
    for (let c = 0; c < 5; c++) borde(cols[c], y, cols[c + 1] - cols[c], altoFilaR);
    t(String(ix + 1), centro(0), y + 7, AZUL, 9.5, "bold", "center");
    t(recortar("Canasta " + it.nombre, cols[2] - cols[1] - 5, 9.5, "bold"), cols[1] + 2.5, y + 5, NAVY, 9.5, "bold");
    t((nivel ? nivel.nombre + "  ·  " : "") + unidadesArmado(it.items) + " productos", cols[1] + 2.5, y + 9, TENUE, 7.8);
    t(String(it.cantidad), centro(2), y + 7, TEXTO, 9, "normal", "center");
    t(monto(it.precioUnitario), centro(3), y + 7, TEXTO, 9, "normal", "center");
    t(monto(it.precioUnitario * it.cantidad), centro(4), y + 7, NAVY, 9.5, "bold", "center");
    y += altoFilaR;
  });
  y += 5;
  const nota = partir("Los totales corresponden a cada opción por separado. La cantidad definitiva se confirma con la orden de compra.", ANCHO, 8, "italic");
  t(nota, L, y, TENUE, 8, "italic");
  y += nota.length * 3.8 + 5;

  if (fotoProductos && dimFotoProductos) {
    const w = 142;
    const h = (w * dimFotoProductos.h) / dimFotoProductos.w;
    asegurarEspacio(h + 10);
    doc.addImage(fotoProductos, "JPEG", L + (ANCHO - w) / 2, y, w, h);
    y += h + 5;
    t("Productos disponibles para nuestra campaña 2026", L + ANCHO / 2, y, TENUE, 8, "italic", "center");
    y += 10;
  }

  // --- Detalle de las canastas ---
  const anchoFoto = 42;
  const xCol1 = L + anchoFoto;
  const anchoCol = (R - xCol1) / 2;
  const xCol2 = xCol1 + anchoCol;
  const anchoNombre = anchoCol - 10;
  // Mismo tamaño de letra para todos los productos; los nombres que no entran
  // en una línea pasan a una segunda en vez de achicarse o cortarse.
  const TAM_LISTA = 7.5;
  const ALTO_LINEA = 3.4;
  const ESPACIO_ITEM = 1.6;

  function armarLista(it: Cotizacion["canastas"][number]) {
    const tieneCaja = it.items.some((p) => p.cod.startsWith("EMP"));
    const lista = it.items.map((p) => ({ cant: String(p.cantidad), nombre: p.nombre }));
    if (!tieneCaja) lista.push({ cant: "1", nombre: "Caja navideña con tapa y precinto" });
    const filas = lista.map((p) => {
      const lineas = partir(p.nombre, anchoNombre, TAM_LISTA);
      return { ...p, lineas, alto: lineas.length * ALTO_LINEA + ESPACIO_ITEM };
    });
    // Se reparte en dos columnas por altura, no por cantidad de productos.
    const total = filas.reduce((a, f) => a + f.alto, 0);
    const col1: typeof filas = [];
    const col2: typeof filas = [];
    let acumulado = 0;
    for (const f of filas) {
      if (acumulado + f.alto / 2 <= total / 2 || !col1.length) {
        col1.push(f);
        acumulado += f.alto;
      } else col2.push(f);
    }
    const altoCol = (c: typeof filas) => c.reduce((a, f) => a + f.alto, 0);
    return { col1, col2, altoCuerpo: Math.max(40, Math.max(altoCol(col1), altoCol(col2)) + 7) };
  }

  const altoBarra = 9;
  tituloSeccion("DETALLE DE LAS CANASTAS", altoBarra + armarLista(cot.canastas[0]).altoCuerpo + 4);

  for (const it of cot.canastas) {
    const nivel = nivelPorCodigo(it.nivel);
    const { col1, col2, altoCuerpo } = armarLista(it);
    asegurarEspacio(altoBarra + altoCuerpo + 4);

    relleno(L, y, ANCHO, altoBarra, NAVY);
    const nombre = "CANASTA " + it.nombre.toUpperCase();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    const wNombre = doc.getTextWidth(nombre);
    t(nombre, L + 3, y + 5.8, BLANCO, 9.5, "bold");
    t((nivel ? nivel.nombre + "  ·  " : "") + unidadesArmado(it.items) + " productos", L + 3 + wNombre + 5, y + 5.8, SUBTITULO_BARRA, 8.5);
    t("S/ " + monto(it.precioUnitario) + " por unidad", R - 3, y + 5.8, BLANCO, 9.5, "bold", "right");
    y += altoBarra;

    borde(L, y, anchoFoto, altoCuerpo);
    borde(xCol1, y, anchoCol, altoCuerpo);
    borde(xCol2, y, anchoCol, altoCuerpo);

    const dimFoto = it.fotoUrl ? await medirImagen(it.fotoUrl) : null;
    if (it.fotoUrl && dimFoto) {
      const escala = Math.min((anchoFoto - 4) / dimFoto.w, (altoCuerpo - 4) / dimFoto.h);
      const w = dimFoto.w * escala,
        h = dimFoto.h * escala;
      doc.addImage(it.fotoUrl, formatoImagen(it.fotoUrl), L + (anchoFoto - w) / 2, y + (altoCuerpo - h) / 2, w, h);
    } else {
      t(["Espacio para la foto", "de la canasta"], L + anchoFoto / 2, y + altoCuerpo / 2 - 1.5, TENUE, 8, "italic", "center");
    }

    [col1, col2].forEach((col, c) => {
      const x = c === 0 ? xCol1 : xCol2;
      let fy = y + 6;
      for (const f of col) {
        t(f.cant, x + 3, fy, AZUL, TAM_LISTA, "bold");
        t(f.lineas, x + 8, fy, TEXTO, TAM_LISTA);
        fy += f.alto;
      }
    });

    y += altoCuerpo + 6;
  }
  t(partir("Todas las canastas se entregan en caja navideña de cartón con tapa y precinto de seguridad.", ANCHO, 8, "italic"), L, y, NOTA, 8, "italic");
  y += 11;

  // --- Condiciones comerciales, cierre y firma: siempre juntos, en la
  // última hoja. Si no entran enteros en lo que queda de la hoja, pasan
  // todos a una hoja nueva. ---
  const condiciones = (cot.condiciones || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const firmante = firmantePorNombre(cot.firmante);
  const altoCondiciones = condiciones.reduce((a, c) => a + partir(c, ANCHO - 8, 9).length * 4.3 + 2.4, 0);
  const altoCierre = 8 + 13 + (firmante ? 5 + 4.6 + 4 : 0);
  asegurarEspacio(7 + altoCondiciones + 5 + altoCierre);
  tituloSeccion("CONDICIONES COMERCIALES", 0);
  condiciones.forEach((c) => {
    const partes = partir(c, ANCHO - 8, 9);
    asegurarEspacio(partes.length * 4.3 + 2);
    t("•", L + 2, y, NAVY, 9.5, "bold");
    t(partes, L + 7, y, TEXTO, 9);
    y += partes.length * 4.3 + 2.4;
  });
  y += 5;

  // --- Cierre y firma ---
  t("Quedamos a su disposición para cualquier consulta o ajuste que requiera la propuesta.", L, y, TEXTO, 9);
  y += 8;
  t("Atentamente,", L, y, TEXTO, 9);
  y += 13;
  if (firmante) {
    t(firmante.nombre, L, y, NAVY, 10.5, "bold");
    y += 5;
    t("WhatsApp " + firmante.telefono, L, y, TEXTO, 9);
    y += 4.6;
    t(firmante.correo, L, y, AZUL, 9);
  }

  // --- Logo arriba y pie de página en todas las hojas ---
  const total = doc.getNumberOfPages();
  const contacto = [emisor.telefonos && "WhatsApp " + emisor.telefonos, emisor.correo].filter(Boolean).join("   |   ");
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    if (logo && dimLogo) {
      const h = 9,
        w = (h * dimLogo.w) / dimLogo.h;
      doc.addImage(logo, formatoImagen(logo), R - w, 9, w, h);
    }
    doc.setDrawColor(BORDE[0], BORDE[1], BORDE[2]);
    doc.setLineWidth(0.3);
    doc.line(L, 284, R, 284);
    if (contacto) t(contacto, L, 288.5, TENUE, 7.5);
    t("Página " + p + " de " + total, R, 288.5, TENUE, 7.5, "normal", "right");
  }

  const nom = "Cotización " + (cot.numeroCot || cot.empresa || "canastas");
  doc.save(nom.replace(/[\\/:*?"<>|]/g, "") + ".pdf");
}
