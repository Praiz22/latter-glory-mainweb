// LGA Push Notification Dispatcher - I implemented this for Admin Broadcasts
// Environment Variables: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { title, body, url, password } = JSON.parse(event.body);

        // Security Check: simple password or check for admin session
        if (password !== process.env.ADMIN_PUSH_SECRET) {
            return { statusCode: 403, body: 'Unauthorized' };
        }

        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!vapidPublicKey || !vapidPrivateKey) {
            return { statusCode: 500, body: 'VAPID keys missing' };
        }

        webpush.setVapidDetails(
            'mailto:admin@latterglory.com.ng',
            vapidPublicKey,
            vapidPrivateKey
        );

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: subs, error } = await supabase.from('push_subscriptions').select('subscription');

        if (error) throw error;

        console.log(`Sending push to ${subs.length} subscribers...`);

        const payload = JSON.stringify({ title, body, url });

        const results = await Promise.allSettled(
            subs.map(row => 
                webpush.sendNotification(row.subscription, payload)
                    .catch(e => {
                        if (e.statusCode === 410 || e.statusCode === 404) {
                            // Expired or invalid subscription - clean up
                            return supabase.from('push_subscriptions').delete().eq('subscription', row.subscription);
                        }
                        throw e;
                    })
            )
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: `Broadcast complete. Sent to ${successCount} devices.`,
                total: subs.length,
                success: successCount
            })
        };

    } catch (err) {
        console.error('Push Function Error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
