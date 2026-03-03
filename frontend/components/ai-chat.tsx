'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { insightsAPI } from '@/lib/api/insights';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content:
        "Hi! I'm your AI assistant. Ask me anything about your team's development metrics, performance, or trends.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const queryMutation = useMutation({
    mutationFn: (query: string) => insightsAPI.query(query),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: 'assistant',
          content: data.answer,
          timestamp: new Date(),
        },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: 'assistant',
          content:
            "Sorry, I couldn't process your question. Please make sure the AI service is running and try again.",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || queryMutation.isPending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      },
    ]);
    setInput('');
    queryMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    'What is our average PR cycle time this week?',
    'Who are the top contributors?',
    'Are there any bottlenecks in our workflow?',
    'How does our commit frequency compare to last week?',
  ];

  return (
    <div className="flex flex-col h-[500px] border rounded-lg bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                }`}
              >
                {msg.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {queryMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (show only when few messages) */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your team's metrics..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={queryMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || queryMutation.isPending}
            size="sm"
          >
            {queryMutation.isPending ? '...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
