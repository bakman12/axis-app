import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Star, Target, Sparkles, RefreshCw, Award, TrendingUp } from 'lucide-react';
import ProgressTracker from './ProgressTracker';
import Leaderboard from './Leaderboard';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { toast } from 'sonner';

const BADGE_DEFINITIONS = [
  { id: 'first_dose', name: 'Getting Started', icon: '🌟', description: 'Logged your first medication', category: 'milestone', threshold: 1 },
  { id: 'week_streak', name: 'Week Warrior', icon: '🔥', description: '7-day perfect streak', category: 'streak', threshold: 7 },
  { id: 'two_week_streak', name: 'Fortnight Fighter', icon: '⚡', description: '14-day perfect streak', category: 'streak', threshold: 14 },
  { id: 'month_streak', name: 'Monthly Master', icon: '💪', description: '30-day perfect streak', category: 'streak', threshold: 30 },
  { id: 'quarter_streak', name: 'Quarter Champion', icon: '🏆', description: '90-day perfect streak', category: 'streak', threshold: 90 },
  { id: 'consistent_50', name: 'Halfway Hero', icon: '🎯', description: '50 medications taken', category: 'milestone', threshold: 50 },
  { id: 'consistent_100', name: 'Century Club', icon: '💯', description: '100 medications taken', category: 'milestone', threshold: 100 },
  { id: 'consistent_250', name: 'Quarter Master', icon: '🌟', description: '250 medications taken', category: 'milestone', threshold: 250 },
  { id: 'consistent_500', name: 'Elite Achiever', icon: '👑', description: '500 medications taken', category: 'milestone', threshold: 500 },
  { id: 'perfect_week', name: 'Flawless Week', icon: '✨', description: 'Zero missed doses in a week', category: 'consistency', threshold: 7 },
  { id: 'perfect_month', name: 'Perfect Month', icon: '🎊', description: 'Zero missed doses in 30 days', category: 'consistency', threshold: 30 },
  { id: 'early_bird', name: 'Early Bird', icon: '🌅', description: 'All morning doses on time for a week', category: 'consistency', threshold: 7 },
  { id: 'night_owl', name: 'Night Owl', icon: '🦉', description: 'All evening doses on time for a week', category: 'consistency', threshold: 7 },
  { id: 'comeback_king', name: 'Comeback King', icon: '💫', description: 'Restarted streak after a miss', category: 'challenge', threshold: 1 }
];

