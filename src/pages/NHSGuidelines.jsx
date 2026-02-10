import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import MessageBubble from '../components/MessageBubble';
import MobileHeader from '../components/MobileHeader';

export default function NHSGuidelines() {
    const [input, setInput] = useState('');
    const [conversationId, setConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const messagesEndRef = useRef(null);
    const queryClient = useQueryClient();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Create conversation on mount
    useEffect(() => {
        const initConversation = async () => {
            try {
                const conversation = await base44.agents.createConversation({
                    agent_name: 'nhs_guidelines_assistant',
                    metadata: { name: 'NHS Guidelines Chat' }
                });
                setConversationId(conversation.id);
                setMessages(conversation.messages || []);
            } catch (error) {
                console.error('Failed to create conversation:', error);
            }
        };
        initConversation();
    }, []);

    // Subscribe to conversation updates
    useEffect(() => {
        if (!conversationId) return;

        const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
            setMessages(data.messages);
        });

        return () => unsubscribe();
    }, [conversationId]);

    const sendMessageMutation = useMutation({
        mutationFn: async (message) => {
            const conversation = await base44.agents.getConversation(conversationId);
            return base44.agents.addMessage(conversation, {
                role: 'user',
                content: message
            });
        },
        onSuccess: () => {
            setInput('');
        }
    });

    const handleSend = () => {
        if (!input.trim() || !conversationId) return;
        sendMessageMutation.mutate(input);
    };

    const quickQuestions = [
        'What does NICE say about medication timing?',
        'NHS guidance on missing doses',
        'How should I store medications?',
        'What are general adherence tips?'
    ];

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <MobileHeader title="NHS Guidelines" />

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
                {/* Disclaimer */}
                <Card className="bg-blue-50 border-blue-200 p-4">
                    <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                            <p className="font-medium mb-1">General Information Only</p>
                            <p className="text-xs">This assistant provides general guideline information from NHS and NICE. Always consult your GP or healthcare provider for medical advice about your specific situation.</p>
                        </div>
                    </div>
                </Card>

                {/* Quick Questions */}
                {messages.length === 0 && (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600 font-medium">Quick questions:</p>
                        <div className="grid grid-cols-1 gap-2">
                            {quickQuestions.map((question, idx) => (
                                <Button
                                    key={idx}
                                    variant="outline"
                                    className="h-auto py-3 px-4 text-left justify-start text-sm whitespace-normal"
                                    onClick={() => {
                                        setInput(question);
                                        setTimeout(() => handleSend(), 100);
                                    }}
                                    disabled={!conversationId || sendMessageMutation.isPending}
                                >
                                    {question}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                <div className="space-y-4">
                    {messages.map((message, idx) => (
                        <MessageBubble key={idx} message={message} />
                    ))}
                </div>

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 pb-safe">
                <div className="max-w-6xl mx-auto flex gap-2">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about NHS or NICE guidelines..."
                        className="resize-none min-h-[44px]"
                        rows={2}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={!conversationId || sendMessageMutation.isPending}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || !conversationId || sendMessageMutation.isPending}
                        className="h-auto min-h-[44px] min-w-[44px] bg-blue-600 hover:bg-blue-700"
                    >
                        {sendMessageMutation.isPending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}