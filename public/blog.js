// Security: Safe HTML Sanitizer
const safeHTML = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/javascript:/gi, "no-js:");
};

let postsData = [];
let eventsData = [];


let currentSlide = 0;
let currentFilter = 'all';
let currentSearchTerm = '';
let clickCount = 0;
let lastClick = 0;

// DOM helpers
const getElement = id => document.getElementById(id);
const getElements = selector => document.querySelectorAll(selector);

// Provide haptic feedback for mobile devices
window.hapticFeed = (duration = 40) => {
    try {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    } catch (e) { }
};

// Lazy-load images via IntersectionObserver
function setupImageObserver() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.onload = () => img.classList.add('loaded');
                    observer.unobserve(img);
                }
            }
        });
    }, { rootMargin: '200px', threshold: 0.01 });
    document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
}

// Preloader - Optimized for performance
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    initBlog();
    
    // Safety timeout to hide preloader even if init hangs
    checkDeepLink();
    renderAll();
    setupImageObserver();
    
    // Hide preloader if exists
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.style.opacity = '0';
            setTimeout(() => preloader.style.display = 'none', 500);
        }, 1000);
    }
});

// --- DEEP LINKING (HASH UPGRADE - ALPHANUMERIC) ---
function checkDeepLink() {
    const hash = window.location.hash.substring(1); // Remove the '#'
    if (hash) {
        // Wait for data to be loaded then open
        const checkInterval = setInterval(() => {
            if (postsData && postsData.length > 0) {
                // Prioritize matching by the new alphanumeric 'short_id'
                let post = postsData.find(p => p.short_id === hash);
                
                // Fallback: If not found by short_id, check slug or numeric id (legacy support)
                if (!post) {
                    const numericId = parseInt(hash);
                    post = isNaN(numericId)
                        ? postsData.find(p => p.slug === hash)   // slug match
                        : postsData.find(p => p.id === numericId); // numeric match
                }
                
                if (post) openPost(post.id, false);
                clearInterval(checkInterval);
            }
        }, 100);
        // Timeout after 5s
        setTimeout(() => clearInterval(checkInterval), 5000);
    }
}

// Add HashChange listener for back/forward navigation within the post reader
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    if (!hash) {
        closePostModal(); // Close if hash is cleared (back button)
    } else {
        checkDeepLink();
    }
});

// Utility: compute estimated reading time from content string
function computeReadingTime(content) {
    if (!content) return 1;
    const words = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200)); // average 200 wpm
}

function hidePreloader() {
    const loader = getElement('loader');
    if (loader && loader.style.opacity !== '0') {
        loader.style.opacity = '0';
        setTimeout(() => {
            if (loader.parentNode) loader.remove();
        }, 400);
    }
}

function loadTheme() {
    document.body.dataset.theme = localStorage.getItem('lga-theme') || 'dark';
}

function toggleTheme() {
    const current = document.body.dataset.theme;
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = newTheme;
    localStorage.setItem('lga-theme', newTheme);
}

// Triple-click admin trigger
document.addEventListener('click', e => {
    if (e.target.closest('.logo')) {
        const now = Date.now();
        if (now - lastClick < 1000) {
            clickCount++;
            if (clickCount >= 3) {
                openAdminModal();
                clickCount = 0;
            }
        } else {
            clickCount = 1;
        }
        lastClick = now;
    }
});

// Admin Entrance Logic - Delegated to admin-modal.js
// No local definition here to avoid recursion. admin-modal.js will override window.openAdminModal.

// Newsletter
async function handleNewsletter() {
    const emailEl = getElement('newsletterEmail');
    const statusEl = getElement('newsletterStatus');
    if (!emailEl || !statusEl) return;

    const email = emailEl.value.trim();
    if (email && email.includes('@')) {
        statusEl.textContent = 'Subscribing...';
        statusEl.style.color = 'var(--accent)';

        try {
            const supabase = getSupabase();
            if (supabase && supabase.from) {
                const { error } = await supabase.from('newsletter_subscriptions').insert([{ email: email, status: 'active' }]);
                if (error && error.code !== '23505') throw error; 
            }

            statusEl.textContent = 'Subscribed! Thank you.';
            statusEl.style.color = '#4CAF50';
            emailEl.value = '';

            const card = document.querySelector('.newsletter-card-modern');
            if (card) {
                card.classList.add('success');
                setTimeout(() => card.classList.remove('success'), 2000);
            }
        } catch (error) {
            console.error('Subscription error:', error);
            statusEl.textContent = 'An error occurred. Try again later.';
            statusEl.style.color = '#f44336';
        }

        setTimeout(() => statusEl.textContent = '', 4000);
    } else {
        statusEl.textContent = 'Please enter valid email';
        statusEl.style.color = '#f44336';
    }
}

