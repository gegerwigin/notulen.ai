import { Mic, Video, Globe, VolumeX, Settings, Users, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { v4 as uuidv4 } from 'uuid';
import { generateMeetingSummary } from '../../services/deepseekAPI';
import { correctTranscription } from '../../services/transcriptionCorrectionService';
import { UserCircle, ArrowRight, Save, PenLine, FileText, TimerReset } from 'lucide-react';

interface SpeechRecognitionResult {
  readonly transcript: string;
  readonly confidence: number;
  readonly isFinal?: boolean;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  readonly item: (index: number) => SpeechRecognitionResult;
  [index: number]: {
    readonly isFinal: boolean;
    readonly length: number;
    readonly item: (index: number) => SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  };
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

interface TranscriptSegment {
  text: string;
  speaker: number;
  isFinal: boolean;
  confidence?: number;
  startTime?: number;
  endTime?: number;
}

const Record = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('id-ID');
  const [noiseReduction, setNoiseReduction] = useState('medium');
  const [selectedPlatform, setSelectedPlatform] = useState('manual');
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState('');
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(1);
  const [speakerCount, setSpeakerCount] = useState(1);
  const [speakerChangeThreshold] = useState(2000); // ms
  const [isGeneratingMoM, setIsGeneratingMoM] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [momId, setMomId] = useState<string>('');
  const [momSummary, setMomSummary] = useState<any>(null);
  const [recordingComplete, setRecordingComplete] = useState(false);

  const { currentUser } = useAuth();
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const lastSpeechRef = useRef<number>(Date.now());

  const platforms = [
    { id: 'manual', name: 'Manual Recording' },
    { id: 'zoom', name: 'Zoom Meeting' },
    { id: 'meet', name: 'Google Meet' },
    { id: 'teams', name: 'Microsoft Teams' },
  ];

  const languages = [
    { id: 'id-ID', name: 'Bahasa Indonesia' },
    { id: 'en-US', name: 'English' },
  ];

  const noiseReductionLevels = [
    { id: 'low', name: 'Low' },
    { id: 'medium', name: 'Medium' },
    { id: 'high', name: 'High' },
  ];

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsRecognitionSupported(false);
      setError('Speech recognition tidak didukung oleh browser Anda. Silakan gunakan Chrome atau Edge terbaru.');
    }
  }, []);

  const detectSpeakerChange = () => {
    const now = Date.now();
    const timeSinceLastSpeech = now - lastSpeechRef.current;
    
    if (timeSinceLastSpeech > speakerChangeThreshold) {
      // Potential new speaker detected
      const nextSpeaker = currentSpeaker === speakerCount ? 1 : currentSpeaker + 1;
      setCurrentSpeaker(nextSpeaker);
    }
    
    lastSpeechRef.current = now;
  };

  const initializeRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return null;
    }
    
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage;

    // @ts-ignore - Browser API menggunakan onstart meskipun tidak didefinisikan dalam interface
    recognition.onstart = function() {
      console.log('Speech recognition started');
    };

    recognition.onresult = function(event) {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        detectSpeakerChange();

        if (result.isFinal) {
          finalTranscript += transcript + ' ';
          setTranscriptSegments(prev => [...prev, {
            text: transcript,
            speaker: currentSpeaker,
            isFinal: true,
            confidence: result[0].confidence,
            startTime: Date.now(),
          }]);
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscription(prev => prev + finalTranscript);
      }
      setInterimTranscript(interimTranscript);
    };

    recognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
      setError(`Error: ${event.error}`);
    };

    recognition.onend = function() {
      console.log('Speech recognition ended');
      if (isRecordingRef.current) {
        recognition.start();
      }
    };

    return recognition;
  };

  const handleStartRecording = async () => {
    if (!isRecognitionSupported) {
      setError('Speech recognition is not supported in your browser');
      return;
    }

    try {
      // Generate a new MoM ID
      const newMomId = uuidv4();
      setMomId(newMomId);

      const recognition = initializeRecognition();
      if (!recognition) {
        throw new Error('Failed to initialize speech recognition');
      }
      
      recognitionRef.current = recognition;
      recognitionRef.current.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      setError('');
      setSpeakerCount(1);
      setCurrentSpeaker(1);
      lastSpeechRef.current = Date.now();

      // Create a new document in Firestore
      await setDoc(doc(db, 'moms', newMomId), {
        userId: currentUser?.uid,
        startTime: serverTimestamp(),
        language: selectedLanguage,
        platform: selectedPlatform,
        noiseReduction,
        status: 'recording',
      });

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please try again.');
      setIsRecording(false);
    }
  };

  const generateAIMoM = async (transcriptText: string) => {
    try {
      setIsGeneratingMoM(true);
      setProcessingStatus('Memperbaiki transkrip...');

      // Check if transcript is too short
      if (!transcriptText || transcriptText.trim().length < 20) {
        setProcessingStatus('Transkrip terlalu pendek, menggunakan data contoh...');
        
        // Create sample data for very short transcripts
        const sampleSummary = {
          title: "Sample Meeting",
          summary: "Ini adalah contoh ringkasan untuk transkrip yang terlalu pendek.",
          topics: [
            {
              title: "Topik Contoh",
              points: ["Ini adalah poin contoh untuk transkrip yang terlalu pendek."]
            }
          ],
          actionItems: [],
          participants: [],
          entities: []
        };
        
        // Update the MoM document with sample data
        const summaryData = {
          title: sampleSummary.title,
          overview: sampleSummary.summary,
          keyPoints: [],
          decisions: [],
          actionItems: [],
          participants: [],
          topics: sampleSummary.topics,
          entities: []
        };
        
        await setDoc(doc(db, 'moms', momId), {
          transcription: transcriptText || "Transkrip terlalu pendek",
          transcriptionCorrection: {
            confidence: 1.0,
            suggestions: []
          },
          summary: summaryData,
          status: 'completed',
        }, { merge: true });
        
        setMomSummary(summaryData);
        setRecordingComplete(true);
        setIsGeneratingMoM(false);
        setProcessingStatus('');
        return;
      }

      // First correct the transcription
      const correctedResult = await correctTranscription(transcriptText, selectedLanguage.split('-')[0]);
      
      // Update transcription with corrected text if confidence is high enough
      const finalTranscript = correctedResult.confidence > 0.8 ? correctedResult.correctedText : transcriptText;

      setProcessingStatus('Menghasilkan ringkasan rapat...');
      const summaryData = await generateMeetingSummary(finalTranscript, 'Meeting Recording');
      
      if (!summaryData) {
        throw new Error('Failed to generate summary data');
      }

      // Create a valid transcriptionCorrection object with default values for missing fields
      const transcriptionCorrection = {
        confidence: correctedResult.confidence || 0,
        suggestions: correctedResult.suggestions || []
      };
      
      // Prepare final summary data
      const finalSummaryData = {
        title: summaryData.meetingInfo?.title || 'Meeting Summary',
        overview: summaryData.summary || '',
        keyPoints: summaryData.topics?.map((topic: { points: string[] }) => topic.points).flat() || [],
        decisions: [],
        actionItems: summaryData.actionItems || [],
        participants: summaryData.participants || [],
        topics: summaryData.topics || [],
        entities: []
      };

      // Update the MoM document with AI-generated content
      await setDoc(doc(db, 'moms', momId), {
        transcription: finalTranscript,
        transcriptionCorrection,
        summary: finalSummaryData,
        status: 'completed',
      }, { merge: true });

      setMomSummary(finalSummaryData);
      setRecordingComplete(true);
      setIsGeneratingMoM(false);
      setProcessingStatus('');
    } catch (err) {
      console.error('Error generating AI MoM:', err);
      setError('Failed to generate AI summary. Please try again.');
      setIsGeneratingMoM(false);
      setProcessingStatus('');
    }
  };

  const handleStopRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      isRecordingRef.current = false;
      setIsRecording(false);

      // Ensure we have some transcription text
      const currentTranscription = transcription || "Empty recording";

      try {
        // First save the transcription
        await setDoc(doc(db, 'moms', momId), {
          userId: currentUser?.uid,
          endTime: serverTimestamp(),
          transcription: currentTranscription,
          segments: transcriptSegments,
          speakerCount,
          status: 'processing',
        }, { merge: true });

        // Then generate the AI MoM
        await generateAIMoM(currentTranscription);

      } catch (err) {
        console.error('Error saving transcription:', err);
        setError('Failed to save transcription. Please try again.');
      }
    }
  };

  const handleSpeakerCountChange = (count: number) => {
    setSpeakerCount(Math.max(1, Math.min(10, count)));
    setCurrentSpeaker(1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-medium text-gray-900">Record Meeting</h1>
        <p className="text-lg text-gray-500">
          Start recording your meeting for automatic transcription
        </p>
        {error && (
          <div className="text-red-600 bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Main Recording Interface */}
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <div className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              <div className="flex items-center mb-4">
                <Video className="h-5 w-5 mr-2 text-gray-400" />
                <span>Meeting Platform</span>
              </div>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedPlatform === platform.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                  }`}
                >
                  {platform.name}
                </button>
              ))}
            </div>
          </div>

          {/* Recording Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-100">
            {/* Language Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <div className="flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-gray-400" />
                  <span>Language</span>
                </div>
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
              >
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Noise Reduction */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <div className="flex items-center">
                  <VolumeX className="h-5 w-5 mr-2 text-gray-400" />
                  <span>Noise Reduction</span>
                </div>
              </label>
              <select
                value={noiseReduction}
                onChange={(e) => setNoiseReduction(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
              >
                {noiseReductionLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Number of Speakers */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-gray-400" />
                  <span>Number of Speakers</span>
                </div>
              </label>
              <select
                value={speakerCount}
                onChange={(e) => handleSpeakerCountChange(parseInt(e.target.value))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>
                    {count} {count === 1 ? 'Speaker' : 'Speakers'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recording Button */}
          <div className="flex justify-center pt-8">
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={!isRecognitionSupported}
              className={`inline-flex items-center px-8 py-4 text-lg font-medium rounded-full transition-all duration-300 shadow-lg hover:shadow-xl ${
                !isRecognitionSupported
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Mic className={`w-6 h-6 mr-2 ${isRecording ? 'animate-pulse' : ''}`} />
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Transcription Preview */}
      {isRecording && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Live Transcription</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-1" />
                Speaker {currentSpeaker}/{speakerCount}
              </div>
              <div className="flex items-center text-sm text-red-600">
                <span className="relative flex h-3 w-3 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Recording
              </div>
            </div>
          </div>
          <div className="h-48 bg-gray-50 rounded-lg p-4 overflow-y-auto">
            <div className="space-y-2">
              {transcriptSegments.map((segment, index) => (
                <div key={index} className={`text-gray-700 ${segment.isFinal ? 'font-normal' : 'italic'}`}>
                  <span className="text-blue-600 font-medium mr-2">Speaker {segment.speaker}:</span>
                  {segment.text}
                </div>
              ))}
              {interimTranscript && (
                <div className="text-gray-500 italic">
                  <span className="text-blue-600 font-medium mr-2">Speaker {currentSpeaker}:</span>
                  {interimTranscript}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOM Result Display */}
      {recordingComplete && momSummary && !isGeneratingMoM && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Meeting Summary</h2>
          
          {/* Overview */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Overview</h3>
            <p className="text-gray-700">{momSummary.overview || "No overview available."}</p>
          </div>
          
          {/* Topics */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Topics Discussed</h3>
            {momSummary.topics && momSummary.topics.length > 0 ? (
              <div className="space-y-4">
                {momSummary.topics.map((topic: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">{topic.title}</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {topic.points && topic.points.map((point: string, pointIndex: number) => (
                        <li key={pointIndex} className="text-gray-700">{point}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No topics available.</p>
            )}
          </div>
          
          {/* Action Items */}
          {momSummary.actionItems && momSummary.actionItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Action Items</h3>
              <div className="divide-y divide-gray-200">
                {momSummary.actionItems.map((item: any, index: number) => (
                  <div key={index} className="py-3">
                    <div className="flex items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-medium text-gray-900">{item.task}</p>
                        <div className="flex text-sm text-gray-500">
                          {item.assignee && <span className="mr-2">Assigned to: {item.assignee}</span>}
                          {item.deadline && <span>Due: {item.deadline}</span>}
                        </div>
                      </div>
                      {item.status && (
                        <div className="ml-3 flex-shrink-0">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-6 flex justify-end">
            <a 
              href={`/dashboard/moms/${momId}`} 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Complete MoM
            </a>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isGeneratingMoM && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-center space-x-3 text-blue-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{processingStatus || 'Memproses rekaman...'}</span>
          </div>
        </div>
      )}

      {/* Additional Settings */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Advanced Settings</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
            <Settings className="w-4 h-4 mr-1" />
            Configure
          </button>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Configure advanced settings like speaker identification, custom vocabulary, and more.
        </div>
      </div>
    </div>
  );
};

export default Record;
