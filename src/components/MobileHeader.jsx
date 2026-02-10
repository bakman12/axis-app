import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function MobileHeader({ title, subtitle }) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-4 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-11 w-11 min-w-[44px] min-h-[44px] shrink-0 select-none"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}