// Main App Init
async function initBlog() {
    // Show Skeletons instantly  
    renderSkeletons();

    try {
        await loadData();
        renderAll();
        bindInteractions();
        startCarousel();
        setupRealtime();
        prepopulateSupabase(); // Prepopulate if empty
        
        console.log('Blog initialized');
    } catch (error) {
        console.error('Init error:', error);
        loadFallbackData(); // ✅ Fallback to dummy posts
        renderAll();
    } finally {
        hidePreloader(); // Force hide when work is done
    }
}

function renderSkeletons() {
    const grid = getElement('mainBlogGrid');
    if (grid) {
        grid.innerHTML = Array(4).fill(0).map(() => `
            <article class="blog-card horizontal fluid-glass skeleton">
                <div class="card-image-container"></div>
                <div class="card-content-container">
                    <div class="skeleton-text title"></div>
                    <div class="skeleton-text subtitle"></div>
                    <div class="skeleton-text subtitle" style="width:70%"></div>
                    <div class="skeleton-text meta"></div>
                </div>
            </article>
        `).join('');
    }
}

async function loadData() {
    const supabase = getSupabase();
    const statusEl = document.querySelector('.nav-links'); // We'll append a status badge here or near logo

    const setOnlineStatus = (isOnline) => {
        const logo = document.querySelector('.logo span');
        if (logo) {
            logo.innerHTML = `LGA ${isOnline ? '<span class="status-dot online" title="Live"></span>' : '<span class="status-dot offline" title="Offline Mode"></span>'}`;
        }
    };

    if (supabase && supabase.from) {
        try {
            // --- UNBREAKABLE FETCH ENGINE ---
            let finalPosts = null;
            let finalEvents = [];

            // 1. Try Posts (Joined first, then simple)
            try {
                const { data, error } = await supabase
                    .from('posts')
                    .select('*, profiles(name, avatar)')
                    .eq('status', 'published')
                    .order('created_at', { ascending: false })
                    .limit(25);

                if (error) throw error;
                finalPosts = data;
            } catch (postErr) {
                console.warn('Joined fetch failed, attempting simple fetch...', postErr.message);
                const { data, error } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('status', 'published')
                    .order('created_at', { ascending: false })
                    .limit(25);
                
                if (!error) finalPosts = data;
            }

            // 2. Try Events
            try {
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .order('event_date')
                    .limit(10);
                
                if (!error) finalEvents = data || [];
            } catch (eventErr) {
                console.warn('Events table not found or inaccessible.', eventErr.message);
            }

            // --- FINAL DATA ASSEMBLY ---
            if (!finalPosts || finalPosts.length === 0) {
                console.warn('No posts reachable from Supabase. Using fallback data.');
                setOnlineStatus(false);
                loadFallbackData();
            } else {
                setOnlineStatus(true);
                postsData = finalPosts.map(p => ({
                    ...p,
                    excerpt: p.content ? p.content.substring(0, 120) + '...' : 'Read more...'
                }));
                eventsData = finalEvents;
            }
        } catch (e) {
            console.error('Supabase load exception:', e);
            setOnlineStatus(false);
            loadFallbackData();
        }
    } else {
        setOnlineStatus(false);
        loadFallbackData();
    }
}

