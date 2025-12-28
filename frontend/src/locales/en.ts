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
      tabs: {
        app: 'App',
        translation: 'Translation',
      },
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
      translationNotAvailable: 'Translation settings are not available',
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
        external_api: 'External API',
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

      // File Upload
      dropFileHere: 'Drop file here',
      dropFileDescription: 'Drag and drop a .txt file or click to upload',
      selectFile: 'Select File',
      supportedFormats: 'Supported formats: .txt (UTF-8)',
      uploading: 'Uploading...',
      fileUploaded: 'File uploaded',
      replaceFile: 'Replace File',
      totalChunks: '{{count}} chunks total',

      // Progress
      chunkProgress: 'Chunk Progress',
      chunkList: 'Chunk List',
      chunks: 'chunks',
      completed: 'Completed',
      failed: 'Failed',
      pending: 'Pending',
      complete: 'Complete',
      clickToRetry: 'Click to retry',
      estimatedRemaining: 'Estimated remaining',
      estimatedSeconds: '~{{count}}s',
      estimatedMinutes: '~{{count}}min',
      noChunks: 'No chunks',
      notTranslatedYet: 'Not translated yet',
      retryCount: '{{count}} retries',
      error: 'Error',

      // Chunk status
      status: 'Status',
      chunkStatus: {
        pending: 'Pending',
        processing: 'Processing',
        completed: 'Completed',
        failed: 'Failed',
      },

      // Filter
      filter: 'Filter',
      all: 'All',
      time: 'Time',
      actions: 'Actions',
      retryChunk: 'Retry Chunk',
      translateChunk: 'Translate Chunk',
      retranslateChunk: 'Retranslate',

      // Controls
      startTranslation: 'Start Translation',
      pause: 'Pause',
      resume: 'Resume',
      retryFailed: 'Retry Failed',
      translating: 'Translating...',
      settings: 'Settings',
      template: 'Prompt Template',
      download: 'Download',
      downloadStarted: 'Download started',

      // Config
      model: 'AI Model',
      chunkSize: 'Chunk Size',
      characters: 'chars',
      chunkSizeHelp: 'Larger chunks preserve more context, but increase retry cost on errors',
      configUpdated: 'Settings saved',
      advancedSettings: 'Advanced Settings',
      temperature: 'Temperature',
      temperatureHelp: 'Higher values produce more creative and diverse outputs, lower values produce more consistent and predictable outputs',
      maxOutputTokens: 'Max Output Tokens',
      maxOutputTokensHelp: 'Maximum number of tokens to generate. Leave empty to use model default',
      topPHelp: 'Cumulative probability sampling. Lower values reduce diversity',
      topKHelp: 'Sample from top K tokens only. Leave empty to disable',
      default: 'Default',
      enable: 'Enable',
      useDefault: 'Use Default',

      // Session Status
      sessionStatus: {
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
        noSessionSelected: 'Please select a session first',
        noTemplateSelected: 'Please select a prompt template',
        invalidSessionState: 'Cannot start translation in current session state',
        startFailed: 'Failed to start translation',
        retryFailed: 'Retry failed',
        loadConfigFailed: 'Failed to load settings',
        updateConfigFailed: 'Failed to save settings',
        loadModelsFailed: 'Failed to load models',
        loadTemplatesFailed: 'Failed to load templates',
        uploadFailed: 'File upload failed',
        downloadFailed: 'Download failed',
        loadChunksFailed: 'Failed to load chunks',
        translateChunkFailed: 'Failed to translate chunk',
      },
    },
  },
};
