import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
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
} from '@mui/icons-material';
import type { TranslationSession, TranslationSessionStatus } from '@languageforest/sharedtype';

// ============================================
// Props
// ============================================

interface SessionSidebarProps {
  sessions: TranslationSession[];
  loading: boolean;
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onEditSession: (session: TranslationSession) => void;
}

// ============================================
// 상태 아이콘 및 색상
// ============================================

type StatusConfigValue = {
  icon: React.ReactNode;
  color: string;
  labelKey:
    | 'translation.status.draft'
    | 'translation.status.ready'
    | 'translation.status.translating'
    | 'translation.status.paused'
    | 'translation.status.completed'
    | 'translation.status.failed';
};

const statusConfig: Record<TranslationSessionStatus, StatusConfigValue> = {
  draft: { icon: <PendingIcon fontSize='small' />, color: 'text.secondary', labelKey: 'translation.status.draft' },
  ready: { icon: <PendingIcon fontSize='small' />, color: 'info.main', labelKey: 'translation.status.ready' },
  translating: { icon: <PlayIcon fontSize='small' />, color: 'primary.main', labelKey: 'translation.status.translating' },
  paused: { icon: <PauseIcon fontSize='small' />, color: 'warning.main', labelKey: 'translation.status.paused' },
  completed: { icon: <CompleteIcon fontSize='small' />, color: 'success.main', labelKey: 'translation.status.completed' },
  failed: { icon: <ErrorIcon fontSize='small' />, color: 'error.main', labelKey: 'translation.status.failed' },
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
// 세션 사이드바
// ============================================

export default function SessionSidebar({
  sessions,
  loading,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onEditSession,
}: SessionSidebarProps) {
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

  return (
    <Paper
      elevation={0}
      sx={{
        width: 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
        borderRadius: 0,
      }}
    >
      {/* 검색 */}
      <Box sx={{ p: 2, pb: 1 }}>
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
                        onSelect={() => onSelectSession(session.id)}
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
                        onSelect={() => onSelectSession(session.id)}
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
    </Paper>
  );
}
