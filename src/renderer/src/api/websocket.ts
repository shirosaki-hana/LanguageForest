import type { WsServerEvent } from '@shared/types';

type EventCallback = (event: WsServerEvent) => void;

// ============================================
// IPC 기반 이벤트 클라이언트 (WebSocket 대체)
// ============================================

class TranslationEventClient {
  private callbacks: Set<EventCallback> = new Set();
  private unsubscribers: Array<() => void> = [];
  private connected = false;

  /**
   * IPC 이벤트 연결
   */
  connect(): void {
    if (this.connected) {
      return;
    }

    // IPC 이벤트 리스너 등록
    const channels = [
      'translation:subscribed',
      'translation:chunk-start',
      'translation:chunk-progress',
      'translation:session-status',
      'translation:session-complete',
      'translation:error',
    ];

    for (const channel of channels) {
      const unsub = window.api.on(channel, (data: unknown) => {
        this.callbacks.forEach(cb => cb(data as WsServerEvent));
      });
      this.unsubscribers.push(unsub);
    }

    this.connected = true;
  }

  /**
   * 연결 해제
   */
  disconnect(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.connected = false;
  }

  /**
   * 세션 구독
   */
  subscribe(sessionId: string): void {
    window.api.translation.subscribe(sessionId);
  }

  /**
   * 세션 구독 해제
   */
  unsubscribe(sessionId: string): void {
    window.api.translation.unsubscribe(sessionId);
  }

  /**
   * 번역 시작
   */
  start(sessionId: string, templateId: string): void {
    window.api.translation.translateAll(sessionId, templateId);
  }

  /**
   * 번역 일시정지
   */
  pause(sessionId: string): void {
    window.api.translation.pause(sessionId);
  }

  /**
   * 번역 재개
   */
  resume(sessionId: string, templateId: string): void {
    window.api.translation.resume(sessionId, templateId);
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
    return this.connected;
  }
}

// 싱글톤 인스턴스
export const translationWs = new TranslationEventClient();
