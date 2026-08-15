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

export function medirImagen(src: string): Promise<{ w: number; h: number } | null> {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => res({ w: i.width, h: i.height });
    i.onerror = () => res(null);
    i.src = src;
  });
}
