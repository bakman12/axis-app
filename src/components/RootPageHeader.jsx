export default function RootPageHeader({ title, subtitle }) {
  return (
    <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-4 p-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}