function loadFallbackData() {
    // If Supabase is unreachable, we show these high-value SEO articles as a safety net.
    if (postsData.length === 0) {
        postsData = [
            {
                id: 101,
                title: "How to Pass WAEC 2026 Without Stress: The Ultimate Reading Guide",
                category: "Exam Success",
                author: "Academic Director",
                views: 12450,
                image_url: "waec-prep.png",
                excerpt: "Preparing for WAEC? Most students fail because of poor preparation, not lack of intelligence. Here are the top 5 secrets to mastering your syllabus in 3 months...",
                content: "Preparing for WAEC? Most students fail because of poor preparation, not lack of intelligence. Here are the top 5 secrets to mastering your syllabus in 3 months. 1. Start Early. 2. Use the Syllabus. 3. Practice Past Questions. 4. Active Recall. 5. Health is Wealth. At Latter Glory Academy, we specialize in helping students achieve A1 results through structured guidance.",
                created_at: "2026-03-20T15:00:00Z"
            },
            {
                id: 102,
                title: "5 Signs Your Child is Struggling in School (And How to Help Them)",
                category: "Parenting",
                author: "Principal",
                views: 8900,
                image_url: "parenting-tips.png",
                excerpt: "Academic success starts at home. If you notice these 5 patterns in your child's behavior, it might be time to intervene...",
                content: "Academic success starts at home. If you notice these 5 patterns in your child's behavior (sudden loss of interest, hiding grades, isolation, fatigue, or defensive talk), it might be time to intervene. Our counseling department at LGA works closely with parents to identify and resolve these learning barriers early.",
                created_at: "2026-03-19T16:00:00Z"
            },
            {
                id: 103,
                title: "Why Latter Glory Academy is Ranked Top in Ogbomoso for 2026",
                category: "Featured",
                author: "LGA Admin",
                views: 15600,
                image_url: "school-rank.png",
                excerpt: "Choosing a school is the most important decision for your child's future. See why our holistic approach sets us apart...",
                content: "Choosing a school is the most important decision for your child's future. LGA has been ranked #1 due to our world-class facilities, dedicated staff, and consistent result excellence. We don't just teach; we transform lives.",
                created_at: "2026-03-18T17:00:00Z"
            }
        ];
    }

    eventsData = [
        { title: 'Career Day 2026', date: 'Mar 18', image: 'career-day.webp' },
        { title: 'Inter-House Sports', date: 'Apr 5 - 15', image: 'sport11.webp' },
        { title: 'Valedictory Service', date: 'July 20', image: 'photoshoot.webp' }
    ];
}

window.realtimeInitialized = false;
function setupRealtime() {
    if (window.realtimeInitialized) return;
    const supabase = getSupabase();
    if (supabase && supabase.channel) {
        supabase.channel('public:posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
                if (payload.new.status === 'published') {
                    showRealtimeToast(payload.new);
                }
            })
            .subscribe();
        window.realtimeInitialized = true;
    }
}

function showRealtimeToast(post) {
    const toast = document.createElement('div');
    toast.className = 'realtime-toast fluid-glass';
    toast.innerHTML = `
        <div style="background:var(--bg-base); padding:16px; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.5); border:1px solid var(--glass-border); width:340px; display:flex; gap:16px; align-items:center;">
            <div style="background:var(--primary); padding:12px; border-radius:12px; display:flex; align-items:center; justify-content:center;">
                <i class="bi bi-bell-fill" style="color:white; font-size:1.2rem;"></i>
            </div>
            <div style="flex:1;">
                <h4 style="margin:0 0 4px 0; font-size:0.95rem; font-weight:700; color:var(--text-primary); letter-spacing:-0.2px;">New Article</h4>
                <p style="margin:0; font-size:0.85rem; font-weight:500; color:var(--text-muted); line-height:1.3; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${post.title}</p>
            </div>
        </div>
    `;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '30px', right: '30px', padding: '20px', zIndex: '999999', cursor: 'pointer',
        transform: 'translateY(150px)', opacity: '0', transition: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    });

    toast.onclick = () => { toast.remove(); loadData().then(renderAll); openPost(post.id); };
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.style.transform = 'translateY(150px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 600);
        }
    }, 6000);
}

// Render Everything
function renderAll() {
    renderHeroCarousel();
    renderBlogGrid();
    renderSidebar();
}

function renderHeroCarousel() {
    const hero = getElement('heroCarousel');
    const carouselSection = hero?.closest('.carousel-section');
    if (!hero || !carouselSection) return;

    // Only show featured carousel if we are looking at 'all' posts without search
    if (currentFilter !== 'all' || currentSearchTerm) {
        carouselSection.classList.add('hidden');
        return;
    }

    carouselSection.classList.remove('hidden');

    // Prioritize 'Featured' and high-value categories for the hero
    const topPosts = postsData
        .sort((a, b) => {
            if (a.category === 'Featured' && b.category !== 'Featured') return -1;
            if (b.category === 'Featured' && a.category !== 'Featured') return 1;
            if (a.category === 'Exam Success' && b.category !== 'Exam Success') return -1;
            if (b.category === 'Exam Success' && a.category !== 'Exam Success') return 1;
            return (b.views || 0) - (a.views || 0); // Then by views
        })
        .slice(0, 3);

    hero.innerHTML = `
        <div class="carousel-container">
            ${topPosts.map((post, index) => `
                <div class="hero-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <div class="slide-media">
                        <img src="${post.image_url || 'latter-glory-logo.webp'}" alt="${safeHTML(post.title)}" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div class="slide-content">
                        <span class="slide-category">${post.category}</span>
                        <h2 class="slide-title">${safeHTML(post.title)}</h2>
                        <p class="slide-excerpt">${post.content ? safeHTML(post.content.substring(0, 150)) : 'No excerpt available.'}...</p>
                        <button class="apple-btn" onclick="openPost(${post.id})">Read Article</button>
                    </div>
                </div>
            `).join('')}
            <div class="carousel-dots">
                ${topPosts.map((_, index) => `
                    <div class="dot ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})"></div>
                `).join('')}
            </div>
        </div>
    `;

    // Safe init controls after render
    if (typeof initCarouselControls === 'undefined') {
        initCarouselControls = () => { };
        console.warn('initCarouselControls not implemented - using no-op');
    }
    initCarouselControls();

    // Start auto-play
    startCarousel();
}

