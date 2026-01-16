export default {
  translation: {
    // Common
    common: {
      appName: 'LanguageForest',
      loading: '로딩 중...',
      error: '오류',
      success: '성공',
      cancel: '취소',
      save: '저장',
      close: '닫기',
      refresh: '새로고침',
      saving: '저장 중...',
      rowsPerPage: '페이지당 행',
      back: '뒤로',
      edit: '수정',
      delete: '삭제',
      create: '생성',
      copy: '복사',
      copied: '복사되었습니다',
    },

    // Dialog
    dialog: {
      notice: '알림',
      confirm: '확인',
      confirmButton: '확인',
    },

    // Welcome
    welcome: {
      subtitle: '개인 서버 애플리케이션 템플릿',
      description: '인증, 로깅, 테마가 구성된 기본 템플릿입니다. 이 템플릿을 기반으로 원하는 기능을 추가해보세요.',
    },

    // Settings
    settings: {
      title: '설정',
      tabs: {
        app: '앱',
        translation: '번역',
      },
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
      translationNotAvailable: '번역 설정을 사용할 수 없습니다',
    },

    // Errors
    errors: {
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
        external_api: '외부 API',
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

    // Translation
    translation: {
      title: '번역',
      searchSessions: '세션 검색...',
      newSession: '새 번역 세션',
      activeSessions: '진행 중',
      completedSessions: '완료됨',
      noSessions: '세션이 없습니다',
      noSearchResults: '검색 결과가 없습니다',
      selectOrCreateSession: '세션을 선택하거나 새로 생성하세요',

      // Session
      sessionTitle: '세션 제목',
      sessionMemo: '메모',
      sessionMemoPlaceholder: '번역 스타일, 주의사항 등을 메모하세요...',
      editSession: '세션 수정',
      sessionCreated: '세션이 생성되었습니다',
      sessionDeleted: '세션이 삭제되었습니다',

      // Custom Dict
      customDict: '사용자 사전',
      customDictHelp: '원문=번역문 형식으로 한 줄에 하나씩 입력하세요',
      customDictPlaceholder: 'Harry Potter=해리 포터\nHogwarts=호그와트',

      // Editor
      sourceText: '원문',
      translatedText: '번역문',
      sourceTextPlaceholder: '번역할 텍스트를 입력하세요...',
      translatedTextPlaceholder: '번역 결과가 여기에 표시됩니다',
      charCount: '{{count}}자',
      wordCount: '{{count}}단어',

      // File Upload
      dropFileHere: '파일을 여기에 놓으세요',
      dropFileDescription: '.txt 파일을 드래그하거나 클릭하여 업로드하세요',
      selectFile: '파일 선택',
      supportedFormats: '지원 형식: .txt (UTF-8)',
      uploading: '업로드 중...',
      fileUploaded: '파일이 업로드되었습니다',
      replaceFile: '파일 교체',
      totalChunks: '전체 {{count}}개 청크',

      // Progress
      chunkProgress: '청크 진행 상황',
      chunkList: '청크 목록',
      chunks: '청크',
      completed: '완료',
      failed: '실패',
      pending: '대기',
      complete: '완료',
      clickToRetry: '클릭하여 재시도',
      estimatedRemaining: '예상 남은 시간',
      estimatedSeconds: '약 {{count}}초',
      estimatedMinutes: '약 {{count}}분',
      noChunks: '청크가 없습니다',
      notTranslatedYet: '아직 번역되지 않았습니다',
      retryCount: '재시도 {{count}}회',
      error: '오류',

      // Chunk status
      status: '상태',
      chunkStatus: {
        pending: '대기',
        processing: '처리 중',
        completed: '완료',
        failed: '실패',
      },

      // Filter
      filter: '필터',
      all: '전체',
      time: '시간',
      actions: '작업',
      retryChunk: '청크 재시도',
      translateChunk: '청크 번역',
      retranslateChunk: '재번역',

      // Controls
      startTranslation: '번역 시작',
      pause: '일시정지',
      resume: '재개',
      retryFailed: '실패 청크 재시도',
      translating: '번역 중...',
      settings: '설정',
      template: '프롬프트 템플릿',
      download: '다운로드',
      downloadStarted: '다운로드가 시작되었습니다',

      // Config
      model: 'AI 모델',
      chunkSize: '청크 크기',
      characters: '자',
      chunkSizeHelp: '청크가 클수록 문맥을 더 잘 이해하지만, 오류 발생 시 재시도 비용이 커집니다',
      configUpdated: '설정이 저장되었습니다',
      advancedSettings: '고급 설정',
      temperature: '온도 (Temperature)',
      temperatureHelp: '높을수록 창의적이고 다양한 출력, 낮을수록 일관되고 예측 가능한 출력이 됩니다',
      maxOutputTokens: '최대 출력 토큰',
      maxOutputTokensHelp: '생성할 수 있는 최대 토큰 수입니다. 비워두면 모델 기본값을 사용합니다',
      topPHelp: '누적 확률 기반 샘플링. 낮을수록 다양성이 줄어듭니다',
      topKHelp: '상위 K개 토큰에서만 샘플링. 비워두면 비활성화됩니다',
      default: '기본값',
      enable: '활성화',
      useDefault: '기본값 사용',

      // Session Status
      sessionStatus: {
        draft: '초안',
        ready: '준비됨',
        translating: '번역 중',
        paused: '일시정지',
        completed: '완료',
        failed: '실패',
      },

      // Confirm
      confirm: {
        deleteSession: '이 세션을 삭제하시겠습니까? 모든 번역 데이터가 삭제됩니다.',
      },

      // Errors
      errors: {
        loadSessionsFailed: '세션 목록을 불러오는데 실패했습니다',
        createSessionFailed: '세션 생성에 실패했습니다',
        loadSessionFailed: '세션을 불러오는데 실패했습니다',
        updateSessionFailed: '세션 수정에 실패했습니다',
        deleteSessionFailed: '세션 삭제에 실패했습니다',
        noSourceText: '번역할 텍스트를 입력하세요',
        noSessionSelected: '세션을 먼저 선택하세요',
        noTemplateSelected: '프롬프트 템플릿을 선택하세요',
        invalidSessionState: '현재 세션 상태에서는 번역을 시작할 수 없습니다',
        startFailed: '번역 시작에 실패했습니다',
        retryFailed: '재시도에 실패했습니다',
        loadConfigFailed: '설정을 불러오는데 실패했습니다',
        updateConfigFailed: '설정 저장에 실패했습니다',
        loadModelsFailed: '모델 목록을 불러오는데 실패했습니다',
        loadTemplatesFailed: '템플릿 목록을 불러오는데 실패했습니다',
        uploadFailed: '파일 업로드에 실패했습니다',
        downloadFailed: '다운로드에 실패했습니다',
        loadChunksFailed: '청크 목록을 불러오는데 실패했습니다',
        translateChunkFailed: '청크 번역에 실패했습니다',
      },
    },
  },
};
