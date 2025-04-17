/**
 * Audio Processing Service
 * Provides utilities for audio processing, noise reduction, and speech enhancement
 */

// Initialize audio context and processor
let audioContext: AudioContext | null = null;
let audioWorkletNode: AudioWorkletNode | null = null;
let audioSource: MediaStreamAudioSourceNode | null = null;

/**
 * Initialize the audio processing system
 * @param stream The media stream to process
 * @returns A processed media stream
 */
export const initializeAudioProcessing = async (stream: MediaStream): Promise<MediaStream> => {
  try {
    // Create audio context if it doesn't exist
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Create source from the input stream
    audioSource = audioContext.createMediaStreamSource(stream);
    
    try {
      // Load and register the audio worklet processor
      await audioContext.audioWorklet.addModule('/audio-processor.js');
      
      // Create AudioWorkletNode
      audioWorkletNode = new AudioWorkletNode(audioContext, 'noise-reducer-processor');
      
      // Connect the nodes
      audioSource.connect(audioWorkletNode);
      audioWorkletNode.connect(audioContext.destination);
    } catch (workletError) {
      console.error('Error loading audio worklet, falling back to passthrough:', workletError);
      // If worklet fails, just connect source to destination
      audioSource.connect(audioContext.destination);
    }
    
    // Create a new stream from the processed audio
    const processedStream = new MediaStream();
    
    // Add the original video tracks if any
    stream.getVideoTracks().forEach(track => {
      processedStream.addTrack(track);
    });
    
    // Return the processed stream
    return processedStream;
  } catch (error) {
    console.error('Error initializing audio processing:', error);
    return stream; // Return original stream if processing fails
  }
};

/**
 * Apply noise reduction to audio data
 * @param inputBuffer The audio buffer to process
 * @returns The processed audio buffer
 */
export const applyNoiseReduction = (inputBuffer: Float32Array): Float32Array => {
  // Simple noise gate implementation
  // In a real implementation, this would use more sophisticated algorithms
  const threshold = 0.01; // Noise threshold
  const outputBuffer = new Float32Array(inputBuffer.length);
  
  for (let i = 0; i < inputBuffer.length; i++) {
    // Apply noise gate
    if (Math.abs(inputBuffer[i]) < threshold) {
      outputBuffer[i] = 0; // Silence noise below threshold
    } else {
      outputBuffer[i] = inputBuffer[i]; // Keep signal above threshold
    }
  }
  
  return outputBuffer;
};

/**
 * Enable noise reduction on the audio processor
 * @param enabled Whether noise reduction should be enabled
 */
export const enableNoiseReduction = (enabled: boolean): void => {
  if (!audioWorkletNode) return;
  
  // Send message to the worklet to enable/disable noise reduction
  audioWorkletNode.port.postMessage({
    type: 'enableNoiseReduction',
    enabled: enabled
  });
};

/**
 * Clean up audio processing resources
 */
export const cleanupAudioProcessing = (): void => {
  if (audioWorkletNode && audioSource && audioContext) {
    audioWorkletNode.disconnect();
    audioSource.disconnect();
    audioWorkletNode = null;
    audioSource = null;
  } else if (audioSource && audioContext) {
    audioSource.disconnect();
    audioSource = null;
  }
};
