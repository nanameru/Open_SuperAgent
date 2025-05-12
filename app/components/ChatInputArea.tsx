'use client';

import React from 'react';
import { User, Mic, Paperclip, SendHorizonal } from 'lucide-react'; // Paperclip for attach, SendHorizonal or ArrowUp for send

interface ChatInputAreaProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  // We might need a prop for a dedicated send button if the form submit on Enter is not enough
}

export const ChatInputArea = ({ 
  input, 
  handleInputChange, 
  handleSubmit, 
  isLoading 
}: ChatInputAreaProps) => {
  return (
    <div className="bg-white px-6 pb-4 pt-2 border-t border-slate-200">
      <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
        <div className="relative flex items-center bg-slate-50 rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 transition-all">
          <button type="button" className="p-3 text-slate-500 hover:text-slate-700">
            <User className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything, create anything"
            className="flex-1 p-3 pr-20 bg-transparent text-slate-800 placeholder-slate-500 focus:outline-none text-sm"
            disabled={isLoading}
          />
          <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2 space-x-1">
            <button type="button" className="p-2 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-200">
              <Paperclip className="h-5 w-5" /> {/* Open-SuperAgent has an attach icon */}
            </button>
            <button type="button" className="p-2 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-200">
              <Mic className="h-5 w-5" />
            </button>
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()} 
              className="p-2 text-white bg-sky-500 rounded-md hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              <SendHorizonal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}; 