export function Footer() {
  const cols = [
    { title: "Product", links: ["How it works", "Pricing", "Changelog", "Roadmap"] },
    { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
    { title: "Legal", links: ["Terms", "Privacy", "Acceptable use", "DMCA"] },
  ];

  return (
    <footer className="border-t border-hairline bg-background">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_3fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="block h-2 w-2 bg-accent shadow-[0_0_12px_var(--color-accent-glow)]" />
              <span className="font-display text-2xl tracking-[0.2em] text-foreground">
                FRAMECAST
              </span>
            </div>
            <p className="mt-5 max-w-sm text-sm text-muted-foreground">
              The autonomous studio for YouTube creators and operators. Script,
              voice, visuals, and publishing — fully automated.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {cols.map((c) => (
              <div key={c.title}>
                <div className="label-eyebrow">{c.title}</div>
                <ul className="mt-5 space-y-3">
                  {c.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="text-sm text-foreground/80 transition-colors hover:text-accent"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-8 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          <span>© 2026 Framecast Studios</span>
          <span>Built for the people who'd rather direct than edit.</span>
        </div>
      </div>
    </footer>
  );
}
