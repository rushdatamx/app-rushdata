"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const GROUP_BY_OPTIONS = [
  { value: "product", label: "Producto" },
  { value: "category", label: "Categoría" },
  { value: "month", label: "Mes" },
];

export type ProductosDetalleFiltersProps = {
  groupBy: string;
  productId: string;
  storeId: string;
  category: string;
  products: Array<{ id: string; name: string }>;
  stores: Array<{ id: string; name: string }>;
  categories: string[];
};

export function ProductosDetalleFilters({
  groupBy,
  productId,
  storeId,
  category,
  products,
  stores,
  categories,
}: ProductosDetalleFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(sp?.toString() ?? "");
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === "all") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [router, pathname, sp]
  );

  const hasFilters = productId || storeId || category;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <FilterBlock label="Agrupar por">
        <Select
          value={groupBy}
          onValueChange={(v) => update({ groupBy: v === "product" ? null : v })}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUP_BY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBlock>

      <FilterBlock label="Producto">
        <Select
          value={productId || "all"}
          onValueChange={(v) => update({ productId: v })}
        >
          <SelectTrigger size="sm" className="w-56">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBlock>

      <FilterBlock label="Tienda">
        <Select
          value={storeId || "all"}
          onValueChange={(v) => update({ storeId: v })}
        >
          <SelectTrigger size="sm" className="w-56">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {stores.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBlock>

      <FilterBlock label="Categoría">
        <Select
          value={category || "all"}
          onValueChange={(v) => update({ category: v })}
        >
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBlock>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => update({ productId: null, storeId: null, category: null })}
        >
          <X className="size-3.5" strokeWidth={1.75} />
          Limpiar
        </Button>
      )}
    </div>
  );
}

function FilterBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
      {children}
    </div>
  );
}
