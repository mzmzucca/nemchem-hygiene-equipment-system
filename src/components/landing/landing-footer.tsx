"use client"

import Link from "next/link"
import { BrandMark } from "@/components/landing/landing-header"
import { useLandingI18n } from "@/components/landing/landing-i18n"
import { LandingAuthButton } from "@/components/landing/landing-auth-button"

export function LandingFooter() {
  const { t } = useLandingI18n()
  const year = new Date().getFullYear()

  const navLinks = [
    { key: "nav.inicio", href: "#inicio" },
    { key: "nav.sobre", href: "#sobre" },
    { key: "nav.funcionalidades", href: "#funcionalidades" },
    { key: "nav.como", href: "#como-funciona" },
    { key: "nav.clientes", href: "#clientes" },
    { key: "nav.contactos", href: "#contactos" },
  ] as const

  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Link href="#inicio" aria-label={t("a11y.brandHome")} className="inline-flex">
            <BrandMark className="text-white" iconFill="bg-cyan-500" />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">{t("foot.desc")}</p>
        </div>

        <nav aria-label={t("foot.navTitle")}>
          <h4 className="text-sm font-bold text-white">{t("foot.navTitle")}</h4>
          <div className="mt-4 grid gap-2.5">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-slate-400 transition-colors hover:text-white">
                {t(l.key)}
              </a>
            ))}
          </div>
        </nav>

        <div>
          <h4 className="text-sm font-bold text-white">{t("foot.platTitle")}</h4>
          <div className="mt-4 grid gap-2.5">
            <LandingAuthButton variant="ghost" className="h-auto justify-start p-0 text-sm font-normal text-slate-400 hover:bg-transparent hover:text-white" />
            <a href="#contactos" className="text-sm text-slate-400 transition-colors hover:text-white">
              {t("foot.support")}
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-white">{t("foot.contactTitle")}</h4>
          <div className="mt-4 grid gap-2.5 text-sm text-slate-400">
            <span>
              <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-amber-200">{t("con.todo")}</span>{" "}
              · {t("con.email")}
            </span>
            <span>
              <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-amber-200">{t("con.todo")}</span>{" "}
              · {t("con.tel")}
            </span>
            <span>
              <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-amber-200">{t("con.todo")}</span>{" "}
              · {t("con.addr")}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-slate-500 sm:px-6">
          <p>
            © {year} NemChem International. {t("foot.rights")}
          </p>
          <p>{t("foot.tag")}</p>
        </div>
      </div>
    </footer>
  )
}
