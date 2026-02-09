import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AIAssistant({ medications, logs }) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const quickQuestions = [
    "What should I do if I miss a critical dose?",
    "Can I take my medications together?",
    "What are signs I should contact my doctor?",
    "How can I improve my adherence?"
  ];

  const askAI = async (q) => {
    setQuestion(q);
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

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a helpful AI assistant for a patient with panhypopituitarism managing hormone replacement therapy. 

Patient's medications: ${JSON.stringify(context.medications)}
Recent adherence: ${JSON.stringify(context.recent_logs)}

IMPORTANT: You are NOT a doctor. Always remind the user to consult their healthcare provider for medical decisions.

User question: ${q}

Provide helpful, empathetic guidance while being clear about medical limitations.`,
        add_context_from_internet: false
      });

      setResponse(result);
    } catch (error) {
      toast.error('Failed to get AI response');
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
          Ask questions about your medications and adherence
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
            placeholder="e.g., What happens if I take my dose 2 hours late?"
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

        {response && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-start gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-indigo-600 mt-0.5" />
              <p className="text-sm font-medium text-indigo-900">AI Response:</p>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {response}
            </p>
            <p className="text-xs text-gray-500 mt-3 italic">
              ⚠️ This is AI-generated guidance. Always consult your healthcare provider for medical decisions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}