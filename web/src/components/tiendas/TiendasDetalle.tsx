import { loadPivotDetail, type PivotGroupBy } from "@/lib/queries/pivot-detail";
import { loadStores } from "@/lib/queries/stores";
import { loadProducts } from "@/lib/queries/products";
import { DetalleTable } from "@/components/shared/DetalleTable";
import { TiendasDetalleFilters } from "@/components/tiendas/TiendasDetalleFilters";

const ALLOWED_GROUP: PivotGroupBy[] = ["store", "region", "month"];

const DIM_LABEL: Record<PivotGroupBy, string> = {
  store: "tienda",
  product: "producto",
  region: "región",
  category: "categoría",
  month: "mes",
};

export type TiendasDetalleProps = {
  period: { start: string; end: string; label: string };
  groupBy?: string;
  storeId?: string;
  productId?: string;
  region?: string;
};

export async function TiendasDetalle({
  period,
  groupBy,
  storeId,
  productId,
  region,
}: TiendasDetalleProps) {
  const safeGroupBy: PivotGroupBy = ALLOWED_GROUP.includes(groupBy as PivotGroupBy)
    ? (groupBy as PivotGroupBy)
    : "store";

  // En paralelo: pivot + catálogos para los dropdowns
  const [pivot, storesRes, productsRes] = await Promise.all([
    loadPivotDetail({
      start: period.start,
      end: period.end,
      groupBy: safeGroupBy,
      storeId: storeId || undefined,
      productId: productId || undefined,
      region: region || undefined,
    }),
    loadStores({ start: period.start, end: period.end }),
    loadProducts({ start: period.start, end: period.end }),
  ]);

  const storesCatalog = storesRes.rows
    .filter((s) => !s.isCedis)
    .map((s) => ({ id: s.id, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const productsCatalog = productsRes.rows
    .map((p) => ({ id: p.id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const regionsCatalog = storesRes.regions ?? [];

  return (
    <div className="flex flex-col gap-4">
      <TiendasDetalleFilters
        groupBy={safeGroupBy}
        storeId={storeId ?? ""}
        productId={productId ?? ""}
        region={region ?? ""}
        stores={storesCatalog}
        products={productsCatalog}
        regions={regionsCatalog}
      />
      <DetalleTable
        rows={pivot.rows}
        totals={pivot.totals}
        groupBy={safeGroupBy}
        dimensionLabel={DIM_LABEL[safeGroupBy]}
        filenameBase={`tiendas-detalle-${safeGroupBy}`}
      />
    </div>
  );
}
