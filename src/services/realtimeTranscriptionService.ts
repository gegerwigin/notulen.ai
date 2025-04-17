import WebSocketService from './websocketService';

interface TranscriptionOptions {
  language?: string;
  onTranscriptionUpdate?: (text: string) => void;
  onError?: (error: Error) => void;
}

class RealtimeTranscriptionService {
  private ws: WebSocketService | null = null;
  private isTranscribing = false;
  private audioChunks: Blob[] = [];
  private options: Required<TranscriptionOptions>;

  constructor(options: TranscriptionOptions = {}) {
    this.options = {
      language: options.language || 'id',
      onTranscriptionUpdate: options.onTranscriptionUpdate || (() => {}),
      onError: options.onError || console.error,
    };
  }

  public async startTranscription(wsUrl: string): Promise<void> {
    if (this.isTranscribing) {
      throw new Error('Transcription is already in progress');
    }

    try {
      this.ws = new WebSocketService(wsUrl, {
        reconnectInterval: 2000,
        maxReconnectAttempts: 5,
        onMessage: this.handleTranscriptionUpdate.bind(this),
        onError: this.handleError.bind(this),
      });

      this.ws.connect();
      this.isTranscribing = true;
      this.audioChunks = [];
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  public async stopTranscription(): Promise<Blob | null> {
    if (!this.isTranscribing || !this.ws) {
      return null;
    }

    this.isTranscribing = false;
    this.ws.disconnect();
    this.ws = null;

    // Combine all audio chunks into a single blob
    if (this.audioChunks.length > 0) {
      return new Blob(this.audioChunks, { type: 'audio/wav' });
    }

    return null;
  }

  public async processAudioChunk(audioChunk: Blob): Promise<void> {
    if (!this.isTranscribing || !this.ws) {
      throw new Error('Transcription is not in progress');
    }

    try {
      // Store the audio chunk
      this.audioChunks.push(audioChunk);

      // Convert audio chunk to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioChunk);
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        // Send audio chunk to WebSocket server
        this.ws?.send({
          type: 'audio',
          data: base64Audio,
          language: this.options.language,
        });
      };
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private handleTranscriptionUpdate(data: any): void {
    try {
      if (data.type === 'transcription') {
        this.options.onTranscriptionUpdate(data.text);
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private handleError(error: Error): void {
    this.options.onError(error);
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }
    this.isTranscribing = false;
  }

  public isActive(): boolean {
    return this.isTranscribing && this.ws?.isConnected() || false;
  }
}

export default new RealtimeTranscriptionService();