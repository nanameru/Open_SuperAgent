'use client';

import { useChat } from '@ai-sdk/react';
import { Sidebar } from '@/app/components/Sidebar';
import { MainHeader } from '@/app/components/MainHeader';
import { ChatInputArea } from '@/app/components/ChatInputArea';
import { ChatMessage } from '@/app/components/ChatMessage';

export default function AppPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/slide-creator/chat', // Default API endpoint
    // experimental_toolCallStreaming: true, // This option caused a type error, temporarily removed.
  });

  return (
    <div className="flex h-screen bg-white antialiased">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden bg-white">
        <MainHeader />
        <main className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="w-full max-w-4xl mx-auto space-y-4 flex-grow mb-4 flex flex-col justify-end">
            {messages.length === 0 && !isLoading && !error && (
              <div className="flex-grow flex flex-col items-center justify-center">
                <h1 className="text-2xl font-semibold text-gray-700">Welcome to Open-SuperAgent</h1>
                <p className="text-gray-500 mt-2">How can I assist you today?</p>
              </div>
            )}
            {messages.map(m => (
              <ChatMessage key={m.id} message={m} />
            ))}
          </div>

          {error && (
            <div className="p-4 text-center text-red-500 bg-red-100 rounded-md w-full max-w-3xl mx-auto">
              <p>Error: {error.message}</p>
              <p>Please check your API key and network connection.</p>
            </div>
          )}
        </main>
        <ChatInputArea
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
