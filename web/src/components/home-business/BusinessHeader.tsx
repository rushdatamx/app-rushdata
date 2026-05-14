import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmtFecha(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function saludoPorHora(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export type BusinessHeaderProps = {
  firstName: string;
  orgName: string;
  anchorDate: string;
};

export function BusinessHeader({ firstName, orgName, anchorDate }: BusinessHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
          {saludoPorHora()}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {orgName} · datos al {fmtFecha(anchorDate)}
        </p>
      </div>
      <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
        <Link href="/reporte">
          <FileText className="size-3.5" strokeWidth={1.75} />
          Reporte PDF
        </Link>
      </Button>
    </div>
  );
}
