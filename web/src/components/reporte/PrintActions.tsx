"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";

export function PrintActions() {
  const sp = useSearchParams();
  const router = useRouter();
  const autoPrint = sp?.get("print") === "1";

  useEffect(() => {
    if (autoPrint) {
      // Pequeño delay para que el render termine antes de disparar el diálogo
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);

  return (
    <div className="print:hidden flex items-center justify-between gap-3 py-4 mb-2">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <ArrowLeft className="size-3.5" strokeWidth={1.75} />
        Volver
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Printer className="size-4" strokeWidth={1.75} />
        Imprimir / Guardar PDF
      </button>
    </div>
  );
}
