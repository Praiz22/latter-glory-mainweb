
// Supabase Configuration
const SUPABASE_URL = 'https://bavxclrpfhxmjebdimkk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdnhjbHJwZmh4bWplYmRpbWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzA3NTMsImV4cCI6MjA4ODQ0Njc1M30.RbxdKdWNUAEhcmxgL06iQOIET1imCTaSI6WukVJiAUU';

let supabaseInitFailed = false;

// Initialize Supabase client
(function() {
    const checkSupabase = () => {
        const supabaseLib = window.supabase;
        if (supabaseLib && supabaseLib.createClient) {
            window.supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase Client Ready');
            return true;
        }
        return false;
    };

    if (!checkSupabase()) {
        // If not immediately available, wait up to 1.5 seconds
        setTimeout(() => {
            if (!checkSupabase()) {
                console.warn('⚠️ Supabase library failed to load (CDN timeout or offline). Switching to Offline Mode.');
                supabaseInitFailed = true;
            }
        }, 1500);
    }
})();

// Helper to get Supabase client with verification
window.getSupabase = function() {
    if (supabaseInitFailed) return null;
    const s = window.supabase;
    if (s && typeof s.from === 'function') return s;
    return null; // Silence warnings, caller handles null
};

// Log initialization (Production Safety: Reduced Logging)
console.log('✅ Supabase initialized');