function renderBlogGrid() {
    const grid = getElement('mainBlogGrid');
    if (grid) {
        grid.style.gap = '0'; // Remove grid gaps for seamless list
        grid.style.display = 'block'; // Block layout instead of CSS grid

        let filtered = postsData.filter(p => currentFilter === 'all' || p.category === currentFilter);

        // Apply Global Search Filtering 
        if (currentSearchTerm) {
            const term = currentSearchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                (p.title && p.title.toLowerCase().includes(term)) ||
                (p.excerpt && p.excerpt.toLowerCase().includes(term)) ||
                (p.author && p.author.toLowerCase().includes(term))
            );
        }

        // For list view, grab items depending on if we are showing featured module
        const isFeaturedVisible = (currentFilter === 'all' && !currentSearchTerm);
        // Only skip the first 3 posts (for the hero carousel) if we have plenty of posts
        const startIndex = (isFeaturedVisible && filtered.length > 5) ? 3 : 0;
        const displayPosts = filtered.slice(startIndex, startIndex + 12);

        grid.innerHTML = displayPosts.map((p, index) => {
            return `
            <article class="apple-list-item" onmousedown="hapticFeed()" onclick="openPost(${p.id})">
                <div class="apple-list-content">
                    <div style="color:var(--primary); font-size:0.75rem; font-weight:800; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px;">${p.category}</div>
                    <h3 style="font-size:1.25rem; font-weight:700; line-height:1.25; margin:0 0 8px 0; color:var(--text-primary); letter-spacing:-0.3px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${safeHTML(p.title)}</h3>
                    <div style="color:var(--text-muted); font-size:0.85rem; font-weight:500;">${new Date(p.created_at).toLocaleDateString()} &bull; ${computeReadingTime(p.content)} min read</div>
                </div>
                <img src="${p.image_url || 'latter-view.webp'}" alt="${safeHTML(p.title)}" class="apple-list-img" loading="lazy">
            </article>
            <div class="apple-divider"></div>
            `;
        }).join('') || `
            <div class="empty-state" style="text-align:center; padding:80px 20px;">
                <h3 style="margin-top:16px; color:var(--text-muted); font-weight:600;">No articles found</h3>
                <p style="color:var(--text-muted); font-size:1rem;">Adjust your search or filters.</p>
            </div>
        `;
    }
}

function renderSidebar() {
    const popular = getElement('popularList');
    const eventList = getElement('eventList');

    if (popular) {
        const topPosts = postsData.sort((a, b) => b.views - a.views).slice(0, 5);
        popular.innerHTML = topPosts.map(p => `
            <div class="popular-item" onclick="openPost(${p.id})">
                <img src="${p.image_url}" alt="${p.title}" loading="lazy">
                <div>
                    <h4>${p.title.substring(0, 35)}...</h4>
                    <span><i class="bi bi-eye"></i> ${p.views.toLocaleString()} views</span>
                </div>
            </div>
        `).join('');
    }

    if (eventList) {
        eventList.innerHTML = eventsData.slice(0, 6).map(e => `
            <div class="event-item">
                <strong>${e.title}</strong>
                <span>${e.date}</span>
            </div>
        `).join('') + `
            <div class="sidebar-cta-card fluid-glass" style="margin-top:24px; padding:24px; text-align:center; border:1px solid var(--primary);">
                <h4 style="color:var(--primary); font-size:1.1rem; margin-bottom:12px;">Secure Your Child's Future</h4>
                <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:20px;">Admissions for the 2026/2027 Academic Session are now open. Start the journey today.</p>
                <button class="apple-btn" style="width:100%;" onclick="window.location.href='admission.html'">Enroll Now</button>
            </div>
        `;
    }
}

// Search logic
window.toggleSearch = function (forceClose = false) {
    const overlay = getElement('searchOverlay');
    if (!overlay) return;

    // Check strictly for true, because event objects are truthy
    if (forceClose === true) {
        overlay.classList.remove('show');
    } else {
        overlay.classList.toggle('show');
    }

    if (overlay.classList.contains('show')) {
        const input = getElement('globalSearch');
        if (input) {
            input.value = ''; // Clear on open
            input.focus();
        }
        renderSearchResults(''); // Clear results on open
    }
};

