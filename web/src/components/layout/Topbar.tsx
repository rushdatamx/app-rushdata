import { Bell, Search, LogOut } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";

type Props = {
  chainLabel?: string;
  userEmail?: string;
  orgName?: string;
  role?: string;
};

function initials(email: string): string {
  if (!email) return "??";
  const [local] = email.split("@");
  const parts = local.split(/[.\-_]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export function Topbar({
  chainLabel = "HEB",
  userEmail = "",
  orgName = "",
  role = "viewer",
}: Props) {
  const ini = initials(userEmail);
  const [local] = userEmail.split("@");

  return (
    <header className="h-14 sticky top-0 z-10 bg-background border-b border-border flex items-center justify-between px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 h-8 px-2.5 rounded-md border border-border text-[13px] text-foreground hover:bg-surface-hover transition-colors"
        >
          <span className="font-medium">{chainLabel}</span>
          <span className="text-subtle">▾</span>
        </button>
        {orgName && (
          <div className="text-[12px] text-muted hidden md:block">{orgName}</div>
        )}
      </div>

      <button
        type="button"
        className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-surface text-[12px] text-muted hover:bg-surface-hover transition-colors min-w-[280px]"
      >
        <Search className="size-3.5" strokeWidth={1.5} />
        <span className="flex-1 text-left">Buscar tienda, SKU, OC…</span>
        <kbd className="font-mono text-[10px] text-subtle border border-border rounded px-1 py-0.5">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="size-8 inline-flex items-center justify-center rounded-md hover:bg-surface-hover transition-colors text-muted"
          aria-label="Notificaciones"
        >
          <Bell className="size-4" strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div
            className="size-7 rounded-full bg-accent-soft text-accent inline-flex items-center justify-center text-[11px] font-medium"
            title={userEmail}
          >
            {ini}
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-[12px] font-medium text-foreground">
              {local || "—"}
            </div>
            <div className="text-[10px] text-subtle uppercase tracking-wider">
              {role}
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="ml-1 size-8 inline-flex items-center justify-center rounded-md hover:bg-surface-hover transition-colors text-muted"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="size-4" strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
