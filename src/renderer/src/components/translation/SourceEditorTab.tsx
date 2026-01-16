import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Typography, Paper, CircularProgress, Tooltip, useTheme, alpha, Chip } from '@mui/material';
import {
  FileUpload as ImportIcon,
  AutoAwesome as ChunkIcon,
  Description as FileIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { EditorView, keymap, placeholder, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { createCodeMirrorTheme } from '../../theme/codemirrorTheme';

// ============================================
// Props
// ============================================

interface SourceEditorTabProps {
  sourceText: string;
  onSourceChange: (text: string) => void;
  onStartChunking: () => void;
  onFileImport: (file: File) => void;
  isChunking: boolean;
  hasChunks: boolean;
  disabled?: boolean;
}

// ============================================
// 소스 에디터 탭
// ============================================

export default function SourceEditorTab({
  sourceText,
  onSourceChange,
  onStartChunking,
  onFileImport,
  isChunking,
  hasChunks,
  disabled = false,
}: SourceEditorTabProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());
  const [isDragOver, setIsDragOver] = useState(false);

  // 에디터 초기화
  useEffect(() => {
    if (!editorRef.current) return;

    const editorTheme = createCodeMirrorTheme(theme);

    const state = EditorState.create({
      doc: sourceText,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        drawSelection(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        placeholder(t('translation.editorPlaceholder')),
        themeCompartment.current.of(editorTheme),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onSourceChange(update.state.doc.toString());
          }
        }),
        EditorView.lineWrapping,
        EditorState.readOnly.of(disabled || isChunking),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // 최초 마운트 시에만 실행

  // 테마 변경 시 업데이트
  useEffect(() => {
    if (!viewRef.current) return;

    const editorTheme = createCodeMirrorTheme(theme);

    viewRef.current.dispatch({
      effects: themeCompartment.current.reconfigure(editorTheme),
    });
  }, [theme]);

  // sourceText 외부 변경 시 에디터 업데이트
  useEffect(() => {
    if (!viewRef.current) return;
    const currentText = viewRef.current.state.doc.toString();
    if (currentText !== sourceText) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentText.length,
          insert: sourceText,
        },
      });
    }
  }, [sourceText]);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.name.endsWith('.txt')) {
        onFileImport(file);
      }
      e.target.value = '';
    },
    [onFileImport]
  );

  // 드래그 앤 드롭 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled || isChunking) return;

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.txt')) {
        onFileImport(file);
      }
    },
    [disabled, isChunking, onFileImport]
  );

  // 텍스트 지우기
  const handleClear = useCallback(() => {
    onSourceChange('');
  }, [onSourceChange]);

  // 통계 계산
  const charCount = sourceText.length;
  const lineCount = sourceText ? sourceText.split('\n').length : 0;

  const canStartChunking = charCount > 0 && !isChunking && !disabled;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
      {/* 툴바 */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: theme.custom.glassmorphism.light,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 파일 가져오기 버튼 */}
          <Button
            component='label'
            variant='outlined'
            startIcon={<ImportIcon />}
            disabled={disabled || isChunking}
            size='small'
          >
            {t('translation.importFile')}
            <input type='file' accept='.txt' hidden onChange={handleFileSelect} />
          </Button>

          {/* 텍스트 지우기 */}
          {charCount > 0 && (
            <Tooltip title={t('translation.clearText')}>
              <Button
                variant='text'
                color='inherit'
                onClick={handleClear}
                disabled={disabled || isChunking}
                size='small'
                sx={{ minWidth: 'auto', px: 1 }}
              >
                <ClearIcon fontSize='small' />
              </Button>
            </Tooltip>
          )}

          {/* 통계 */}
          <Box sx={{ display: 'flex', gap: 1, ml: 1 }}>
            <Chip
              size='small'
              icon={<FileIcon sx={{ fontSize: 14 }} />}
              label={t('translation.charCount', { count: charCount })}
              variant='outlined'
            />
            <Chip size='small' label={t('translation.lineCount', { count: lineCount })} variant='outlined' />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 청킹 상태 표시 */}
          {hasChunks && (
            <Chip size='small' color='success' label={t('translation.chunked')} sx={{ mr: 1 }} />
          )}

          {/* 청킹 시작 버튼 */}
          <Button
            variant='contained'
            color='primary'
            startIcon={isChunking ? <CircularProgress size={16} color='inherit' /> : <ChunkIcon />}
            onClick={onStartChunking}
            disabled={!canStartChunking}
            size='medium'
          >
            {isChunking ? t('translation.chunking') : t('translation.startChunking')}
          </Button>
        </Box>
      </Paper>

      {/* 에디터 영역 */}
      <Paper
        elevation={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: 2,
          borderStyle: isDragOver ? 'dashed' : 'solid',
          borderColor: isDragOver ? 'primary.main' : 'divider',
          bgcolor: isDragOver ? theme.custom.stateBackground.primary.light : 'transparent',
          transition: 'all 0.2s ease',
          borderRadius: 2,
          '& .cm-editor': {
            height: '100%',
            outline: 'none',
          },
          '& .cm-scroller': {
            fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
          },
        }}
      >
        <Box
          ref={editorRef}
          sx={{
            flex: 1,
            overflow: 'hidden',
            '& .cm-editor': {
              height: '100%',
            },
          }}
        />
      </Paper>

      {/* 드래그 힌트 */}
      {isDragOver && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <Paper
            elevation={4}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              bgcolor: theme.custom.glassmorphism.heavy,
            }}
          >
            <ImportIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant='h6' color='primary'>
              {t('translation.dropFileHere')}
            </Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
