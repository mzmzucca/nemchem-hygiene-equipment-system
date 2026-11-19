"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, Globe, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLandingI18n } from "@/components/landing/landing-i18n"
import { LANGUAGES, type LandingLang } from "@/lib/i18n/landing-dictionaries"
import { LandingAuthButton } from "@/components/landing/landing-auth-button"

/** NemChem brand mark — placeholder SVG wordmark (swap for the official logo asset when available). */
export function BrandMark({ className, iconFill = "bg-sky-600" }: { className?: string; iconFill?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold tracking-tight text-slate-900", className)}>
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", iconFill)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3.5c4 4.7 6.4 8.1 6.4 10.9a6.4 6.4 0 1 1-12.8 0c0-2.8 2.4-6.2 6.4-10.9Z" fill="#fff" opacity=".92" />
          <path d="M9.2 14.6l2 2 3.6-3.8" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>
        Nem<span className="text-sky-600">Chem</span>
      </span>
    </span>
  )
}

const SECTION_LINKS = [
  { key: "nav.inicio", href: "#inicio" },
  { key: "nav.sobre", href: "#sobre" },
  { key: "nav.funcionalidades", href: "#funcionalidades" },
  { key: "nav.como", href: "#como-funciona" },
  { key: "nav.clientes", href: "#clientes" },
  { key: "nav.contactos", href: "#contactos" },
] as const

export function LandingHeader() {
  const { t, lang, setLang } = useLandingI18n()
  const [open, setOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLangOpen(false)
    }
    document.addEventListener("click", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("click", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-transparent bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 transition-[border-color,box-shadow]",
        scrolled && "border-slate-200 shadow-[0_8px_30px_-18px_rgba(2,42,80,0.35)]"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="#inicio" aria-label={t("a11y.brandHome")} className="shrink-0">
          <BrandMark />
        </Link>

        <nav aria-label={t("a11y.mainNav")} className="mx-auto hidden items-center gap-1 lg:flex">
          {SECTION_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {t(item.key)}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {/* Language selector */}
          <div className="relative" ref={langRef}>
            <button
              type="button"
              aria-label={t("a11y.langBtn")}
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              onClick={() => setLangOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
            >
              <Globe className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <span className="hidden min-[380px]:inline">{LANGUAGES.find((l) => l.code === lang)?.short}</span>
              <ChevronDown className={cn("h-3 w-3 text-slate-400 transition-transform", langOpen && "rotate-180")} aria-hidden="true" />
            </button>
            {langOpen && (
              <div
                role="listbox"
                aria-label={t("a11y.langMenu")}
                className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
              >
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    role="option"
                    aria-selected={lang === l.code}
                    onClick={() => {
                      setLang(l.code as LandingLang)
                      setLangOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                      lang === l.code ? "bg-sky-50 font-semibold text-sky-700" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span>{l.label}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">{l.short}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden sm:block">
            <LandingAuthButton className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700">
              {null}
            </LandingAuthButton>
          </div>

          <button
            type="button"
            aria-label={t("a11y.menu")}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 lg:hidden"
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="landing-mobile-menu" className="border-t border-slate-200 bg-white lg:hidden">
          <nav aria-label={t("a11y.mainNav")} className="mx-auto grid max-w-6xl gap-1 px-4 py-3 sm:px-6">
            {SECTION_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-base font-semibold text-slate-800 hover:bg-slate-50"
              >
                {t(item.key)}
              </a>
            ))}
            <div className="pt-2 sm:hidden">
              <LandingAuthButton className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
                {null}
              </LandingAuthButton>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
