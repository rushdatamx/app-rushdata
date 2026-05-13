"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type MarkSentResult =
  | { ok: true; updated: number }
  | { ok: false; error: string };

export async function markSuggestionsSent(ids: string[]): Promise<MarkSentResult> {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "Sin IDs seleccionados" };
  }

  const { orgId, role } = await verifySession();
  if (role === "viewer") {
    return { ok: false, error: "No tienes permisos para esta acción" };
  }

  const db = await supabaseServer({ allowSetCookies: true });
  const { error, count } = await db
    .from("suggested_orders")
    .update({ status: "sent" }, { count: "exact" })
    .eq("org_id", orgId)
    .eq("status", "new")
    .in("id", ids);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/sugeridos");
  revalidatePath("/");
  return { ok: true, updated: count ?? 0 };
}