function renderSearchResults(term) {
    const list = getElement('searchResults');
    if (!list) return;

    if (!term || term.length < 1) {
        list.innerHTML = '';
        return;
    }

    const lowTerm = term.toLowerCase();
    const filtered = postsData.filter(p =>
        p.title.toLowerCase().includes(lowTerm) ||
        p.category.toLowerCase().includes(lowTerm) ||
        p.content.toLowerCase().includes(lowTerm)
    );

    if (filtered.length === 0) {
        list.innerHTML = `<div class="search-no-results">No results found for "${term}"</div>`;
        return;
    }

    list.innerHTML = filtered.map(p => `
        <div class="search-result-item" onclick="openAndCloseSearch(${p.id})">
            <div class="search-result-info">
                <span class="search-result-category">${p.category}</span>
                <span class="search-result-title">${p.title}</span>
            </div>
            <i class="bi bi-arrow-right"></i>
        </div>
    `).join('');
}

window.openAndCloseSearch = (id) => {
    toggleSearch(true);
    openPost(id);
};

async function prepopulateSupabase() {
    const supabase = getSupabase();
    if (!supabase || !supabase.from) return;

    try {
        const { data: existing, error: checkError } = await supabase.from('posts').select('id').limit(1);
        if (checkError) throw checkError;

        if (existing && existing.length === 0) {
            console.log('Prepopulating Supabase with production dummy data...');
            loadFallbackData(); // Ensure we have the fallback posts loaded to insert
            const toInsert = postsData.map(({ id, ...rest }) => ({
                ...rest,
                status: 'published'
            }));
            const { error } = await supabase.from('posts').insert(toInsert);
            if (error) console.error('Populate error:', error);
            else {
                console.log('Supabase populated successfully!');
                await loadData(); // Reload database to get real IDs
                renderAll();      // Rerender the grid and carousel
            }
        }
    } catch (e) {
        console.warn('Supabase prepopulate check failed (expected if offline):', e.message || e);
    }
}

// Event Binders
function bindInteractions() {
    const subscribeBtn = getElement('subscribeBtn');
    if (subscribeBtn) subscribeBtn.onclick = handleNewsletter;

    const themeBtn = getElement('themeBtn');
    if (themeBtn) themeBtn.onclick = toggleTheme;

    const searchIcon = getElement('searchIcon');
    if (searchIcon) searchIcon.onclick = toggleSearch;

    const searchInput = getElement('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value;
            currentSearchTerm = term;
            renderSearchResults(term);
            renderAll(); // Keep background list updated too
        });
    }

    const closeSearch = getElement('closeSearch');
    if (closeSearch) {
        closeSearch.onclick = () => toggleSearch(true);
    }

    // Escape key to close search or modal
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            toggleSearch(true);
            closePostModal();
        }
    });

    // Carousel interactions
    bindCarouselInteractions();
}

function bindCarouselInteractions() {
    // Arrow controls
    getElements('.carousel-arrow').forEach(arrow => {
        arrow.onclick = () => {
            hapticFeed();
            const isPrev = arrow.classList.contains('prev');
            const slides = getElements('.hero-slide');
            const current = currentSlide;
            currentSlide = isPrev ? (current - 1 + slides.length) % slides.length : (current + 1) % slides.length;
            goToSlide(currentSlide);
        };
    });

    // Dot controls
    getElements('.carousel-dots .dot').forEach((dot, index) => { // Updated selector for dots
        dot.onclick = () => {
            hapticFeed();
            goToSlide(index);
        };
    });

    // Keyboard navigation
    document.addEventListener('keydown', e => {
        if (document.querySelector('.carousel-section:not(.hidden)')) {
            if (e.key === 'ArrowLeft') {
                hapticFeed();
                e.preventDefault();
                const slides = getElements('.hero-slide');
                currentSlide = (currentSlide - 1 + slides.length) % slides.length;
                goToSlide(currentSlide);
            } else if (e.key === 'ArrowRight') {
                hapticFeed();
                e.preventDefault();
                const slides = getElements('.hero-slide');
                currentSlide = (currentSlide + 1) % slides.length;
                goToSlide(currentSlide);
            }
        }
    });

    // Mouse hover pause
    const carouselSection = getElement('heroCarousel')?.closest('.carousel-container'); // Updated selector
    if (carouselSection) {
        carouselSection.onmouseenter = pauseCarousel;
        carouselSection.onmouseleave = () => setTimeout(resumeCarousel, 300);
    }
}

