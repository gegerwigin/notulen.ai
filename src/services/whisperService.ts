/**
 * Whisper API Service
 * 
 * This service handles all interactions with OpenAI's Whisper API for audio transcription.
 * It provides methods for transcribing audio files, handling different languages,
 * and optimizing for Bahasa Indonesia transcription.
 */

import axios from 'axios';

// Interface for Whisper API request
interface WhisperTranscriptionRequest {
  audioBlob: Blob;
  language?: string; // Optional, Whisper can auto-detect language
  prompt?: string;   // Optional, can help guide the transcription
  meetingId?: string; // Optional, for tracking purposes
}

// Interface for Whisper API response
interface WhisperTranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
}

class WhisperService {
  private apiKey: string;
  private apiUrl: string = 'https://api.openai.com/v1/audio/transcriptions';
  private isApiKeyValid: boolean = false;

  constructor() {
    // Get API key from environment variables
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('OpenAI API key is not set. Whisper transcription will not work.');
      this.isApiKeyValid = false;
    } else {
      // Validate API key asynchronously but don't block constructor
      this.validateApiKey().catch(err => {
        console.warn('Failed to validate OpenAI API key:', err);
        this.isApiKeyValid = false;
      });
    }
  }

  /**
   * Validate the API key by making a small test request
   */
  private async validateApiKey(): Promise<boolean> {
    try {
      if (!this.apiKey || this.apiKey.trim() === '') {
        console.warn('Empty OpenAI API key');
        this.isApiKeyValid = false;
        return false;
      }

      // Check if API key is valid by making a HEAD request
      await axios.head('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 10000 // 10 second timeout
      });
      
      this.isApiKeyValid = true;
      console.log('OpenAI API key validated successfully');
      return true;
    } catch (error) {
      this.isApiKeyValid = false;
      console.error('OpenAI API key validation failed:', error);
      return false;
    }
  }

  /**
   * Transcribe audio using OpenAI's Whisper API
   * 
   * @param request - The transcription request containing audio and options
   * @returns Promise with the transcription response
   */
  async transcribeAudio(request: WhisperTranscriptionRequest): Promise<WhisperTranscriptionResponse> {
    try {
      if (!this.apiKey || this.apiKey.trim() === '') {
        throw new Error('OpenAI API key is not set');
      }

      if (!this.isApiKeyValid) {
        // Try to validate again in case it was a temporary issue
        const isValid = await this.validateApiKey();
        if (!isValid) {
          throw new Error('OpenAI API key is invalid');
        }
      }

      // Create form data for the audio file
      const formData = new FormData();
      formData.append('file', request.audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      
      // Add optional parameters if provided
      if (request.language) {
        formData.append('language', request.language);
      }
      
      if (request.prompt) {
        formData.append('prompt', request.prompt);
      }

      // Set response_format to json to get detailed response
      formData.append('response_format', 'verbose_json');
      
      // Call the Whisper API with timeout and retry logic
      const response = await axios.post(this.apiUrl, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 second timeout
      });

      return response.data;
    } catch (error: any) {
      // Provide more detailed error information
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.error?.message || error.message;
        
        if (statusCode === 401) {
          console.error('Authentication error with Whisper API. Please check your API key.');
          this.isApiKeyValid = false;
          throw new Error('OpenAI API key is invalid or expired');
        } else if (statusCode === 429) {
          console.error('Rate limit exceeded with Whisper API. Please try again later.');
          throw new Error('Whisper API rate limit exceeded. Please try again later');
        } else if (statusCode === 400) {
          console.error('Bad request to Whisper API:', errorMessage);
          throw new Error(`Bad request to Whisper API: ${errorMessage}`);
        } else {
          console.error(`Whisper API error (${statusCode}):`, errorMessage);
          throw new Error(`Whisper API error (${statusCode}): ${errorMessage}`);
        }
      } else {
        console.error('Error transcribing audio with Whisper API:', error);
      }
      
      throw new Error(`Failed to transcribe audio with Whisper API: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Optimize transcription for Bahasa Indonesia
   * 
   * @param audioBlob - The audio blob to transcribe
   * @param meetingId - Optional meeting ID for tracking
   * @returns Promise with the optimized transcription response
   */
  async transcribeBahasaIndonesia(audioBlob: Blob, meetingId?: string): Promise<WhisperTranscriptionResponse> {
    // Create a request with Bahasa Indonesia optimization
    const request: WhisperTranscriptionRequest = {
      audioBlob,
      language: 'id', // ISO code for Bahasa Indonesia
      // Add a prompt that helps guide the model for Bahasa Indonesia content
      prompt: 'Transkripsikan audio ini dalam Bahasa Indonesia dengan akurat. Perhatikan istilah teknis dan nama orang.',
      meetingId
    };

    return this.transcribeAudio(request);
  }

  /**
   * Process audio chunks for real-time transcription
   * This is a simplified version - in production, you might want to 
   * implement a more sophisticated streaming solution
   * 
   * @param audioChunk - The audio chunk to transcribe
   * @param language - The language code
   * @returns Promise with the transcription text
   */
  async processAudioChunk(audioChunk: Blob, language: string = 'id'): Promise<string> {
    try {
      const request: WhisperTranscriptionRequest = {
        audioBlob: audioChunk,
        language
      };

      const response = await this.transcribeAudio(request);
      return response.text;
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      return '';
    }
  }

  /**
   * Check if the Whisper service is properly configured
   * 
   * @returns boolean indicating if the service is ready to use
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey) && this.isApiKeyValid;
  }

  /**
   * Get API key status - useful for UI to show if API key is valid
   */
  getApiKeyStatus(): { hasKey: boolean, isValid: boolean } {
    return {
      hasKey: Boolean(this.apiKey && this.apiKey.trim() !== ''),
      isValid: this.isApiKeyValid
    };
  }
}

// Export as a singleton
export default new WhisperService();
