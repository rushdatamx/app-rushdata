import { loadPivotDetail, type PivotGroupBy } from "@/lib/queries/pivot-detail";
import { loadStores } from "@/lib/queries/stores";
import { loadProducts } from "@/lib/queries/products";
import { DetalleTable } from "@/components/shared/DetalleTable";
import { ProductosDetalleFilters } from "@/components/productos/ProductosDetalleFilters";

const ALLOWED_GROUP: PivotGroupBy[] = ["product", "category", "month"];

const DIM_LABEL: Record<PivotGroupBy, string> = {
  store: "tienda",
  product: "producto",
  region: "región",
  category: "categoría",
  month: "mes",
};

export type ProductosDetalleProps = {
  period: { start: string; end: string; label: string };
  groupBy?: string;
  productId?: string;
  storeId?: string;
  category?: string;
};

export async function ProductosDetalle({
  period,
  groupBy,
  productId,
  storeId,
  category,
}: ProductosDetalleProps) {
  const safeGroupBy: PivotGroupBy = ALLOWED_GROUP.includes(groupBy as PivotGroupBy)
    ? (groupBy as PivotGroupBy)
    : "product";

  const [pivot, storesRes, productsRes] = await Promise.all([
    loadPivotDetail({
      start: period.start,
      end: period.end,
      groupBy: safeGroupBy,
      productId: productId || undefined,
      storeId: storeId || undefined,
      category: category || undefined,
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

  const categoriesSet = new Set<string>();
  for (const p of productsRes.rows) {
    if (p.category) categoriesSet.add(p.category);
  }
  const categoriesCatalog = Array.from(categoriesSet).sort();

  return (
    <div className="flex flex-col gap-4">
      <ProductosDetalleFilters
        groupBy={safeGroupBy}
        productId={productId ?? ""}
        storeId={storeId ?? ""}
        category={category ?? ""}
        products={productsCatalog}
        stores={storesCatalog}
        categories={categoriesCatalog}
      />
      <DetalleTable
        rows={pivot.rows}
        totals={pivot.totals}
        groupBy={safeGroupBy}
        dimensionLabel={DIM_LABEL[safeGroupBy]}
        filenameBase={`productos-detalle-${safeGroupBy}`}
      />
    </div>
  );
}
