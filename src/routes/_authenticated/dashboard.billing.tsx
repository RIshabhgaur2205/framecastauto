import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPreferences } from "@/lib/profile.functions";
import { toast } from "sonner";
import { CineSkeleton } from "@/components/ui/cine-skeleton";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  component: BillingPage,
});

function BillingPage() {
  const { data: prefs, isLoading } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => getPreferences(),
  });

  const tier = prefs?.quality_tier === "premium" ? "Pro" : "Starter";
  const price = prefs?.quality_tier === "premium" ? "$99 / month" : "$29 / month";
  const perVideo = prefs?.quality_tier === "premium" ? "$6 / video" : "$2 / video";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="label-eyebrow">Billing</div>
      <h1 className="display mt-4 text-4xl text-foreground lg:text-5xl">
        Your plan.
      </h1>

      <div className="mt-10 grid gap-px bg-hairline lg:grid-cols-[2fr_1fr]">
        <div className="cine-hover bg-surface p-8">
          <div className="label-eyebrow">Current plan</div>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              <CineSkeleton className="h-12 w-40" />
              <CineSkeleton className="h-3 w-24" />
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-baseline gap-3">
                <span className="font-display text-5xl text-foreground sm:text-6xl">
                  {tier.toUpperCase()}
                </span>
                <span className="text-sm text-muted-foreground">{price}</span>
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {perVideo}
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() =>
              toast.success("Upgrade flow coming soon", {
                description: "We'll email you the moment plans go live.",
              })
            }
            className="cine-press mt-8 inline-flex h-11 items-center bg-accent px-5 text-sm font-medium text-accent-foreground"
          >
            Upgrade plan
          </button>
        </div>
        <div className="bg-surface p-8">
          <div className="label-eyebrow">Payments</div>
          <p className="mt-4 text-sm text-muted-foreground">
            Billing handled by Framecast — payments coming soon. No card on file
            required while you explore.
          </p>
        </div>
      </div>
    </div>
  );
}

