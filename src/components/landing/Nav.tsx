import { useEffect, useState } from "react";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-hairline bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
        <a href="#top" className="flex items-center gap-2">
          <span className="block h-2 w-2 bg-accent shadow-[0_0_12px_var(--color-accent-glow)]" />
          <span className="font-display text-xl tracking-[0.18em] text-foreground">
            FRAMECAST
          </span>
        </a>
        <nav className="hidden items-center gap-10 md:flex">
          {[
            { href: "#how", label: "How it works" },
            { href: "#pricing", label: "Pricing" },
            { href: "#testimonials", label: "Testimonials" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href="#cta"
          className="inline-flex h-9 items-center bg-accent px-4 text-[13px] font-medium text-accent-foreground transition-all hover:bg-accent/90 hover:shadow-[0_0_24px_-4px_var(--color-accent-glow)]"
        >
          Start creating
        </a>
      </div>
    </header>
  );
}
