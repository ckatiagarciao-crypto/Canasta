import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Costeador from "@/components/Costeador";
import type { Producto } from "@/lib/tipos";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: productos } = await supabase.from("productos").select("*").order("cod");

  return <Costeador productosIniciales={(productos as Producto[]) ?? []} correoUsuaria={user.email ?? ""} />;
}
