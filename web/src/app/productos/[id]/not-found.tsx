import Link from "next/link";
import { Package, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto pt-12">
      <Link
        href="/productos"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ChevronLeft className="size-3.5" strokeWidth={1.5} />
        Volver a productos
      </Link>
      <Card className="p-12 text-center items-center">
        <div className="inline-flex size-12 items-center justify-center rounded-xl bg-muted">
          <Package className="size-6 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-4">
          Producto no encontrado
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          El SKU que buscas no existe o no tienes acceso. Pudo haber sido descontinuado
          o el enlace que abriste es viejo.
        </p>
        <Button asChild className="mt-6">
          <Link href="/productos">Ver todos los productos</Link>
        </Button>
      </Card>
    </div>
  );
}
