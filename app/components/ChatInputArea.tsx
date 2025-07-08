'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, Mic, MicOff, ChevronDown, Search, Paperclip, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Web Speech API の型定義
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ChatInputAreaProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>, image?: File) => void;
  isLoading: boolean;
  isDeepResearchMode?: boolean;
  onDeepResearchModeChange?: (enabled: boolean) => void;
}

// ツールオプションの型定義
interface ToolOption {
  value: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const toolOptions: ToolOption[] = [
  {
    value: 'deep-research',
    label: 'Deep Research を実行する',
    icon: <Search className="h-4 w-4" />,
    description: '詳細な調査と分析を行います'
  },
  {
    value: 'enhanced-research',
    label: 'Enhanced Deep Research',
    icon: <Search className="h-4 w-4" />,
    description: 'LangGraph-style advanced research with source validation'
  }
];

export const ChatInputArea = ({ 
  input, 
  handleInputChange, 
  handleSubmit, 
  isLoading,
  isDeepResearchMode = false,
  onDeepResearchModeChange
}: ChatInputAreaProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [lastEnterTime, setLastEnterTime] = useState<number>(0);
  const [enterCount, setEnterCount] = useState<number>(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // textareaの高さを自動調整
  const adjustTextareaHeight = () => {
    if (textareaRef.current && typeof window !== 'undefined') {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 52; // 最小高さ（約2行分）
      // モバイルでは少し低めに設定
      const isMobile = window.innerWidth < 768;
      const maxHeight = isMobile ? 150 : 200; // モバイル: 約6行分、デスクトップ: 約8行分
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
    }
  };

  // 入力値が変更されたときに高さを調整
  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // ウィンドウサイズ変更時に高さを再調整
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        adjustTextareaHeight();
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

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
          } as React.ChangeEvent<HTMLTextAreaElement>;
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

  // 画像選択をトリガー
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 画像が選択されたときのハンドラ
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // ファイルサイズの検証（10MB制限）
      if (file.size > 10 * 1024 * 1024) {
        alert('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
        return;
      }
      
      // MIME typeの検証
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        return;
      }
      
      setSelectedImage(file);
    }
  };

  // 画像プレビューURL管理
  useEffect(() => {
    if (selectedImage) {
      const url = URL.createObjectURL(selectedImage);
      setImagePreviewUrl(url);
      
      // クリーンアップ関数でURLを解放
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setImagePreviewUrl(null);
    }
  }, [selectedImage]);

  // キーボードイベントハンドラ
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enterの場合は改行を許可
    if (e.key === 'Enter' && e.shiftKey) {
      // デフォルトの動作（改行）を許可
      return;
    }
    
    // Enterキーのみの場合
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); // デフォルトの改行を防ぐ
      
      const currentTime = Date.now();
      const timeDiff = currentTime - lastEnterTime;
      
      // 300ms以内に2回目のEnterが押された場合
      if (timeDiff < 300 && enterCount === 1) {
        // フォーム送信
        const form = e.currentTarget.closest('form');
        if (form && input.trim()) {
          form.requestSubmit();
        }
        setEnterCount(0);
        setLastEnterTime(0);
      } else {
        // 1回目のEnter
        setEnterCount(1);
        setLastEnterTime(currentTime);
        
        // 300ms後にカウントをリセット
        setTimeout(() => {
          setEnterCount(0);
          setLastEnterTime(0);
        }, 300);
      }
    }
  };

  // フォーム送信時の処理を更新
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // 選択されたツールがある場合は、入力テキストの前にツール指示を追加
    if (selectedTool && input.trim()) {
      let modifiedInput = input;
      
      if (selectedTool === 'deep-research') {
        modifiedInput = `[Deep Research] ${input}`;
      } else if (selectedTool === 'enhanced-research') {
        modifiedInput = `[Enhanced Research] ${input}`;
      }
      
      // 修正された入力で送信
      const syntheticEvent = {
        ...e,
        preventDefault: () => {},
        target: {
          ...e.target,
          elements: {
            ...((e.target as HTMLFormElement).elements),
            0: { value: modifiedInput }
          }
        }
      } as React.FormEvent<HTMLFormElement>;
      
      handleSubmit(syntheticEvent, selectedImage || undefined);
      setSelectedImage(null); // 画像をクリア
      
          // Deep Researchモード以外の場合はツール選択をリセット
      if (selectedTool !== 'deep-research' && selectedTool !== 'enhanced-research') {
        setSelectedTool('');
        if (onDeepResearchModeChange) {
          onDeepResearchModeChange(false);
        }
      }
    } else {
      // 通常の送信でもpreventDefaultメソッドを含むイベントを渡す
      handleSubmit(e, selectedImage || undefined);
      setSelectedImage(null); // 画像をクリア
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md">
      <div className="safe-areas">
        <div className="max-w-4xl mx-auto p-2 md:p-4">
          {/* 画像プレビューセクション */}
          {selectedImage && imagePreviewUrl && (
            <div className="mb-2 inline-block relative">
              <img 
                src={imagePreviewUrl} 
                alt="添付画像" 
                className="max-h-16 max-w-[200px] rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute -top-1 -right-1 p-1 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors border border-gray-200"
                title="画像を削除"
              >
                <X className="h-3 w-3 text-gray-600" />
              </button>
            </div>
          )}
          
          <form onSubmit={handleFormSubmit}>
            <div className="relative flex items-center bg-gray-100 rounded-2xl md:rounded-3xl border border-gray-200 focus-within:ring-1 focus-within:ring-gray-300 focus-within:border-gray-300 transition-all shadow-sm">
            {/* ツール選択ドロップダウン */}
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="hidden md:flex items-center gap-1 px-3 py-2 ml-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-2xl transition-colors"
                  disabled={isLoading}
                >
                  {selectedTool ? (
                    <>
                      {toolOptions.find(opt => opt.value === selectedTool)?.icon}
                      <span className="text-xs font-medium">
                        {isDeepResearchMode && (selectedTool === 'deep-research' || selectedTool === 'enhanced-research')
                          ? selectedTool === 'enhanced-research' ? 'Enhanced Research (有効)' : 'Deep Research (有効)'
                          : toolOptions.find(opt => opt.value === selectedTool)?.label}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs">ツール</span>
                    </>
                  )}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <Command>
                  <CommandInput placeholder="ツールを検索..." />
                  <CommandList>
                    <CommandEmpty>ツールが見つかりません</CommandEmpty>
                    <CommandGroup>
                      {toolOptions.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={(currentValue) => {
                            const newSelectedTool = currentValue === selectedTool ? '' : currentValue;
                            setSelectedTool(newSelectedTool);
                            setOpen(false);
                            
                            // Deep Researchモードの状態を更新
                            if (onDeepResearchModeChange) {
                              onDeepResearchModeChange(newSelectedTool === 'deep-research' || newSelectedTool === 'enhanced-research');
                            }
                          }}
                          className="flex items-start gap-3 p-3"
                        >
                          <div className="mt-0.5">{option.icon}</div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.description}</div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isDeepResearchMode 
                  ? selectedTool === 'enhanced-research' 
                    ? "Enhanced Research で高度な調査を実行します..."
                    : "Deep Researchで詳細調査します..." 
                  : selectedTool 
                    ? `${toolOptions.find(opt => opt.value === selectedTool)?.label}について質問してください` 
                    : selectedImage 
                      ? "画像を添付しました。メッセージを入力してください。" 
                      : "質問してみましょう"
              }
              className="flex-1 p-3 pl-4 pr-20 md:pr-24 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none text-base resize-none overflow-y-auto"
              style={{ 
                minHeight: '52px', 
                maxHeight: '200px', 
                lineHeight: '1.5' 
              }}
              disabled={isLoading}
              rows={1}
            />
            <div className="absolute right-2 flex items-center gap-1">
              {/* 画像添付ボタン */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleImageSelect}
              />
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={isLoading}
                className="hidden md:flex p-2 rounded-full transition-colors text-gray-600 bg-gray-50 hover:bg-gray-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                title="画像を添付"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              {/* 音声入力ボタン */}
              {isSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  disabled={isLoading}
                  className={`hidden md:flex p-2 rounded-full transition-colors ${
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
                className="p-2.5 md:p-2 text-white bg-black rounded-full hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
      </div>
    </div>
  );
}; 