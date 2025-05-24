'use client';

import React from 'react';
import { ArrowUp } from 'lucide-react';

interface ChatInputAreaProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export const ChatInputArea = ({ 
  input, 
  handleInputChange, 
  handleSubmit, 
  isLoading 
}: ChatInputAreaProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-transparent pb-6 pt-4 z-10 ml-64">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6">
        <div className="relative flex items-center bg-gray-100 rounded-3xl border border-gray-200 focus-within:ring-1 focus-within:ring-gray-300 focus-within:border-gray-300 transition-all shadow-sm">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="質問してみましょう"
            className="flex-1 p-3 pl-6 pr-16 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none text-base"
            disabled={isLoading}
          />
          <div className="absolute right-2">
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()} 
              className="p-2 text-white bg-black rounded-full hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}; 