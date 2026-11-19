"use client"

import { ClipboardCheck, Droplets, ShieldCheck } from "lucide-react"
import { useLandingI18n } from "@/components/landing/landing-i18n"
import { LandingAuthButton } from "@/components/landing/landing-auth-button"

function KpiCard({ value, label, delta, tone }: { value: string; label: string; delta: string; tone: "up" | "info" | "warn" }) {
  const toneCls =
    tone === "up"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "info"
        ? "bg-sky-50 text-sky-700"
        : "bg-amber-50 text-amber-700"
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
      <p className="text-xl font-extrabold leading-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
      <span className={cnDelta(toneCls)}>{delta}</span>
    </div>
  )
}

function cnDelta(base: string) {
  return `mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${base}`
}

function EquipmentRow({
  icon,
  name,
  sub,
  status,
  tone,
}: {
  icon: React.ReactNode
  name: string
  sub: string
  status: string
  tone: "ok" | "warn" | "maint"
}) {
  const toneCls =
    tone === "ok" ? "bg-emerald-50 text-emerald-700" : tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-800"
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold text-slate-900">{name}</span>
        <span className="block truncate text-[11px] text-slate-400">{sub}</span>
      </span>
      <span className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${toneCls}`}>{status}</span>
    </div>
  )
}

export function LandingHero() {
  const { t } = useLandingI18n()

  return (
    <section id="inicio" className="relative overflow-hidden bg-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px 480px at 88% -12%, #e9f4fb 0%, rgba(233,244,251,0) 62%), radial-gradient(900px 460px at -8% 108%, #edfafd 0%, rgba(237,250,253,0) 58%)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-700">
            <span className="h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.15)]" aria-hidden="true" />
            {t("hero.badge")}
          </span>
          <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
            <span className="bg-gradient-to-r from-sky-700 to-cyan-600 bg-clip-text text-transparent">{t("hero.h1mark")}</span>{" "}
            {t("hero.h1rest")}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">{t("hero.lead")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href="#sobre"
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_-10px_rgba(2,132,199,0.55)] transition hover:-translate-y-0.5 hover:bg-sky-700"
            >
              {t("hero.cta1")}
            </a>
            <LandingAuthButton
              variant="outline"
              size="lg"
              className="rounded-xl border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            />
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-400">
            <ShieldCheck className="h-4 w-4 text-cyan-600" aria-hidden="true" />
            {t("hero.meta")}
          </p>
        </div>

        {/* Dashboard preview (illustrative) */}
        <div className="relative max-w-xl max-lg:mx-auto w-full">
          <div aria-hidden="true" className="absolute -inset-4 left-8 right-[-1rem] top-8 bottom-[-1.5rem] rounded-3xl bg-gradient-to-br from-sky-100 to-cyan-100" />
          <div
            role="img"
            aria-label={t("a11y.mock")}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_34px_70px_-34px_rgba(2,42,80,0.4)]"
          >
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden="true" />
              <span className="ml-2 text-xs font-semibold text-slate-500">{t("mock.title")}</span>
              <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                {t("mock.pill")}
              </span>
            </div>
            <div className="grid gap-3 p-4" aria-hidden="true">
              <div className="grid grid-cols-3 gap-2.5">
                <KpiCard value="128" label={t("mock.k1")} delta={t("mock.k1d")} tone="up" />
                <KpiCard value="36" label={t("mock.k2")} delta={t("mock.k2d")} tone="info" />
                <KpiCard value="5" label={t("mock.k3")} delta={t("mock.k3d")} tone="warn" />
              </div>
              <div className="grid gap-2">
                <EquipmentRow
                  icon={<Droplets className="h-4 w-4" />}
                  name={t("mock.r1")}
                  sub={t("mock.r1s")}
                  status={t("mock.stOk")}
                  tone="ok"
                />
                <EquipmentRow
                  icon={<ClipboardCheck className="h-4 w-4" />}
                  name={t("mock.r2")}
                  sub={t("mock.r2s")}
                  status={t("mock.stWarn")}
                  tone="warn"
                />
                <EquipmentRow
                  icon={<ShieldCheck className="h-4 w-4" />}
                  name={t("mock.r3")}
                  sub={t("mock.r3s")}
                  status={t("mock.stMaint")}
                  tone="maint"
                />
              </div>
            </div>
          </div>
          <p className="relative mt-3 text-center text-xs text-slate-400">{t("mock.note")}</p>
        </div>
      </div>
    </section>
  )
}
