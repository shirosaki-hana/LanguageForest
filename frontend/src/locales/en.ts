export default {
  translation: {
    // Common
    common: {
      appName: 'LanguageForest',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      save: 'Save',
      close: 'Close',
      refresh: 'Refresh',
      saving: 'Saving...',
      rowsPerPage: 'Rows per page',
      back: 'Back',
      edit: 'Edit',
      delete: 'Delete',
      create: 'Create',
      copy: 'Copy',
      copied: 'Copied',
    },

    // Dialog
    dialog: {
      notice: 'Notice',
      confirm: 'Confirm',
      confirmButton: 'OK',
    },

    // Auth
    auth: {
      setup: {
        title: 'Setup Password',
        subtitle: 'Set an administrator password to get started',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        passwordHelper: 'At least 8 characters, including letters and numbers',
        submit: 'Set Password',
        submitting: 'Setting...',
        passwordMismatch: 'Passwords do not match',
        invalidFormat: 'Invalid password format',
      },
      login: {
        title: 'Sign In',
        subtitle: 'Sign in to continue',
        password: 'Password',
        submit: 'Sign In',
        submitting: 'Signing in...',
      },
      logout: 'Sign Out',
    },

    // Welcome
    welcome: {
      subtitle: 'Personal Server Application Template',
      description: 'A base template with authentication, logging, and theming. Add your own features on top of this template.',
    },

    // Settings
    settings: {
      title: 'Settings',
      theme: {
        title: 'Theme',
        light: 'Light',
        dark: 'Dark',
        system: 'System',
      },
      language: {
        title: 'Language',
        ko: '한국어',
        en: 'English',
      },
    },

    // Errors
    errors: {
      statusCheckFailed: 'Failed to check status',
      setupFailed: 'Failed to set password',
      loginFailed: 'Failed to sign in',
      logoutFailed: 'Failed to sign out',
      network: 'Network error',
      unknown: 'Unknown error occurred',
    },

    // Logs
    logs: {
      title: 'System Logs',
      subtitle: 'Server activity and event records',
      empty: 'No logs',
      search: 'Search messages...',
      level: 'Level',
      category: 'Category',
      all: 'All',
      time: 'Time',
      message: 'Message',
      detail: 'Log Detail',
      metadata: 'Metadata',
      settings: 'Log Settings',
      retentionDays: 'Retention Days',
      retentionDaysHelp: 'Logs older than specified days will be deleted during cleanup',
      maxLogs: 'Maximum Logs',
      maxLogsHelp: 'Oldest logs will be deleted when exceeding the limit',
      cleanup: 'Cleanup Logs',
      deleteAll: 'Delete All',
      stats: {
        total: 'Total Logs',
        errors: 'Errors',
        warnings: 'Warnings',
        last24h: '24 Hours',
      },
      categories: {
        api: 'API',
        auth: 'Auth',
        system: 'System',
        database: 'DB',
        server: 'Server',
      },
      errors: {
        loadFailed: 'Failed to load logs',
        settingsSaveFailed: 'Failed to save settings',
        cleanupFailed: 'Failed to cleanup logs',
        deleteFailed: 'Failed to delete logs',
      },
      confirm: {
        cleanup: 'This will cleanup old logs according to settings. Continue?',
        deleteAll: 'This will delete all logs. This action cannot be undone. Continue?',
      },
      cleanupResult: '{{count}} logs have been cleaned up.',
    },

    // Translation
    translation: {
      title: 'Translation',
      searchSessions: 'Search sessions...',
      newSession: 'New Translation Session',
      activeSessions: 'Active',
      completedSessions: 'Completed',
      noSessions: 'No sessions',
      noSearchResults: 'No search results',
      selectOrCreateSession: 'Select or create a session',

      // Session
      sessionTitle: 'Session Title',
      sessionMemo: 'Memo',
      sessionMemoPlaceholder: 'Notes about translation style, guidelines, etc...',
      editSession: 'Edit Session',
      sessionCreated: 'Session created',
      sessionDeleted: 'Session deleted',

      // Custom Dict
      customDict: 'Custom Dictionary',
      customDictHelp: 'Enter one term per line in "source=translation" format',
      customDictPlaceholder: 'Harry Potter=해리 포터\nHogwarts=호그와트',

      // Editor
      sourceText: 'Source Text',
      translatedText: 'Translation',
      sourceTextPlaceholder: 'Enter text to translate...',
      translatedTextPlaceholder: 'Translation will appear here',
      charCount: '{{count}} chars',
      wordCount: '{{count}} words',

      // Progress
      chunkProgress: 'Chunk Progress',
      chunks: 'chunks',
      completed: 'Completed',
      failed: 'Failed',
      clickToRetry: 'Click to retry',
      estimatedRemaining: 'Estimated remaining',
      estimatedSeconds: '~{{count}}s',
      estimatedMinutes: '~{{count}}min',

      // Controls
      startTranslation: 'Start Translation',
      pause: 'Pause',
      resume: 'Resume',
      retryFailed: 'Retry Failed',
      translating: 'Translating...',
      settings: 'Settings',

      // Config
      model: 'AI Model',
      chunkSize: 'Chunk Size',
      characters: 'chars',
      chunkSizeHelp: 'Larger chunks preserve more context, but increase retry cost on errors',
      configUpdated: 'Settings saved',

      // Status
      status: {
        draft: 'Draft',
        ready: 'Ready',
        translating: 'Translating',
        paused: 'Paused',
        completed: 'Completed',
        failed: 'Failed',
      },

      // Confirm
      confirm: {
        deleteSession: 'Delete this session? All translation data will be deleted.',
      },

      // Errors
      errors: {
        loadSessionsFailed: 'Failed to load sessions',
        createSessionFailed: 'Failed to create session',
        loadSessionFailed: 'Failed to load session',
        updateSessionFailed: 'Failed to update session',
        deleteSessionFailed: 'Failed to delete session',
        noSourceText: 'Please enter text to translate',
        startFailed: 'Failed to start translation',
        retryFailed: 'Retry failed',
        loadConfigFailed: 'Failed to load settings',
        updateConfigFailed: 'Failed to save settings',
      },
    },
  },
};
