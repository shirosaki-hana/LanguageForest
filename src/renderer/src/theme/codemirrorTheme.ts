import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { Theme, alpha } from '@mui/material/styles';

// ============================================
// CodeMirror 테마 옵션
// ============================================

export interface CodeMirrorThemeOptions {
  /** 읽기 전용 모드 (커서 숨김) */
  readOnly?: boolean;
}

// ============================================
// 불투명 색상으로 변환 (rgba를 실제 색상으로)
// ============================================

function getOpaqueColor(mode: 'light' | 'dark'): {
  editorBg: string;
  gutterBg: string;
} {
  if (mode === 'light') {
    return {
      editorBg: '#fafcfa', // 라이트 모드 에디터 배경
      gutterBg: '#f0f4f0', // 라이트 모드 거터 배경
    };
  } else {
    return {
      editorBg: '#0a1f14', // 다크 모드 에디터 배경 (forest green 계열)
      gutterBg: '#071a10', // 다크 모드 거터 배경
    };
  }
}

// ============================================
// MUI 테마 기반 라이트 테마 생성
// ============================================

function createLightTheme(theme: Theme, options: CodeMirrorThemeOptions = {}) {
  const { readOnly = false } = options;
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const textPrimary = theme.palette.text.primary;
  const textSecondary = theme.palette.text.secondary;
  const colors = getOpaqueColor('light');

  return EditorView.theme(
    {
      '&': {
        color: textPrimary,
        backgroundColor: colors.editorBg,
      },
      '.cm-content': {
        caretColor: primary,
        fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        padding: '16px 0',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: primary,
        borderLeftWidth: '2px',
        display: readOnly ? 'none' : 'block',
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: primary,
      },
      '.cm-selectionBackground, ::selection': {
        backgroundColor: alpha(primary, 0.2) + ' !important',
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: alpha(primary, 0.25) + ' !important',
      },
      '.cm-activeLine': {
        backgroundColor: readOnly ? 'transparent' : alpha(primary, 0.06),
      },
      '.cm-gutters': {
        backgroundColor: colors.gutterBg,
        color: textSecondary,
        border: 'none',
        borderRight: `1px solid ${theme.palette.divider}`,
      },
      '.cm-activeLineGutter': {
        backgroundColor: readOnly ? 'transparent' : alpha(primary, 0.1),
        color: readOnly ? textSecondary : primary,
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 12px',
        minWidth: '48px',
        fontFamily: '"Consolas", monospace',
        fontSize: '12px',
      },
      '.cm-scroller': {
        overflow: 'auto',
      },
      '.cm-placeholder': {
        color: textSecondary,
        fontStyle: 'italic',
      },
      '.cm-selectionMatch': {
        backgroundColor: alpha(secondary, 0.2),
      },
      '.cm-searchMatch': {
        backgroundColor: alpha(secondary, 0.3),
        borderRadius: '2px',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: alpha(primary, 0.4),
      },
    },
    { dark: false }
  );
}

// ============================================
// MUI 테마 기반 다크 테마 생성
// ============================================

function createDarkTheme(theme: Theme, options: CodeMirrorThemeOptions = {}) {
  const { readOnly = false } = options;
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const textPrimary = theme.palette.text.primary;
  const textSecondary = theme.palette.text.secondary;
  const colors = getOpaqueColor('dark');

  return EditorView.theme(
    {
      '&': {
        color: textPrimary,
        backgroundColor: colors.editorBg,
      },
      '.cm-content': {
        caretColor: primary,
        fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        padding: '16px 0',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: primary,
        borderLeftWidth: '2px',
        display: readOnly ? 'none' : 'block',
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: primary,
      },
      '.cm-selectionBackground, ::selection': {
        backgroundColor: alpha(primary, 0.3) + ' !important',
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: alpha(primary, 0.35) + ' !important',
      },
      '.cm-activeLine': {
        backgroundColor: readOnly ? 'transparent' : alpha(primary, 0.1),
      },
      '.cm-gutters': {
        backgroundColor: colors.gutterBg,
        color: textSecondary,
        border: 'none',
        borderRight: `1px solid ${theme.palette.divider}`,
      },
      '.cm-activeLineGutter': {
        backgroundColor: readOnly ? 'transparent' : alpha(primary, 0.15),
        color: readOnly ? textSecondary : primary,
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 12px',
        minWidth: '48px',
        fontFamily: '"Consolas", monospace',
        fontSize: '12px',
      },
      '.cm-scroller': {
        overflow: 'auto',
      },
      '.cm-placeholder': {
        color: textSecondary,
        fontStyle: 'italic',
      },
      '.cm-selectionMatch': {
        backgroundColor: alpha(secondary, 0.25),
      },
      '.cm-searchMatch': {
        backgroundColor: alpha(secondary, 0.35),
        borderRadius: '2px',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: alpha(primary, 0.5),
      },
    },
    { dark: true }
  );
}

// ============================================
// CodeMirror 테마 확장 생성 (메인 함수)
// ============================================

/**
 * MUI 테마를 기반으로 CodeMirror 테마 확장을 생성합니다.
 *
 * @param theme - MUI Theme 객체
 * @param options - 테마 옵션 (readOnly 등)
 * @returns CodeMirror Extension (단일)
 *
 * @example
 * ```tsx
 * const theme = useTheme();
 * const editorTheme = createCodeMirrorTheme(theme, { readOnly: true });
 * ```
 */
export function createCodeMirrorTheme(
  theme: Theme,
  options: CodeMirrorThemeOptions = {}
): Extension {
  const isDark = theme.palette.mode === 'dark';

  if (isDark) {
    return createDarkTheme(theme, options);
  } else {
    return createLightTheme(theme, options);
  }
}
