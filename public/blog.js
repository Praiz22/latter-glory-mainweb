

let postsData = [
    {
        id: 1,
        title: "Empowering Futures: LGA Career Day 2026 Highlights",
        category: "Academic",
        author: "Admin",
        image_url: "career-day.webp",
        content: "Our annual Career Day was a resounding success! Students from all grades dressed in their future professional attire, from surgeons to space engineers. The event featured guest speakers from various industries who shared inspiring stories of resilience and success. At Latter Glory Academy, we believe in nurturing dreams from a young age.",
        views: 1240,
        created_at: "2026-03-24T10:00:00Z"
    },
    {
        id: 2,
        title: "Laughter and Joy: Celebrating Children's Day at LGA",
        category: "Events",
        author: "Editor",
        image_url: "childrens day.webp",
        content: "Children are the heritage of the Lord, and at LGA, we celebrated them in grand style! From face painting to bouncy castles and inter-class dance competitions, the atmosphere was electric with pure joy. The school management provided special treats for all students, making it a day to remember.",
        views: 980,
        created_at: "2026-03-23T09:00:00Z"
    },
    {
        id: 3,
        title: "Honoring Our Superstars: A Special Mothers' Day Tribute",
        category: "Community",
        author: "Staff",
        image_url: "mothers day.webp",
        content: "Mothers are the backbone of our community. This year's Mothers' Day celebration at LGA was deeply emotional and beautiful. Students presented poems, songs, and handmade cards to their mothers. We hosted a special breakfast session where mothers shared their experiences and bonded over the shared goal of raising excellence.",
        views: 1560,
        created_at: "2026-03-22T08:30:00Z"
    },
    {
        id: 4,
        title: "The Rhythm of Leadership: Highlights from the Cultural Gala",
        category: "Arts",
        author: "Principal",
        image_url: "proprietress_dancing.webp",
        content: "Our Cultural Gala was headlined by a spectacular performance from our very own Proprietress, who led the traditional dance troop with grace and energy. The event showcased the rich diversity of our heritage through music, dance, and drama. It was a powerful reminder that leadership is about participation and passion.",
        views: 2100,
        created_at: "2026-03-21T11:00:00Z"
    },
    {
        id: 5,
        title: "Velocity and Valor: The 15th Annual Inter-House Sports Meet",
        category: "Sports",
        author: "Coach Sam",
        image_url: "sport11.webp",
        content: "The tracks were on fire as Blue House emerged victorious in this year's Inter-House Sports competition! Special mentions to our track stars in the 100m senior relay. The spirit of sportsmanship was evident in every race, as students pushed their limits and cheered for their peers regardless of the outcome.",
        views: 3200,
        created_at: "2026-03-20T14:00:00Z"
    },
    {
        id: 6,
        title: "Stage of Dreams: LGA Dramatics and Arts Performance",
        category: "Arts",
        author: "Arts Dept",
        image_url: "latter-glory-drama.png",
        content: "The LGA Drama Club presented 'The Glory of Persistence' in front of a packed auditorium. The performance was a masterclass in storytelling, featuring high-quality costumes and set designs. Our students demonstrated incredible dramatic range, moving the audience to both laughter and tears.",
        views: 890,
        created_at: "2026-03-19T10:00:00Z"
    },
    {
        id: 7,
        title: "Faces of Excellence: Unveiling Our 2026 Scholars",
        category: "Academic",
        author: "Admin",
        image_url: "photoshoot.webp",
        content: "Meet the brilliant minds shaping the future. Our latest official school photoshoot captured the essence of LGA: discipline, excellence, and a hunger for knowledge. These scholars have maintained outstanding academic records and shown exemplary leadership within the school community.",
        views: 1100,
        created_at: "2026-03-18T09:00:00Z"
    },
    {
        id: 8,
        title: "Active Minds, Active Bodies: Exploring the New Playground",
        category: "Lifestyle",
        author: "Staff",
        image_url: "playground.webp",
        content: "Outdoor play is essential for holistic development. We are excited to unveil our newly upgraded playground, featuring state-of-the-art equipment designed for safety and maximum fun. From the climbing walls to the creative sand pits, there's a new world of adventure waiting for our students.",
        views: 1340,
        created_at: "2026-03-17T08:00:00Z"
    }
];
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

