import React, { useState, useRef, useEffect, FC } from 'react';
import { Box, Button, Typography, CircularProgress, Paper, List, ListItem, ListItemText, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../firebase';
import { doc, setDoc, serverTimestamp, arrayUnion, updateDoc, collection, addDoc, Timestamp, DocumentReference } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import * as deepseekAPI from '../../services/deepseekAPI';
import { uploadAudio } from '../../services/lightsailStorage';
import MeetingSummaryDisplay from '../../components/MeetingSummaryDisplay';
import { SummaryData, SummaryTopic, ActionItem } from '../../types';
import { Loader2, Mic, FileText, Copy, Download, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getDoc } from 'firebase/firestore';
import { ref } from 'firebase/storage';
import { uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import axios from 'axios';

// Web Speech API types
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

const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;

interface ManualRecordingProps {}

const ManualRecording: FC<ManualRecordingProps> = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Initialize state variables
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [transcriptionId, setTranscriptionId] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('id-ID');
  const [speakerCount, setSpeakerCount] = useState(1);
  const [momSummary, setMomSummary] = useState<SummaryData | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize refs
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const recordingDurationRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to check microphone permission
  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  };
  
  // Start recording
  const handleStartRecording = async () => {
    try {
      // Reset states
      setError(null);
      setTranscription('');
      setInterimTranscript('');
      setIsRecording(false);
      setIsProcessingRecording(false);
      setRecordingComplete(false);
      setMomSummary(null);
      
      // Generate a new transcription ID
      const newTranscriptionId = uuidv4();
      setTranscriptionId(newTranscriptionId);
      
      // Reset audio chunks
      audioChunksRef.current = [];
      
      // Reset recording duration
      recordingDurationRef.current = 0;
      setRecordingDuration(0);
      
      // Request microphone permission with optimized audio settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100
        }
      });
      
      mediaStreamRef.current = stream;
      
      // Create MediaRecorder with higher bitrate for better quality
      const options = { mimeType: 'audio/webm', audioBitsPerSecond: 128000 };
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      
      // Set up data handling
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Set up Web Speech API for live transcription
      if (SpeechRecognitionImpl) {
        const recognition = new SpeechRecognitionImpl();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage;
        recognition.maxAlternatives = 1;
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            
            if (result.isFinal) {
              setTranscription(prev => prev + transcript + ' ');
            } else {
              interimTranscript += transcript;
            }
          }
          setInterimTranscript(interimTranscript);
        };
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'no-speech') {
            return;
          }
          setError(`Speech recognition error: ${event.error}`);
          
          if (event.error !== 'not-allowed' && isRecordingRef.current) {
            setTimeout(restartRecognition, 1000);
          }
        };
        
        recognition.onend = () => {
          if (isRecordingRef.current) {
            setTimeout(restartRecognition, 100);
          }
        };
        
        // Start recording and transcription
        recorder.start(1000); // Collect data every second
        recognition.start();
        setIsRecording(true);
        isRecordingRef.current = true;
        setStartTime(Date.now());
        
        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
          recordingDurationRef.current += 1;
        }, 1000);
      } else {
        throw new Error('Speech recognition is not supported in this browser');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to start recording');
      handleStopRecording();
    }
  };

  // Function to restart speech recognition
  const restartRecognition = () => {
    if (!isRecordingRef.current) return; // Don't restart if recording is stopped
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
                  } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }

    if (SpeechRecognitionImpl) {
      const recognition = new SpeechRecognitionImpl();
      recognitionRef.current = recognition;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            setTranscription(prev => prev + transcript + ' ');
          } else {
            interimTranscript += transcript;
          }
        }
        setInterimTranscript(interimTranscript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'aborted' && isRecordingRef.current) {
          setTimeout(restartRecognition, 1000);
        }
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
          setTimeout(restartRecognition, 100);
        }
      };

        try {
          recognition.start();
        } catch (e) {
          console.error('Error starting recognition:', e);
        }
    }
  };

  // Stop recording
  const handleStopRecording = async () => {
    if (!isRecordingRef.current) return;
    
    try {
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsProcessingRecording(true);
      
      // Stop recognition
      if (recognitionRef.current) {
          recognitionRef.current.stop();
      }
      
      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Clear intervals
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }

      setRecordingComplete(true);
      setIsProcessingRecording(false);

      // Save transcription without audio URL if storage fails
                const transcriptionData = {
                  id: transcriptionId,
                  title: `Recording ${new Date().toLocaleString()}`,
        text: transcription,
        createdAt: serverTimestamp(),
        duration: recordingDurationRef.current,
                  language: selectedLanguage,
        userId: currentUser?.uid,
        summary: null
                };
                
                await setDoc(doc(db, 'transcriptions', transcriptionId), transcriptionData);
      
      toast('Recording saved without audio. Please try uploading audio later.', {
        icon: '⚠️'
      });
    } catch (error) {
      console.error('Error stopping recording:', error);
      setError('Failed to stop recording');
    }
  };
  
  // Handle language change
  const handleLanguageChange = (event: SelectChangeEvent) => {
    setSelectedLanguage(event.target.value);
  };
  
  // Handle speaker count change
  const handleSpeakerCountChange = (event: SelectChangeEvent) => {
    setSpeakerCount(Number(event.target.value));
  };
  
  // Handle generating summary
  const handleGenerateSummary = async () => {
    if (!transcription.trim()) {
      toast.error('Please record some audio first');
      return;
    }

    try {
      setIsGeneratingSummary(true);
      setError(null);

      const response = await axios.post('https://us-central1-sekreai.cloudfunctions.net/generateSummary', {
        text: transcription
      });

      if (response.data && response.data.summary) {
        setSummaryData(response.data);
        setMomSummary(response.data);
        
        // Update Firestore with summary
        if (currentUser && transcriptionId) {
          await updateDoc(doc(db, 'transcriptions', transcriptionId), {
            summary: response.data
          });
        }
        
        toast.success('Ringkasan berhasil dibuat');
      } else {
        throw new Error('Format respons tidak valid');
      }
    } catch (err) {
      console.error('Error generating summary:', err);
      toast.error('Gagal membuat ringkasan. Silakan coba lagi.');
      setError('Gagal membuat ringkasan');
    } finally {
      setIsGeneratingSummary(false);
    }
  };
  
  // Handle saving transcription
  const handleSaveTranscription = async () => {
    if (!transcription.trim()) {
      toast.error('Tidak ada transkripsi untuk disimpan');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const transcriptionData = {
        title: 'Transkripsi Baru',
        text: transcription,
        createdAt: serverTimestamp(),
        duration: Math.floor((Date.now() - startTime) / 1000),
        language: 'id-ID',
        userId: currentUser?.uid,
        summary: {
          summary: '',
          topics: [],
          actionItems: []
        }
      };

      const docRef = await addDoc(collection(db, 'transcriptions'), transcriptionData);
      toast.success('Transkripsi berhasil disimpan');
      navigate(`/dashboard/transcriptions/${docRef.id}`);
    } catch (err) {
      console.error('Error saving transcription:', err);
      toast.error('Gagal menyimpan transkripsi. Silakan coba lagi.');
      setError('Gagal menyimpan transkripsi');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
          recognitionRef.current.stop();
      }
    };
  }, []);
  
  // Format duration
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Add enhanced keepalive mechanism to prevent recording from stopping unexpectedly
  useEffect(() => {
    let keepaliveInterval: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;
    
    if (isRecording) {
      // Send a keepalive signal every 5 seconds to prevent the browser from suspending the recording
      keepaliveInterval = setInterval(async () => {
        // Check if recording is still active
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive' && isRecordingRef.current) {
          console.log('Recording stopped unexpectedly, attempting to restart...');
          
          // Try to restart recording with exponential backoff
          try {
            if (mediaStreamRef.current && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttempts++;
              
              // Wait with exponential backoff before attempting reconnection
              const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 5000);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
              
              const recorder = new MediaRecorder(mediaStreamRef.current, { 
                mimeType: 'audio/webm', 
                audioBitsPerSecond: 128000 
              });
              
              recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                  audioChunksRef.current.push(event.data);
                }
              };
              
              // Reduce chunk size to 1 second for more frequent data collection
              recorder.start(1000);
              mediaRecorderRef.current = recorder;
              console.log(`Successfully restarted recording (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
              
              // Reset reconnect attempts after successful reconnection
              if (recorder.state === 'recording') {
                reconnectAttempts = 0;
              }
            } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
              console.error('Max reconnection attempts reached');
              handleStopRecording();
            }
          } catch (e) {
            console.error('Failed to restart recording:', e);
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
              // If max attempts reached or restart fails, stop recording gracefully
              handleStopRecording();
            }
          }
        } else if (mediaRecorderRef.current?.state === 'recording') {
          // Reset reconnect attempts when recording is active
          reconnectAttempts = 0;
        }
        
        console.log('Recording keepalive check - Recording active:', 
          mediaRecorderRef.current?.state === 'recording',
          'Duration:', formatDuration(recordingDurationRef.current)
        );
      }, 5000);
    }
    
    return () => {
      if (keepaliveInterval) {
        clearInterval(keepaliveInterval);
      }
    };
  }, [isRecording]);
  
  // Add this useEffect after the existing useEffects
  useEffect(() => {
    if (!isRecording && !isProcessingRecording && transcription) {
      setRecordingComplete(true);
    }
  }, [isRecording, isProcessingRecording, transcription]);
  
  const formatTopicsAndDetails = (topics: Array<SummaryTopic | string>) => {
    return topics.map((topic): SummaryTopic => {
      if (typeof topic === 'string') {
        return {
          title: topic,
          points: []
        };
      }
      return topic;
    });
  };

  const formatActionItems = (items: Array<ActionItem | string>) => {
    return items.map((item): ActionItem => {
      if (typeof item === 'string') {
        return {
          task: item,
          assignee: '',
          deadline: '',
          status: 'Pending'
        };
      }
      return item;
    });
  };

  const handleCopySummary = async () => {
    if (!summaryData) return;

    try {
      const formattedTopics = formatTopicsAndDetails(summaryData.topics as (string | SummaryTopic)[]);
      const summaryText = `Meeting Summary\n\nTopics Discussed:\n${formattedTopics.map(topic => 
        `• ${topic.title}${topic.points.length ? '\n  ' + topic.points.join('\n  ') : ''}`
      ).join('\n\n')}`;

      await navigator.clipboard.writeText(summaryText);
      toast.success('Summary copied to clipboard');
    } catch (error) {
      console.error('Error copying summary:', error);
      toast.error('Failed to copy summary');
    }
  };

  const handleDownloadSummary = () => {
    if (!summaryData) return;

    try {
      const formattedTopics = formatTopicsAndDetails(summaryData.topics as (string | SummaryTopic)[]);
      const summaryText = `Meeting Summary\n\nTopics Discussed:\n${formattedTopics.map(topic => 
        `• ${topic.title}${topic.points.length ? '\n  ' + topic.points.join('\n  ') : ''}`
      ).join('\n\n')}`;

      const blob = new Blob([summaryText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Summary downloaded');
    } catch (error) {
      console.error('Error downloading summary:', error);
      toast.error('Failed to download summary');
    }
  };

  const handleShareSummary = async () => {
    if (!summaryData) return;

    try {
      const formattedTopics = formatTopicsAndDetails(summaryData.topics as (string | SummaryTopic)[]);
      const summaryText = `Meeting Summary\n\nTopics Discussed:\n${formattedTopics.map(topic => 
        `• ${topic.title}${topic.points.length ? '\n  ' + topic.points.join('\n  ') : ''}`
      ).join('\n\n')}`;

      if (navigator.share) {
        await navigator.share({
          title: 'Meeting Summary',
          text: summaryText
        });
        toast.success('Summary shared successfully');
      } else {
        await navigator.clipboard.writeText(summaryText);
        toast.success('Summary copied to clipboard (sharing not supported)');
      }
    } catch (error) {
      console.error('Error sharing summary:', error);
      toast.error('Failed to share summary');
    }
  };
  
  // Render component
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Manual Recording</h1>
        <p className="text-gray-600">Record and transcribe your meetings with ease.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Paper className="p-6 rounded-lg shadow-sm">
          <div className="space-y-4">
            <FormControl fullWidth>
              <InputLabel>Language</InputLabel>
          <Select
            value={selectedLanguage}
                onChange={(e: SelectChangeEvent) => setSelectedLanguage(e.target.value)}
                className="mb-4"
          >
            <MenuItem value="id-ID">Bahasa Indonesia</MenuItem>
            <MenuItem value="en-US">English (US)</MenuItem>
          </Select>
        </FormControl>
        
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isProcessingRecording}
              className={`w-full py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isProcessingRecording ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isRecording ? (
                <>
                  <span className="w-3 h-3 rounded-full bg-red-200 animate-pulse" />
                  <span>Stop Recording</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  <span>Start Recording</span>
                </>
              )}
            </button>

            {recordingDuration > 0 && (
              <div className="text-center text-gray-600">
                Recording time: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
          </Paper>

        <Paper className="p-6 rounded-lg shadow-sm">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Live Transcription</h2>
            <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg">
              {transcription && (
                <p className="text-gray-700 whitespace-pre-wrap">{transcription}</p>
              )}
              {interimTranscript && (
                <p className="text-gray-400 italic">{interimTranscript}</p>
              )}
              {!transcription && !interimTranscript && (
                <p className="text-gray-400 text-center">Transcription will appear here...</p>
              )}
            </div>
          </div>
        </Paper>
      </div>
      
      {recordingComplete && (
        <Paper className="p-6 rounded-lg shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Meeting Summary</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleGenerateSummary()}
                  disabled={isGeneratingSummary || !transcription}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGeneratingSummary ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <FileText className="w-5 h-5 mr-2" />
                  )}
                  Generate Summary
                </button>
              </div>
            </div>

            {summaryData && (
              <div className="space-y-4">
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleCopySummary}
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </button>
                  <button
                    onClick={handleDownloadSummary}
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                  <button
                    onClick={handleShareSummary}
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </button>
                </div>
                <MeetingSummaryDisplay summaryData={summaryData} />
              </div>
            )}
          </div>
        </Paper>
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default ManualRecording;
