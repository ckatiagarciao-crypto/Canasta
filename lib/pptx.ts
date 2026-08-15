import JSZip from "jszip";

export type ImagenExtraida = {
  nombreArchivo: string;
  blob: Blob;
  url: string;
};

const EXTENSIONES_VALIDAS: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function extraerImagenesDePptx(file: File): Promise<ImagenExtraida[]> {
  const zip = await JSZip.loadAsync(file);
  const entradas = Object.values(zip.files).filter(
    (f) => !f.dir && /^ppt\/media\//.test(f.name)
  );

  const imagenes: ImagenExtraida[] = [];
  for (const entrada of entradas) {
    const ext = entrada.name.split(".").pop()?.toLowerCase() ?? "";
    const mime = EXTENSIONES_VALIDAS[ext];
    if (!mime) continue;
    const blob = await entrada.async("blob");
    const tipado = new Blob([blob], { type: mime });
    imagenes.push({
      nombreArchivo: entrada.name.split("/").pop() ?? entrada.name,
      blob: tipado,
      url: URL.createObjectURL(tipado),
    });
  }

  imagenes.sort((a, b) => a.nombreArchivo.localeCompare(b.nombreArchivo, undefined, { numeric: true }));
  return imagenes;
}
