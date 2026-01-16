import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Collapse,
  Menu,
  MenuItem,
  Divider,
  Skeleton,
  Drawer,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Description as DocIcon,
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandLess,
  ExpandMore,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Schedule as PendingIcon,
  Terminal as TerminalIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import type { TranslationSession, TranslationSessionStatus } from '@languageforest/sharedtype';

// ============================================
// Constants
// ============================================

export const SIDEBAR_WIDTH = 280;

// ============================================
// Props
// ============================================

interface SessionSidebarProps {
  sessions: TranslationSession[];
  loading: boolean;
  currentSessionId: string | null;
  open: boolean;
  onToggle: () => void;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onEditSession: (session: TranslationSession) => void;
  // 하단 액션 버튼
  onNavigateLogs: () => void;
  onOpenSettings: () => void;
}

// ============================================
// 상태 아이콘 및 색상
// ============================================

type StatusConfigValue = {
  icon: React.ReactNode;
  color: string;
  labelKey:
    | 'translation.sessionStatus.draft'
    | 'translation.sessionStatus.ready'
    | 'translation.sessionStatus.translating'
    | 'translation.sessionStatus.paused'
    | 'translation.sessionStatus.completed'
    | 'translation.sessionStatus.failed';
};

const statusConfig: Record<TranslationSessionStatus, StatusConfigValue> = {
  draft: { icon: <PendingIcon fontSize='small' />, color: 'text.secondary', labelKey: 'translation.sessionStatus.draft' },
  ready: { icon: <PendingIcon fontSize='small' />, color: 'info.main', labelKey: 'translation.sessionStatus.ready' },
  translating: { icon: <PlayIcon fontSize='small' />, color: 'primary.main', labelKey: 'translation.sessionStatus.translating' },
  paused: { icon: <PauseIcon fontSize='small' />, color: 'warning.main', labelKey: 'translation.sessionStatus.paused' },
  completed: { icon: <CompleteIcon fontSize='small' />, color: 'success.main', labelKey: 'translation.sessionStatus.completed' },
  failed: { icon: <ErrorIcon fontSize='small' />, color: 'error.main', labelKey: 'translation.sessionStatus.failed' },
};

// ============================================
// 세션 목록 아이템
// ============================================

interface SessionListItemProps {
  session: TranslationSession;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function SessionListItem({ session, selected, onSelect, onDelete, onEdit }: SessionListItemProps) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const config = statusConfig[session.status];
  const createdDate = new Date(session.createdAt).toLocaleDateString();

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete();
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit();
  };

  return (
    <>
      <ListItemButton
        selected={selected}
        onClick={onSelect}
        sx={{
          borderRadius: 2,
          mb: 0.5,
          '&.Mui-selected': {
            bgcolor: theme => alpha(theme.palette.primary.main, 0.12),
            '&:hover': {
              bgcolor: theme => alpha(theme.palette.primary.main, 0.18),
            },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 40, color: config.color }}>{config.icon}</ListItemIcon>
        <ListItemText
          primary={
            <Typography variant='body2' fontWeight={selected ? 600 : 400} noWrap>
              {session.title}
            </Typography>
          }
          secondary={
            <Typography variant='caption' color='text.secondary' noWrap>
              {createdDate} · {t(config.labelKey)}
            </Typography>
          }
        />
        <IconButton size='small' onClick={handleMenuOpen}>
          <MoreIcon fontSize='small' />
        </IconButton>
      </ListItemButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize='small' />
          </ListItemIcon>
          {t('common.edit')}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize='small' color='error' />
          </ListItemIcon>
          {t('common.delete')}
        </MenuItem>
      </Menu>
    </>
  );
}

// ============================================
// 사이드바 내용
// ============================================

interface SidebarContentProps {
  sessions: TranslationSession[];
  loading: boolean;
  currentSessionId: string | null;
  isMobile: boolean;
  onToggle: () => void;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onEditSession: (session: TranslationSession) => void;
  onNavigateLogs: () => void;
  onOpenSettings: () => void;
}

