export function Footer() {
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="px-4 lg:px-6 py-4 max-w-[1600px] w-full mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} NemChem Hygiene Services — Sistema de Gestão de Higiene</p>
        <p>v1.0 · Todos os módulos interligados · Dados em tempo real</p>
      </div>
    </footer>
  )
}
