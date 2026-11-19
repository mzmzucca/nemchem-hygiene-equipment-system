"use client"

import { useEffect, useState } from "react"
import { useLandingI18n } from "@/components/landing/landing-i18n"

/**
 * Client portfolio section.
 *
 * Client names come from the system's own data source — the Location
 * table — via the public endpoint /api/public/clients (names only, no
 * private data). The list shown is therefore always the real, currently
 * registered client base; this component never hardcodes client names.
 */
interface ClientEntry {
  name: string
  facilityType: string
}

function initials(name: string): string {
  const cleaned = name.replace(/[^\p{L}\p{N} .&-]/gu, " ").trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0] ?? ""
    const b = parts[1][0] ?? ""
    return (a + b).toUpperCase()
  }
  return cleaned.slice(0, 2).toUpperCase()
}

function Chip({ name }: { name: string }) {
  return (
    <li className="inline-flex shrink-0 items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-5 transition hover:border-sky-200 hover:shadow-sm">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-50 text-[11px] font-extrabold text-sky-700"
      >
        {initials(name)}
      </span>
      <span className="whitespace-nowrap text-sm font-semibold text-slate-700">{name}</span>
    </li>
  )
}

export function LandingClients() {
  const { t } = useLandingI18n()
  const [clients, setClients] = useState<ClientEntry[]>([])
  const [state, setState] = useState<"loading" | "ok" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    fetch("/api/public/clients")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { clients?: ClientEntry[] }) => {
        if (cancelled) return
        setClients(Array.isArray(data.clients) ? data.clients : [])
        setState("ok")
      })
      .catch(() => {
        if (cancelled) return
        setState("error")
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section id="clientes" className="scroll-mt-20 border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-sky-600">{t("cli.eyebrow")}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t("cli.title")}</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">{t("cli.lead")}</p>
        </div>

        {state === "loading" && (
          <p className="mt-10 text-center text-sm text-slate-400" aria-live="polite">
            …
          </p>
        )}

        {state === "ok" && clients.length > 0 && (
          <div
            className="landing-marquee mt-8 overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,#000_9%,#000_91%,transparent)]"
            aria-label={t("a11y.clients")}
          >
            <div className="landing-marquee-inner flex w-max gap-3.5">
              <ul className="flex shrink-0 gap-3.5">
                {clients.map((c, i) => (
                  <Chip key={`${c.name}-${i}`} name={c.name} />
                ))}
              </ul>
              <ul className="flex shrink-0 gap-3.5" aria-hidden="true">
                {clients.map((c, i) => (
                  <Chip key={`dup-${c.name}-${i}`} name={c.name} />
                ))}
              </ul>
            </div>
          </div>
        )}

        {(state === "error" || (state === "ok" && clients.length === 0)) && (
          <p className="mt-10 text-center text-sm text-slate-500">{t("cli.error")}</p>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">{t("cli.note")}</p>
      </div>
    </section>
  )
}
