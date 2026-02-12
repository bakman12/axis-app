import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Sparkles, Heart, Settings } from 'lucide-react';
import { toast } from 'sonner';
import MessageBubble from '../components/MessageBubble';
import RootPageHeader from '../components/RootPageHeader';
import VoiceInput from '../components/VoiceInput';
import HealthProfileSetup from '../components/HealthProfileSetup';
import SavedWorkoutsPanel from '../components/SavedWorkoutsPanel';
import SavedRecipesPanel from '../components/SavedRecipesPanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function HealthCoach() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: healthProfile } = useQuery({
    queryKey: ['healthProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.HealthProfile.list();
      return profiles[0] || null;
    }
  });

  // Create or load conversation
  useEffect(() => {
    const loadConversation = async () => {
      try {
        // Try to find existing conversation
        const conversations = await base44.agents.listConversations({
          agent_name: 'health_coach'
        });

        if (conversations.length > 0) {
          const conv = conversations[0];
          setConversationId(conv.id);
          setMessages(conv.messages || []);
        } else {
          // Create new conversation
          const conv = await base44.agents.createConversation({
            agent_name: 'health_coach',
            metadata: {
              name: 'Health Coach Chat',
              description: 'Personalized wellness guidance'
            }
          });
          setConversationId(conv.id);
          setMessages([]);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
        toast.error('Failed to load health coach');
      }
    };

    if (user) {
      loadConversation();
    }
  }, [user]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages);
      setIsTyping(false);
    });

    return unsubscribe;
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText = null) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || !conversationId || isTyping) return;

    setInput('');
    setIsTyping(true);

    try {
      const conversation = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: textToSend
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setIsTyping(false);
    }
  };

  const handleVoiceTranscript = (transcript) => {
    setInput(transcript);
    sendMessage(transcript);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { label: "Workout for today", prompt: "Suggest a workout routine for today based on my health profile, energy level, and medication schedule" },
    { label: "Healthy recipes", prompt: "Give me recipe ideas that match my dietary needs and health conditions" },
    { label: "Progress review", prompt: "Analyze my medication adherence, mood patterns, and overall progress this week" },
    { label: "Energy-boosting tips", prompt: "What can I do to boost my energy levels today?" },
    { label: "Stress management", prompt: "I'm feeling stressed. What techniques can help me right now?" },
    { label: "Better sleep habits", prompt: "How can I improve my sleep quality given my medication schedule?" }
  ];

  const handleQuickAction = (prompt) => {
    setInput(prompt);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (user.ai_health_coach === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <div className="max-w-md">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">AI Health Coach Disabled</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The AI Health Coach feature is currently turned off in your settings.
          </p>
          <Button
            onClick={() => window.location.href = '/Settings'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Settings className="w-4 h-4 mr-2" />
            Go to Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ height: '100dvh' }}>
      <RootPageHeader title="AI Health Coach" subtitle="Personalized wellness guidance" />

      <div className="flex-1 overflow-hidden px-4 md:px-6 lg:px-8 pt-4 pb-2 flex flex-col max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Health Profile Status */}
          <Card className="lg:col-span-3 border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Health Profile</p>
                  {healthProfile ? (
                    <p className="text-xs text-gray-500">
                      {healthProfile.fitness_level} • {healthProfile.health_conditions?.length || 0} conditions tracked
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">Complete your profile for better recommendations</p>
                  )}
                </div>
              </div>
              <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    {healthProfile ? 'Edit' : 'Setup'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Health Profile</DialogTitle>
                    <DialogDescription>
                      Help your AI coach provide better recommendations
                    </DialogDescription>
                  </DialogHeader>
                  <HealthProfileSetup onComplete={() => setSetupOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Saved Workouts & Recipes */}
        <div className="hidden lg:block">
          <SavedWorkoutsPanel />
        </div>
        <div className="hidden lg:block">
          <SavedRecipesPanel />
        </div>
      </div>

      {/* Mobile: Show saved items below messages */}
      <div className="lg:hidden px-4 space-y-4 mb-4">
        <SavedWorkoutsPanel />
        <SavedRecipesPanel />
      </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Welcome to Your AI Health Coach!</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  I'm here to support your wellness journey with personalized advice on exercise, nutrition, 
                  and staying motivated with your medication routine. I analyze your health data to provide 
                  tailored recommendations just for you.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-6">
                  {quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-3 whitespace-normal"
                      onClick={() => handleQuickAction(action.prompt)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-xs text-blue-900 dark:text-blue-200">
                    💡 <strong>Tip:</strong> The more you share about your daily routine, mood, and challenges, 
                    the better I can personalize my guidance for you!
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {messages.map((message, idx) => (
                <MessageBubble key={idx} message={message} />
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mt-0.5">
                    <Heart className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 pb-safe">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about workouts, nutrition, motivation..."
              disabled={isTyping || !conversationId}
              className="flex-1"
            />
            <VoiceInput 
              onTranscript={handleVoiceTranscript}
              disabled={isTyping || !conversationId}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping || !conversationId}
            >
              {isTyping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}