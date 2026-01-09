/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_REVENUECAT_IOS_KEY: string;
    readonly VITE_REVENUECAT_ANDROID_KEY: string;
    readonly VITE_SUPERUSER_EMAILS: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
