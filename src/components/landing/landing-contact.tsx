"use client"

import { Check, Mail, MapPin, Phone } from "lucide-react"
import { useLandingI18n } from "@/components/landing/landing-i18n"
import { LandingAuthButton } from "@/components/landing/landing-auth-button"

/**
 * Contact section. NemChem's official Mozambique contact details are not
 * published anywhere in the repository or application, so they are shown
 * as clearly marked placeholders ("A configurar") — nothing is invented.
 */
export function LandingContact() {
  const { t } = useLandingI18n()

  const rows = [
    { icon: Mail, labelKey: "con.email" as const },
    { icon: Phone, labelKey: "con.tel" as const },
    { icon: MapPin, labelKey: "con.addr" as const },
  ]

  return (
    <section id="contactos" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-sky-600">{t("con.eyebrow")}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t("con.title")}</h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">{t("con.lead")}</p>

          <div className="mt-8 grid max-w-lg gap-3">
            {rows.map(({ icon: Icon, labelKey }) => (
              <div key={labelKey} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{t(labelKey)}</p>
                  <p className="mt-0.5">
                    <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      {t("con.todo")}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-lg text-xs text-slate-400">{t("con.note")}</p>
        </div>

        <aside className="relative flex flex-col justify-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-sky-950 to-sky-800 p-8 text-white shadow-[0_34px_70px_-34px_rgba(2,42,80,0.5)] sm:p-10">
          <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-2xl" />
          <h3 className="relative text-2xl font-extrabold">{t("con.ctaTitle")}</h3>
          <p className="relative text-sm leading-relaxed text-white/80">{t("con.ctaText")}</p>
          <ul className="relative mt-1 grid gap-2.5">
            {(["con.t1", "con.t2", "con.t3"] as const).map((key) => (
              <li key={key} className="flex items-start gap-2.5 text-sm text-white/90">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-cyan-300">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
          <LandingAuthButton
            size="lg"
            className="relative mt-2 w-fit rounded-xl bg-white px-6 font-semibold text-slate-900 hover:bg-slate-100"
          />
        </aside>
      </div>
    </section>
  )
}
