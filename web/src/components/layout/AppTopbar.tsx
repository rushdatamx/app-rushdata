"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
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

export function AppTopbar() {
  const pathname = usePathname() ?? "/";
  const crumbs = buildCrumbs(pathname);

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
