// LGA Newsletter Subscriber - I implemented this to handle Resend email delivery
// Environment Variables: RESEND_API_KEY
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { email } = JSON.parse(event.body);
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY is missing');
            return { statusCode: 500, body: JSON.stringify({ error: 'Mail server config missing' }) };
        }

        // Save email to database securely bypassing RLS
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { error: dbError } = await supabase.from('newsletter_subscriptions').upsert([{ 
            email: email, 
            status: 'active' 
        }], { onConflict: 'email' });

        if (dbError) throw dbError;

        // Send Welcome Email via Resend
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'Latter Glory Academy <noreply@latterglory.com.ng>',
                to: [email],
                subject: 'Welcome to the Latter Glory Family! 💌',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <img src="https://www.latterglory.com.ng/latter-glory-logo.webp" alt="LGA Logo" style="width: 100px; display: block; margin: 0 auto 20px;">
                        <h2 style="color: #b71c1c; text-align: center;">Welcome to LGA Insights!</h2>
                        <p>Hello,</p>
                        <p>Thank you for subscribing to our newsletter. You'll now be the first to receive:</p>
                        <ul>
                            <li>Latest academic insights and tips</li>
                            <li>Important school announcements</li>
                            <li>Success stories from our students</li>
                            <li>Updates on upcoming events</li>
                        </ul>
                        <p>We're excited to have you with us!</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #666; text-align: center;">
                            Latter Glory Academy, Ogbomoso, Nigeria<br>
                            Building Tomorrow's Leaders
                        </p>
                    </div>
                `
            })
        });

        if (res.ok) {
            return { statusCode: 200, body: JSON.stringify({ message: 'Subscribed and email sent' }) };
        } else {
            const error = await res.json();
            throw new Error(error.message || 'Failed to send email');
        }

    } catch (err) {
        console.error('Newsletter Function Error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
