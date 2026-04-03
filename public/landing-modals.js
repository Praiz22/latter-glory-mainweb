/* 
   LGA Landing Page Engagement Logic
   Handles:
   1. Featured Blog Post Modal (10-15s delay)
   2. Cookie Consent Popup (25s delay)
*/

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Featured Post Modal (15s delay)
    // We use a slightly longer delay (15s) to ensure the user is truly engaged
    setTimeout(async () => {
        if (sessionStorage.getItem('lga_featured_seen')) return;

        try {
            const supabase = getSupabase();
            if (!supabase) {
                // Fallback for local development/offline
                const posts = [
                    {
                        id: 1,
                        title: "Why LGA is the Top Choice for Your Child",
                        image_url: "school-rank.png",
                        excerpt: "Choosing a school is the most important decision for your child's future. See why our holistic approach sets us apart...",
                        content: "Choosing a school is the most important decision for your child's future. LGA has been ranked #1 due to our world-class facilities, dedicated staff, and consistent result excellence. We don't just teach; we transform lives.",
                        created_at: "2026-03-18T17:00:00Z",
                        short_id: "x7a9k2b8"
                    }
                ];
                showFeaturedModal(posts[0]);
                sessionStorage.setItem('lga_featured_seen', 'true');
                return;
            }

            // Fetch the single latest published post
            const { data: posts, error } = await supabase
                .from('posts')
                .select('*')
                .eq('status', 'published')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error || !posts || posts.length === 0) return;

            const latestPost = posts[0];
            showFeaturedModal(latestPost);
            sessionStorage.setItem('lga_featured_seen', 'true');
        } catch (e) {
            console.warn('Could not fetch featured post for modal:', e);
        }
    }, 15000);

    // 2. Initialize Cookie Consent (25s delay)
    setTimeout(() => {
        if (localStorage.getItem('lga_cookies_accepted')) return;
        showCookieBanner();
    }, 25000);
});

function showFeaturedModal(post) {
    const overlay = document.createElement('div');
    overlay.className = 'engagement-modal-overlay';
    overlay.id = 'featuredModal';
    
    // Create the hash link using alphanumeric short_id (fallback to slug or numeric id)
    const postHash = post.short_id || post.slug || post.id;
    const postLink = `blog.html#${postHash}`;

    overlay.innerHTML = `
        <div class="featured-modal-card">
            <button class="close-engagement" onclick="closeEngagementModal('featuredModal')">
                <i class="bi bi-x-lg"></i>
            </button>
            <div class="modal-img-container">
                <img src="${post.image_url || 'latter-view.webp'}" alt="${post.title}">
            </div>
            <div class="modal-text-container">
                <span class="modal-badge">Latest from our Blog</span>
                <h2>${post.title}</h2>
                <p>${post.content ? post.content.substring(0, 140) : 'Read the latest updates from Latter Glory Academy...'}...</p>
                <a href="${postLink}" class="modal-cta-btn">
                    Read Article <i class="bi bi-arrow-right-short"></i>
                </a>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    
    // Trigger entrance animation after a tiny delay for CSS transition
    requestAnimationFrame(() => overlay.classList.add('show'));
}

function showCookieBanner() {
    const banner = document.createElement('div');
    banner.className = 'cookie-overlay';
    banner.id = 'cookieBanner';

    banner.innerHTML = `
        <div class="cookie-icon"><i class="bi bi-shield-check"></i></div>
        <div class="cookie-content">
            <p>We use essential cookies to ensure you get the best experience on the LGA platform.</p>
        </div>
        <div class="cookie-actions">
            <button class="btn-cookie" onclick="closeEngagementModal('cookieBanner')">Decline</button>
            <button class="btn-cookie primary" onclick="acceptCookies()">Accept</button>
        </div>
    `;

    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('show'));
}

window.acceptCookies = function() {
    localStorage.setItem('lga_cookies_accepted', 'true');
    closeEngagementModal('cookieBanner');
};

window.closeEngagementModal = function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    
    el.classList.remove('show');
    setTimeout(() => el.remove(), 800);
};
