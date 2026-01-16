import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '@mui/material';
import { useLogsStore } from '../stores/logsStore';
import { dialog } from '../stores/dialogStore';
import { LogsHeader, LogsStats, LogsFilter, LogsTable, LogDetailDialog, LogSettingsDialog } from '../components/logs';

export default function LogsPage() {
  const { t } = useTranslation();

  // Zustand store에서 상태와 액션 가져오기
  const {
    logs,
    total,
    loading,
    search,
    levelFilter,
    categoryFilter,
    page,
    rowsPerPage,
    stats,
    settings,
    settingsOpen,
    savingSettings,
    selectedLog,
    loadLogs,
    loadStats,
    loadSettings,
    saveSettings,
    cleanup,
    deleteAll,
    setSearch,
    setLevelFilter,
    setCategoryFilter,
    setPage,
    setRowsPerPage,
    setSettings,
    setSettingsOpen,
    setSelectedLog,
  } = useLogsStore();

  // 초기 로드
  useEffect(() => {
    loadLogs();
    loadStats();
    loadSettings();
  }, [loadLogs, loadStats, loadSettings]);

  // 필터 변경 시 로그 재로드
  useEffect(() => {
    loadLogs();
  }, [search, levelFilter, categoryFilter, page, rowsPerPage, loadLogs]);

  // 새로고침 핸들러
  const handleRefresh = () => {
    loadLogs();
    loadStats();
  };

  // 로그 정리 핸들러
  const handleCleanup = async () => {
    const confirmed = await dialog.confirm(t('logs.confirm.cleanup'));
    if (!confirmed) return;

    try {
      const result = await cleanup();
      await dialog.alert(t('logs.cleanupResult', { count: result.deletedCount }));
    } catch {
      // 에러는 store에서 처리됨
    }
  };

  // 전체 삭제 핸들러
  const handleDeleteAll = async () => {
    const confirmed = await dialog.confirm(t('logs.confirm.deleteAll'));
    if (!confirmed) return;

    try {
      await deleteAll();
    } catch {
      // 에러는 store에서 처리됨
    }
  };

  // 설정 저장 핸들러
  const handleSaveSettings = async () => {
    try {
      await saveSettings();
    } catch {
      // 에러는 store에서 처리됨
    }
  };

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* 헤더 */}
      <LogsHeader onRefresh={handleRefresh} onCleanup={handleCleanup} onSettingsOpen={() => setSettingsOpen(true)} />

      {/* 통계 카드 */}
      {stats && <LogsStats stats={stats} />}

      {/* 필터 */}
      <LogsFilter
        search={search}
        levelFilter={levelFilter}
        categoryFilter={categoryFilter}
        onSearchChange={setSearch}
        onLevelFilterChange={setLevelFilter}
        onCategoryFilterChange={setCategoryFilter}
        onDeleteAll={handleDeleteAll}
      />

      {/* 로그 테이블 */}
      <LogsTable
        logs={logs}
        loading={loading}
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onLogSelect={setSelectedLog}
      />

      {/* 로그 상세 다이얼로그 */}
      <LogDetailDialog log={selectedLog} onClose={() => setSelectedLog(null)} />

      {/* 설정 다이얼로그 */}
      <LogSettingsDialog
        open={settingsOpen}
        settings={settings}
        saving={savingSettings}
        onClose={() => setSettingsOpen(false)}
        onSettingsChange={setSettings}
        onSave={handleSaveSettings}
      />
    </Container>
  );
}