// Preloader - Fixed Timing
document.addEventListener('DOMContentLoaded', () => {
    // Start loading immediately
    loadTheme();
    initBlog();

    // Hide preloader after 3 seconds or when content is ready
    setTimeout(hidePreloader, 2500);
});

function hidePreloader() {
    const loader = getElement('loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 400);
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

// Admin Modal - Direct call to admin-modal.js implementation
window.openAdminModal = function () {
    console.log('Original modal opened');
    const modal = document.createElement('div');
    modal.className = 'admin-overlay show';
    modal.innerHTML = `
        <div class="login-modal-overlay">
            <div class="login-modal">
                <button class="login-close" onclick="this.closest('.login-modal-overlay').remove()">
                    <i class="bi bi-x"></i>
                </button>
                <div class="login-header">
                    <div class="login-icon">
                        <i class="bi bi-shield-lock"></i>
                    </div>
                    <h2>Admin Access</h2>
                    <p>Enter your credentials</p>
                </div>
                <div class="login-form">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="loginEmail" placeholder="admin@lga.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="loginPassword" placeholder="••••••••">
                    </div>
                    <button class="login-btn" onclick="handleLogin()">Login</button>
                    <div id="loginError" style="color:#f44336; font-size:0.85rem; margin-top:8px; display:none;"></div>
                </div>
                <div class="login-footer">
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

async function handleLogin() {
    const loginModal = document.querySelector('.login-modal-overlay');
    const errorEl = document.getElementById('loginError');

    // Use admin-modal.js handleLogin - it loads separately
    if (typeof window.handleLogin === 'function') {
        loginModal.remove();
        window.handleLogin(); // Call admin-modal's version
        return;
    }

    // Fallback - simple Supabase auth
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!window.supabase || !window.supabase.auth) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Supabase not ready - refresh page';
        return;
    }

    // Show loading
    errorEl.style.display = 'block';
    errorEl.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Authenticating...';

    try {
        const { data, error: authError } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (authError) throw authError;

        errorEl.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Loading profile...';

        const { data: profile, error: profileError } = await window.supabase
            .from('profiles')
            .select('name, role, avatar')
            .eq('email', email)
            .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        errorEl.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Accessing portal...';

        document.querySelector('.login-modal-overlay').remove();
        openDashboard(profile || { name: email, role: 'user', avatar: 'latter-glory-logo.webp' });

    } catch (error) {
        console.error('Login error:', error);
        errorEl.style.display = 'block';
        errorEl.textContent = error.message || 'Invalid credentials';
    }
}


function openDashboard(user) {
    const modal = document.createElement('div');
    modal.className = 'admin-overlay show';
    modal.innerHTML = `
        <div class="dashboard-modal">
            <div class="dashboard-header">
                <div class="user-info">
                    <img src="${user.avatar}" class="user-avatar">
                    <div>
                        <h3>${user.name}</h3>
                        <span class="user-role">${user.role}</span>
                    </div>
                </div>
                <button class="dashboard-close" onclick="this.closest('.admin-overlay').remove()">×</button>
            </div>
            <div class="dashboard-content">
                <div class="dashboard-grid">
                    <div class="dashboard-card" onclick="openPostEditor()">
                        <h4><i class="bi bi-plus-circle"></i> Create Post</h4>
                        <p>Write new blog posts</p>
                    </div>
                    <div class="dashboard-card" onclick="openReviewQueue()">
                        <h4><i class="bi bi-eye"></i> Review Queue</h4>
                        <p>Approve posts</p>
                    </div>
                    <div class="dashboard-card" onclick="openAnalytics()">
                        <h4><i class="bi bi-graph-up"></i> Analytics</h4>
                        <p>View stats</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

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
            const supabase = window.supabase;
            if (supabase && supabase.from) {
                const { error } = await supabase.from('subscribers').insert([{ email: email, subscribed_at: new Date().toISOString() }]);
                if (error && error.code !== '23505') throw error; // Ignore duplicate email errors implicitly
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
        hidePreloader(); // Force hide preloader
        console.log('LGA Blog Ready - Modern carousel initialized');
    } catch (error) {
        console.error('Init error:', error);
        loadFallbackData(); // ✅ Fallback to dummy posts
        renderAll();
        hidePreloader(); // Force hide even on error
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
    const supabase = window.supabase;
    if (supabase && supabase.from) {
        try {
            const { data: posts } = await supabase
                .from('posts')
                .select('*')
                .eq('status', 'published')
                .order('created_at', { ascending: false })
                .limit(25);
            const { data: events } = await supabase
                .from('events')
                .select('*')
                .order('event_date')
                .limit(10);

            postsData = posts.map(p => ({
                ...p,
                excerpt: p.content ? p.content.substring(0, 120) + '...' : 'Read more...'
            })) || [];
            eventsData = events || [];
        } catch (e) {
            console.log('Supabase error:', e);
            loadFallbackData();
        }
    } else {
        loadFallbackData();
    }
}

function loadFallbackData() {
    // Already populated at top, but ensure it's reset if needed
    if (postsData.length === 0) {
        // Fallback to original content matches the top-level declaration
    }

    eventsData = [
        { title: 'Career Day 2026', date: 'Mar 18', image: 'career-day.webp' },
        { title: 'Inter-House Sports', date: 'Apr 5 - 15', image: 'sport11.webp' },
        { title: 'Valedictory Service', date: 'July 20', image: 'photoshoot.webp' }
    ];
}

function setupRealtime() {
    const supabase = window.supabase;
    if (supabase && supabase.channel) {
        supabase.channel('public:posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
                if (payload.new.status === 'published') {
                    showRealtimeToast(payload.new);
                }
            })
            .subscribe();
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
    const topPosts = postsData.slice(0, 3);

    hero.innerHTML = `
        <div class="carousel-container">
            ${topPosts.map((post, index) => `
                <div class="hero-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <div class="slide-media">
                        <img src="${post.image_url || 'latter-glory-logo.webp'}" alt="${post.title}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div class="slide-content">
                        <span class="slide-category">${post.category}</span>
                        <h2 class="slide-title">${post.title}</h2>
                        <p class="slide-excerpt">${post.content ? post.content.substring(0, 150) : 'No excerpt available.'}...</p>
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
        const startIndex = isFeaturedVisible ? 3 : 0;
        const displayPosts = filtered.slice(startIndex, startIndex + 12);

        grid.innerHTML = displayPosts.map((p, index) => {
            return `
            <article class="apple-list-item" onmousedown="hapticFeed()" onclick="openPost(${p.id})">
                <div class="apple-list-content">
                    <div style="color:var(--primary); font-size:0.75rem; font-weight:800; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px;">${p.category}</div>
                    <h3 style="font-size:1.25rem; font-weight:700; line-height:1.25; margin:0 0 8px 0; color:var(--text-primary); letter-spacing:-0.3px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${p.title}</h3>
                    <div style="color:var(--text-muted); font-size:0.85rem; font-weight:500;">${new Date(p.created_at).toLocaleDateString()}</div>
                </div>
                <img src="${p.image_url || 'latter-view.webp'}" alt="${p.title}" class="apple-list-img">
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
                <img src="${p.image_url}" alt="${p.title}">
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
        `).join('');
    }
}

// Search logic
window.toggleSearch = function(forceClose = false) {
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
    const supabase = window.supabase;
    if (!supabase || !supabase.from) return;

    try {
        const { data: existing } = await supabase.from('posts').select('id').limit(1);
        if (existing && existing.length === 0) {
            console.log('Prepopulating Supabase with production dummy data...');
            const toInsert = postsData.map(({id, ...rest}) => ({
                ...rest,
                status: 'published'
            }));
            const { error } = await supabase.from('posts').insert(toInsert);
            if (error) console.error('Populate error:', error);
            else console.log('Supabase populated successfully!');
        }
    } catch (e) {
        console.error('Supabase check failed:', e);
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

// Modal - Styled Perfectly (Full Screen Fluid Glass Redesign)
function openPost(id) {
    const post = postsData.find(p => p.id === id) || postsData[0]; // fallback safely
    if (!post) return;

    hapticFeed();

    // Track view (simple local increment for demo)
    post.views = (post.views || 0) + 1;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
        <div class="post-reader">
            <button class="reader-close" onclick="closePostModal()">
                <i class="bi bi-x-lg"></i>
            </button>
            
            <div class="reader-hero">
                <img src="${post.image_url || 'latter-glory-logo.webp'}" alt="${post.title}" class="reader-img">
                <div class="reader-vignette"></div>
                <div class="reader-header-content">
                    <span class="post-category">${post.category}</span>
                    <h1 class="post-title">${post.title}</h1>
                    <div class="post-meta">
                        <img src="latter-glory-logo.webp" alt="${post.author}" class="author-img">
                        <span>by ${post.author} • ${new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            
            <div class="reader-body">
                <div class="reader-main-content">
                    ${post.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
                </div>
                
                <div class="reader-footer">
                    <button class="apple-btn" onclick="printPost(${post.id})">
                        <i class="bi bi-printer"></i> Print
                    </button>
                    <div class="share-group">
                        <span class="share-label">SHARE:</span>
                        <button class="share-btn share-fb" onmousedown="hapticFeed()" onclick="shareFB('${post.title.replace(/'/g, "\\'")}')" title="Facebook">
                            <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </button>
                        <button class="share-btn share-tw" onclick="shareTwitter('${post.title.replace(/'/g, "\\'")}')" title="Twitter / X">
                            <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </button>
                        <button class="share-btn share-wa" onclick="shareWA('${post.title.replace(/'/g, "\\'")}')" title="WhatsApp">
                            <svg viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.388 0 12.039c0 2.122.551 4.195 1.597 6.01L.001 24l6.104-1.601A11.972 11.972 0 0012.031 24c6.643 0 12.03-5.386 12.03-12.04C24.061 5.387 18.674 0 12.031 0m6.534 17.291c-.267.755-1.503 1.488-2.071 1.558-.567.07-1.25.17-3.665-.83-2.903-1.205-4.755-4.223-4.897-4.417-.142-.194-1.171-1.564-1.171-2.986 0-1.422.738-2.125.993-2.395.255-.27.553-.338.737-.338.184 0 .368.002.525.01.17.009.398-.066.623.473.284.685.993 2.434 1.078 2.603.085.17.142.368.028.594-.113.226-.17.368-.34.567-.17.198-.354.434-.51.585-.17.17-.348.358-.142.716.206.358.916 1.536 1.955 2.483 1.341 1.222 2.487 1.597 2.841 1.767.354.17.561.142.774-.103.213-.245.922-1.074 1.177-1.442.255-.368.51-.302.835-.18.326.122 2.055.986 2.41 1.165.354.18.594.264.68.406.085.142.085.83-.182 1.585"/></svg>
                        </button>
                        <button class="share-btn share-native" onclick="nativeShare('${post.title.replace(/'/g, "\\'")}', '')" title="Share via Device">
                            <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" fill="currentColor"/><circle cx="6" cy="12" r="3" fill="currentColor"/><circle cx="18" cy="19" r="3" fill="currentColor"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" stroke="currentColor" stroke-width="2"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden'; // Lock scroll
}

function closePostModal() {
    hapticFeed();
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto'; // Unlock scroll
    }
}

function shareFB(title) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}`, '_blank');
}

function shareTwitter(title) {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(location.href)}`, '_blank');
}

function shareWA(title) {
    window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + location.href)}`, '_blank');
}

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

