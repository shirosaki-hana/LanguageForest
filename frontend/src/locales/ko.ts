export default {
  translation: {
    // Common
    common: {
      appName: 'TemplateForest',
      loading: '로딩 중...',
      error: '오류',
      success: '성공',
      cancel: '취소',
      save: '저장',
      close: '닫기',
      refresh: '새로고침',
      saving: '저장 중...',
      rowsPerPage: '페이지당 행',
    },

    // Dialog
    dialog: {
      notice: '알림',
      confirm: '확인',
      confirmButton: '확인',
    },

    // Auth
    auth: {
      setup: {
        title: '비밀번호 설정',
        subtitle: '시작하려면 관리자 비밀번호를 설정하세요',
        password: '비밀번호',
        confirmPassword: '비밀번호 확인',
        passwordHelper: '8자 이상, 영문과 숫자 포함',
        submit: '비밀번호 설정',
        submitting: '설정 중...',
        passwordMismatch: '비밀번호가 일치하지 않습니다',
        invalidFormat: '비밀번호 형식이 올바르지 않습니다',
      },
      login: {
        title: '로그인',
        subtitle: '로그인하여 계속하세요',
        password: '비밀번호',
        submit: '로그인',
        submitting: '로그인 중...',
      },
      logout: '로그아웃',
    },

    // Welcome
    welcome: {
      subtitle: '개인 서버 애플리케이션 템플릿',
      description: '인증, 로깅, 테마가 구성된 기본 템플릿입니다. 이 템플릿을 기반으로 원하는 기능을 추가해보세요.',
    },

    // Settings
    settings: {
      title: '설정',
      theme: {
        title: '테마',
        light: '라이트',
        dark: '다크',
        system: '시스템',
      },
      language: {
        title: '언어',
        ko: '한국어',
        en: 'English',
      },
    },

    // Errors
    errors: {
      statusCheckFailed: '상태 확인에 실패했습니다',
      setupFailed: '비밀번호 설정에 실패했습니다',
      loginFailed: '로그인에 실패했습니다',
      logoutFailed: '로그아웃에 실패했습니다',
      network: '네트워크 오류',
      unknown: '알 수 없는 오류가 발생했습니다',
    },

    // Logs
    logs: {
      title: '시스템 로그',
      subtitle: '서버 활동 및 이벤트 기록',
      empty: '로그가 없습니다',
      search: '메시지 검색...',
      level: '레벨',
      category: '카테고리',
      all: '전체',
      time: '시간',
      message: '메시지',
      detail: '로그 상세',
      metadata: '메타데이터',
      settings: '로그 설정',
      retentionDays: '보관 기간 (일)',
      retentionDaysHelp: '지정된 기간이 지난 로그는 자동 정리 시 삭제됩니다',
      maxLogs: '최대 로그 수',
      maxLogsHelp: '최대 개수를 초과하면 가장 오래된 로그부터 삭제됩니다',
      cleanup: '로그 정리',
      deleteAll: '전체 삭제',
      stats: {
        total: '전체 로그',
        errors: '에러',
        warnings: '경고',
        last24h: '24시간',
      },
      categories: {
        api: 'API',
        auth: '인증',
        system: '시스템',
        database: 'DB',
        server: '서버',
      },
      errors: {
        loadFailed: '로그를 불러오는데 실패했습니다',
        settingsSaveFailed: '설정 저장에 실패했습니다',
        cleanupFailed: '로그 정리에 실패했습니다',
        deleteFailed: '로그 삭제에 실패했습니다',
      },
      confirm: {
        cleanup: '설정에 따라 오래된 로그를 정리합니다. 계속하시겠습니까?',
        deleteAll: '모든 로그를 삭제합니다. 이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?',
      },
      cleanupResult: '{{count}}개의 로그가 정리되었습니다.',
    },
  },
};
