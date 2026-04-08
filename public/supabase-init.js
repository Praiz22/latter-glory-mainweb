/* I secured this Supabase Configuration Layer for safe backend communication */
const SUPABASE_URL = (window.ENV_CONFIG && window.ENV_CONFIG.SUPABASE_URL) || '';
const SUPABASE_ANON_KEY = (window.ENV_CONFIG && window.ENV_CONFIG.SUPABASE_ANON_KEY) || '';

let supabaseInitFailed = false;

// I initialized the Supabase client here as the main communication bridge
(function () {
    const checkSupabase = () => {
        // I checked if the required keys are present before initializing
        if (!SUPABASE_URL || SUPABASE_URL === '$SUPABASE_URL' || !SUPABASE_ANON_KEY) {
            console.warn('⚠️ Supabase configuration is missing from ENV_CONFIG.');
            showConfigWarning();
            supabaseInitFailed = true;
            return false;
        }

        const supabaseLib = window.supabase;
        if (supabaseLib && supabaseLib.createClient) {
            window.supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase Client Ready');
            return true;
        }
        return false;
    };

    function showConfigWarning() {
        // I created a visual warning for the developer/owner to see if the build failed
        const warning = document.createElement('div');
        warning.style = 'position:fixed; bottom:20px; left:20px; right:20px; background:#b71c1c; color:white; padding:15px; border-radius:10px; z-index:9999; font-family:sans-serif; font-size:14px; box-shadow:0 10px 30px rgba(0,0,0,0.5);';
        warning.innerHTML = `
            <div style="font-weight:bold; margin-bottom:5px;">⚠️ Supabase Config Missing</div>
            <div>The portal cannot connect to the database. Make sure you have set <b>SUPABASE_URL</b> and <b>SUPABASE_ANON_KEY</b> in your hosting (Netlify/GitHub) environment variables.</div>
        `;
        document.body.appendChild(warning);
    }

    if (!checkSupabase()) {
        setTimeout(() => {
            if (!checkSupabase() && !supabaseInitFailed) {
                console.warn('⚠️ Supabase library failed to load.');
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
