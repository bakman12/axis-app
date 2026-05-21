export default function RootPageHeader({ title, subtitle }) {
  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {title}<span className="text-primary">.</span>
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}