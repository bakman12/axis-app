import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AIAssistant({ medications, logs }) {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);

  const quickQuestions = [
    "How can I improve my adherence?",
    "What are good reminder strategies?",
    "How do I track my medications better?",
    "Tips for staying consistent?"
  ];

  const askAI = async (q) => {
    if (!q.trim()) return;
    
    const userMessage = { role: 'user', content: q };
    setConversation(prev => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);
    
    try {
      const context = {
        medications: medications.map(m => ({
          name: m.name,
          dosage: m.dosage,
          critical: m.critical,
          times: m.times,
          notes: m.notes
        })),
        recent_logs: logs.slice(0, 20).map(l => ({
          medication: l.medication_name,
          status: l.status,
          delay: l.delay_minutes,
          context: l.context
        }))
      };

      const conversationHistory = conversation.length > 0 
        ? `\n\nPrevious conversation:\n${conversation.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}\n`
        : '';

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a supportive AI assistant helping with medication adherence and routine management.

Patient's medications: ${JSON.stringify(context.medications)}
Recent adherence: ${JSON.stringify(context.recent_logs)}

STRICT SAFETY & PRIVACY RULES:
1. You provide ADHERENCE SUPPORT ONLY - not medical advice, diagnosis, or treatment
2. NEVER suggest starting, stopping, changing doses, or switching medications
3. NEVER interpret symptoms, side effects, or lab results
4. NEVER diagnose conditions or assess medical risk
5. If asked medical questions, decline politely and redirect to healthcare provider
6. If user reports symptoms/emergencies, immediately advise: "Please contact your GP or call NHS 111"
7. Do NOT ask for additional personal health information beyond what's provided
8. Keep responses focused on practical adherence strategies (reminders, routines, tracking)

PRIVACY: User data is confidential and only used for this conversation.

WHAT YOU CAN HELP WITH:
- Setting up reminder systems
- Building consistent routines
- Tracking strategies
- Overcoming forgetfulness
- Time management for medication schedules

WHAT YOU CANNOT DO:
- Provide medical advice or health guidance
- Answer "what if I miss a dose" (medical question)
- Explain drug interactions (medical question)
- Interpret how medications work (medical question)
${conversationHistory}
User: ${q}

Respond helpfully within these boundaries. If it's a medical question, politely decline and suggest they contact their GP or pharmacist.`,
        add_context_from_internet: false
      });

      setConversation(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      toast.error('Failed to get AI response');
      setConversation(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-md border-l-4 border-l-indigo-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-500" />
          AI Medication Assistant
        </CardTitle>
        <p className="text-sm text-gray-600">
          Get help with adherence strategies and routines
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Quick questions:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => askAI(q)}
                disabled={loading}
                className="p-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3 inline mr-1 text-indigo-500" />
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 block">
            Or ask your own question:
          </label>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., How can I remember to take my evening dose?"
            rows={3}
          />
          <Button
            onClick={() => askAI(question)}
            disabled={!question.trim() || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Thinking...' : 'Ask AI'}
          </Button>
        </div>

        {conversation.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto p-2">
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-gray-100 ml-8'
                    : 'bg-indigo-50 border border-indigo-200 mr-8'
                }`}
              >
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {msg.role === 'user' ? 'You' : 'AI Assistant'}
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>
            ))}
            {loading && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg mr-8">
                <p className="text-sm text-gray-600">Thinking...</p>
              </div>
            )}
          </div>
        )}

        {conversation.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-gray-700">
              <strong>⚠️ Not Medical Advice:</strong> This provides adherence support only. 
              For medical questions about your medications, symptoms, or health, always consult your GP or pharmacist.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}