window.initCarouselControls = bindCarouselInteractions;


// Debug admin
// Clean - no test functions


// Modern RAF Carousel with pause/resume
let rafId = null;
let isPaused = false;
let lastTransition = Date.now();
const TRANSITION_DELAY = 5000;

function startCarousel() {
    if (rafId) cancelAnimationFrame(rafId);
    lastTransition = Date.now();

    function animate() {
        const now = Date.now();

        if (isPaused) {
            lastTransition = now; // Reset timer when paused
            rafId = requestAnimationFrame(animate);
            return;
        }

        if (now - lastTransition >= TRANSITION_DELAY) {
            const slides = getElements('.hero-slide');
            const dots = getElements('.carousel-dots .dot'); // Updated selector for dots
            if (slides.length > 0) {
                currentSlide = (currentSlide + 1) % slides.length;
                slides.forEach((s, i) => s.classList.toggle('active', i === currentSlide));
                dots.forEach((d, i) => d.classList.toggle('active', i === currentSlide));
                announceSlideChange(slides[currentSlide]);
            }
            lastTransition = now;
        }

        rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);
}

function pauseCarousel() {
    isPaused = true;
}

function resumeCarousel() {
    isPaused = false;
}

function goToSlide(index) {
    if (index === currentSlide && document.querySelector('.hero-slide.active')) return;

    currentSlide = index;
    const slides = getElements('.hero-slide');
    const dots = getElements('.carousel-dots .dot'); // Updated selector for dots

    slides.forEach((s, i) => {
        s.classList.toggle('active', i === index);
    });

    dots.forEach((d, i) => {
        d.classList.toggle('active', i === index);
    });

    announceSlideChange(slides[index]);

    // Reset timer on manual navigation
    if (rafId) {
        cancelAnimationFrame(rafId);
        startCarousel();
    }
}

function announceSlideChange(slide) {
    const title = slide.querySelector('.slide-title')?.textContent || 'Featured post';
    const announce = getElement('carousel-announce');
    if (announce) {
        announce.textContent = `Now showing: ${title}`;
        announce.dispatchEvent(new Event('liveupdate'));
    }
}

async function incrementViews(id) {
    try {
        const supabase = getSupabase();
        if (!supabase) return;
        const post = postsData.find(p => p.id === id);
        if (post) {
            await supabase.from('posts').update({ views: post.views }).eq('id', id);
        }
    } catch (e) {
        console.warn('View sync failed');
    }
}