function SidebarContent({
  sessions,
  loading,
  currentSessionId,
  isMobile,
  onToggle,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onEditSession,
  onNavigateLogs,
  onOpenSettings,
}: SidebarContentProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    active: true,
    completed: true,
  });

  // 세션 필터링
  const filteredSessions = sessions.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  // 그룹 분류
  const activeStatuses: TranslationSessionStatus[] = ['draft', 'ready', 'translating', 'paused', 'failed'];
  const activeSessions = filteredSessions.filter(s => activeStatuses.includes(s.status));
  const completedSessions = filteredSessions.filter(s => s.status === 'completed');

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // 세션 선택 시 모바일에서 사이드바 닫기
  const handleSelectSession = (id: string) => {
    onSelectSession(id);
    if (isMobile) {
      onToggle();
    }
  };

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {/* 헤더 */}
      <Box
        sx={{
          p: 2,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant='h6' fontWeight={600}>
          {t('translation.title')}
        </Typography>
        <IconButton onClick={onToggle} size='small'>
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      {/* 검색 */}
      <Box sx={{ px: 2, pb: 1 }}>
        <TextField
          fullWidth
          size='small'
          placeholder={t('translation.searchSessions')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <SearchIcon fontSize='small' color='action' />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* 새 세션 버튼 */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Button fullWidth variant='contained' startIcon={<AddIcon />} onClick={onCreateSession}>
          {t('translation.newSession')}
        </Button>
      </Box>

      <Divider />

      {/* 세션 목록 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {loading ? (
          // 로딩 스켈레톤
          [...Array(5)].map((_, i) => <Skeleton key={i} variant='rounded' height={56} sx={{ mb: 0.5, borderRadius: 2 }} />)
        ) : filteredSessions.length === 0 ? (
          // 빈 상태
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <DocIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color='text.secondary' variant='body2'>
              {search ? t('translation.noSearchResults') : t('translation.noSessions')}
            </Typography>
          </Box>
        ) : (
          <>
            {/* 진행 중 그룹 */}
            {activeSessions.length > 0 && (
              <>
                <ListItemButton onClick={() => toggleGroup('active')} sx={{ borderRadius: 2 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant='subtitle2' fontWeight={600}>
                          {t('translation.activeSessions')}
                        </Typography>
                        <Chip label={activeSessions.length} size='small' />
                      </Box>
                    }
                  />
                  {expandedGroups.active ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={expandedGroups.active}>
                  <List dense disablePadding>
                    {activeSessions.map(session => (
                      <SessionListItem
                        key={session.id}
                        session={session}
                        selected={session.id === currentSessionId}
                        onSelect={() => handleSelectSession(session.id)}
                        onDelete={() => onDeleteSession(session.id)}
                        onEdit={() => onEditSession(session)}
                      />
                    ))}
                  </List>
                </Collapse>
              </>
            )}

            {/* 완료됨 그룹 */}
            {completedSessions.length > 0 && (
              <>
                <ListItemButton onClick={() => toggleGroup('completed')} sx={{ borderRadius: 2, mt: 1 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant='subtitle2' fontWeight={600}>
                          {t('translation.completedSessions')}
                        </Typography>
                        <Chip label={completedSessions.length} size='small' color='success' />
                      </Box>
                    }
                  />
                  {expandedGroups.completed ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={expandedGroups.completed}>
                  <List dense disablePadding>
                    {completedSessions.map(session => (
                      <SessionListItem
                        key={session.id}
                        session={session}
                        selected={session.id === currentSessionId}
                        onSelect={() => handleSelectSession(session.id)}
                        onDelete={() => onDeleteSession(session.id)}
                        onEdit={() => onEditSession(session)}
                      />
                    ))}
                  </List>
                </Collapse>
              </>
            )}
          </>
        )}
      </Box>

      {/* 하단 액션 버튼 */}
      <Divider />
      <Box sx={{ p: 1 }}>
        <List dense disablePadding>
          <ListItemButton onClick={onNavigateLogs} sx={{ borderRadius: 2, py: 1 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <TerminalIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText primary={<Typography variant='body2'>{t('logs.title')}</Typography>} />
          </ListItemButton>
          <ListItemButton onClick={onOpenSettings} sx={{ borderRadius: 2, py: 1 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SettingsIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText primary={<Typography variant='body2'>{t('settings.title')}</Typography>} />
          </ListItemButton>
        </List>
      </Box>
    </Box>
  );
}

// ============================================
// 세션 사이드바
// ============================================

export default function SessionSidebar({
  sessions,
  loading,
  currentSessionId,
  open,
  onToggle,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onEditSession,
  onNavigateLogs,
  onOpenSettings,
}: SessionSidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const sidebarContent = (
    <SidebarContent
      sessions={sessions}
      loading={loading}
      currentSessionId={currentSessionId}
      isMobile={isMobile}
      onToggle={onToggle}
      onSelectSession={onSelectSession}
      onCreateSession={onCreateSession}
      onDeleteSession={onDeleteSession}
      onEditSession={onEditSession}
      onNavigateLogs={onNavigateLogs}
      onOpenSettings={onOpenSettings}
    />
  );

  // 모바일: Temporary Drawer (오버레이)
  if (isMobile) {
    return (
      <Drawer
        variant='temporary'
        open={open}
        onClose={onToggle}
        ModalProps={{
          keepMounted: true, // 모바일 성능 향상
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  // 데스크톱: Persistent Drawer
  return (
    <Drawer
      variant='persistent'
      anchor='left'
      open={open}
      sx={{
        width: open ? SIDEBAR_WIDTH : 0,
        flexShrink: 0,
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          position: 'relative',
          borderRight: 1,
          borderColor: 'divider',
        },
      }}
    >
      {sidebarContent}
    </Drawer>
  );
}
