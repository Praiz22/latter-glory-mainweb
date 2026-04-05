const { createClient } = require('@supabase/supabase-js');

/**
 * DYNAMIC SITEMAP GENERATOR for Latter Glory Academy
 * This function fetches all published blog posts and renders a live XML sitemap.
 */
exports.handler = async (event, context) => {
    // 1. Initialize Supabase (Using Backend Service Role for reliability)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        return { statusCode: 500, body: 'Supabase configuration missing.' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // 2. Fetch all published posts
        const { data: posts, error } = await supabase
            .from('posts')
            .select('id, short_id, slug, updated_at')
            .eq('status', 'published')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // 3. Static Pages List
        const domain = 'https://www.latterglory.com.ng';
        const staticPages = [
            { loc: '/', priority: '1.0', changefreq: 'daily' },
            { loc: '/blog.html', priority: '0.9', changefreq: 'daily' },
            { loc: '/about.html', priority: '0.8', changefreq: 'monthly' },
            { loc: '/admission.html', priority: '0.9', changefreq: 'monthly' },
            { loc: '/contact.html', priority: '0.7', changefreq: 'monthly' }
        ];

        // 4. Build XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        // Add static pages
        staticPages.forEach(p => {
            xml += `  <url>\n`;
            xml += `    <loc>${domain}${p.loc}</loc>\n`;
            xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
            xml += `    <priority>${p.priority}</priority>\n`;
            xml += `  </url>\n`;
        });

        // Add dynamic blog posts (Hash-routed)
        posts.forEach(post => {
            const postHash = post.short_id || post.slug || post.id;
            const lastMod = new Date(post.updated_at).toISOString().split('T')[0];
            
            xml += `  <url>\n`;
            xml += `    <loc>${domain}/blog.html#${postHash}</loc>\n`;
            xml += `    <lastmod>${lastMod}</lastmod>\n`;
            xml += `    <changefreq>weekly</changefreq>\n`;
            xml += `    <priority>0.8</priority>\n`;
            xml += `  </url>\n`;
        });

        xml += `</urlset>`;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
            },
            body: xml
        };

    } catch (error) {
        console.error('Sitemap generation error:', error);
        return { statusCode: 500, body: 'Error generating sitemap.' };
    }
};
