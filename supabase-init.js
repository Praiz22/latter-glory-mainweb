/* Supabase Configuration Layer (Secured) */
const SUPABASE_URL = (window.ENV_CONFIG && window.ENV_CONFIG.SUPABASE_URL) || '';
const SUPABASE_ANON_KEY = (window.ENV_CONFIG && window.ENV_CONFIG.SUPABASE_ANON_KEY) || '';

let supabaseInitFailed = false;

// Initialize Supabase client
(function () {
    const checkSupabase = () => {
        const supabaseLib = window.supabase;
        if (supabaseLib && supabaseLib.createClient && SUPABASE_URL) {
            window.supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase Client Ready');
            return true;
        }
        return false;
    };

    if (!checkSupabase()) {
        setTimeout(() => {
            if (!checkSupabase()) {
                console.warn('⚠️ Supabase config missing or library failed to load.');
                supabaseInitFailed = true;
            }
        }, 1500);
    }
})();

window.getSupabase = function () {
    if (supabaseInitFailed) return null;
    const s = window.supabase;
    if (s && typeof s.from === 'function') return s;
    return null;
};
