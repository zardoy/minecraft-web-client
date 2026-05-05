declare namespace NodeJS {
  interface ProcessEnv {
    // Build configuration
    NODE_ENV: 'development' | 'production'
    MIN_MC_VERSION?: string
    MAX_MC_VERSION?: string
    ALWAYS_COMPRESS_LARGE_DATA?: 'true' | 'false'
    SINGLE_FILE_BUILD?: 'true' | 'false'
    WS_PORT?: string
    DISABLE_SERVICE_WORKER?: 'true' | 'false'
    CONFIG_JSON_SOURCE?: 'BUNDLED' | 'REMOTE'
    LOCAL_CONFIG_FILE?: string
    BUILD_VERSION?: string
    /** Set at compile time: DD.MM.YY (local date when the config ran). */
    BUILD_DISPLAY_DATE?: string

    // Build internals
    GITHUB_REPOSITORY?: string
    VERCEL_GIT_REPO_OWNER?: string
    VERCEL_GIT_REPO_SLUG?: string

    // UI
    MAIN_MENU_LINKS?: string
    ALWAYS_MINIMAL_SERVER_UI?: 'true' | 'false'

    // App features
    ENABLE_COOKIE_STORAGE?: string
    COOKIE_STORAGE_PREFIX?: string

    // Build info. Release information
    RELEASE_TAG?: string
    RELEASE_LINK?: string
    RELEASE_CHANGELOG?: string

    // Build info
    INLINED_APP_CONFIG?: string
    GITHUB_URL?: string
  }
}