// Modal - Styled Perfectly (Full Screen Fluid Glass Redesign)
window.openPost = (id, pushState = true) => {
    const post = postsData.find(p => p.id === id);
    if (!post) return;

    // Deep Link State Update — using alphanumeric Short ID (e.g., #a8b2c4d1)
    const postHash = post.short_id || post.slug || String(id);
    if (pushState) {
        const newUrl = window.location.origin + window.location.pathname + '#' + postHash;
        history.pushState({ postId: id }, post.title, newUrl);
    }

    // Increment Views (Optimistic)
    incrementViews(post.id);
    
    // Update Meta Tags for SEO (Client-side switcher)
    updateMetaTags(post);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
        <div class="post-reader">
            <button class="reader-close" onclick="closePostModal()">
                <i class="bi bi-x-lg"></i>
            </button>
            
            <div class="reader-hero">
                <img src="${post.image_url}" class="reader-image" alt="${post.seo_metadata?.image_alt || post.title}">
                <div class="reader-vignette"></div>
                <div class="reader-header-content">
                    <span class="post-category">${post.category}</span>
                    <h1 class="post-title">${post.title}</h1>
                    <div class="post-meta" style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <img src="${post.profiles?.avatar || 'latter-glory-logo.webp'}" alt="${post.profiles?.name || post.author}" class="author-img" loading="lazy" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                            <span>by ${post.profiles?.name || post.author} &bull; ${new Date(post.created_at).toLocaleDateString()} &bull; ${computeReadingTime(post.content)} min read</span>
                        </div>
                        <button class="apple-btn share-global-btn" onclick="nativeShare('${post.title.replace(/'/g, "\\'")}', 'Check out this article from Latter Glory Academy!', '${post.short_id || post.id}')" style="padding:8px 16px; font-size:14px; background:var(--glass); border:1px solid var(--glass-border);">
                            <i class="bi bi-share"></i> Share
                        </button>
                    </div>
                </div>
            </div>
            <div class="reader-body">
                <div class="reader-main-content">
                    ${post.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
                </div>

                <div class="reader-conversion-section" style="margin-top:60px; padding:40px; background:var(--glass); border-radius:20px; border:1px solid var(--primary); text-align:center;">
                    <h2 style="font-size:2rem; font-weight:800; margin-bottom:16px;">Ready to give your child the best?</h2>
                    <p style="color:var(--text-muted); font-size:1.1rem; margin-bottom:24px;">Join the LGA family and experience academic excellence like never before.</p>
                    <div style="display:flex; gap:16px; justify-content:center;">
                        <button class="apple-btn" onclick="window.location.href='admission.html'">Apply for Admission</button>
                        <button class="apple-btn" style="background:transparent; border:1px solid var(--glass-border);" onclick="showToast('Downloading Prospectus...')">Download Prospectus</button>
                    </div>
                </div>

                <div class="related-posts-section" style="margin-top:60px;">
                    <h3 style="font-size:1.5rem; font-weight:800; margin-bottom:24px; color:var(--text-primary);">More for You</h3>
                    <div class="related-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:24px;">
                        ${postsData
            .filter(p => p.id !== post.id && (p.category === post.category || p.category === 'Featured'))
            .slice(0, 2)
            .map(p => `
                                <div class="related-card" onclick="closePostModal(); setTimeout(() => openPost(${p.id}), 300)" style="cursor:pointer;">
                                    <img src="${p.image_url}" style="width:100%; height:160px; object-fit:cover; border-radius:12px; margin-bottom:12px;">
                                    <h4 style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin:0;">${p.title}</h4>
                                </div>
                            `).join('')}
                    </div>
                </div>
                
                <div class="reader-footer">
                    <button class="apple-btn" onclick="printPost(${post.id})">
                        <i class="bi bi-printer"></i> Print
                    </button>
                    <div class="share-group">
                        <span class="share-label">SHARE STORY:</span>
                        <button class="share-btn share-fb" onclick="sharePost('fb', '${post.id}', '${post.title.replace(/'/g, "\\'")}')" title="Facebook">
                            <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </button>
                        <button class="share-btn share-tw" onclick="sharePost('tw', '${post.id}', '${post.title.replace(/'/g, "\\'")}')" title="Twitter / X">
                            <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </button>
                        <button class="share-btn share-wa" onclick="sharePost('wa', '${post.id}', '${post.title.replace(/'/g, "\\'")}')" title="WhatsApp">
                            <svg viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.388 0 12.039c0 2.122.551 4.195 1.597 6.01L.001 24l6.104-1.601A11.972 11.972 0 0012.031 24c6.643 0 12.03-5.386 12.03-12.04C24.061 5.387 18.674 0 12.031 0m6.534 17.291c-.267.755-1.503 1.488-2.071 1.558-.567.07-1.25.17-3.665-.83-2.903-1.205-4.755-4.223-4.897-4.417-.142-.194-1.171-1.564-1.171-2.986 0-1.422.738-2.125.993-2.395.255-.27.553-.338.737-.338.184 0 .368.002.525.01.17.009.398-.066.623.473.284.685.993 2.434 1.078 2.603.085.17.142.368.028.594-.113.226-.17.368-.34.567-.17.198-.354.434-.51.585-.17.17-.348.358-.142.716.206.358.916 1.536 1.955 2.483 1.341 1.222 2.487 1.597 2.841 1.767.354.17.561.142.774-.103.213-.245.922-1.074 1.177-1.442.255-.368.51-.302.835-.18.326.122 2.055.986 2.41 1.165.354.18.594.264.68.406.085.142.085.83-.182 1.585"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden'; // Lock scroll
};

window.updateMetaTags = function(post) {
    const metaDesc = document.querySelector('meta[name="description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    const twImage = document.querySelector('meta[name="twitter:image"]');

    const desc = post.seo_metadata?.description || post.title + ": " + post.content.substring(0, 120).replace(/\n/g, ' ') + '...';
    const title = post.title; // Keep it clean for the preview caption

    if (metaDesc) metaDesc.setAttribute('content', desc);
    if (ogTitle) ogTitle.setAttribute('content', title);
    if (ogDesc) ogDesc.setAttribute('content', desc);
    if (ogImage) ogImage.setAttribute('content', post.image_url);
    if (twTitle) twTitle.setAttribute('content', title);
    if (twDesc) twDesc.setAttribute('content', desc);
    if (twImage) twImage.setAttribute('content', post.image_url);
    
    document.title = `${title} | LGA Blog`;
};

window.resetMetaTags = function() {
    const title = "Blog | Latter Glory Academy - Insights & Excellence";
    const desc = "Official Blog of Latter Glory Academy - Insights into academic excellence, school culture, and student success stories.";
    const metaDesc = document.querySelector('meta[name="description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    
    if (metaDesc) metaDesc.setAttribute('content', desc);
    if (ogTitle) ogTitle.setAttribute('content', title);
    if (ogDesc) ogDesc.setAttribute('content', desc);
    if (ogImage) ogImage.setAttribute('content', 'https://www.latterglory.com.ng/latter-glory-logo.webp');
    
    document.title = title;
};

window.closePostModal = () => {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 400);
        document.body.style.overflow = 'auto';
        
        // Clear deep link on close
        history.pushState(null, '', window.location.pathname);
    }
};

