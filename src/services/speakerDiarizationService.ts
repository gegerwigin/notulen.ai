/**
 * Speaker Diarization Service
 * Provides utilities for identifying and labeling different speakers in a conversation
 */

/**
 * Interface for speaker segment
 */
interface SpeakerSegment {
  text: string;
  speaker: number;
  startTime: number;
  endTime: number;
  confidence: number;
}

/**
 * Interface for audio features
 */
interface AudioFeatures {
  pitch: number;
  energy: number;
  tempo: number;
  spectralCentroid: number;
}

// Cache for speaker profiles
const speakerProfiles: Map<number, AudioFeatures[]> = new Map();

/**
 * Initialize speaker diarization system
 * @param speakerCount Number of expected speakers
 */
export const initializeDiarization = (speakerCount: number): void => {
  // Clear existing profiles
  speakerProfiles.clear();
  
  // Initialize empty profiles for each speaker
  for (let i = 1; i <= speakerCount; i++) {
    speakerProfiles.set(i, []);
  }
};

/**
 * Analyze audio to extract features for speaker identification
 * @param audioBuffer Audio data to analyze
 * @returns Extracted audio features
 */
export const extractAudioFeatures = (audioBuffer: Float32Array): AudioFeatures => {
  // In a real implementation, this would use signal processing techniques
  // to extract meaningful features from the audio
  
  // Simplified feature extraction
  
  // Calculate energy (volume)
  let energy = 0;
  for (let i = 0; i < audioBuffer.length; i++) {
    energy += audioBuffer[i] * audioBuffer[i];
  }
  energy = energy / audioBuffer.length;
  
  // Simulate pitch extraction (would use FFT in real implementation)
  const pitch = Math.random() * 100 + 100; // Simulated pitch between 100-200Hz
  
  // Simulate tempo detection
  const tempo = Math.random() * 30 + 70; // Simulated tempo between 70-100 BPM
  
  // Simulate spectral centroid (brightness of sound)
  const spectralCentroid = Math.random() * 2000 + 1000; // Simulated centroid between 1000-3000Hz
  
  return {
    pitch,
    energy,
    tempo,
    spectralCentroid
  };
};

/**
 * Update speaker profile with new audio features
 * @param speaker Speaker number
 * @param features Audio features to add to profile
 */
export const updateSpeakerProfile = (speaker: number, features: AudioFeatures): void => {
  const profile = speakerProfiles.get(speaker) || [];
  
  // Add new features to profile (limit to 10 samples per speaker)
  profile.push(features);
  if (profile.length > 10) {
    profile.shift(); // Remove oldest sample
  }
  
  speakerProfiles.set(speaker, profile);
};

/**
 * Identify the most likely speaker for an audio segment
 * @param features Audio features of the segment
 * @returns The most likely speaker number and confidence
 */
export const identifySpeaker = (features: AudioFeatures): { speaker: number; confidence: number } => {
  // Default to speaker 1 if no profiles exist
  if (speakerProfiles.size === 0) {
    return { speaker: 1, confidence: 0.5 };
  }
  
  let bestSpeaker = 1;
  let bestDistance = Number.MAX_VALUE;
  
  // Compare features with each speaker profile
  for (const [speaker, profile] of speakerProfiles.entries()) {
    // Skip speakers with no profile data
    if (profile.length === 0) continue;
    
    // Calculate average features for this speaker
    const avgFeatures = {
      pitch: profile.reduce((sum, f) => sum + f.pitch, 0) / profile.length,
      energy: profile.reduce((sum, f) => sum + f.energy, 0) / profile.length,
      tempo: profile.reduce((sum, f) => sum + f.tempo, 0) / profile.length,
      spectralCentroid: profile.reduce((sum, f) => sum + f.spectralCentroid, 0) / profile.length
    };
    
    // Calculate Euclidean distance between features
    const distance = Math.sqrt(
      Math.pow((features.pitch - avgFeatures.pitch) / 100, 2) +
      Math.pow((features.energy - avgFeatures.energy) / 0.1, 2) +
      Math.pow((features.tempo - avgFeatures.tempo) / 30, 2) +
      Math.pow((features.spectralCentroid - avgFeatures.spectralCentroid) / 1000, 2)
    );
    
    // Update best match if this distance is smaller
    if (distance < bestDistance) {
      bestDistance = distance;
      bestSpeaker = speaker;
    }
  }
  
  // Calculate confidence based on distance (closer = higher confidence)
  // Normalize to 0.5-1.0 range
  const confidence = Math.max(0.5, Math.min(1.0, 1.0 - (bestDistance / 5)));
  
  return { speaker: bestSpeaker, confidence };
};

/**
 * Process a transcript segment to determine the speaker
 * @param text Transcript text
 * @param audioFeatures Audio features of the segment
 * @param currentSpeaker Current speaker (for context)
 * @param timeSinceLastSpeech Time since last speech in ms
 * @returns Processed segment with speaker identification
 */
export const processSpeakerSegment = (
  text: string,
  audioFeatures: AudioFeatures,
  currentSpeaker: number,
  timeSinceLastSpeech: number
): SpeakerSegment => {
  // If significant silence (>3s), likely a new speaker
  const likelySpeakerChange = timeSinceLastSpeech > 3000;
  
  // Identify speaker based on audio features
  const { speaker: identifiedSpeaker, confidence } = identifySpeaker(audioFeatures);
  
  // Determine final speaker
  // If confidence is high, use identified speaker
  // If confidence is low but there was a long pause, suggest a speaker change
  // Otherwise, stick with current speaker for continuity
  let finalSpeaker = currentSpeaker;
  
  if (confidence > 0.7) {
    // High confidence in speaker identification
    finalSpeaker = identifiedSpeaker;
  } else if (likelySpeakerChange) {
    // Long pause suggests speaker change, but not sure who
    // Cycle to next speaker as a fallback
    finalSpeaker = (currentSpeaker % speakerProfiles.size) + 1;
  }
  
  // Update the profile of the determined speaker
  updateSpeakerProfile(finalSpeaker, audioFeatures);
  
  return {
    text,
    speaker: finalSpeaker,
    startTime: Date.now() - timeSinceLastSpeech,
    endTime: Date.now(),
    confidence
  };
};

/**
 * Get speaker name based on speaker number
 * @param speaker Speaker number
 * @returns Speaker name
 */
export const getSpeakerName = (speaker: number): string => {
  // In a real implementation, this would use custom names set by the user
  const defaultNames = [
    'Speaker 1',
    'Speaker 2',
    'Speaker 3',
    'Speaker 4',
    'Speaker 5',
    'Speaker 6'
  ];
  
  return defaultNames[speaker - 1] || `Speaker ${speaker}`;
};

/**
 * Clean up diarization resources
 */
export const cleanupDiarization = (): void => {
  speakerProfiles.clear();
};
