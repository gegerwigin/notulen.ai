import React from 'react';
import { Settings, Globe, Volume2, VolumeX, Zap, Users } from 'lucide-react';

interface LanguageOption {
  code: string;
  label: string;
}

interface TranscriptionSettingsProps {
  selectedLanguage: string;
  onLanguageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  noiseReductionEnabled: boolean;
  onToggleNoiseReduction: () => void;
  aiCorrectionEnabled: boolean;
  onToggleAiCorrection: () => void;
  isOpen: boolean;
  onToggle: () => void;
  speakerChangeThreshold?: number;
  onSpeakerChangeThresholdChange?: (value: number) => void;
}

const TranscriptionSettings: React.FC<TranscriptionSettingsProps> = ({
  selectedLanguage,
  onLanguageChange,
  noiseReductionEnabled,
  onToggleNoiseReduction,
  aiCorrectionEnabled,
  onToggleAiCorrection,
  isOpen,
  onToggle,
  speakerChangeThreshold = 2000,
  onSpeakerChangeThresholdChange
}) => {
  // Language options
  const languageOptions: LanguageOption[] = [
    { code: 'id-ID', label: 'Indonesian' },
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'zh-CN', label: 'Chinese (Simplified)' },
    { code: 'ja-JP', label: 'Japanese' },
    { code: 'ko-KR', label: 'Korean' },
    { code: 'es-ES', label: 'Spanish' },
    { code: 'fr-FR', label: 'French' },
    { code: 'de-DE', label: 'German' },
    { code: 'it-IT', label: 'Italian' },
    { code: 'pt-BR', label: 'Portuguese (Brazil)' },
    { code: 'ru-RU', label: 'Russian' },
    { code: 'ar-SA', label: 'Arabic' },
    { code: 'hi-IN', label: 'Hindi' },
  ];

  // Speaker sensitivity options
  const speakerSensitivityOptions = [
    { value: 1000, label: 'High (1s)' },
    { value: 2000, label: 'Medium (2s)' },
    { value: 3000, label: 'Low (3s)' },
    { value: 5000, label: 'Very Low (5s)' },
  ];

  const handleSpeakerSensitivityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onSpeakerChangeThresholdChange) {
      onSpeakerChangeThresholdChange(Number(e.target.value));
    }
  };

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center justify-center p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors"
        title="Transcription Settings"
      >
        <Settings className="h-5 w-5" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg p-4 z-10 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Transcription Settings
          </h3>
          
          <div className="space-y-4">
            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={onLanguageChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {languageOptions.map(option => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Speaker Detection Sensitivity */}
            {onSpeakerChangeThresholdChange && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Speaker Change Sensitivity
                </label>
                <select
                  value={speakerChangeThreshold}
                  onChange={handleSpeakerSensitivityChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {speakerSensitivityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Higher sensitivity detects speaker changes more quickly but may incorrectly split a single speaker's speech.
                </p>
              </div>
            )}
            
            {/* Noise Reduction Toggle */}
            <div>
              <button
                onClick={onToggleNoiseReduction}
                className={`flex items-center justify-between w-full p-2 rounded-md ${
                  noiseReductionEnabled ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'
                }`}
              >
                <span className="flex items-center">
                  {noiseReductionEnabled ? (
                    <Volume2 className="h-4 w-4 mr-2" />
                  ) : (
                    <VolumeX className="h-4 w-4 mr-2" />
                  )}
                  Noise Reduction
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  noiseReductionEnabled ? 'bg-blue-100' : 'bg-gray-200'
                }`}>
                  {noiseReductionEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
              <p className="mt-1 text-xs text-gray-500 pl-2">
                Reduces background noise for clearer transcription
              </p>
            </div>
            
            {/* AI Correction Toggle */}
            <div>
              <button
                onClick={onToggleAiCorrection}
                className={`flex items-center justify-between w-full p-2 rounded-md ${
                  aiCorrectionEnabled ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'
                }`}
              >
                <span className="flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  AI Transcription Correction
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  aiCorrectionEnabled ? 'bg-blue-100' : 'bg-gray-200'
                }`}>
                  {aiCorrectionEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
              <p className="mt-1 text-xs text-gray-500 pl-2">
                Improves accuracy by correcting common transcription errors
              </p>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
            Changes are applied immediately to the transcription.
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionSettings;
