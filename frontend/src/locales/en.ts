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
  },
};
