"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const errorParam = params.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    setErrorMsg(null);

    const sb = supabaseBrowser();
    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="text-[22px] font-semibold tracking-tight text-foreground">
            RushData
          </div>
          <div className="text-[13px] text-muted mt-1">
            Si Power BI te dice qué pasó, RushData te dice qué hacer.
          </div>
        </div>

        <div className="border border-border rounded-lg bg-surface p-6">
          <h1 className="text-[15px] font-semibold text-foreground mb-1">
            Inicia sesión
          </h1>
          <p className="text-[12px] text-muted mb-5">
            Te enviamos un enlace seguro a tu correo. Sin contraseña.
          </p>

          {errorParam === "no-org" && (
            <div className="mb-4 text-[12px] text-red-400 border border-red-900/30 bg-red-900/10 rounded-md px-3 py-2">
              Tu cuenta no tiene organización asignada. Contacta a Mario.
            </div>
          )}
          {errorParam === "callback-failed" && (
            <div className="mb-4 text-[12px] text-red-400 border border-red-900/30 bg-red-900/10 rounded-md px-3 py-2">
              El enlace expiró o ya fue usado. Pide uno nuevo.
            </div>
          )}

          {status === "sent" ? (
            <div className="text-[13px] text-foreground border border-border rounded-md px-3 py-4 text-center">
              <div className="font-medium mb-1">Revisa tu correo</div>
              <div className="text-[12px] text-muted">
                Te enviamos un enlace a <span className="font-mono">{email}</span>.
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block">
                <span className="text-[11px] text-muted uppercase tracking-wider">
                  Correo
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-background text-[13px] text-foreground placeholder:text-subtle focus:outline-none focus:border-accent"
                  autoFocus
                />
              </label>

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full h-10 rounded-md bg-foreground text-background text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {status === "sending" ? "Enviando…" : "Enviar enlace mágico"}
              </button>

              {errorMsg && (
                <div className="text-[12px] text-red-400">{errorMsg}</div>
              )}
            </form>
          )}
        </div>

        <div className="text-[11px] text-subtle text-center mt-6">
          ¿Problemas para entrar? Escribe a{" "}
          <span className="font-mono">mario@rushdata.com.mx</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
