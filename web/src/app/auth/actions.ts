"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/ssr";

export async function signOutAction() {
  const sb = await supabaseServer({ allowSetCookies: true });
  await sb.auth.signOut();
  redirect("/login");
}
