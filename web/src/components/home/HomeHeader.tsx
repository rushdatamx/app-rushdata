import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

function fmtFecha(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export type HomeHeaderProps = {
  firstName: string;
  orgName: string;
  kpiDate: string | null;
};

export function HomeHeader({ firstName, orgName, kpiDate }: HomeHeaderProps) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
          Bienvenido, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {orgName} · vista del {fmtFecha(kpiDate ?? today)}
        </p>
      </div>
      <Button variant="outline" size="sm" className="hidden sm:inline-flex">
        <Download className="size-3.5" strokeWidth={1.75} />
        Exportar
      </Button>
    </div>
  );
}
