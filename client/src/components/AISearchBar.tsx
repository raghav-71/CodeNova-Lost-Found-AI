import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Search, 
  Image as ImageIcon, 
  X, 
  ArrowRight, 
  Loader2, 
  Mic, 
  MicOff, 
  Languages, 
  RotateCcw,
  Volume2
} from 'lucide-react';
import { MultilingualDetection } from '../types/index.js';

interface AISearchBarProps {
  onSearch: (query: string, type: string, imageBase64?: string, isVoice?: boolean, preferredLanguage?: string) => void;
  isLoading: boolean;
  searchStep: number; // 1: Understanding, 2: Searching, 3: Analyzing
  initialQuery?: string;
  detectedLanguage?: MultilingualDetection | null;
  activeFilters?: {
    item_type: 'LOST' | 'FOUND' | 'ALL';
    object?: string;
    category?: string;
    brand?: string;
    color?: string[];
    location?: string;
    date?: string;
  } | null;
  onClearContext?: () => void;
}

const SUPPORTED_VOICE_LANGUAGES = [
  { code: 'auto', label: 'Auto Detect (ಯಾವುದೇ ಭಾಷೆ / कोई भी भाषा)' },
  { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'hi-IN', label: 'Hindi (हिन्दी)' },
  { code: 'en-IN', label: 'English (Indian / Campus)' },
  { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
  { code: 'te-IN', label: 'Telugu (తెలుగు)' },
  { code: 'mr-IN', label: 'Marathi (मराठी)' },
  { code: 'bn-IN', label: 'Bengali (বাংলা)' },
  { code: 'gu-IN', label: 'Gujarati (ગુજરાતી)' },
  { code: 'pa-IN', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ur-IN', label: 'Urdu (اردو)' }
];

const MULTILINGUAL_EXAMPLE_PROMPTS = [
  { label: 'Kannada', query: 'ನನ್ನ ಕಪ್ಪು ವಾಲೆಟ್ ಲೈಬ್ರರಿ ಹತ್ತಿರ ಕಳೆದುಹೋಯಿತು' },
  { label: 'Hindi', query: 'मेरा काला वॉलेट लाइब्रेरी के पास खो गया' },
  { label: 'Kanglish', query: 'nanna black wallet library hatra lost agide' },
  { label: 'Hinglish', query: 'mera black wallet library ke paas kho gaya' },
  { label: 'English', query: 'I lost my black JBL headphones near the library yesterday' },
  { label: 'Found Item', query: 'Someone found a blue water bottle near the canteen' }
];

export function AISearchBar({
  onSearch,
  isLoading,
  searchStep,
  initialQuery = '',
  detectedLanguage,
  activeFilters,
  onClearContext
}: AISearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState<'ALL' | 'LOST' | 'FOUND'>('ALL');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Voice Search States
  const [isListening, setIsListening] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState('auto');
  const [voiceStatusText, setVoiceStatusText] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API if supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatusText('Listening... (speak in your language)');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setQuery(transcript);
        setVoiceStatusText('Understanding speech...');
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setVoiceStatusText(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        setVoiceStatusText(null);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or type your query.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setVoiceStatusText(null);
    } else {
      const targetLang = voiceLanguage === 'auto' ? 'en-IN' : voiceLanguage;
      recognitionRef.current.lang = targetLang;
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Voice recognition start error:', err);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const prefLang = voiceLanguage !== 'auto' ? voiceLanguage.split('-')[0] : undefined;
    onSearch(query.trim(), selectedType, imagePreview || undefined, false, prefLang);
  };

  const handlePromptClick = (promptQuery: string) => {
    setQuery(promptQuery);
    const prefLang = voiceLanguage !== 'auto' ? voiceLanguage.split('-')[0] : undefined;
    onSearch(promptQuery, selectedType, imagePreview || undefined, false, prefLang);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-3xl bg-white border border-[#D5ECD9] p-4 sm:p-7 space-y-4 shadow-[0_12px_32px_-4px_rgba(22,138,74,0.08)]">
      {/* Header with Title & Language/Type Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center text-[#168A4A] shadow-sm shrink-0">
            <Sparkles className="w-5 h-5 text-[#35B86B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#102018] tracking-tight">
                Multilingual Conversational AI Search
              </h2>
              {detectedLanguage && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]">
                  <Languages className="w-3 h-3 text-[#35B86B]" />
                  <span>{detectedLanguage.language_name}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#66756C] line-clamp-1 sm:line-clamp-none font-medium">
              Search naturally using voice or text in Kannada, Hindi, Hinglish, Kanglish, English, or any Indian regional language
            </p>
          </div>
        </div>

        {/* Controls: Voice Language & Type Filters */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Voice Language Selector */}
          <div className="relative inline-block">
            <select
              value={voiceLanguage}
              onChange={(e) => setVoiceLanguage(e.target.value)}
              className="text-xs font-semibold bg-[#F7FBF8] border border-[#E3ECE6] rounded-xl px-2.5 py-1.5 text-[#2D3D34] focus:outline-none focus:border-[#35B86B] cursor-pointer"
              title="Voice & Language Preference"
            >
              {SUPPORTED_VOICE_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center bg-[#F7FBF8] p-1 rounded-xl border border-[#E3ECE6] text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setSelectedType('ALL')}
              className={`px-3 py-1 rounded-lg transition-colors touch-target ${
                selectedType === 'ALL' ? 'bg-[#35B86B] text-white shadow-sm' : 'text-[#66756C] hover:text-[#102018]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('LOST')}
              className={`px-3 py-1 rounded-lg transition-colors touch-target ${
                selectedType === 'LOST' ? 'bg-[#35B86B] text-white shadow-sm' : 'text-[#66756C] hover:text-[#102018]'
              }`}
            >
              Lost
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('FOUND')}
              className={`px-3 py-1 rounded-lg transition-colors touch-target ${
                selectedType === 'FOUND' ? 'bg-[#35B86B] text-white shadow-sm' : 'text-[#66756C] hover:text-[#102018]'
              }`}
            >
              Found
            </button>
          </div>
        </div>
      </div>

      {/* Main Search Input Form with Microphone Button */}
      <form onSubmit={handleFormSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Describe what you lost or found in your language... (e.g. 'ನನ್ನ black wallet library ಹತ್ತಿರ ಕಳೆದುಹೋಯ್ತು' or 'I lost my black JBL speaker near the canteen yesterday')"
            className="w-full px-4 py-3.5 pr-14 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#66756C]/60 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B] focus:bg-white focus:ring-2 focus:ring-[#35B86B]/15 transition-all resize-none shadow-inner"
          />

          {/* Microphone Action inside Textarea */}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`absolute top-3.5 right-3.5 p-2.5 rounded-xl border transition-all flex items-center justify-center touch-target ${
              isListening
                ? 'bg-[#E11D48] text-white border-[#E11D48] animate-pulse shadow-md shadow-[#E11D48]/30'
                : 'bg-white text-[#168A4A] border-[#D5ECD9] hover:bg-[#EEF8F1] shadow-sm'
            }`}
            title={isListening ? 'Stop listening' : 'Speak to search (Voice Search)'}
            aria-label="Voice Search"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-[#35B86B]" />}
          </button>
        </div>

        {/* Live Voice Status Indicator */}
        {(isListening || voiceStatusText) && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#EEF8F1] border border-[#D5ECD9] text-xs font-bold text-[#168A4A] animate-in fade-in">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] animate-ping" />
            <span>{voiceStatusText || 'Listening...'}</span>
          </div>
        )}

        {/* Action Bar Beneath Textarea */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Optional Photo Attachment */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E3ECE6] hover:border-[#35B86B] hover:bg-[#EEF8F1] text-[#66756C] hover:text-[#168A4A] cursor-pointer transition-colors shadow-sm text-xs font-semibold touch-target">
              <ImageIcon className="w-4 h-4 text-[#35B86B]" />
              <span>{imagePreview ? 'Photo Attached' : 'Attach Photo (Optional)'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>

            {imagePreview && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EEF8F1] border border-[#D5ECD9] text-xs font-semibold text-[#168A4A]">
                <img src={imagePreview} alt="Preview" className="w-5 h-5 rounded object-cover" />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="p-1 rounded text-[#66756C] hover:text-rose-600"
                  aria-label="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {activeFilters && (activeFilters.object || activeFilters.location || activeFilters.date) && onClearContext && (
              <button
                type="button"
                onClick={onClearContext}
                className="px-3.5 py-2.5 rounded-xl border border-[#E3ECE6] hover:bg-[#FFF1F2] text-[#E11D48] text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Reset conversation context"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Context</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold disabled:opacity-50 touch-target"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {searchStep === 1
                      ? 'Understanding...'
                      : searchStep === 2
                      ? 'Searching Campus...'
                      : 'Finding potential matches...'}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Search With AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Multilingual Quick Example Prompts */}
      <div className="pt-2 border-t border-[#E3ECE6]">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#66756C] mb-2">
          <span>Try searching in any language:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MULTILINGUAL_EXAMPLE_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePromptClick(p.query)}
              className="text-xs px-2.5 py-1 rounded-xl bg-[#F7FBF8] hover:bg-[#EEF8F1] border border-[#E3ECE6] text-[#2D3D34] hover:text-[#168A4A] transition-colors font-medium flex items-center gap-1.5"
            >
              <span className="font-bold text-[#168A4A] text-[10px] bg-[#EEF8F1] px-1.5 py-0.5 rounded-md">
                {p.label}
              </span>
              <span className="line-clamp-1">{p.query}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
