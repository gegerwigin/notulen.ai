import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  serverTimestamp,
  doc,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import TranscriptionSettings from '../components/TranscriptionSettings';
import { v4 as uuidv4 } from 'uuid';
import { 
  CircleAlert, 
  Mic, 
  Save, 
  Square, 
  Trash2, 
  User, 
  Users, 
  Settings 
} from 'lucide-react';
import { generateSemanticTitle } from '../services/deepseekAPI';
import { 
  enableNoiseReduction, 
  cleanupAudioProcessing 
} from '../services/audioProcessingService';
import { 
  correctTranscription 
} from '../services/transcriptionCorrectionService';
import {
  cleanupDiarization
} from '../services/speakerDiarizationService';

// Define the SpeechRecognition type
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

// Define the missing event interfaces
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal?: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Define the window with SpeechRecognition property
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Track transcript segments by potential speaker
interface TranscriptSegment {
  text: string;
  speaker: number;
  isFinal: boolean;
  confidence?: number;
  startTime?: number;
  endTime?: number;
}

export default function Recorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [title, setTitle] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(1);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecognitionRunning, setIsRecognitionRunning] = useState(false);
  
  // Track restart count for analytics and debugging
  const [recognitionRestartCount, setRecognitionRestartCount] = useState(0);
  
  // New transcription settings state
  const [selectedLanguage, setSelectedLanguage] = useState('id-ID');
  const [noiseReductionEnabled, setNoiseReductionEnabled] = useState(true);
  const [aiCorrectionEnabled, setAiCorrectionEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [speakerChangeThreshold, setSpeakerChangeThreshold] = useState(2000); // ms
  
  // Handler functions for transcription settings
  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };
  
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(e.target.value);
    // If currently recording, stop and restart with new language
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        // Recognition will auto-restart with new language due to the onend handler
      } catch (err) {
        console.error('Error stopping recognition for language change', err);
      }
    }
  };
  
  const toggleNoiseReduction = () => {
    const newState = !noiseReductionEnabled;
    setNoiseReductionEnabled(newState);
    enableNoiseReduction(newState);
  };
  
  const toggleAiCorrection = () => {
    setAiCorrectionEnabled(!aiCorrectionEnabled);
  };
  
  // Handle speaker change threshold updates
  const handleSpeakerChangeThresholdChange = (value: number) => {
    console.log(`Updating speaker change threshold to ${value}ms`);
    setSpeakerChangeThreshold(value);
    // No need to restart recognition, this will take effect on next speaker change detection
  };
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const enhancedStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const userStoppedRecordingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const lastSpeechRef = useRef<number>(Date.now());
  const isRecognitionRunningRef = useRef(false);
  const recognitionInstancesRef = useRef<SpeechRecognition[]>([]);
  const lastTranscriptRef = useRef<string>('');
  const voiceActivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRestartTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Safe text rendering helper function
  const safeText = (text: any): string => {
    if (text === null || text === undefined) return '';
    if (typeof text === 'string') return text;
    if (text instanceof Promise) return '';
    return String(text);
  };

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsRecognitionSupported(false);
      setError('Speech recognition tidak didukung oleh browser Anda. Silakan gunakan Chrome atau Edge terbaru, atau gunakan input manual.');
    }
  }, []);
  
  // Completely rewritten speech recognition setup with improved reliability
  useEffect(() => {
    if (!isRecognitionSupported) {
      return;
    }
    
    // Only initialize recognition when recording begins
    if (!isRecording) {
      return;
    }
    
    // Guard against multiple initialization attempts
    if (isRecognitionRunningRef.current) {
      console.log('Recognition is already running, skipping initialization');
      return;
    }
    
    console.log('Initializing speech recognition with enhanced sensitivity');
    
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configure recognition for maximum sensitivity
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5; // Increased from 3 to 5 for better accuracy
    recognition.lang = selectedLanguage;
    
    // Set a shorter timeout for no-speech detection
    try {
      // @ts-ignore - This is a non-standard property but works in Chrome
      recognition.speechRecognitionTimeoutDetection = false;
      // @ts-ignore
      recognition.speechRecognitionTimeoutDetectionThreshold = 15000; // Increased from 10s to 15s
    } catch (e) {
      console.log('Speech recognition timeout properties not supported');
    }
    
    // Store recognition instance in ref
    recognitionRef.current = recognition;
    recognitionInstancesRef.current.push(recognition);
    
    // Set up event handlers
    recognition.onstart = () => {
      console.log('Recognition started with enhanced sensitivity');
      isRecognitionRunningRef.current = true;
      setIsRecognitionRunning(true);
      
      // Clear any previous errors when recognition starts successfully
      setError('');
      
      // Set up a periodic heartbeat to ensure recognition is still running
      if (recognitionRestartTimerRef.current) {
        clearInterval(recognitionRestartTimerRef.current);
      }
      
      recognitionRestartTimerRef.current = setInterval(() => {
        if (isRecordingRef.current && !isRecognitionRunningRef.current) {
          console.log('Heartbeat detected recognition stopped, attempting restart');
          restartRecognition();
        }
      }, 5000); // Check every 5 seconds
    };
    
    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error, event.message || '');
      
      // Handle specific error types
      if (event.error === 'not-allowed') {
        setError('Izin mikrofon ditolak. Silakan berikan izin mikrofon untuk aplikasi ini.');
      } else if (event.error === 'no-speech') {
        // No speech detected - this is normal during pauses, don't show an error
        console.log('No speech detected, continuing to listen...');
        
        // Set up a voice activity detection timeout
        if (voiceActivityTimeoutRef.current) {
          clearTimeout(voiceActivityTimeoutRef.current);
        }
        
        voiceActivityTimeoutRef.current = setTimeout(() => {
          console.log('No voice activity for 30 seconds, restarting recognition');
          if (recognitionRef.current && isRecordingRef.current) {
            try {
              recognitionRef.current.stop();
              // Will auto-restart due to onend handler
            } catch (err) {
              console.error('Error stopping recognition for restart after silence', err);
              restartRecognition();
            }
          }
        }, 30000); // 30 seconds of silence
      } else if (event.error === 'audio-capture') {
        setError('Tidak dapat menangkap audio. Pastikan mikrofon terhubung dan berfungsi.');
      } else if (event.error === 'network') {
        setError('Masalah jaringan terdeteksi. Periksa koneksi internet Anda.');
        
        // Try to restart after network error
        setTimeout(() => {
          if (isRecordingRef.current) {
            restartRecognition();
          }
        }, 3000);
      } else if (event.error === 'aborted') {
        console.log('Recognition aborted');
      } else {
        console.warn('Recognition error:', event.error);
        
        // For unknown errors, try to restart
        setTimeout(() => {
          if (isRecordingRef.current) {
            restartRecognition();
          }
        }, 2000);
      }
    };
    
    recognition.onend = () => {
      console.log("Recognition ended, checking if should restart");
      isRecognitionRunningRef.current = false;
      setIsRecognitionRunning(false);
      
      // Only restart if still recording
      if (isRecordingRef.current && !userStoppedRecordingRef.current) {
        console.log('Still recording, restarting recognition...');
        const newRestartCount = recognitionRestartCount + 1;
        setRecognitionRestartCount(newRestartCount);
        console.log(`Recognition restart count: ${newRestartCount}`);
        
        // Add a small delay before restarting
        setTimeout(() => {
          if (isRecordingRef.current && !isRecognitionRunningRef.current) {
            restartRecognition();
          }
        }, 300);
      } else {
        console.log('Not restarting recognition because recording is stopped');
      }
    };
    
    // Improved result handler with better speaker detection
    recognition.onresult = (event) => {
      // Reset voice activity timeout since we're getting results
      if (voiceActivityTimeoutRef.current) {
        clearTimeout(voiceActivityTimeoutRef.current);
        voiceActivityTimeoutRef.current = null;
      }
      
      let currentInterimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        // Skip empty or very short transcripts (likely noise)
        if (!transcript || transcript.trim().length < 2) {
          continue;
        }
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          
          // Improved speaker detection logic
          let speakerId = currentSpeaker;
          
          // Only change speaker if there was a significant silence
          const timeSinceLastSpeech = Date.now() - lastSpeechRef.current;
          
          // More sophisticated speaker change detection
          if (timeSinceLastSpeech > speakerChangeThreshold) {
            // Cycle between speakers
            speakerId = (currentSpeaker % 3) + 1;
            setCurrentSpeaker(speakerId);
            console.log(`Speaker change detected after ${timeSinceLastSpeech}ms of silence. New speaker: ${speakerId}`);
          } else {
            // Check for significant changes in speech patterns that might indicate a new speaker
            // This is a simple heuristic - in a real app, you'd use more sophisticated audio analysis
            const lastTranscript = lastTranscriptRef.current;
            const currentTranscript = transcript;
            
            // Check if the speaking style has changed dramatically (e.g., short vs. long sentences)
            const lastLength = lastTranscript.length;
            const currentLength = currentTranscript.length;
            const lengthRatio = Math.max(lastLength, currentLength) / Math.max(1, Math.min(lastLength, currentLength));
            
            if (lengthRatio > 3 && lastLength > 10 && currentLength > 10) {
              // Significant change in sentence length pattern
              speakerId = (currentSpeaker % 3) + 1;
              setCurrentSpeaker(speakerId);
              console.log(`Speaker change detected due to speech pattern change. New speaker: ${speakerId}`);
            }
          }
          
          // Store this transcript for future comparison
          lastTranscriptRef.current = transcript;
          
          // Apply AI correction if enabled
          let processedTranscript = transcript;
          if (aiCorrectionEnabled) {
            // Store the uncorrected transcript initially
            processedTranscript = transcript;
            
            // Start the correction process asynchronously
            correctTranscription(transcript, selectedLanguage)
              .then(result => {
                // When correction is complete, update the transcript segment
                const correctedText = result.correctedText;
                
                // Find and update the segment with the corrected text
                setTranscriptSegments(prev => 
                  prev.map(segment => {
                    // Match the segment by text and time to update it
                    if (segment.text === transcript && 
                        segment.isFinal && 
                        Math.abs((segment.startTime || 0) - (recordingTime - (transcript.length / 10))) < 1) {
                      return {
                        ...segment,
                        text: correctedText,
                        confidence: result.confidence
                      };
                    }
                    return segment;
                  })
                );
                
                // Also update the full transcription if needed
                setTranscription(prev => {
                  // Replace the uncorrected text with corrected text
                  return prev.replace(transcript, correctedText);
                });
              })
              .catch(err => {
                console.error('Error correcting transcription:', err);
                // Keep the original transcript if correction fails
              });
          }
          
          // Add the segment with speaker information
          const newSegment: TranscriptSegment = {
            text: processedTranscript,
            speaker: speakerId,
            isFinal: true,
            confidence: confidence,
            startTime: recordingTime - (transcript.length / 10),
            endTime: recordingTime
          };
          
          setTranscriptSegments(prev => [...prev, newSegment]);
          
          // Update last speech timestamp
          lastSpeechRef.current = Date.now();
          
          // Clear any existing silence timer
          if (silenceTimer) {
            clearTimeout(silenceTimer);
          }
          
          // Set a new silence timer for potential speaker changes
          const newTimer = setTimeout(() => {
            // If significant silence (3 seconds), we might have a new speaker
            const timeSinceLastSpeech = Date.now() - lastSpeechRef.current;
            if (timeSinceLastSpeech > 3000) {
              // Cycle between 3 speakers maximum
              setCurrentSpeaker(prev => (prev % 3) + 1);
            }
          }, 3000);
          
          setSilenceTimer(newTimer);
        } else {
          currentInterimTranscript += transcript;
          
          // Update interim segment
          setTranscriptSegments(prev => [
            ...prev.filter(segment => segment.isFinal),
            {
              text: currentInterimTranscript,
              speaker: currentSpeaker,
              isFinal: false,
              confidence: confidence,
              startTime: recordingTime - (currentInterimTranscript.length / 10),
              endTime: recordingTime
            }
          ]);
        }
      }
      
      if (finalTranscript) {
        setTranscription(prev => {
          const needsSpace = prev.length > 0 && 
                            !prev.endsWith(' ') && 
                            !prev.endsWith('.') && 
                            !prev.endsWith('?') && 
                            !prev.endsWith('!') && 
                            !prev.endsWith(',');
          
          return prev + (needsSpace ? ' ' : '') + finalTranscript;
        });
      }
      
      setInterimTranscript(currentInterimTranscript);
    };
    
    // Helper function to restart recognition with a new instance if needed
    const restartRecognition = () => {
      try {
        // Try to stop any existing recognition
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (err) {
            console.error('Error stopping existing recognition', err);
          }
        }
        
        // Create a new recognition instance
        const newRecognition = new SpeechRecognition();
        
        // Configure the new recognition instance
        newRecognition.continuous = true;
        newRecognition.interimResults = true;
        newRecognition.maxAlternatives = 5;
        newRecognition.lang = selectedLanguage;
        
        // Set up all the event handlers
        newRecognition.onresult = recognition.onresult;
        newRecognition.onerror = recognition.onerror;
        newRecognition.onend = recognition.onend;
        newRecognition.onstart = recognition.onstart;
        
        // Replace the old recognition with the new one
        recognitionRef.current = newRecognition;
        recognitionInstancesRef.current.push(newRecognition);
        
        // Try to start the new recognition
        try {
          newRecognition.start();
          console.log('Recognition restarted with new instance');
        } catch (startErr) {
          console.error('Failed to start new recognition instance', startErr);
          
          // Try one more time after a delay
          setTimeout(() => {
            if (isRecordingRef.current && !isRecognitionRunningRef.current) {
              try {
                newRecognition.start();
                console.log('Recognition started after final retry');
              } catch (finalErr) {
                console.error('Failed to restart recognition after all attempts', finalErr);
                setError('Tidak dapat memulai pengenalan suara. Silakan coba lagi.');
              }
            }
          }, 1000);
        }
      } catch (err) {
        console.error('Error in restartRecognition', err);
        setError('Terjadi kesalahan saat memulai ulang pengenalan suara.');
      }
    };
    
    // Start recognition only if not already running
    if (!isRecognitionRunningRef.current) {
      try {
        recognition.start();
        console.log('Recognition started on first attempt');
      } catch (err) {
        console.error('Error starting recognition, trying again in 300ms', err);
        
        // Try again after a short delay
        setTimeout(() => {
          if (recognitionRef.current && !isRecognitionRunningRef.current) {
            try {
              recognitionRef.current.start();
              console.log('Recognition started after delay');
            } catch (delayedErr) {
              console.error('Failed to start recognition even after delay', delayedErr);
              restartRecognition();
            }
          }
        }, 300);
      }
    } else {
      console.log('Recognition is already running, not starting again');
    }
    
    // Cleanup function
    return () => {
      // Clear any timers
      if (recognitionRestartTimerRef.current) {
        clearInterval(recognitionRestartTimerRef.current);
        recognitionRestartTimerRef.current = null;
      }
      
      if (voiceActivityTimeoutRef.current) {
        clearTimeout(voiceActivityTimeoutRef.current);
        voiceActivityTimeoutRef.current = null;
      }
      
      // Only stop if it's running
      if (recognitionRef.current && isRecognitionRunningRef.current) {
        try {
          recognitionRef.current.stop();
          isRecognitionRunningRef.current = false;
          setIsRecognitionRunning(false);
          console.log('Recognition stopped on cleanup');
        } catch (err) {
          console.error('Error stopping recognition on cleanup', err);
        }
      }
      
      // Clean up all recognition instances
      recognitionInstancesRef.current.forEach(instance => {
        try {
          instance.stop();
        } catch (err) {
          // Ignore errors on cleanup
        }
      });
      recognitionInstancesRef.current = [];
    };
  }, [isRecording, isRecognitionSupported, selectedLanguage, speakerChangeThreshold]);
  
  // Separate timer effect that runs independently
  useEffect(() => {
    // Only start timer when recording begins
    if (isRecording) {
      console.log('Starting timer because isRecording is true');
      
      // Store start time
      const startTime = Date.now();
      
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Create new timer that updates every 100ms
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = (now - startTime) / 1000;
        setRecordingTime(elapsedSeconds);
      }, 100);
      
      console.log('Timer started with ID:', timerRef.current);
    } else {
      // Stop timer when recording stops
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        console.log('Timer stopped because isRecording is false');
      }
    }
    
    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        console.log('Timer stopped on cleanup');
      }
    };
  }, [isRecording]);

  // Separate microphone handling effect
  useEffect(() => {
    // Only initialize microphone when recording begins
    if (isRecording) {
      console.log('Initializing microphone because isRecording is true');
      
      // Request microphone access
      const initMicrophone = async () => {
        try {
          // Try to get audio with settings optimized for speech recognition
          const constraints = {
            audio: {
              echoCancellation: false, // Turn off echo cancellation as it can filter out some speech
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
              sampleRate: 44100, // Higher sample rate for better quality
              sampleSize: 16
            }
          };
          
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          enhancedStreamRef.current = stream;
          console.log('Microphone access granted with enhanced settings');
          
          // Apply additional audio processing if needed
          if (noiseReductionEnabled) {
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const source = audioContext.createMediaStreamSource(stream);
              
              // Create a gain node to boost the audio signal
              const gainNode = audioContext.createGain();
              gainNode.gain.value = 1.5; // Boost the volume
              
              // Connect the nodes
              source.connect(gainNode);
              
              // Create a destination that doesn't output to speakers to avoid feedback
              const destination = audioContext.createMediaStreamDestination();
              gainNode.connect(destination);
              
              // Replace the original stream with the processed one
              enhancedStreamRef.current = destination.stream;
              console.log('Applied audio enhancement for better speech recognition');
            } catch (err) {
              console.error('Error setting up audio processing:', err);
              // Fall back to the original stream
            }
          }
        } catch (err) {
          console.error('Error accessing microphone:', err);
          setError('Gagal mengakses mikrofon. Pastikan mikrofon terhubung dan berfungsi.');
        }
      };
      
      initMicrophone();
    } else {
      // Stop microphone when recording stops
      if (enhancedStreamRef.current) {
        console.log('Stopping microphone because isRecording is false');
        enhancedStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`Track ${track.id} stopped`);
        });
        enhancedStreamRef.current = null;
      }
      
      // Clean up audio processing
      cleanupAudioProcessing();
      
      // Clean up diarization
      cleanupDiarization();
    }
    
    // Cleanup function
    return () => {
      if (enhancedStreamRef.current) {
        enhancedStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`Track ${track.id} stopped on cleanup`);
        });
        enhancedStreamRef.current = null;
      }
      
      cleanupAudioProcessing();
      cleanupDiarization();
    };
  }, [isRecording, noiseReductionEnabled]);

  // Simplified start recording function
  const startRecording = async () => {
    if (!isRecognitionSupported) {
      setError('Browser Anda tidak mendukung Speech Recognition API. Silakan gunakan Chrome, Edge, atau Safari terbaru.');
      return;
    }
    
    try {
      // Clear any previous errors
      setError('');
      
      // Reset transcript and related states
      setTranscription('');
      setInterimTranscript('');
      setTranscriptSegments([]);
      setSaveStatus('idle');
      setCurrentSpeaker(1);
      
      // Reset recording time
      setRecordingTime(0);
      
      // Reset the user stopped flag
      userStoppedRecordingRef.current = false;
      
      // Initialize last speech timestamp
      lastSpeechRef.current = Date.now();
      
      // Simply set recording state to true
      // All the actual initialization happens in the effects
      isRecordingRef.current = true;
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Error in startRecording', err);
      setError('Terjadi kesalahan saat memulai rekaman. Silakan coba lagi.');
    }
  };
  
  // Simplified stop recording function
  const stopRecording = () => {
    console.log('Stopping recording...');
    
    // Set the user stopped flag first to prevent auto-restart
    userStoppedRecordingRef.current = true;
    
    // Then update the recording state
    // All the actual cleanup happens in the effects
    isRecordingRef.current = false;
    setIsRecording(false);
    
    // Add any remaining interim transcript to the final transcript
    if (interimTranscript) {
      setTranscription(prev => prev + interimTranscript + ' ');
      setInterimTranscript('');
      
      // Also finalize any interim segments
      setTranscriptSegments(prev => 
        prev.map(segment => ({...segment, isFinal: true}))
      );
    }
    
    // Generate a title using Deepseek API
    if (!title && transcription.length > 20) {
      setIsGeneratingTitle(true);
      
      // Use an immediately invoked async function to properly handle the Promise
      (async () => {
        try {
          const finalTranscription = transcription + (interimTranscript ? interimTranscript : '');
          const aiTitle = await generateSemanticTitle(finalTranscription);
          // Only set the title after the Promise has resolved
          setTitle(typeof aiTitle === 'string' ? aiTitle : 'New Recording');
        } catch (err) {
          console.error('Error generating title:', err);
          // Fallback to timestamp
          const now = new Date();
          setTitle(`Rekaman ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
        } finally {
          setIsGeneratingTitle(false);
        }
      })();
    }
    
    console.log('Recording stopped');
  };
  
  const saveTranscription = async () => {
    if (!currentUser) {
      setError('Anda harus login untuk menyimpan transkripsi');
      return;
    }
    
    if (!transcription && !interimTranscript) {
      setError('Tidak ada transkripsi untuk disimpan');
      return;
    }
    
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      setError('');
      
      // Make sure we have a valid title
      const finalTitle = safeText(title) || 'New Recording';
      
      // Make sure text is a string
      const textToSave = safeText(transcription);
      
      console.log('Saving transcription to Firebase...');
      console.log('User ID:', currentUser.uid);
      console.log('Title:', finalTitle);
      console.log('Content length:', textToSave.length);
      
      // Generate a custom ID
      const docId = uuidv4();
      
      // Create the document with the custom ID
      const docRef = doc(db, 'transcriptions', docId);
      
      // Prepare the data - ensure all values are serializable
      const transcriptData = {
        userId: currentUser.uid,
        title: finalTitle,
        content: textToSave,
        duration: recordingTime,
        createdAt: serverTimestamp(),
        // Store speaker segments data in case we want to display it later
        speakers: transcriptSegments
          .filter(segment => segment.isFinal)
          .map(segment => ({
            text: safeText(segment.text),
            speaker: segment.speaker
          }))
      };
      
      // Set the document with the data
      await setDoc(docRef, transcriptData);
      
      console.log('Transcription saved successfully with ID:', docId);
      setSaveStatus('success');
      
      // Navigate to the view page with the new document ID
      navigate(`/view/${docId}`);
    } catch (err: any) {
      console.error('Error saving transcription:', err);
      const errorMessage = err.message || 'Terjadi kesalahan saat menyimpan transkrip';
      setError(`Gagal menyimpan transkrip: ${errorMessage}`);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };
  
  const clearTranscription = () => {
    if (window.confirm('Yakin ingin menghapus transkripsi ini?')) {
      setTranscription('');
      setInterimTranscript('');
      setTranscriptSegments([]);
      setTitle('');
      setRecordingTime(0);
      setSaveStatus('idle');
    }
  };
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    // Add leading zeros
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    
    console.log(`Formatting time: ${seconds} seconds -> ${formattedMinutes}:${formattedSeconds}`);
    return `${formattedMinutes}:${formattedSeconds}`;
  };
  
  const requestMicrophonePermission = async () => {
    try {
      setError('');
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Browser Anda tidak mendukung akses mikrofon. Silakan gunakan browser modern seperti Chrome atau Firefox.');
        return false;
      }
      
      // First try with minimal constraints to ensure we get permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Verify that we actually got audio tracks
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        setError('Tidak dapat mendeteksi mikrofon. Pastikan mikrofon terhubung dan berfungsi.');
        stream.getTracks().forEach(track => track.stop());
        return false;
      }
      
      // Log the audio track information for debugging
      console.log('Audio tracks detected:', audioTracks.map(track => ({
        label: track.label,
        id: track.id,
        enabled: track.enabled,
        settings: track.getSettings()
      })));
      
      // Stop the tracks immediately, we just needed to request permission
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (err: any) {
      console.error('Error requesting microphone permission:', err);
      
      // More comprehensive error handling
      const errorName = err.name || '';
      const errorMessage = err.message || '';
      
      // Check for permission errors with more flexible matching
      if (errorName.includes('NotAllowed') || errorName.includes('Permission') || 
          errorMessage.includes('permission') || errorMessage.includes('denied')) {
        setError('Izin akses mikrofon ditolak. Silakan berikan izin mikrofon untuk aplikasi ini di pengaturan browser Anda.');
      } 
      // Check for device not found errors with more flexible matching
      else if (errorName.includes('NotFound') || errorName.includes('Devices') || 
               errorMessage.includes('found') || errorMessage.includes('device')) {
        setError('Mikrofon tidak ditemukan. Pastikan mikrofon terhubung ke komputer Anda dan tidak digunakan oleh aplikasi lain.');
      } 
      // Generic fallback
      else {
        setError(`Gagal mengakses mikrofon: ${errorMessage || 'Kesalahan tidak diketahui'}. Coba refresh halaman atau gunakan browser lain.`);
      }
      
      return false;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="py-10 flex-grow">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900 tracking-tight">Rekam & Transkripsi</h1>
          </div>
        </header>
        
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              {error && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-800 rounded-md flex items-start">
                  <CircleAlert className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-base font-medium">{error}</div>
                </div>
              )}
              
              {!isRecognitionSupported && (
                <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-md">
                  <h3 className="text-lg font-semibold mb-2">Browser Anda tidak mendukung Speech Recognition</h3>
                  <p className="text-base">
                    Silakan gunakan browser terbaru seperti Chrome, Edge, atau Safari. Atau, Anda bisa menggunakan mode input manual di bawah.
                  </p>
                </div>
              )}
              
              {/* Microphone permission notice */}
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800 mb-2">
                  Aplikasi ini memerlukan akses ke mikrofon Anda untuk transkripsi. Klik tombol di bawah untuk memberikan izin.
                </p>
                <button
                  onClick={requestMicrophonePermission}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Mic className="h-4 w-4 mr-2 inline" />
                  Berikan Izin Mikrofon
                </button>
              </div>
              
              <div className="bg-white shadow-md overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex-grow mr-4 relative">
                      <input
                        type="text"
                        placeholder="Judul transkripsi Anda"
                        value={safeText(title)}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base text-gray-900"
                        disabled={isRecording || isGeneratingTitle}
                      />
                      {isGeneratingTitle && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-mono font-bold text-gray-900">
                        {formatTime(recordingTime)}
                      </div>
                      {isRecording && (
                        <div className="text-sm text-red-600 flex items-center justify-end mt-1 font-semibold">
                          <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse mr-1"></span>
                          Merekam
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        <span className="text-gray-700 font-medium">
                          {isRecording ? 'Merekam' : 'Siap Merekam'}
                        </span>
                        
                        {/* Add recognition status indicator */}
                        {isRecording && (
                          <span className="ml-4 flex items-center text-sm text-gray-500">
                            <div className={`w-2 h-2 rounded-full mr-1 ${isRecognitionRunning ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                            {isRecognitionRunning ? 'Pengenalan Suara Aktif' : 'Menunggu Suara...'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">Transkripsi:</h3>
                        <div className="bg-white rounded-lg shadow-sm p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                          {transcriptSegments.length > 0 ? (
                            <div className="space-y-2">
                              {transcriptSegments.map((segment, index) => (
                                segment.isFinal && (
                                  <div key={index} className="flex items-start">
                                    <div 
                                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                                        segment.speaker === 1 ? 'bg-blue-100 text-blue-800' :
                                        segment.speaker === 2 ? 'bg-green-100 text-green-800' :
                                        segment.speaker === 3 ? 'bg-purple-100 text-purple-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      <User className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center mb-1">
                                        <span className="text-sm font-medium">
                                          Pembicara
                                        </span>
                                        {segment.confidence && (
                                          <span className="ml-2 text-xs text-gray-500">
                                            {`${Math.round(segment.confidence * 100)}% confidence`}
                                          </span>
                                        )}
                                        {segment.startTime && segment.endTime && (
                                          <span className="ml-2 text-xs text-gray-500">
                                            {`${Math.floor(segment.startTime / 60)}:${(segment.startTime % 60).toString().padStart(2, '0')} - ${Math.floor(segment.endTime / 60)}:${(segment.endTime % 60).toString().padStart(2, '0')}`}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-gray-800">{safeText(segment.text)}</p>
                                    </div>
                                  </div>
                                )
                              ))}
                              
                              {/* Interim transcript */}
                              {interimTranscript && (
                                <div className="flex items-start">
                                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                                    currentSpeaker === 1 ? 'bg-blue-100 text-blue-800' :
                                    currentSpeaker === 2 ? 'bg-green-100 text-green-800' :
                                    currentSpeaker === 3 ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    <User className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center mb-1">
                                      <span className="text-sm font-medium">
                                        Pembicara
                                      </span>
                                      <span className="ml-2 text-xs text-gray-500 italic">
                                        (mendengarkan...)
                                      </span>
                                    </div>
                                    <p className="text-gray-500 italic">{safeText(interimTranscript)}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">
                              {isRecording 
                                ? "Mendengarkan... Mulai bicara untuk melihat transkripsi." 
                                : "Klik tombol rekam untuk memulai transkripsi."}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {isRecognitionSupported && (
                      <div className="mt-2 text-sm text-gray-600 flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-500" />
                        Sistem akan otomatis mendeteksi pergantian pembicara berdasarkan jeda berbicara
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-between">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-base font-semibold rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={saveStatus === 'saving' || !isRecognitionSupported}
                      >
                        <Mic className="h-5 w-5 mr-2" />
                        Mulai Rekaman
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-base font-semibold rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Square className="h-5 w-5 mr-2" />
                        Hentikan Rekaman
                      </button>
                    )}
                    
                    <div className="flex gap-3">
                      <button
                        onClick={clearTranscription}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-base font-semibold rounded-md shadow-sm text-gray-800 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isRecording || (!transcription && !interimTranscript) || saveStatus === 'saving' || isGeneratingTitle}
                      >
                        <Trash2 className="h-5 w-5 mr-2" />
                        Hapus
                      </button>
                      
                      <button
                        onClick={saveTranscription}
                        disabled={isSaving || saveStatus === 'success'}
                        className={`inline-flex items-center px-4 py-2 rounded-md text-white ${
                          isSaving || saveStatus === 'success' 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Menyimpan...' : 'Simpan Transkripsi'}
                      </button>
                    </div>
                    
                    <button
                      onClick={toggleSettings}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-base font-semibold rounded-md shadow-sm text-gray-800 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Settings className="h-5 w-5 mr-2" />
                      Pengaturan
                    </button>
                  </div>
                  
                  {saveStatus === 'saving' && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-700 mr-2"></div>
                      <p className="text-yellow-800 font-medium">Sedang menyimpan transkripsi ke database...</p>
                    </div>
                  )}
                </div>
              </div>
              
              {!isRecognitionSupported && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Tips untuk input manual:</h3>
                  <ul className="list-disc pl-5 text-blue-800">
                    <li className="mb-1">Gunakan text area di atas untuk mengetik transkripsi Anda</li>
                    <li className="mb-1">Beri judul yang deskriptif untuk memudahkan pencarian</li>
                    <li>Klik tombol "Simpan Transkripsi" setelah selesai</li>
                  </ul>
                </div>
              )}
              
              {isSettingsOpen && (
                <TranscriptionSettings
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={handleLanguageChange}
                  noiseReductionEnabled={noiseReductionEnabled}
                  onToggleNoiseReduction={toggleNoiseReduction}
                  aiCorrectionEnabled={aiCorrectionEnabled}
                  onToggleAiCorrection={toggleAiCorrection}
                  isOpen={isSettingsOpen}
                  onToggle={toggleSettings}
                  speakerChangeThreshold={speakerChangeThreshold}
                  onSpeakerChangeThresholdChange={handleSpeakerChangeThresholdChange}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
