import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Paper, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { Translate as TranslateIcon, Menu as MenuIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslationStore } from '../stores/translationStore';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore, type TranslationSettingsProps } from '../stores/settingsStore';
import { dialog } from '../stores/dialogStore';
import {
  SessionSidebar,
  FileUploadZone,
  ChunkListView,
  ControlPanel,
  SessionDialog,
} from '../components/translation';
import type { TranslationSession, CreateSessionRequest, UpdateSessionRequest } from '@languageforest/sharedtype';

// ============================================
// 번역 페이지
// ============================================

export default function TranslationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { logout } = useAuthStore();
  const { openSettings } = useSettingsStore();

  // Store 상태
  const {
    sessions,
    sessionsLoading,
    currentSessionId,
    currentSession,
    chunks,
    chunkPagination,
    chunkFilter,
    progress,
    isTranslating,
    isPaused,
    isUploading,
    config,
    models,
    modelsLoading,
    templates,
    selectedTemplateId,
    loadSessions,
    createSession,
    selectSession,
    updateSession,
    deleteSession,
    uploadFile,
    downloadTranslation,
    loadChunks,
    translateSingleChunk,
    retryChunk,
    startTranslation,
    pauseTranslation,
    resumeTranslation,
    loadConfig,
    updateConfig,
    loadModels,
    loadTemplates,
    selectTemplate,
    connectWs,
    disconnectWs,
  } = useTranslationStore();

  // 로컬 상태
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TranslationSession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile); // 데스크톱에서는 기본 열림

  // 화면 크기 변경 시 사이드바 상태 조정
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // 초기 로드
  useEffect(() => {
    loadSessions();
    loadConfig();
    loadTemplates();
    connectWs();

    return () => {
      disconnectWs();
    };
  }, [loadSessions, loadConfig, loadTemplates, connectWs, disconnectWs]);

  // 사이드바 토글
  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

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

  // 파일 업로드
  const handleUploadFile = useCallback(
    async (file: File) => {
      await uploadFile(file);
    },
    [uploadFile]
  );

  // 청크 페이지 변경
  const handlePageChange = useCallback(
    (page: number) => {
      loadChunks({ page });
    },
    [loadChunks]
  );

  // 청크 필터 변경
  const handleFilterChange = useCallback(
    (status: import('@languageforest/sharedtype').TranslationChunkStatus | null) => {
      loadChunks({ page: 1, status });
    },
    [loadChunks]
  );

  // 실패 청크 모두 재시도
  const handleRetryFailed = useCallback(() => {
    const failedChunks = chunks.filter(c => c.status === 'failed');
    failedChunks.forEach(chunk => retryChunk(chunk.id));
  }, [chunks, retryChunk]);

  // 설정 열기 (번역 설정 탭으로)
  const handleOpenSettings = useCallback(
    (tab: number = 0) => {
      const translationProps: TranslationSettingsProps = {
        config,
        models,
        modelsLoading,
        onSave: updateConfig,
        onLoadModels: loadModels,
      };
      openSettings(tab, translationProps);
    },
    [config, models, modelsLoading, updateConfig, loadModels, openSettings]
  );

  // 파생 상태
  // 파일이 있는지 확인: originalFileName이 있거나, sourceText가 있거나, 청크가 있는 경우
  const hasFile = currentSession?.status !== 'draft' && 
    Boolean(currentSession?.originalFileName || currentSession?.sourceText || (currentSession?.totalChunks ?? 0) > 0);
  const hasCompletedChunks = chunks.some(c => c.status === 'completed');
  const hasFailedChunks = chunks.some(c => c.status === 'failed');

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* 사이드바 */}
      <SessionSidebar
        sessions={sessions}
        loading={sessionsLoading}
        currentSessionId={currentSessionId}
        open={sidebarOpen}
        onToggle={handleToggleSidebar}
        onSelectSession={handleSelectSession}
        onCreateSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onEditSession={handleEditSession}
        onNavigateLogs={() => navigate('/logs')}
        onOpenSettings={() => handleOpenSettings(0)}
        onLogout={logout}
      />

      {/* 메인 영역 */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          // 데스크톱에서 사이드바 열릴 때 마진 조정
          ml: !isMobile && sidebarOpen ? 0 : 0,
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* 헤더 */}
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            borderRadius: 0,
            minHeight: 56,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* 사이드바 토글 버튼 */}
            {(!sidebarOpen || isMobile) && (
              <IconButton
                onClick={handleToggleSidebar}
                edge='start'
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <TranslateIcon color='primary' />
            <Box>
              <Typography variant='h6' fontWeight={600} noWrap>
                {currentSession?.title || t('translation.title')}
              </Typography>
              {currentSession?.memo && (
                <Typography variant='caption' color='text.secondary' noWrap>
                  {currentSession.memo}
                </Typography>
              )}
            </Box>
          </Box>
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
              p: 3,
            }}
          >
            <TranslateIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            <Typography color='text.secondary' textAlign='center'>
              {t('translation.selectOrCreateSession')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* 제어 패널 */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <ControlPanel
                sessionStatus={currentSession.status}
                isTranslating={isTranslating}
                isPaused={isPaused}
                hasFile={hasFile}
                hasCompletedChunks={hasCompletedChunks}
                hasFailedChunks={hasFailedChunks}
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                onSelectTemplate={selectTemplate}
                onStart={startTranslation}
                onPause={pauseTranslation}
                onResume={resumeTranslation}
                onRetryFailed={handleRetryFailed}
                onDownload={downloadTranslation}
                onOpenSettings={() => handleOpenSettings(1)}
              />
            </Box>

            {/* 메인 콘텐츠 */}
            <Box sx={{ flex: 1, overflow: 'hidden', p: 2, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
              {/* 파일 업로드 영역 */}
              <FileUploadZone
                session={currentSession}
                isUploading={isUploading}
                onUpload={handleUploadFile}
                disabled={isTranslating}
              />

              {/* 청크 리스트 */}
              {hasFile && (
                <ChunkListView
                  chunks={chunks}
                  pagination={chunkPagination}
                  progress={progress}
                  filter={chunkFilter}
                  isTranslating={isTranslating}
                  onPageChange={handlePageChange}
                  onFilterChange={handleFilterChange}
                  onRetryChunk={retryChunk}
                  onTranslateChunk={translateSingleChunk}
                />
              )}
            </Box>
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
    </Box>
  );
}
