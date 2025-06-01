'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, Mic, MicOff } from 'lucide-react';

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
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Web Speech API サポート確認
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'ja-JP';
        
        recognition.onstart = () => {
          setIsListening(true);
        };
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          // 音声認識結果を入力フィールドに設定
          const syntheticEvent = {
            target: { value: transcript }
          } as React.ChangeEvent<HTMLInputElement>;
          handleInputChange(syntheticEvent);
        };
        
        recognition.onerror = (event: any) => {
          console.error('音声認識エラー:', event.error);
          setIsListening(false);
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, [handleInputChange]);

  // 音声認識開始/停止
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-transparent pb-6 pt-4 z-10 ml-64">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6">
        <div className="relative flex items-center bg-gray-100 rounded-3xl border border-gray-200 focus-within:ring-1 focus-within:ring-gray-300 focus-within:border-gray-300 transition-all shadow-sm">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="質問してみましょう"
            className="flex-1 p-3 pl-6 pr-24 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none text-base"
            disabled={isLoading}
          />
          <div className="absolute right-2 flex items-center gap-1">
            {/* 音声入力ボタン */}
            {isSupported && (
              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={isLoading}
                className={`p-2 rounded-full transition-colors ${
                  isListening 
                    ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                    : 'text-gray-600 bg-gray-50 hover:bg-gray-200'
                } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                title={isListening ? '音声入力を停止' : '音声入力を開始'}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            
            {/* 送信ボタン */}
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()} 
              className="p-2 text-white bg-black rounded-full hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* 音声認識状態表示 */}
        {isListening && (
          <div className="mt-2 text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-50 text-red-700">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
              音声を聞いています...
            </span>
          </div>
        )}
      </form>
    </div>
  );
}; 