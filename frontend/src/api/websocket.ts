import type { WsClientMessage, WsServerEvent } from '@languageforest/sharedtype';

type EventCallback = (event: WsServerEvent) => void;

// ============================================
// WebSocket 클라이언트
// ============================================

class TranslationWebSocket {
  private ws: WebSocket | null = null;
  private callbacks: Set<EventCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isManualClose = false;

  /**
   * WebSocket 연결
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isManualClose = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/translation/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data) as WsServerEvent;
        this.callbacks.forEach(cb => cb(data));
      } catch {
        // Failed to parse message - ignore
      }
    };

    this.ws.onclose = () => {
      if (!this.isManualClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // WebSocket error - connection will be closed
    };
  }

  /**
   * 연결 해제
   */
  disconnect(): void {
    this.isManualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 재연결 스케줄링
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 메시지 전송
   */
  private send(message: WsClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 세션 구독
   */
  subscribe(sessionId: string): void {
    this.send({ type: 'subscribe', sessionId });
  }

  /**
   * 세션 구독 해제
   */
  unsubscribe(sessionId: string): void {
    this.send({ type: 'unsubscribe', sessionId });
  }

  /**
   * 번역 시작
   */
  start(sessionId: string, templateId: string): void {
    this.send({ type: 'start', sessionId, templateId });
  }

  /**
   * 번역 일시정지
   */
  pause(sessionId: string): void {
    this.send({ type: 'pause', sessionId });
  }

  /**
   * 번역 재개
   */
  resume(sessionId: string, templateId: string): void {
    this.send({ type: 'resume', sessionId, templateId });
  }

  /**
   * 이벤트 리스너 등록
   */
  onEvent(callback: EventCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 연결 상태 확인
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// 싱글톤 인스턴스
export const translationWs = new TranslationWebSocket();
