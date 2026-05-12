"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Store,
  Package,
  FileText,
  Database,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  soon?: boolean;
};

const primary: NavItem[] = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/sugeridos", label: "Sugeridos", icon: ShoppingCart },
  { href: "/tiendas", label: "Tiendas", icon: Store },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/oc", label: "OC", icon: FileText },
];

const secondary: NavItem[] = [
  { href: "/ingesta", label: "Ingesta", icon: Database, soon: true },
  { href: "/equipo", label: "Equipo", icon: Users, soon: true },
  { href: "/ajustes", label: "Ajustes", icon: Settings, soon: true },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  if (item.soon) {
    return (
      <div
        className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-[13px] leading-5 text-subtle cursor-not-allowed"
        title="Próximamente"
      >
        <span className="flex items-center gap-2.5">
          <Icon className="size-4 shrink-0" strokeWidth={1.5} />
          <span>{item.label}</span>
        </span>
        <span className="text-[9px] uppercase tracking-wider font-mono text-subtle/60">
          pronto
        </span>
      </div>
    );
  }
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] leading-5 transition-colors",
        active
          ? "bg-accent-soft text-accent font-medium"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.5} />
      <span>{item.label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  return (
    <aside className="w-[220px] shrink-0 border-r border-border bg-surface h-screen sticky top-0 flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-border">
        <span className="font-mono text-[15px] tracking-tight text-foreground">
          rushdata
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {primary.map((it) => (
          <NavLink key={it.href} item={it} active={isActive(pathname, it.href)} />
        ))}
        <div className="h-px bg-border my-3" />
        {secondary.map((it) => (
          <NavLink key={it.href} item={it} active={isActive(pathname, it.href)} />
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-border text-[11px] tracking-wider uppercase text-subtle">
        Demo · Sazonadores
      </div>
    </aside>
  );
}
