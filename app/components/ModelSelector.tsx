'use client';

import React, { useEffect } from 'react';
import { useModel } from './ModelContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ModelProvider = 'openai' | 'claude' | 'gemini' | 'grok';

interface Model {
  id: string;
  provider: ModelProvider;
  name: string;
  displayName: string;
}

const models: Model[] = [
  { id: 'gpt-4.1', provider: 'openai', name: 'gpt-4.1', displayName: 'GPT-4.1' },
  { id: 'o3-2025-04-16', provider: 'openai', name: 'o3-2025-04-16', displayName: 'o3' },
  { id: 'o3-pro-2025-06-10', provider: 'openai', name: 'o3-pro-2025-06-10', displayName: 'o3 Pro' },
  { id: 'o4-mini-2025-04-16', provider: 'openai', name: 'o4-mini-2025-04-16', displayName: 'o4-mini' },
  { id: 'claude-opus-4-20250514', provider: 'claude', name: 'claude-opus-4-20250514', displayName: 'Claude Opus 4' },
  { id: 'claude-sonnet-4-20250514', provider: 'claude', name: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4' },
  { id: 'gemini-2.5-flash', provider: 'gemini', name: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', provider: 'gemini', name: 'gemini-2.5-flash-lite-preview-06-17', displayName: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.5-pro', provider: 'gemini', name: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
  { id: 'grok-4', provider: 'grok', name: 'grok-4-0709', displayName: 'Grok 4' },
];

const providerConfig = {
  openai: { 
    label: 'OpenAI', 
    color: 'text-green-700',
    badgeColor: 'bg-green-100 text-green-800 border-green-200'
  },
  claude: { 
    label: 'Claude', 
    color: 'text-orange-700',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  gemini: { 
    label: 'Gemini', 
    color: 'text-blue-700',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  grok: { 
    label: 'Grok', 
    color: 'text-purple-700',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200'
  },
};

export const ModelSelector = () => {
  const { currentModel, setCurrentModel } = useModel();

  const selectedModel = models.find(m => m.name === currentModel.modelName) || models[5];

  const handleModelChange = async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;
    
    const newModelConfig = {
      provider: model.provider,
      modelName: model.name
    };
    
    // Contextの状態を更新
    setCurrentModel(newModelConfig);
    
    // Send model change to API
    try {
      await fetch('/api/set-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newModelConfig),
      });
    } catch (error) {
      console.error('Failed to update model:', error);
    }
  };

  return (
    <Select value={selectedModel.id} onValueChange={handleModelChange}>
      <SelectTrigger className="w-[280px] h-9">
        <SelectValue>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${providerConfig[selectedModel.provider].badgeColor}`}>
              {providerConfig[selectedModel.provider].label}
            </span>
            <span className="text-sm font-medium">{selectedModel.displayName}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(
          models.reduce((acc, model) => {
            if (!acc[model.provider]) acc[model.provider] = [];
            acc[model.provider].push(model);
            return acc;
          }, {} as Record<ModelProvider, Model[]>)
        ).map(([provider, providerModels]) => (
          <div key={provider}>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {providerConfig[provider as ModelProvider].label}
            </div>
            {providerModels.map((model) => (
              <SelectItem key={model.id} value={model.id} className="pl-6">
                <div className="flex items-center justify-between w-full">
                  <span>{model.displayName}</span>
                  {selectedModel.id === model.id && (
                    <div className="w-2 h-2 bg-primary rounded-full ml-2"></div>
                  )}
                </div>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
};