/**
 * ============================================================================
 * Supabase Initialization for Latter Glory Academy Blog
 * ============================================================================
 * 
 * This file initializes the Supabase client for the blog.
 * 
 * HOW TO FIND YOUR KEYS:
 * 1. Go to https://supabase.com/dashboard
 * 2. Select your project: "bavxclrpfhxmjebdimkk"
 * 3. Go to Settings (gear icon) > API
 * 4. Find your keys under "Project API keys"
 * 
 * ENVIRONMENT VARIABLES:
 * - SUPABASE_URL: Found in the "URL" section
 * - SUPABASE_ANON_KEY: Found as "anon public" key
 * 
 * ============================================================================
 */

// Supabase Configuration
const SUPABASE_URL = 'https://bavxclrpfhxmjebdimkk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdnhjbHJwZmh4bWplYmRpbWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzA3NTMsImV4cCI6MjA4ODQ0Njc1M30.RbxdKdWNUAEhcmxgL06iQOIET1imCTaSI6WukVJiAUU';

// Initialize Supabase client (if not already initialized)
if (typeof window.supabase === 'undefined') {
    const { createClient } = window.supabase || {};
    if (createClient) {
        window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
}

// Log initialization
console.log('✅ Supabase client initialized for project: bavxclrpfhxmjebdimkk');

/**
 * Available Keys Reference:
 * -----------------------
 * anon key (public):     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdnhjbHJwZmh4bWplYmRpbWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzA3NTMsImV4cCI6MjA4ODQ0Njc1M30.RbxdKdWNUAEhcmxgL06iQOIET1imCTaSI6WukVJiAUU
 * service role (private): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdnhjbHJwZmh4bWplYmRpbWtrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg3MDc1MywiZXhwIjoyMDg4NDQ2NzUzfQ.JQgtvi9OhsrSXhHhSOUxUp489E0-fuP9MjbI1pCmK6Y
 * 
 * ⚠️ SECURITY NOTE: Never expose the service role key in client-side code!
 * The anon key is safe for client-side use with RLS policies.
 */

