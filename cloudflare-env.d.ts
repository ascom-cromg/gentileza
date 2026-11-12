declare namespace Cloudflare {
  interface Env {
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_TOKEN_KEY?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
    GMAIL_CLIENT_ID?: string;
    GMAIL_CLIENT_SECRET?: string;
    GMAIL_REFRESH_TOKEN?: string;
    APPS_SCRIPT_URL?: string;
    APPS_SCRIPT_SECRET?: string;
    DIRECTORY_IMPORT_HASH?: string;
    DIRECTORY_IMPORT_EXPIRES_AT?: string;
  }
}
