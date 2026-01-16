import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Paper, IconButton, useMediaQuery, useTheme, Tabs, Tab } from '@mui/material';
import {
  Translate as TranslateIcon,
  Menu as MenuIcon,
  Edit as SourceIcon,
  ViewList as ChunksIcon,
  CheckCircle as ResultIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslationStore } from '../stores/translationStore';
import { useSettingsStore, type TranslationSettingsProps } from '../stores/settingsStore';
import { dialog } from '../stores/dialogStore';
import { SessionSidebar, SessionDialog, SourceEditorTab, ChunksTab, ResultTab } from '../components/translation';
import type { TranslationSession, CreateSessionRequest, UpdateSessionRequest, TranslationChunkStatus } from '@shared/types';
import * as api from '../api/translation';
import { snackbar } from '../stores/snackbarStore';

// ============================================
// 탭 타입
// ============================================

type TabValue = 'source' | 'chunks' | 'result';

// ============================================
// 번역 페이지
// ============================================

export default function TranslationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { openSettings } = useSettingsStore();

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
    models,
    modelsLoading,
    templates,
    selectedTemplateId,
    loadSessions,
    createSession,
    selectSession,
    updateSession,
    deleteSession,
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
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [prevIsMobile, setPrevIsMobile] = useState(isMobile);

  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabValue>('source');

  // 소스 텍스트 상태 (에디터용)
  const [sourceText, setSourceText] = useState('');
  const [isChunking, setIsChunking] = useState(false);

  // 청크 필터 상태 (클라이언트 사이드)
  const [chunkFilter, setChunkFilter] = useState<TranslationChunkStatus | null>(null);

  // 화면 크기 변경 시 사이드바 상태 조정
  if (isMobile !== prevIsMobile) {
    setPrevIsMobile(isMobile);
    setSidebarOpen(!isMobile);
  }

  // 초기 로드
  useEffect(() => {
    loadSessions();
    loadConfig();
    loadModels();
    loadTemplates();
    connectWs();

    return () => {
      disconnectWs();
    };
  }, [loadSessions, loadConfig, loadModels, loadTemplates, connectWs, disconnectWs]);

  // 세션 변경 시 상태 초기화
  useEffect(() => {
    if (currentSession) {
      // sourceText 초기화
      setSourceText(currentSession.sourceText || '');
      // 필터 초기화
      setChunkFilter(null);

      // 탭 자동 전환: 청크가 있으면 청크 탭으로, 없으면 소스 탭으로
      if (currentSession.totalChunks > 0) {
        setActiveTab('chunks');
      } else {
        setActiveTab('source');
      }
    } else {
      setSourceText('');
      setChunkFilter(null);
      setActiveTab('source');
    }
  }, [currentSession?.id]);

  // 번역 완료 시 결과 탭으로 자동 전환
  useEffect(() => {
    if (currentSession?.status === 'completed') {
      setActiveTab('result');
    }
  }, [currentSession?.status]);

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

  // 파일 Import (에디터에 텍스트 로드)
  const handleFileImport = useCallback(async (file: File) => {
    try {
      const content = await file.text();
      setSourceText(content);
      snackbar.success('translation.fileImported', true);
    } catch {
      snackbar.error('translation.errors.fileReadFailed', true);
    }
  }, []);

  // 청킹 시작
  const handleStartChunking = useCallback(async () => {
    if (!currentSessionId || !sourceText.trim()) return;

    setIsChunking(true);
    try {
      // API 호출: 소스 텍스트로 청킹 시작
      await api.startTranslation(currentSessionId, sourceText);

      // 세션과 청크 다시 로드
      await selectSession(currentSessionId);
      // 명시적으로 청크 로드 (세션의 totalChunks가 업데이트 되지 않았을 수 있음)
      await loadChunks();

      // 청크 탭으로 전환
      setActiveTab('chunks');

      snackbar.success('translation.chunkingComplete', true);
    } catch {
      snackbar.error('translation.errors.chunkingFailed', true);
    } finally {
      setIsChunking(false);
    }
  }, [currentSessionId, sourceText, selectSession, loadChunks]);

  // 청크 필터 변경 (클라이언트 사이드)
  const handleFilterChange = useCallback((status: TranslationChunkStatus | null) => {
    setChunkFilter(status);
  }, []);

  // 실패 청크 모두 재시도
  const handleRetryFailed = useCallback(() => {
    const failedChunks = chunks.filter(c => c.status === 'failed');
    failedChunks.forEach(chunk => retryChunk(chunk.id));
  }, [chunks, retryChunk]);

  // 설정 열기
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

  // 탭 변경
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
  }, []);

  // 소스 탭으로 돌아가기
  const handleBackToSource = useCallback(() => {
    setActiveTab('source');
  }, []);

  // 파생 상태
  const hasChunks = chunks.length > 0 || (currentSession?.totalChunks ?? 0) > 0;
  const hasCompletedChunks = chunks.some(c => c.status === 'completed');
  const hasFailedChunks = chunks.some(c => c.status === 'failed');

  // 필터링된 청크 (클라이언트 사이드)
  const filteredChunks = useMemo(() => {
    if (!chunkFilter) return chunks;
    return chunks.filter(c => c.status === chunkFilter);
  }, [chunks, chunkFilter]);

  // 번역된 텍스트 (청크에서 직접 계산)
  const translatedText = useMemo(() => {
    return chunks
      .filter(c => c.status === 'completed' && c.translatedText)
      .sort((a, b) => a.order - b.order)
      .map(c => c.translatedText)
      .join('\n\n');
  }, [chunks]);

  // 탭 활성화 상태
  const isSourceTabEnabled = Boolean(currentSession);
  const isChunksTabEnabled = hasChunks;
  const isResultTabEnabled = hasChunks;

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
      />

      {/* 메인 영역 */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
            px: 1.5,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            borderRadius: 0,
            minHeight: 48,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* 사이드바 토글 버튼 */}
            {(!sidebarOpen || isMobile) && (
              <IconButton onClick={handleToggleSidebar} edge='start' sx={{ mr: 1 }}>
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

          {/* 설정 버튼 */}
          <IconButton onClick={() => handleOpenSettings(1)} color='inherit'>
            <SettingsIcon />
          </IconButton>
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
            {/* 탭 헤더 */}
            <Box
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: theme.custom.glassmorphism.light,
              }}
            >
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant='standard'
                sx={{
                  minHeight: 48,
                  '& .MuiTab-root': {
                    minHeight: 48,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                  },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                  },
                }}
              >
                <Tab
                  value='source'
                  label={t('translation.tabs.source')}
                  icon={<SourceIcon sx={{ fontSize: 20 }} />}
                  iconPosition='start'
                  disabled={!isSourceTabEnabled}
                />
                <Tab
                  value='chunks'
                  label={t('translation.tabs.chunks')}
                  icon={<ChunksIcon sx={{ fontSize: 20 }} />}
                  iconPosition='start'
                  disabled={!isChunksTabEnabled}
                  sx={{
                    '&.Mui-disabled': {
                      opacity: 0.5,
                    },
                  }}
                />
                <Tab
                  value='result'
                  label={t('translation.tabs.result')}
                  icon={<ResultIcon sx={{ fontSize: 20 }} />}
                  iconPosition='start'
                  disabled={!isResultTabEnabled}
                  sx={{
                    '&.Mui-disabled': {
                      opacity: 0.5,
                    },
                  }}
                />
              </Tabs>
            </Box>

            {/* 탭 콘텐츠 */}
            <Box
              sx={{
                flex: 1,
                overflow: 'hidden',
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              {/* 소스 탭 */}
              {activeTab === 'source' && (
                <SourceEditorTab
                  sourceText={sourceText}
                  onSourceChange={setSourceText}
                  onStartChunking={handleStartChunking}
                  onFileImport={handleFileImport}
                  isChunking={isChunking}
                  hasChunks={hasChunks}
                  disabled={isTranslating}
                />
              )}

              {/* 청크 탭 */}
              {activeTab === 'chunks' && (
                <ChunksTab
                  chunks={filteredChunks}
                  totalChunks={chunks.length}
                  progress={progress}
                  filter={chunkFilter}
                  templates={templates}
                  selectedTemplateId={selectedTemplateId}
                  onSelectTemplate={selectTemplate}
                  isTranslating={isTranslating}
                  isPaused={isPaused}
                  hasFailedChunks={hasFailedChunks}
                  onFilterChange={handleFilterChange}
                  onRetryChunk={retryChunk}
                  onTranslateChunk={translateSingleChunk}
                  onStart={startTranslation}
                  onPause={pauseTranslation}
                  onResume={resumeTranslation}
                  onRetryFailed={handleRetryFailed}
                  onBackToSource={handleBackToSource}
                />
              )}

              {/* 결과 탭 */}
              {activeTab === 'result' && (
                <ResultTab
                  sessionStatus={currentSession.status}
                  progress={progress}
                  isTranslating={isTranslating}
                  hasCompletedChunks={hasCompletedChunks}
                  hasFailedChunks={hasFailedChunks}
                  translatedText={translatedText}
                  onDownload={downloadTranslation}
                  onRetryFailed={handleRetryFailed}
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
