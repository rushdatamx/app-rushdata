"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, Database } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ROUTE_LABELS: Record<string, string> = {
  "": "Inicio",
  sugeridos: "Sugeridos",
  oc: "Órdenes de compra",
  tiendas: "Tiendas",
  productos: "Productos",
  ingesta: "Ingesta",
  equipo: "Equipo",
  ajustes: "Ajustes",
};

function buildCrumbs(pathname: string): Array<{ label: string; href: string }> {
  if (pathname === "/") return [{ label: "Inicio", href: "/" }];
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: Array<{ label: string; href: string }> = [
    { label: "Inicio", href: "/" },
  ];
  let acc = "";
  for (const p of parts) {
    acc += "/" + p;
    const label = ROUTE_LABELS[p] ?? decodeURIComponent(p);
    crumbs.push({ label, href: acc });
  }
  return crumbs;
}

function fmtAnchor(iso: string): { short: string; long: string; isToday: boolean } {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = d.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
  return {
    short: d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
    long: d.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    isToday,
  };
}

export type AppTopbarProps = {
  dataAnchor: string | null;
};

export function AppTopbar({ dataAnchor }: AppTopbarProps) {
  const pathname = usePathname() ?? "/";
  const crumbs = buildCrumbs(pathname);
  const anchor = dataAnchor ? fmtAnchor(dataAnchor) : null;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-5" />

      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <React.Fragment key={c.href}>
                <BreadcrumbItem>
                  {last ? (
                    <BreadcrumbPage>{c.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={c.href}>{c.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!last && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        {anchor && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`hidden md:inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium ${
                  anchor.isToday
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-muted bg-muted/30 text-muted-foreground"
                }`}
              >
                <Database className="size-3" strokeWidth={1.75} />
                <span className="font-mono tabular-nums">
                  {anchor.isToday ? "Datos al día" : `Datos al ${anchor.short}`}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="max-w-[260px]">
              {anchor.isToday ? (
                <span>
                  Datos sincronizados al día de hoy. Todos los reportes reflejan
                  la información más reciente disponible.
                </span>
              ) : (
                <span>
                  Última información cargada: <strong>{anchor.long}</strong>. Todas
                  las vistas y períodos se calculan desde esa fecha.
                </span>
              )}
            </TooltipContent>
          </Tooltip>
        )}

        <button
          type="button"
          className="hidden md:inline-flex h-9 min-w-[260px] items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Search className="size-3.5" strokeWidth={1.75} />
          <span className="flex-1 text-left">Buscar tienda, SKU, OC…</span>
          <kbd className="font-mono text-[10px] text-muted-foreground/80 border rounded px-1 py-0.5">
            ⌘K
          </kbd>
        </button>

        <Button variant="ghost" size="icon" aria-label="Notificaciones">
          <Bell className="size-4" strokeWidth={1.75} />
        </Button>
      </div>
    </header>
  );
}
