import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Star, Target, Sparkles, RefreshCw, Award } from 'lucide-react';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { toast } from 'sonner';

const BADGE_DEFINITIONS = [
  { id: 'first_dose', name: 'Getting Started', icon: '🌟', description: 'Logged your first medication', category: 'milestone', threshold: 1 },
  { id: 'week_streak', name: 'Week Warrior', icon: '🔥', description: '7-day perfect streak', category: 'streak', threshold: 7 },
  { id: 'month_streak', name: 'Monthly Master', icon: '💪', description: '30-day perfect streak', category: 'streak', threshold: 30 },
  { id: 'consistent_100', name: 'Century Club', icon: '💯', description: '100 medications taken', category: 'milestone', threshold: 100 },
  { id: 'perfect_week', name: 'Flawless Week', icon: '✨', description: 'Zero missed doses in a week', category: 'consistency', threshold: 7 },
  { id: 'early_bird', name: 'Early Bird', icon: '🌅', description: 'All morning doses on time for a week', category: 'consistency', threshold: 7 }
];

export default function GamificationDashboard({ logs, medications }) {
  const [analyzing, setAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => base44.entities.Achievement.list('-earned_date', 50)
  });

  const { data: personalizedChallenge, refetch: refetchChallenge } = useQuery({
    queryKey: ['challenge'],
    queryFn: async () => {
      setAnalyzing(true);
      try {
        const recentLogs = logs.slice(0, 30);
        const prompt = `Based on this user's medication adherence data, create a personalized, achievable challenge.

Recent adherence: ${JSON.stringify(recentLogs.map(l => ({
  medication: l.medication_name,
  status: l.status,
  delay: l.delay_minutes
})))}

ETHICAL GUIDELINES:
- Challenges should be supportive and achievable, not punitive
- Focus on positive reinforcement and gradual improvement
- Respect that health challenges may impact adherence
- Never pressure or shame for missed doses
- Promote self-compassion and realistic goals

Create ONE specific challenge for this week that:
1. Is achievable based on their current patterns
2. Focuses on a specific improvement area
3. Has a clear, measurable goal
4. Is motivating but not overwhelming`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              challenge_title: { type: "string" },
              challenge_description: { type: "string" },
              goal: { type: "string" },
              reward_points: { type: "number" },
              encouragement: { type: "string" }
            }
          }
        });

        return result;
      } finally {
        setAnalyzing(false);
      }
    },
    enabled: logs.length > 5,
    staleTime: 1000 * 60 * 60 * 24, // 1 day
    refetchOnWindowFocus: false
  });

  const createAchievementMutation = useMutation({
    mutationFn: (badge) => base44.entities.Achievement.create({
      badge_id: badge.id,
      badge_name: badge.name,
      badge_icon: badge.icon,
      badge_description: badge.description,
      earned_date: format(new Date(), 'yyyy-MM-dd'),
      category: badge.category
    }),
    onSuccess: (_, badge) => {
      queryClient.invalidateQueries(['achievements']);
      toast.success(`🎉 Achievement Unlocked: ${badge.name}!`, {
        description: badge.description
      });
    }
  });

  // Calculate stats
  const calculateStats = () => {
    const takenLogs = logs.filter(l => l.status === 'taken');
    const totalTaken = takenLogs.length;
    const points = totalTaken * 10 + (achievements.length * 50);

    // Calculate current streak
    let currentStreak = 0;
    const today = startOfDay(new Date());
    
    for (let i = 0; i < 100; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      
      const dayLogs = logs.filter(l => 
        format(new Date(l.created_date), 'yyyy-MM-dd') === dateStr
      );
      
      const dayTaken = dayLogs.filter(l => l.status === 'taken').length;
      const dayTotal = dayLogs.length;
      
      if (dayTotal > 0 && dayTaken === dayTotal) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      totalTaken,
      points,
      currentStreak,
      adherenceRate: logs.length > 0 ? Math.round((takenLogs.length / logs.length) * 100) : 0
    };
  };

  // Check and award new badges
  useEffect(() => {
    if (logs.length === 0) return;

    const stats = calculateStats();
    const earnedBadgeIds = achievements.map(a => a.badge_id);

    BADGE_DEFINITIONS.forEach(badge => {
      if (earnedBadgeIds.includes(badge.id)) return;

      let shouldAward = false;

      if (badge.id === 'first_dose' && logs.length >= 1) {
        shouldAward = true;
      } else if (badge.id === 'week_streak' && stats.currentStreak >= 7) {
        shouldAward = true;
      } else if (badge.id === 'month_streak' && stats.currentStreak >= 30) {
        shouldAward = true;
      } else if (badge.id === 'consistent_100' && stats.totalTaken >= 100) {
        shouldAward = true;
      } else if (badge.id === 'perfect_week' && stats.currentStreak >= 7) {
        shouldAward = true;
      }

      if (shouldAward) {
        createAchievementMutation.mutate(badge);
      }
    });
  }, [logs.length]);

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.points}</p>
                <p className="text-xs text-gray-600">Points</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-full">
                <Flame className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.currentStreak}</p>
                <p className="text-xs text-gray-600">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-full">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{achievements.length}</p>
                <p className="text-xs text-gray-600">Badges</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.adherenceRate}%</p>
                <p className="text-xs text-gray-600">Adherence</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personalized Challenge */}
      {personalizedChallenge && (
        <Card className="shadow-md border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Your Weekly Challenge
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchChallenge()}
              disabled={analyzing}
            >
              <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900">{personalizedChallenge.challenge_title}</h3>
                <p className="text-sm text-gray-600 mt-1">{personalizedChallenge.challenge_description}</p>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-sm font-medium text-indigo-900">Goal: {personalizedChallenge.goal}</p>
                <p className="text-xs text-indigo-700 mt-1">Reward: +{personalizedChallenge.reward_points} points</p>
              </div>
              <p className="text-sm text-gray-700 italic">💪 {personalizedChallenge.encouragement}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      <Card className="shadow-md border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-500" />
            Your Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Start taking your medications to earn badges!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-xl text-center hover:shadow-lg transition-shadow"
                >
                  <div className="text-4xl mb-2">{achievement.badge_icon}</div>
                  <p className="font-semibold text-sm text-gray-900">{achievement.badge_name}</p>
                  <p className="text-xs text-gray-600 mt-1">{achievement.badge_description}</p>
                  <p className="text-xs text-gray-400 mt-2">{format(new Date(achievement.earned_date), 'MMM d')}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900">
          <strong>Privacy & Ethics:</strong> Your gamification data stays private and secure. 
          Points and badges are for motivation only, not medical assessment. Always prioritize your health over achievements.
        </p>
      </div>
    </div>
  );
}