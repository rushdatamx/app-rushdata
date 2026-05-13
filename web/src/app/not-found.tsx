import Link from "next/link";
import { Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto pt-16">
      <Card className="p-12 text-center items-center">
        <div className="inline-flex size-12 items-center justify-center rounded-xl bg-muted">
          <Compass className="size-6 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-4">Página no encontrada</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          La URL que abriste no corresponde a ninguna vista del portal.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </Card>
    </div>
  );
}
