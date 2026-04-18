const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const payload = JSON.parse(event.body);

        if (!payload.subscription) {
            return { statusCode: 400, body: 'Missing subscription data' };
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        // We use the Service Role Key here to bypass any Row Level Security (RLS) restrictions
        // that are causing the 401 (Unauthorized) error for anonymous front-end users.
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase.from('push_subscriptions').upsert([{ 
            subscription: payload.subscription,
            user_agent: payload.userAgent
        }], { onConflict: 'subscription' });

        if (error) throw error;

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Subscription saved successfully" })
        };
    } catch (err) {
        console.error('Subscription Error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
