export function comprimir(file: File, maxAncho: number, formato: "image/jpeg" | "image/png"): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const esc = Math.min(1, maxAncho / img.width);
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * esc);
        cv.height = Math.round(img.height * esc);
        const cx = cv.getContext("2d")!;
        if (formato === "image/jpeg") {
          cx.fillStyle = "#fff";
          cx.fillRect(0, 0, cv.width, cv.height);
        }
        cx.drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL(formato, 0.85));
      };
      img.onerror = () => rej(new Error("imagen inválida"));
      img.src = fr.result as string;
    };
    fr.onerror = () => rej(new Error("no se pudo leer"));
    fr.readAsDataURL(file);
  });
}

/**
 * Recorta el margen vacío (transparente o casi blanco) alrededor del
 * producto en la foto, para que el recuadro de la imagen quede pegado al
 * dibujo real. Sin esto, fotos con mucho aire alrededor (comunes en fotos
 * de catálogo) hacen que el área de arrastre/selección en el collage sea
 * mucho más grande de lo que se ve.
 */
export function recortarMargenes(file: File): Promise<File> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = img.width;
        cv.height = img.height;
        const cx = cv.getContext("2d")!;
        cx.drawImage(img, 0, 0);

        let datos: ImageData;
        try {
          datos = cx.getImageData(0, 0, cv.width, cv.height);
        } catch {
          // Si el navegador no deja leer los píxeles (imagen de otro origen),
          // se deja la imagen tal cual, sin recorte.
          res(file);
          return;
        }

        const px = datos.data;
        let minX = cv.width, minY = cv.height, maxX = -1, maxY = -1;
        for (let y = 0; y < cv.height; y++) {
          for (let x = 0; x < cv.width; x++) {
            const i = (y * cv.width + x) * 4;
            const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
            const esVacio = a < 12 || (r > 248 && g > 248 && b > 248);
            if (!esVacio) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX < minX || maxY < minY) {
          res(file);
          return;
        }

        const margen = Math.round(Math.max(maxX - minX, maxY - minY) * 0.03);
        minX = Math.max(0, minX - margen);
        minY = Math.max(0, minY - margen);
        maxX = Math.min(cv.width - 1, maxX + margen);
        maxY = Math.min(cv.height - 1, maxY + margen);

        const anchoRec = maxX - minX + 1;
        const altoRec = maxY - minY + 1;
        const cvRec = document.createElement("canvas");
        cvRec.width = anchoRec;
        cvRec.height = altoRec;
        cvRec.getContext("2d")!.drawImage(cv, minX, minY, anchoRec, altoRec, 0, 0, anchoRec, altoRec);

        cvRec.toBlob((blob) => {
          if (!blob) {
            res(file);
            return;
          }
          res(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".png", { type: "image/png" }));
        }, "image/png");
      };
      img.onerror = () => rej(new Error("imagen inválida"));
      img.src = fr.result as string;
    };
    fr.onerror = () => rej(new Error("no se pudo leer"));
    fr.readAsDataURL(file);
  });
}

export function medirImagen(src: string): Promise<{ w: number; h: number } | null> {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => res({ w: i.width, h: i.height });
    i.onerror = () => res(null);
    i.src = src;
  });
}
