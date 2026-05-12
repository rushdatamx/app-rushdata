import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/ssr";

export type Session = {
  userId: string;
  email: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  role: string;
};

/**
 * Verifica que hay un usuario autenticado con org asignada.
 * Redirige a /login si no.
 *
 * Memoizado por render con React cache(): se llama varias veces sin pegarle a la BD.
 */
/**
 * Lee la sesión sin redirigir. Usar en el layout raíz (que también renderiza /login).
 * Devuelve null si no hay sesión o si el user no tiene org.
 */
export const getSessionSoft = cache(async (): Promise<Session | null> => {
  const sb = await supabaseServer();
  const { data: userRes } = await sb.auth.getUser();
  const user = userRes?.user;
  if (!user) return null;

  const { data: profile } = await sb
    .from("users")
    .select("org_id, role, organizations(id, slug, name)")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.org_id) return null;

  const orgRaw = profile.organizations as unknown;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as
    | { id: string; slug: string; name: string }
    | null;

  return {
    userId: user.id,
    email: user.email ?? "",
    orgId: profile.org_id as string,
    orgSlug: org?.slug ?? "",
    orgName: org?.name ?? "",
    role: (profile.role as string) ?? "viewer",
  };
});

export const verifySession = cache(async (): Promise<Session> => {
  const sb = await supabaseServer();
  const { data: userRes } = await sb.auth.getUser();
  const user = userRes?.user;

  if (!user) {
    redirect("/login");
  }

  // org_id puede venir del JWT (rápido) o del lookup en public.users (primer login).
  // Hacemos un solo join contra public.users + organizations para tener todo lo que el shell necesita.
  const { data: profile, error } = await sb
    .from("users")
    .select("org_id, role, organizations(id, slug, name)")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || !profile.org_id) {
    // Usuario en auth pero sin row en public.users → sesión incompleta.
    redirect("/login?error=no-org");
  }

  const orgRaw = profile.organizations as unknown;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as
    | { id: string; slug: string; name: string }
    | null;

  return {
    userId: user.id,
    email: user.email ?? "",
    orgId: profile.org_id as string,
    orgSlug: org?.slug ?? "",
    orgName: org?.name ?? "",
    role: (profile.role as string) ?? "viewer",
  };
});
