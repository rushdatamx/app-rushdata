"use client";

import * as React from "react";
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
  LogOut,
  ChevronsUpDown,
  Building2,
  Sparkles,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOutAction } from "@/app/auth/actions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  soon?: boolean;
};

const principal: NavItem[] = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/sugeridos", label: "Sugeridos", icon: ShoppingCart },
  { href: "/forecast", label: "Forecast", icon: Sparkles },
  { href: "/oc", label: "Órdenes de compra", icon: FileText },
];

const catalogo: NavItem[] = [
  { href: "/tiendas", label: "Tiendas", icon: Store },
  { href: "/productos", label: "Productos", icon: Package },
];

const datos: NavItem[] = [
  { href: "/ingesta", label: "Ingesta", icon: Database, soon: true },
  { href: "/equipo", label: "Equipo", icon: Users, soon: true },
  { href: "/ajustes", label: "Ajustes", icon: Settings, soon: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function initials(input: string): string {
  if (!input) return "??";
  const parts = input.split(/[\s.\-_@]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return input.slice(0, 2).toUpperCase();
}

export type AppSidebarProps = {
  orgName: string;
  userEmail: string;
  role: string;
};

export function AppSidebar({ orgName, userEmail, role }: AppSidebarProps) {
  const pathname = usePathname() ?? "/";
  const [local] = userEmail.split("@");
  const userInitials = initials(userEmail);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="font-mono text-[13px] font-semibold">R</span>
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-semibold tracking-tight">RushData</span>
            <span className="truncate text-xs text-muted-foreground">
              {orgName || "—"}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {principal.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <Icon strokeWidth={1.75} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Catálogo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {catalogo.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <Icon strokeWidth={1.75} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Datos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {datos.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      disabled
                      className="cursor-not-allowed opacity-60"
                    >
                      <Icon strokeWidth={1.75} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.soon && (
                      <SidebarMenuBadge className="text-[9px] uppercase tracking-wider">
                        pronto
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                  tooltip={local}
                >
                  <Avatar className="size-7 rounded-md">
                    <AvatarFallback className="rounded-md bg-primary text-primary-foreground text-[11px]">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium">{local}</span>
                    <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                      {role}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                className="w-56"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{local}</span>
                    <span className="text-xs text-muted-foreground">
                      {userEmail}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <Building2 className="mr-2 size-4" />
                  <span>{orgName}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    void signOutAction();
                  }}
                >
                  <LogOut className="mr-2 size-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
