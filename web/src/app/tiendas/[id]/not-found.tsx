import Link from "next/link";
import { Store, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StoreNotFound() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto pt-12">
      <Link
        href="/tiendas"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ChevronLeft className="size-3.5" strokeWidth={1.5} />
        Volver a tiendas
      </Link>
      <Card className="p-12 text-center items-center">
        <div className="inline-flex size-12 items-center justify-center rounded-xl bg-muted">
          <Store className="size-6 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-4">
          Tienda no encontrada
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          La tienda que buscas no existe o no tienes acceso. Pudo haber sido archivada
          o el enlace que abriste es viejo.
        </p>
        <Button asChild className="mt-6">
          <Link href="/tiendas">Ver todas las tiendas</Link>
        </Button>
      </Card>
    </div>
  );
}
