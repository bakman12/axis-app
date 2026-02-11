import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PremiumBadge({ tier = 'pro', className = '' }) {
  const colors = {
    pro: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    family: 'bg-gradient-to-r from-purple-500 to-pink-600'
  };

  return (
    <Badge className={`${colors[tier]} text-white border-0 ${className}`}>
      <Crown className="w-3 h-3 mr-1" />
      {tier === 'family' ? 'Family' : 'Pro'}
    </Badge>
  );
}