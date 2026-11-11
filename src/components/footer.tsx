export function Footer() {
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="px-4 lg:px-6 py-4 max-w-[1600px] w-full mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} HygieneOps — Equipment Management & Field Operations System</p>
        <p>v1.0 · All modules interconnected · Real-time data</p>
      </div>
    </footer>
  )
}
