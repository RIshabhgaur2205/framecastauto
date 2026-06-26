export function CineSkeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function CineSkeletonRows({
  rows = 5,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={`divide-y divide-hairline border border-hairline bg-surface ${className}`}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-5 sm:grid-cols-[1fr_auto_auto] sm:gap-6"
        >
          <div className="min-w-0 space-y-2">
            <CineSkeleton className="h-3 w-2/3" />
            <CineSkeleton className="h-2 w-1/3" />
          </div>
          <CineSkeleton className="hidden h-3 w-16 sm:block" />
          <CineSkeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-hairline bg-surface/40 p-10 text-center">
      {icon && (
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center border border-hairline bg-background text-accent">
          {icon}
        </div>
      )}
      <div className="font-display text-2xl tracking-[0.1em] text-foreground">
        {title.toUpperCase()}
      </div>
      {description && (
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
