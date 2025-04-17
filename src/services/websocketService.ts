import { EventEmitter } from 'events';

interface WebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
}

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<WebSocketOptions>;
  private reconnectAttempts = 0;
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private shouldReconnect = true;

  constructor(url: string, options: WebSocketOptions = {}) {
    super();
    this.url = url;
    this.options = {
      reconnectInterval: options.reconnectInterval || 2000,
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      pingInterval: options.pingInterval || 30000,
      onMessage: options.onMessage || (() => {}),
      onError: options.onError || console.error,
      onReconnect: options.onReconnect || (() => {}),
    };
  }

  public connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      this.attachEventListeners();
      this.startPingInterval();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private attachEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.emit('open');
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.options.onMessage(data);
        this.emit('message', data);
      } catch (error) {
        this.handleError(error as Error);
      }
    };

    this.ws.onerror = (event) => {
      this.handleError(new Error('WebSocket error'));
    };

    this.ws.onclose = () => {
      this.emit('close');
      this.cleanup();
      if (this.shouldReconnect) {
        this.attemptReconnect();
      }
    };
  }

  private startPingInterval(): void {
    this.pingTimer = setInterval(() => {
      this.ping();
    }, this.options.pingInterval);
  }

  private ping(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }

  private cleanup(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private attemptReconnect(): void {
    if (
      this.isReconnecting ||
      this.reconnectAttempts >= this.options.maxReconnectAttempts
    ) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      try {
        this.connect();
        this.options.onReconnect();
      } catch (error) {
        this.handleError(error as Error);
      }
    }, this.options.reconnectInterval);
  }

  private handleError(error: Error): void {
    this.options.onError(error);
    this.emit('error', error);
  }

  public send(data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.handleError(new Error('WebSocket is not connected'));
      return;
    }

    try {
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
    }
    this.cleanup();
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export default WebSocketService;