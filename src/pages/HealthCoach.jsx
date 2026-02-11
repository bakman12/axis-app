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
    { label: "Today's workout suggestion", prompt: "Can you suggest a workout for today based on my current health and energy level?" },
    { label: "Healthy meal ideas", prompt: "What are some healthy meal ideas that work well with my medications?" },
    { label: "Motivation boost", prompt: "I'm feeling a bit unmotivated. Can you help me?" },
    { label: "Review my progress", prompt: "Can you review my medication adherence and overall health progress?" }
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

  return (
    <div className="flex flex-col h-screen" style={{ height: '100dvh' }}>
      <RootPageHeader title="AI Health Coach" subtitle="Personalized wellness guidance" />

      <div className="flex-1 overflow-hidden px-4 md:px-6 lg:px-8 pt-4 pb-2 flex flex-col max-w-5xl mx-auto w-full">
        {/* Health Profile Status */}
        <Card className="mb-4 border-l-4 border-l-green-500">
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Welcome to Your AI Health Coach!</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  I'm here to support your wellness journey with personalized advice on exercise, nutrition, 
                  and staying motivated with your medication routine.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
                  {quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2"
                      onClick={() => handleQuickAction(action.prompt)}
                    >
                      {action.label}
                    </Button>
                  ))}
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