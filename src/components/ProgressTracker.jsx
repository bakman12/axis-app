import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, TrendingUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export default function ProgressTracker({ logs, medications, stats }) {
  // Calculate weekly progress
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const weeklyData = daysInWeek.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayLogs = logs.filter(l => 
      format(new Date(l.created_date), 'yyyy-MM-dd') === dayStr
    );
    const taken = dayLogs.filter(l => l.status === 'taken').length;
    const total = dayLogs.length;
    
    return {
      day: format(day, 'EEE'),
      taken,
      total,
      percentage: total > 0 ? (taken / total) * 100 : 0
    };
  });

  // Next badge progress
  const BADGE_THRESHOLDS = [
    { name: 'Week Warrior', icon: '🔥', current: stats.currentStreak, target: 7 },
    { name: 'Month Master', icon: '💪', current: stats.currentStreak, target: 30 },
    { name: 'Century Club', icon: '💯', current: stats.totalTaken, target: 100 },
    { name: '500 Club', icon: '🏆', current: stats.totalTaken, target: 500 }
  ];

  const nextBadge = BADGE_THRESHOLDS.find(b => b.current < b.target);

  return (
    <div className="space-y-4">
      {/* Weekly Visual Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            This Week's Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weeklyData.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className="text-xs font-medium text-gray-600">{day.day}</div>
                <div className="relative w-8 h-24 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`absolute bottom-0 w-full transition-all duration-500 ${
                      day.percentage === 100 ? 'bg-green-500' : 
                      day.percentage >= 80 ? 'bg-blue-500' :
                      day.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                    }`}
                    style={{ height: `${day.percentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500">{day.taken}/{day.total}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Badge Progress */}
      {nextBadge && (
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-purple-600" />
              Next Achievement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{nextBadge.icon}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{nextBadge.name}</p>
                  <p className="text-sm text-gray-600">
                    {nextBadge.current} / {nextBadge.target}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <Progress value={(nextBadge.current / nextBadge.target) * 100} className="h-3" />
                <p className="text-xs text-gray-500 text-right">
                  {nextBadge.target - nextBadge.current} more to go!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Progress Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Overall Adherence</span>
                <span className="font-bold text-gray-900">{stats.adherenceRate}%</span>
              </div>
              <Progress value={stats.adherenceRate} className="h-2" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center pt-2">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.totalTaken}</p>
                <p className="text-xs text-gray-600">Doses Taken</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.currentStreak}</p>
                <p className="text-xs text-gray-600">Day Streak</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.points}</p>
                <p className="text-xs text-gray-600">Total Points</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}