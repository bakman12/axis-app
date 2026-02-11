import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy, Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock, Volume2, VolumeX } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import WorkoutTile from './WorkoutTile';
import RecipeTile from './RecipeTile';
import AdherenceChart from './AdherenceChart';

const FunctionDisplay = ({ toolCall }) => {
    const [expanded, setExpanded] = useState(false);
    const name = toolCall?.name || 'Function';
    const status = toolCall?.status || 'pending';
    const results = toolCall?.results;
    
    // Parse and check for errors
    const parsedResults = (() => {
        if (!results) return null;
        try {
            return typeof results === 'string' ? JSON.parse(results) : results;
        } catch {
            return results;
        }
    })();
    
    const isError = results && (
        (typeof results === 'string' && /error|failed/i.test(results)) ||
        (parsedResults?.success === false)
    );
    
    // Status configuration
    const statusConfig = {
        pending: { icon: Clock, color: 'text-slate-400', text: 'Pending' },
        running: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        in_progress: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        completed: isError ? 
            { icon: AlertCircle, color: 'text-red-500', text: 'Failed' } : 
            { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        success: { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        failed: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' },
        error: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' }
    }[status] || { icon: Zap, color: 'text-slate-500', text: '' };
    
    const Icon = statusConfig.icon;
    const formattedName = name.split('.').reverse().join(' ').toLowerCase();
    
    return (
        <div className="mt-2 text-xs">
            <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                    "hover:bg-slate-50",
                    expanded ? "bg-slate-50 border-slate-300" : "bg-white border-slate-200"
                )}
            >
                <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
                <span className="text-slate-700">{formattedName}</span>
                {statusConfig.text && (
                    <span className={cn("text-slate-500", isError && "text-red-600")}>
                        • {statusConfig.text}
                    </span>
                )}
                {!statusConfig.spin && (toolCall.arguments_string || results) && (
                    <ChevronRight className={cn("h-3 w-3 text-slate-400 transition-transform ml-auto", 
                        expanded && "rotate-90")} />
                )}
            </button>
            
            {expanded && !statusConfig.spin && (
                <div className="mt-1.5 ml-3 pl-3 border-l-2 border-slate-200 space-y-2">
                    {toolCall.arguments_string && (
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Parameters:</div>
                            <pre className="bg-slate-50 rounded-md p-2 text-xs text-slate-600 whitespace-pre-wrap">
                                {(() => {
                                    try {
                                        return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                                    } catch {
                                        return toolCall.arguments_string;
                                    }
                                })()}
                            </pre>
                        </div>
                    )}
                    {parsedResults && (
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Result:</div>
                            <pre className="bg-slate-50 rounded-md p-2 text-xs text-slate-600 whitespace-pre-wrap max-h-48 overflow-auto">
                                {typeof parsedResults === 'object' ? 
                                    JSON.stringify(parsedResults, null, 2) : parsedResults}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speech, setSpeech] = useState(null);

    // Parse workout data from message
    const parseWorkouts = (content) => {
        try {
            // Look for workout JSON in the message
            const workoutMatch = content.match(/```json\s*(\[[\s\S]*?\])\s*```/);
            if (workoutMatch) {
                const workouts = JSON.parse(workoutMatch[1]);
                return Array.isArray(workouts) ? workouts : null;
            }
        } catch (e) {
            console.error('Failed to parse workouts:', e);
        }
        return null;
    };

    // Parse chart data from message
    const parseChartData = (content) => {
        try {
            const chartMatch = content.match(/```chart\s*(\{[\s\S]*?\})\s*```/);
            if (chartMatch) {
                return JSON.parse(chartMatch[1]);
            }
        } catch (e) {
            console.error('Failed to parse chart:', e);
        }
        return null;
    };

    // Parse recipe data from message
    const parseRecipes = (content) => {
        try {
            // Look for all JSON blocks
            const jsonBlocks = content.match(/```json\s*(\[[\s\S]*?\])\s*```/g);
            if (!jsonBlocks) return null;

            // Parse all blocks and find the one with recipe data
            for (const block of jsonBlocks) {
                const jsonMatch = block.match(/```json\s*(\[[\s\S]*?\])\s*```/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[1]);
                    // Check if it's recipes (has ingredients/instructions) vs workouts (has duration/exercises)
                    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].ingredients && parsed[0].instructions) {
                        return parsed;
                    }
                }
            }
        } catch (e) {
            console.error('Failed to parse recipes:', e);
        }
        return null;
    };

    const workouts = !isUser ? parseWorkouts(message.content || '') : null;
    const recipes = !isUser ? parseRecipes(message.content || '') : null;
    const chartData = !isUser ? parseChartData(message.content || '') : null;

    // Remove JSON blocks from displayed text
    const cleanContent = message.content
        ?.replace(/```json[\s\S]*?```/g, '')
        ?.replace(/```chart[\s\S]*?```/g, '')
        ?.trim();

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setSpeech(window.speechSynthesis);
        }
        
        return () => {
            if (speech && isSpeaking) {
                speech.cancel();
            }
        };
    }, []);

    const toggleSpeech = () => {
        if (!speech) {
            toast.error('Text-to-speech not supported');
            return;
        }

        if (isSpeaking) {
            speech.cancel();
            setIsSpeaking(false);
        } else {
            const utterance = new SpeechSynthesisUtterance(cleanContent);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => {
                setIsSpeaking(false);
                toast.error('Speech failed');
            };
            speech.speak(utterance);
            setIsSpeaking(true);
        }
    };
    
    return (
        <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <div className="h-7 w-7 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mt-0.5">
                    <div className="text-sm">💚</div>
                </div>
            )}
            <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
                {cleanContent && (
                    <div className={cn(
                        "rounded-2xl px-4 py-2.5 relative group",
                        isUser ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700"
                    )}>
                        {!isUser && speech && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={toggleSpeech}
                            >
                                {isSpeaking ? (
                                    <VolumeX className="h-3 w-3" />
                                ) : (
                                    <Volume2 className="h-3 w-3" />
                                )}
                            </Button>
                        )}
                        {isUser ? (
                            <p className="text-sm leading-relaxed">{cleanContent}</p>
                        ) : (
                            <ReactMarkdown 
                                className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                components={{
                                    code: ({ inline, className, children, ...props }) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                            <div className="relative group/code">
                                                <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto my-2">
                                                    <code className={className} {...props}>{children}</code>
                                                </pre>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-slate-800 hover:bg-slate-700"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                                        toast.success('Code copied');
                                                    }}
                                                >
                                                    <Copy className="h-3 w-3 text-slate-400" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                                                {children}
                                            </code>
                                        );
                                    },
                                    a: ({ children, ...props }) => (
                                        <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
                                    ),
                                    p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                                    ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                                    ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                                    li: ({ children }) => <li className="my-0.5">{children}</li>,
                                    h1: ({ children }) => <h1 className="text-lg font-semibold my-2">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-semibold my-2">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-semibold my-2">{children}</h3>,
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-2 border-slate-300 pl-3 my-2 text-slate-600">
                                            {children}
                                        </blockquote>
                                    ),
                                }}
                            >
                                {cleanContent}
                            </ReactMarkdown>
                        )}
                    </div>
                )}

                {/* Chart Display */}
                {chartData && (
                    <div className="mt-2 w-full">
                        <AdherenceChart 
                            data={chartData.data} 
                            type={chartData.type || 'line'} 
                        />
                    </div>
                )}

                {/* Workout Tiles */}
                {workouts && workouts.length > 0 && (
                    <div className="mt-3 w-full space-y-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            🏋️ Recommended Workouts
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                            {workouts.map((workout, idx) => (
                                <WorkoutTile key={idx} workout={workout} index={idx + 1} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Recipe Tiles */}
                {recipes && recipes.length > 0 && (
                    <div className="mt-3 w-full space-y-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            🍽️ Personalized Recipes
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                            {recipes.map((recipe, idx) => (
                                <RecipeTile key={idx} recipe={recipe} index={idx + 1} />
                            ))}
                        </div>
                    </div>
                )}
                
                {message.tool_calls?.length > 0 && (
                    <div className="space-y-1 mt-2">
                        {message.tool_calls.map((toolCall, idx) => (
                            <FunctionDisplay key={idx} toolCall={toolCall} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}