window.nativeShare = async (title, text, shortId) => {
    const postHash = shortId || '';
    const shareUrl = window.location.origin + window.location.pathname + (postHash ? `#${postHash}` : '');

    if (navigator.share) {
        try {
            await navigator.share({
                title: title,
                text: text,
                url: shareUrl
            });
        } catch (err) {
            console.log('Share failed:', err);
            showToast('Fallback: Copy link from address bar');
        }
    } else {
        // Fallback for browsers without Web Share API
        const dummy = document.createElement('input');
        document.body.appendChild(dummy);
        dummy.value = shareUrl;
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
        showToast('Link copied to clipboard!');
    }
};

window.sharePost = (platform, id, title) => {
    const post = postsData.find(p => p.id == id);
    const postHash = post ? (post.short_id || post.id) : id;
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = encodeURIComponent(`${baseUrl}#${postHash}`);
    
    // Explicit headline caption
    const textHeadline = `${title.toUpperCase()}\n\nDiscover more at Latter Glory Academy:`;
    const encodedHeadline = encodeURIComponent(textHeadline);
    
    let url = '';

    switch(platform) {
        case 'fb': 
            url = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`; 
            break;
        case 'tw': 
            url = `https://twitter.com/intent/tweet?text=${encodedHeadline}&url=${shareUrl}`; 
            break;
        case 'wa': 
            // WhatsApp allows multi-line text which acts as a caption
            url = `https://api.whatsapp.com/send?text=*${encodedHeadline}*%0A%0A${shareUrl}`; 
            break;
    }

    if (url) window.open(url, '_blank', 'width=600,height=400');
};

function printPost(id) {
    const post = postsData.find(p => p.id === id);
    if (post) {
        const win = window.open('', '_blank');
        win.document.write(`
            <html>
                <head>
                    <title>${post.title}</title>
                    <style>body{font-family:serif;line-height:1.6;max-width:800px;margin:40px auto;padding:0 20px}</style>
                </head>
                <body>
                    <h1>${post.title}</h1>
                    <p>${post.author} • ${new Date(post.created_at).toLocaleDateString()} • ${post.views} views</p>
                    <img src="${post.image_url}" style="width:100%;max-width:600px;height:auto">
                    <div style="margin-top:30px">${post.content}</div>
                </body>
            </html>
        `);
        win.document.close();
        win.print();
    }
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// SEO Engine
function updateSEOMetadata(post) {
    if (!post) return;
    
    // Core Title & Meta
    document.title = `${post.title} | Latter Glory Academy Blog`;
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', post.seo_metadata?.description || post.content.substring(0, 160));
    
    // OpenGraph (Social Sharing)
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    
    if (ogTitle) ogTitle.setAttribute('content', post.title);
    if (ogDesc) ogDesc.setAttribute('content', post.seo_metadata?.description || post.content.substring(0, 150));
    if (ogImage) ogImage.setAttribute('content', post.image_url);

    // Schema.org Structured Data
    injectJSONLD(post);
}

function injectJSONLD(post) {
    // Remove existing
    const existing = document.getElementById('lga-schema');
    if (existing) existing.remove();
    
    const schema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "image": [post.image_url],
        "datePublished": post.created_at,
        "author": [{
            "@type": "Person",
            "name": post.author,
            "url": window.location.href
        }],
        "publisher": {
            "@type": "EducationalOrganization",
            "name": "Latter Glory Academy",
            "url": "https://www.latterglory.com.ng",
            "logo": {
                "@type": "ImageObject",
                "url": "https://www.latterglory.com.ng/latter-glory-logo.webp",
                "width": 112,
                "height": 112
            }
        },
        "description": post.seo_metadata?.description || post.content.substring(0, 160)
    };
    
    const script = document.createElement('script');
    script.id = 'lga-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
}

// Share helpers
function nativeShare(title, text) {
    if (navigator.share) {
        navigator.share({
            title: title,
            text: text,
            url: window.location.href
        }).catch(err => console.log('Error sharing', err));
    } else {
        showToast('Native share not supported on this device.');
    }
}

// Perfect!

