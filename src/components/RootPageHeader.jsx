export default function RootPageHeader({ title, subtitle }) {
  return (
    <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-4 p-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}