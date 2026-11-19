"use client"

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Check,
  ClipboardCheck,
  Gauge,
  Globe2,
  Package,
  Users,
  Zap,
} from "lucide-react"
import { useLandingI18n } from "@/components/landing/landing-i18n"

function SectionHead({ eyebrowKey, titleKey, leadKey, centered = false }: { eyebrowKey: Parameters<ReturnType<typeof useLandingI18n>["t"]>[0]; titleKey: Parameters<ReturnType<typeof useLandingI18n>["t"]>[0]; leadKey: Parameters<ReturnType<typeof useLandingI18n>["t"]>[0]; centered?: boolean }) {
  const { t } = useLandingI18n()
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-sky-600">{t(eyebrowKey)}</p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t(titleKey)}</h2>
      <p className="mt-4 text-base leading-relaxed text-slate-600">{t(leadKey)}</p>
    </div>
  )
}

export function LandingAbout() {
  const { t } = useLandingI18n()
  const list: Parameters<ReturnType<typeof useLandingI18n>["t"]>[0][] = ["sobre.li1", "sobre.li2", "sobre.li3", "sobre.li4", "sobre.li5", "sobre.li6"]

  return (
    <section id="sobre" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <SectionHead eyebrowKey="sobre.eyebrow" titleKey="sobre.title" leadKey="sobre.p1" />
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">{t("sobre.p2")}</p>
          <ul className="mt-8 grid gap-3">
            {list.map((key) => (
              <li key={key} className="flex items-start gap-3 text-sm font-semibold text-slate-800">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
              <Gauge className="h-3.5 w-3.5 text-cyan-600" aria-hidden="true" />
              {t("sobre.stat1")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
              <Globe2 className="h-3.5 w-3.5 text-cyan-600" aria-hidden="true" />
              {t("sobre.stat2")}
            </span>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_-18px_rgba(2,42,80,0.28)] lg:sticky lg:top-24">
          <h3 className="text-lg font-bold text-slate-900">{t("sobre.cardTitle")}</h3>
          <div className="mt-4">
            {[
              { icon: Gauge, tKey: "sobre.mb1", sKey: "sobre.mb1s" },
              { icon: Zap, tKey: "sobre.mb2", sKey: "sobre.mb2s" },
              { icon: Activity, tKey: "sobre.mb3", sKey: "sobre.mb3s" },
            ].map(({ icon: Icon, tKey, sKey }) => (
              <div key={tKey} className="flex items-start gap-4 border-t border-slate-100 py-4 first:border-t-0 first:pt-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t(tKey)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{t(sKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}

const FEATURE_CARDS = [
  { icon: Package, tKey: "feat.f1", dKey: "feat.f1d" },
  { icon: ClipboardCheck, tKey: "feat.f2", dKey: "feat.f2d" },
  { icon: AlertTriangle, tKey: "feat.f3", dKey: "feat.f3d" },
  { icon: CalendarDays, tKey: "feat.f4", dKey: "feat.f4d" },
  { icon: BarChart3, tKey: "feat.f5", dKey: "feat.f5d" },
  { icon: Users, tKey: "feat.f6", dKey: "feat.f6d" },
] as const

export function LandingFeatures() {
  const { t } = useLandingI18n()
  return (
    <section id="funcionalidades" className="scroll-mt-20 border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrowKey="feat.eyebrow" titleKey="feat.title" leadKey="feat.lead" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_CARDS.map(({ icon: Icon, tKey, dKey }) => (
            <article
              key={tKey}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_14px_34px_-18px_rgba(2,42,80,0.3)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                <Icon className="h-5.5 w-5.5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-slate-900">{t(tKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{t(dKey)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

const STEPS = [
  { tKey: "how.s1", dKey: "how.s1d" },
  { tKey: "how.s2", dKey: "how.s2d" },
  { tKey: "how.s3", dKey: "how.s3d" },
  { tKey: "how.s4", dKey: "how.s4d" },
  { tKey: "how.s5", dKey: "how.s5d" },
] as const

export function LandingHowItWorks() {
  const { t } = useLandingI18n()
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrowKey="how.eyebrow" titleKey="how.title" leadKey="how.lead" />
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {STEPS.map(({ tKey, dKey }, i) => (
            <li key={tKey} className="relative">
              <span
                aria-hidden="true"
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-sky-600 to-cyan-500 text-base font-extrabold text-white shadow-[0_0_0_6px_white,0_0_0_7px_#e2e8f0]"
              >
                {i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-14 right-[-1.5rem] top-[22px] hidden h-0.5 lg:block"
                  style={{ background: "repeating-linear-gradient(90deg,#c7d8ea 0 7px,transparent 7px 13px)" }}
                />
              )}
              <h3 className="text-sm font-bold text-slate-900">{t(tKey)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t(dKey)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