export default function GamificationDashboard({ logs, medications }) {
  const [analyzing, setAnalyzing] = useState(false);
  const queryClient = useQueryClient();
  
  const isPremium = logs.length > 30; // Simple check - real check in Analytics page

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => base44.entities.Achievement.list('-earned_date', 50)
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: previousChallenges = [] } = useQuery({
    queryKey: ['previousChallenges'],
    queryFn: () => base44.entities.Challenge.list('-created_date', 10)
  });

  const { data: personalizedChallenge, refetch: refetchChallenge } = useQuery({
    queryKey: ['challenge'],
    enabled: logs.length > 5 && !!user && isPremium && (user.personalized_challenges ?? true),
    queryFn: async () => {
      setAnalyzing(true);
      try {
        const stats = calculateStats();
        const recentLogs = logs.slice(0, 50);
        
        // Analyze missed medication patterns
        const missedLogs = logs.filter(l => l.status === 'missed');
        const missedByTime = missedLogs.reduce((acc, log) => {
          const hour = parseInt(log.scheduled_time?.split(':')[0] || '0');
          const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
          acc[timeOfDay] = (acc[timeOfDay] || 0) + 1;
          return acc;
        }, {});
        
        const missedByMedication = missedLogs.reduce((acc, log) => {
          acc[log.medication_name] = (acc[log.medication_name] || 0) + 1;
          return acc;
        }, {});

        // Analyze previous challenge feedback
        const completedChallenges = previousChallenges.filter(c => c.status === 'completed');
        const avgCompletionRate = completedChallenges.length > 0 
          ? completedChallenges.reduce((sum, c) => sum + (c.completion_rate || 0), 0) / completedChallenges.length 
          : null;
        
        const feedbackCounts = previousChallenges.reduce((acc, c) => {
          if (c.user_feedback) acc[c.user_feedback] = (acc[c.user_feedback] || 0) + 1;
          return acc;
        }, {});

        const prompt = `You are a compassionate health coach creating a personalized medication adherence challenge.

USER'S CURRENT STATUS:
- Current adherence rate: ${stats.adherenceRate}%
- Current streak: ${stats.currentStreak} days
- Total medications taken: ${stats.totalTaken}
- Target adherence goal: ${user?.target_adherence || 95}%
- Target streak goal: ${user?.target_streak || 30} days

MISSED MEDICATION PATTERNS:
- Total missed: ${missedLogs.length}
- By time of day: ${JSON.stringify(missedByTime)}
- By medication: ${JSON.stringify(missedByMedication)}
- Most problematic time: ${Object.keys(missedByTime).sort((a, b) => missedByTime[b] - missedByTime[a])[0] || 'none'}

RECENT ADHERENCE DATA (last 50 entries):
${JSON.stringify(recentLogs.map(l => ({
  medication: l.medication_name,
  status: l.status,
  delay: l.delay_minutes,
  date: format(new Date(l.created_date), 'yyyy-MM-dd')
})).slice(0, 20))}

PREVIOUS CHALLENGES HISTORY:
- Total challenges attempted: ${previousChallenges.length}
- Completed: ${completedChallenges.length}
- Average completion rate: ${avgCompletionRate ? Math.round(avgCompletionRate) + '%' : 'N/A'}
- User feedback: ${JSON.stringify(feedbackCounts)}
${previousChallenges.length > 0 ? `- Recent challenges: ${JSON.stringify(previousChallenges.slice(0, 3).map(c => ({
  title: c.challenge_title,
  status: c.status,
  feedback: c.user_feedback,
  target: c.target_metric
})))}` : ''}

ETHICAL GUIDELINES:
- Challenges MUST be supportive and achievable, not punitive or overwhelming
- Focus on positive reinforcement and gradual, sustainable improvement
- Respect that health challenges, life events, and circumstances affect adherence
- NEVER pressure, shame, or create anxiety about missed doses
- Promote self-compassion, realistic goals, and celebrate small wins
- If adherence is already high (>90%), focus on maintaining consistency, not perfection

ADAPTATION RULES:
${feedbackCounts.too_hard > 2 ? '- User found recent challenges too difficult. Make this one EASIER and more achievable.' : ''}
${feedbackCounts.too_easy > 2 ? '- User found recent challenges too easy. Make this one slightly more ambitious.' : ''}
${avgCompletionRate && avgCompletionRate < 50 ? '- Low completion rate detected. Create a SIMPLER, more achievable challenge.' : ''}
${stats.adherenceRate < 70 ? '- Low adherence detected. Focus on ONE specific, small improvement area.' : ''}
${stats.currentStreak > 14 ? '- Strong streak! Focus on maintaining momentum, not perfection.' : ''}

Create ONE specific challenge for this week that:
1. Is REALISTICALLY achievable based on their current patterns and history
2. Addresses their most significant improvement opportunity (based on missed patterns)
3. Has a clear, measurable goal with specific metrics
4. Builds on previous challenge feedback and completion patterns
5. Is appropriately challenging (not too easy if they complete everything, not too hard if they struggle)
6. Focuses on ONE target metric: streak, adherence, timing, consistency, or specific medication`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              challenge_title: { type: "string" },
              challenge_description: { type: "string" },
              goal: { type: "string" },
              reward_points: { type: "number" },
              encouragement: { type: "string" },
              target_metric: { 
                type: "string",
                enum: ["streak", "adherence", "timing", "consistency", "specific_medication"]
              }
            }
          }
        });

        // Save challenge to database
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        
        await base44.entities.Challenge.create({
          challenge_title: result.challenge_title,
          challenge_description: result.challenge_description,
          goal: result.goal,
          reward_points: result.reward_points,
          encouragement: result.encouragement,
          target_metric: result.target_metric,
          start_date: format(new Date(), 'yyyy-MM-dd'),
          end_date: format(weekFromNow, 'yyyy-MM-dd'),
          status: 'active'
        });

        queryClient.invalidateQueries(['previousChallenges']);

        return result;
      } finally {
        setAnalyzing(false);
      }
    },
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

    // Milestone badges
    if (badge.id === 'first_dose' && logs.length >= 1) {
      shouldAward = true;
    } else if (badge.id === 'consistent_50' && stats.totalTaken >= 50) {
      shouldAward = true;
    } else if (badge.id === 'consistent_100' && stats.totalTaken >= 100) {
      shouldAward = true;
    } else if (badge.id === 'consistent_250' && stats.totalTaken >= 250) {
      shouldAward = true;
    } else if (badge.id === 'consistent_500' && stats.totalTaken >= 500) {
      shouldAward = true;
    }

    // Streak badges
    else if (badge.id === 'week_streak' && stats.currentStreak >= 7) {
      shouldAward = true;
    } else if (badge.id === 'two_week_streak' && stats.currentStreak >= 14) {
      shouldAward = true;
    } else if (badge.id === 'month_streak' && stats.currentStreak >= 30) {
      shouldAward = true;
    } else if (badge.id === 'quarter_streak' && stats.currentStreak >= 90) {
      shouldAward = true;
    }

    // Consistency badges
    else if (badge.id === 'perfect_week' && stats.currentStreak >= 7) {
      shouldAward = true;
    } else if (badge.id === 'perfect_month' && stats.currentStreak >= 30) {
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
      {/* Visual Progress Tracker */}
      <ProgressTracker logs={logs} medications={medications} stats={stats} />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
      {personalizedChallenge && (user?.personalized_challenges ?? true) && (
        <Card className="shadow-md border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Your Personalized Challenge
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
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{personalizedChallenge.challenge_title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {personalizedChallenge.target_metric?.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">{personalizedChallenge.challenge_description}</p>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-sm font-medium text-indigo-900">🎯 Goal: {personalizedChallenge.goal}</p>
                <p className="text-xs text-indigo-700 mt-1">🏆 Reward: +{personalizedChallenge.reward_points} points</p>
              </div>
              <p className="text-sm text-gray-700 italic">💪 {personalizedChallenge.encouragement}</p>
              
              {/* Challenge Feedback */}
              <div className="flex gap-2 pt-2 border-t">
                <p className="text-xs text-gray-500 flex-1">How's this challenge?</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={async () => {
                    const activeChallenges = await base44.entities.Challenge.filter({ 
                      status: 'active' 
                    });
                    if (activeChallenges[0]) {
                      await base44.entities.Challenge.update(activeChallenges[0].id, {
                        user_feedback: 'too_easy'
                      });
                      toast.success('Feedback saved! Next challenge will be more ambitious.');
                    }
                  }}
                >
                  Too easy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={async () => {
                    const activeChallenges = await base44.entities.Challenge.filter({ 
                      status: 'active' 
                    });
                    if (activeChallenges[0]) {
                      await base44.entities.Challenge.update(activeChallenges[0].id, {
                        user_feedback: 'too_hard'
                      });
                      toast.success('Feedback saved! Next challenge will be easier.');
                    }
                  }}
                >
                  Too hard
                </Button>
              </div>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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

      {/* Leaderboard */}
      <Leaderboard stats={stats} achievements={achievements} />

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