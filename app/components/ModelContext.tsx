'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ModelConfig {
  provider: string;
  modelName: string;
}

interface ModelContextType {
  currentModel: ModelConfig;
  setCurrentModel: (model: ModelConfig) => void;
}

const defaultModel: ModelConfig = {
  provider: 'gemini',
  modelName: 'gemini-2.5-flash'
};

const ModelContext = createContext<ModelContextType>({
  currentModel: defaultModel,
  setCurrentModel: () => {}
});

export const useModel = () => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
};

export const ModelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentModel, setCurrentModel] = useState<ModelConfig>(defaultModel);

  // 初期表示時に現在のモデル設定を取得
  useEffect(() => {
    const fetchCurrentModel = async () => {
      try {
        const response = await fetch('/api/set-model');
        const data = await response.json();
        if (data.model) {
          setCurrentModel(data.model);
        }
      } catch (error) {
        console.error('Failed to fetch current model:', error);
      }
    };

    fetchCurrentModel();
  }, []);

  return (
    <ModelContext.Provider value={{ currentModel, setCurrentModel }}>
      {children}
    </ModelContext.Provider>
  );
}; 