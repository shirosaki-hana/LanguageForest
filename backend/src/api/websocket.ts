import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket } from 'ws';
import {
  WsClientMessageSchema,
  WsSubscribedEventSchema,
  WsErrorEventSchema,
  type WsServerEvent,
  type WsClientMessage,
} from '@languageforest/sharedtype';
import {
  subscribeToSession,
  calculateProgress,
} from '../services/translationEvents.js';
import {
  getSession,
  getSessionChunks,
  pauseTranslation,
  resumeTranslation,
  translateAllPendingChunks,
} from '../services/translation.js';

// ============================================
// WebSocket 연결 관리
// ============================================

interface ClientConnection {
  socket: WebSocket;
  subscriptions: Map<string, () => void>; // sessionId -> unsubscribe function
}

const clients = new Set<ClientConnection>();

/**
 * 클라이언트에 이벤트 전송
 */
function sendEvent(socket: WebSocket, event: WsServerEvent): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(event));
  }
}

/**
 * 에러 이벤트 전송
 */
function sendError(socket: WebSocket, message: string, sessionId?: string): void {
  const event = WsErrorEventSchema.parse({
    type: 'error',
    message,
    sessionId,
  });
  sendEvent(socket, event);
}

// ============================================
// 메시지 핸들러
// ============================================

async function handleSubscribe(
  client: ClientConnection,
  sessionId: string
): Promise<void> {
  // 이미 구독 중이면 무시
  if (client.subscriptions.has(sessionId)) {
    return;
  }

  // 세션 존재 확인
  const session = await getSession(sessionId);
  if (!session) {
    sendError(client.socket, 'Session not found', sessionId);
    return;
  }

  // 청크 조회
  const chunks = await getSessionChunks(sessionId);
  const progress = calculateProgress(chunks);

  // 이벤트 구독
  const unsubscribe = subscribeToSession(sessionId, (event) => {
    sendEvent(client.socket, event);
  });
  client.subscriptions.set(sessionId, unsubscribe);

  // 구독 확인 이벤트 전송
  const subscribedEvent = WsSubscribedEventSchema.parse({
    type: 'subscribed',
    sessionId,
    session: {
      id: session.id,
      title: session.title,
      memo: session.memo,
      customDict: session.customDict,
      sourceText: session.sourceText,
      translatedText: session.translatedText,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    },
    progress,
  });
  sendEvent(client.socket, subscribedEvent);
}

function handleUnsubscribe(
  client: ClientConnection,
  sessionId: string
): void {
  const unsubscribe = client.subscriptions.get(sessionId);
  if (unsubscribe) {
    unsubscribe();
    client.subscriptions.delete(sessionId);
  }
}

async function handleStart(
  client: ClientConnection,
  sessionId: string
): Promise<void> {
  // 구독 확인
  if (!client.subscriptions.has(sessionId)) {
    sendError(client.socket, 'Not subscribed to this session', sessionId);
    return;
  }

  try {
    // 비동기로 번역 시작 (결과는 이벤트로 전달)
    translateAllPendingChunks(sessionId).catch(error => {
      sendError(client.socket, error.message, sessionId);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendError(client.socket, message, sessionId);
  }
}

async function handlePause(
  client: ClientConnection,
  sessionId: string
): Promise<void> {
  try {
    await pauseTranslation(sessionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendError(client.socket, message, sessionId);
  }
}

async function handleResume(
  client: ClientConnection,
  sessionId: string
): Promise<void> {
  try {
    await resumeTranslation(sessionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendError(client.socket, message, sessionId);
  }
}

async function handleMessage(
  client: ClientConnection,
  message: WsClientMessage
): Promise<void> {
  switch (message.type) {
    case 'subscribe':
      await handleSubscribe(client, message.sessionId);
      break;
    case 'unsubscribe':
      handleUnsubscribe(client, message.sessionId);
      break;
    case 'start':
      await handleStart(client, message.sessionId);
      break;
    case 'pause':
      await handlePause(client, message.sessionId);
      break;
    case 'resume':
      await handleResume(client, message.sessionId);
      break;
  }
}

// ============================================
// WebSocket 라우트 플러그인
// ============================================

export const websocketRoutes: FastifyPluginAsync = async (fastify) => {
  // WebSocket 엔드포인트
  fastify.get('/ws', { websocket: true }, (socket, _request) => {
    const client: ClientConnection = {
      socket,
      subscriptions: new Map(),
    };
    clients.add(client);

    // 메시지 수신
    socket.on('message', async (rawMessage: Buffer) => {
      try {
        const data = JSON.parse(rawMessage.toString());
        const message = WsClientMessageSchema.parse(data);
        await handleMessage(client, message);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Invalid message format';
        sendError(socket, errorMessage);
      }
    });

    // 연결 종료
    socket.on('close', () => {
      // 모든 구독 해제
      for (const unsubscribe of client.subscriptions.values()) {
        unsubscribe();
      }
      client.subscriptions.clear();
      clients.delete(client);
    });

    // 에러 처리
    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
};

export default websocketRoutes;

