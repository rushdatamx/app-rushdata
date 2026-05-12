import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!SUPABASE_ANON_KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

/**
 * Server client with user session — RLS aplica filtros automáticamente por org_id (JWT).
 * Crear uno nuevo por request: el cliente lee/escribe cookies de la sesión.
 *
 * `allowSetCookies=false` para Server Components (no pueden escribir cookies).
 * El proxy.ts se encarga de refrescar tokens.
 */
export async function supabaseServer(opts: { allowSetCookies?: boolean } = {}): Promise<
  SupabaseClient
> {
  const cookieStore = await cookies();
  const allowSet = opts.allowSetCookies ?? false;

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(toSet) {
        if (!allowSet) return;
        for (const { name, value, options } of toSet) {
          try {
            cookieStore.set(name, value, options as CookieOptions);
          } catch {
            // Server Components: ignorar silenciosamente; proxy.ts hace el refresh.
          }
        }
      },
    },
  });
}
