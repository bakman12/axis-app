import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { entities } from '@/lib/encryptedBase44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Trophy, Users, Lock, Crown, Medal, Award, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function Leaderboard({ stats, achievements }) {
  const [displayName, setDisplayName] = useState('');
  const [friendGroupCode, setFriendGroupCode] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: myProfile } = useQuery({
    queryKey: ['myLeaderboardProfile'],
    queryFn: () => entities.Leaderboard.filter({ created_by: user?.email })
      .then(profiles => profiles[0] || null)
  });

  const { data: publicLeaderboard = [] } = useQuery({
    queryKey: ['publicLeaderboard'],
    queryFn: () => entities.Leaderboard.filter({ is_public: true }, '-points', 10)
  });

  const { data: friendLeaderboard = [] } = useQuery({
    queryKey: ['friendLeaderboard', myProfile?.friend_group],
    queryFn: () => {
      if (!myProfile?.friend_group) return [];
      return entities.Leaderboard.filter(
        { friend_group: myProfile.friend_group },
        '-points',
        20
      );
    },
    enabled: !!myProfile?.friend_group
  });

  const createProfileMutation = useMutation({
    mutationFn: (data) => entities.Leaderboard.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myLeaderboardProfile']);
      toast.success('Leaderboard profile created!');
      setShowSettings(false);
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Leaderboard.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myLeaderboardProfile']);
      queryClient.invalidateQueries(['publicLeaderboard']);
      queryClient.invalidateQueries(['friendLeaderboard']);
      toast.success('Profile updated!');
    }
  });

  const syncStats = async () => {
    if (!myProfile) return;
    
    await updateProfileMutation.mutateAsync({
      id: myProfile.id,
      data: {
        points: stats.points,
        current_streak: stats.currentStreak,
        best_streak: Math.max(myProfile.best_streak || 0, stats.currentStreak),
        total_badges: achievements.length
      }
    });
  };

  const handleCreateProfile = () => {
    if (!displayName.trim()) {
      toast.error('Please enter a display name');
      return;
    }

    createProfileMutation.mutate({
      display_name: displayName,
      points: stats.points,
      current_streak: stats.currentStreak,
      best_streak: stats.currentStreak,
      total_badges: achievements.length,
      is_public: false,
      friend_group: friendGroupCode || undefined
    });
  };

  const getRankIcon = (rank) => {
    if (rank === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-bold text-gray-500">#{rank + 1}</span>;
  };

  const renderLeaderboard = (data) => (
    <div className="space-y-2">
      {data.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No one here yet. Be the first!</p>
        </div>
      ) : (
        data.map((profile, idx) => {
          const isMe = profile.id === myProfile?.id;
          return (
            <div
              key={profile.id}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                isMe
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-10 flex justify-center">
                {getRankIcon(idx)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 flex items-center gap-2">
                  {profile.display_name}
                  {isMe && <Badge variant="secondary" className="text-xs">You</Badge>}
                </p>
                <p className="text-xs text-gray-600">
                  {profile.current_streak} day streak • {profile.total_badges} badges
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600">{profile.points}</p>
                <p className="text-xs text-gray-500">points</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  if (!myProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Join the Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <Lock className="w-4 h-4 inline mr-1" />
              <strong>100% Private:</strong> Choose a nickname, compete with friends, 
              and keep your real identity hidden. Your health data stays secure.
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="displayName">Display Name (Public Nickname)</Label>
              <Input
                id="displayName"
                placeholder="e.g., HealthyHero123"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="friendGroup">Friend Group Code (Optional)</Label>
              <Input
                id="friendGroup"
                placeholder="Enter your friend group code"
                value={friendGroupCode}
                onChange={(e) => setFriendGroupCode(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Create a private leaderboard with friends by using the same code
              </p>
            </div>

            <Button onClick={handleCreateProfile} className="w-full">
              Create Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Leaderboard
          </CardTitle>
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" onClick={syncStats}>
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Leaderboard Settings</DialogTitle>
                <DialogDescription>
                  Manage your privacy and leaderboard preferences
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newDisplayName">Display Name</Label>
                  <Input
                    id="newDisplayName"
                    defaultValue={myProfile.display_name}
                    onBlur={(e) => {
                      if (e.target.value !== myProfile.display_name) {
                        updateProfileMutation.mutate({
                          id: myProfile.id,
                          data: { display_name: e.target.value }
                        });
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="publicToggle">Show on Public Leaderboard</Label>
                    <p className="text-xs text-gray-500">Compete with everyone</p>
                  </div>
                  <Switch
                    id="publicToggle"
                    checked={myProfile.is_public}
                    onCheckedChange={(checked) => {
                      updateProfileMutation.mutate({
                        id: myProfile.id,
                        data: { is_public: checked }
                      });
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="groupCode">Friend Group Code</Label>
                  <Input
                    id="groupCode"
                    defaultValue={myProfile.friend_group || ''}
                    onBlur={(e) => {
                      if (e.target.value !== myProfile.friend_group) {
                        updateProfileMutation.mutate({
                          id: myProfile.id,
                          data: { friend_group: e.target.value || null }
                        });
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Share this code with friends to create a private leaderboard
                  </p>
                </div>

                <Button onClick={syncStats} className="w-full">
                  Sync Current Stats
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={myProfile.friend_group ? "friends" : "public"}>
          <TabsList className="grid w-full grid-cols-2">
            {myProfile.friend_group && (
              <TabsTrigger value="friends">
                <Users className="w-4 h-4 mr-2" />
                Friends
              </TabsTrigger>
            )}
            <TabsTrigger value="public">
              <Trophy className="w-4 h-4 mr-2" />
              Public
            </TabsTrigger>
          </TabsList>

          {myProfile.friend_group && (
            <TabsContent value="friends">
              {renderLeaderboard(friendLeaderboard)}
            </TabsContent>
          )}

          <TabsContent value="public">
            {myProfile.is_public ? (
              renderLeaderboard(publicLeaderboard)
            ) : (
              <div className="text-center py-8">
                <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Enable public visibility in settings to see the leaderboard
                </p>
                <Button onClick={() => setShowSettings(true)}>
                  Open Settings
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}