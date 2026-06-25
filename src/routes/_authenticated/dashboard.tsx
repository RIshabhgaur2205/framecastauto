import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid, Tv, CalendarClock, CreditCard, Settings, LogOut, Loader2 } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid, exact: true },
  { to: "/dashboard/channels", label: "Channels", icon: Tv, exact: false },
  { to: "/dashboard/queue", label: "Content queue", icon: CalendarClock, exact: false },
  { to: "/dashboard/billing", label: "Billing", icon: CreditCard, exact: false },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
] as const;

function DashboardLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isLoading && profile && !profile.onboarded) {
      navigate({ to: "/onboarding" });
    }
  }, [isLoading, profile, navigate]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-hairline bg-surface lg:flex">
        <Link to="/" className="flex h-16 items-center gap-2 border-b border-hairline px-6">
          <span className="block h-2 w-2 bg-accent shadow-[0_0_12px_var(--color-accent-glow)]" />
          <span className="font-display text-lg tracking-[0.2em] text-foreground">
            FRAMECAST
          </span>
        </Link>
        <nav className="flex-1 p-3">
          <div className="label-eyebrow px-3 py-3">Studio</div>
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-px -translate-y-1/2 bg-accent" />
                )}
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-hairline p-3">
          <div className="px-3 py-2 text-xs">
            <div className="truncate text-foreground">{profile.email}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Operator
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-accent"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex w-full min-w-0 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-hairline bg-surface px-4 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <span className="block h-2 w-2 bg-accent" />
            <span className="font-display tracking-[0.2em]">FRAMECAST</span>
          </Link>
          <button onClick={signOut} className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Sign out
          </button>
        </header>

        {/* Mobile nav strip */}
        <div className="flex gap-1 overflow-x-auto border-b border-hairline bg-surface px-2 py-2 lg:hidden">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`shrink-0 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] ${
                  active ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <main className="min-w-0 flex-1 px-6 py-10 lg:px-10 lg:py-14">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
