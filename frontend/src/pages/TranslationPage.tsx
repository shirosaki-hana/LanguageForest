import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, IconButton, Tooltip, Paper } from '@mui/material';
import { ArrowBack as BackIcon, Translate as TranslateIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslationStore } from '../stores/translationStore';
import { dialog } from '../stores/dialogStore';
import {
  SessionSidebar,
  TranslationEditor,
  ChunkProgressPanel,
  ControlPanel,
  SessionDialog,
  ConfigDialog,
} from '../components/translation';
import type { TranslationSession, CreateSessionRequest, UpdateSessionRequest } from '@languageforest/sharedtype';

// ============================================
// 번역 페이지
// ============================================

export default function TranslationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Store 상태
  const {
    sessions,
    sessionsLoading,
    currentSessionId,
    currentSession,
    chunks,
    progress,
    isTranslating,
    isPaused,
    config,
    sourceText,
    loadSessions,
    createSession,
    selectSession,
    updateSession,
    deleteSession,
    setSourceText,
    startTranslation,
    pauseTranslation,
    resumeTranslation,
    retryChunk,
    loadConfig,
    updateConfig,
    connectWs,
    disconnectWs,
  } = useTranslationStore();

  // 로컬 상태
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TranslationSession | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  // 초기 로드
  useEffect(() => {
    loadSessions();
    loadConfig();
    connectWs();

    return () => {
      disconnectWs();
    };
  }, [loadSessions, loadConfig, connectWs, disconnectWs]);

  // 세션 선택
  const handleSelectSession = useCallback(
    (id: string) => {
      selectSession(id);
    },
    [selectSession]
  );

  // 세션 생성
  const handleCreateSession = useCallback(
    async (data: CreateSessionRequest) => {
      const session = await createSession(data);
      selectSession(session.id);
    },
    [createSession, selectSession]
  );

  // 세션 업데이트
  const handleUpdateSession = useCallback(
    async (id: string, data: UpdateSessionRequest) => {
      await updateSession(id, data);
    },
    [updateSession]
  );

  // 세션 삭제
  const handleDeleteSession = useCallback(
    async (id: string) => {
      const confirmed = await dialog.confirm(t('translation.confirm.deleteSession'));
      if (confirmed) {
        await deleteSession(id);
      }
    },
    [deleteSession, t]
  );

  // 세션 편집 다이얼로그 열기
  const handleEditSession = useCallback((session: TranslationSession) => {
    setEditingSession(session);
    setSessionDialogOpen(true);
  }, []);

  // 새 세션 다이얼로그 열기
  const handleNewSession = useCallback(() => {
    setEditingSession(null);
    setSessionDialogOpen(true);
  }, []);

  // 세션 다이얼로그 닫기
  const handleCloseSessionDialog = useCallback(() => {
    setSessionDialogOpen(false);
    setEditingSession(null);
  }, []);

  // 실패 청크 모두 재시도
  const handleRetryFailed = useCallback(() => {
    const failedChunks = chunks.filter(c => c.status === 'failed');
    failedChunks.forEach(chunk => retryChunk(chunk.id));
  }, [chunks, retryChunk]);

  // 실패 청크 있는지 확인
  const hasFailedChunks = chunks.some(c => c.status === 'failed');

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* 사이드바 */}
      <SessionSidebar
        sessions={sessions}
        loading={sessionsLoading}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onEditSession={handleEditSession}
      />

      {/* 메인 영역 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 헤더 */}
        <Paper
          elevation={0}
          sx={{
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            borderRadius: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title={t('common.back')}>
              <IconButton onClick={() => navigate('/welcome')}>
                <BackIcon />
              </IconButton>
            </Tooltip>
            <TranslateIcon color='primary' />
            <Box>
              <Typography variant='h6' fontWeight={600}>
                {currentSession?.title || t('translation.title')}
              </Typography>
              {currentSession?.memo && (
                <Typography variant='caption' color='text.secondary'>
                  {currentSession.memo}
                </Typography>
              )}
            </Box>
          </Box>

          {/* 제어 패널 */}
          {currentSession && (
            <ControlPanel
              sessionStatus={currentSession.status}
              isTranslating={isTranslating}
              isPaused={isPaused}
              hasSourceText={Boolean(sourceText.trim())}
              hasFailedChunks={hasFailedChunks}
              onStart={startTranslation}
              onPause={pauseTranslation}
              onResume={resumeTranslation}
              onRetryFailed={handleRetryFailed}
              onOpenSettings={() => setConfigDialogOpen(true)}
            />
          )}
        </Paper>

        {/* 콘텐츠 영역 */}
        {!currentSession ? (
          // 세션 선택 안됨
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <TranslateIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            <Typography color='text.secondary'>{t('translation.selectOrCreateSession')}</Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2, gap: 2 }}>
            {/* 에디터 */}
            <TranslationEditor
              sourceText={sourceText}
              onSourceTextChange={setSourceText}
              chunks={chunks}
              disabled={isTranslating}
              readonly={currentSession.status === 'completed'}
            />

            {/* 청크 진행 상황 */}
            {chunks.length > 0 && <ChunkProgressPanel chunks={chunks} progress={progress} onRetryChunk={retryChunk} />}
          </Box>
        )}
      </Box>

      {/* 세션 다이얼로그 */}
      <SessionDialog
        open={sessionDialogOpen}
        session={editingSession}
        onClose={handleCloseSessionDialog}
        onCreate={handleCreateSession}
        onUpdate={handleUpdateSession}
      />

      {/* 설정 다이얼로그 */}
      <ConfigDialog open={configDialogOpen} config={config} onClose={() => setConfigDialogOpen(false)} onSave={updateConfig} />
    </Box>
  );
}
