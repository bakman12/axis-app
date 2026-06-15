export default function RootPageHeader({ title, subtitle }) {
  return (
    <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-4 px-5 py-3">
        <div className="flex-1">
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 500 }}>{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}