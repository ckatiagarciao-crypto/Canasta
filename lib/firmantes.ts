export type Firmante = {
  nombre: string;
  telefono: string;
  correo: string;
};

export const FIRMANTES: Firmante[] = [
  { nombre: "Katia García", telefono: "998 997 155", correo: "katia.garcia.gyc@gmail.com" },
  { nombre: "Patricia García", telefono: "969 234 393", correo: "patricia.garcia.gyc@gmail.com" },
  { nombre: "José Luis Chumpitaz", telefono: "985 319 051", correo: "joseluischumpitaz.gyc@gmail.com" },
];

export function firmantePorNombre(nombre: string): Firmante | undefined {
  return FIRMANTES.find((f) => f.nombre === nombre);
}
