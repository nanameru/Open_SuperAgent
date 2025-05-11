'use client';

import React from 'react';
import type { Message } from '@ai-sdk/react';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  // Basic styling to differentiate user and assistant messages
  // This matches the general appearance of the image provided.
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-2xl p-3 rounded-lg shadow-sm whitespace-pre-wrap ${isUser ? 'bg-blue-50 text-blue-800 ml-auto' : 'bg-white text-slate-800 border border-slate-200 mr-auto'}`}
      >
        {/* Optional: Add role display if needed, though not explicitly in the image's chat bubbles */}
        {/* <strong className="block mb-1 text-sm">{message.role === 'user' ? 'You' : 'Assistant'}</strong> */}
        {message.content}
      </div>
    </div>
  );
}; 