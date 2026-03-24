

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
    } catch (e) {}
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
window.openAdminModal = function() {
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
    postsData = [
        {
            id: 1, title: 'Latter Glory Academy Wins National Coding Championship!',
            category: 'academics', image_url: 'latter-view.webp', views: 4200, author: 'Dr. Sarah Martins (Head of STEM)',
            excerpt: 'Our students showcased exceptional algorithmic skills at the national level, bringing home the gold trophy...',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            content: '<p>It is with immense pride that we announce our Senior Secondary team has secured the 1st position at the 2026 National Coding Championship. Building AI-driven applications that solve local agricultural problems, the team demonstrated the core values of Latter Glory Academy: Innovation and Excellence.</p><br><p>Congratulations to the participants and their mentors.</p>'
        },
        {
            id: 2, title: 'Annual Inter-House Sports Extravaganza Scheduled for April',
            category: 'sports', image_url: 'sport11.webp', views: 3500, author: 'Mr. John Obi (Sports Director)',
            excerpt: 'Get ready for an electrifying week of track and field, football finals, and house spirit as Blue House aims to defend their title.',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            content: '<p>The anticipated Annual Sports Week is here. Track events, marathons, and the epic tug-of-war will take center stage. Students are advised to begin training with their House Masters. May the best house win!</p>'
        },
        {
            id: 3, title: 'Introducing the New Fluid Glassmorphism Student Portal',
            category: 'events', image_url: 'latter-glory-geniuses.webp', views: 5120, author: 'IT Department',
            excerpt: 'We have completely overhauled the student digital experience with an advanced Antigravity UI for better accessibility and speed.',
            created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
            content: '<p>We are thrilled to roll out the new portal. Featuring instant loading skeletons, realtime websocket updates, and a gorgeous glass aesthetic, managing your academic life has never been better.</p>'
        },
        {
            id: 4, title: 'Term 3 Registration Deadlines Extended',
            category: 'academics', image_url: 'event2.webp', views: 2400, author: 'Admin Console',
            excerpt: 'Please be advised that the late registration window has been pushed to Friday.',
            created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
            content: '<p>All parents must complete portal registrations ASAP to secure seating arrangements. Let patience and diligence guide our processes as we wrap up another excellent term.</p>'
        },
        {
            id: 5, title: 'Blue House Takes The Lead In Pre-Tournament Qualifiers',
            category: 'sports', image_url: 'sport11.webp', views: 1850, author: 'Mr. John Obi (Sports Director)',
            excerpt: 'The athletics division saw a massive sweep by Blue House athletes this morning.',
            created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
            content: '<p>What a spectacular showing by our junior sprinters. We expect the finals tomorrow to break records!</p>'
        },
        {
            id: 6, title: 'Alumni Spotlight: Dr. Sarah Wins Global Tech Award',
            category: 'events', image_url: 'latter-glory-geniuses.webp', views: 6300, author: 'Media Team',
            excerpt: 'One of our brightest former students has just been recognized internationally.',
            created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
            content: '<p>Congratulations Dr. Sarah for representing the core values of Latter Glory Academy on a global stage in Berlin last week!</p>'
        }
    ];
    
    eventsData = [
        {title: 'Career Day 2026', date: 'Mar 18', image: 'event2.webp'},
        {title: 'Term 2 Examinations', date: 'Apr 5 - 15', image: 'latter-view.webp'},
        {title: 'Valedictory Service', date: 'July 20', image: 'latter-glory-geniuses.webp'}
    ];
}

function setupRealtime() {
    const supabase = window.supabase;
    if(supabase && supabase.channel) {
        supabase.channel('public:posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
                if(payload.new.status === 'published') {
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
        if(document.body.contains(toast)) {
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
    
    hero.innerHTML = topPosts.map((p, i) => `
        <article class="hero-slide ${i === 0 ? 'active' : ''}" 
                 data-slide="${i}" 
                 role="group" 
                 aria-label="Featured post ${i+1}: ${p.title}"
                 onmousedown="hapticFeed()" 
                 onclick="openPost(${p.id})">
            <div class="slide-media">
                <img src="${p.image_url || 'latter-view.webp'}" alt="${p.title}" loading="lazy">
            </div>
            <div class="slide-content">
                <div class="cat-badge" aria-label="${p.category} category">${p.category?.toUpperCase()}</div>
                <h2 class="slide-title">${p.title}</h2>
                <div class="slide-meta">
                    <span class="author">${p.author}</span>
                    <span class="date">${new Date(p.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        </article>
    `).join('');
    
    // Safe init controls after render
    if (typeof initCarouselControls === 'undefined') {
        initCarouselControls = () => {};
        console.warn('initCarouselControls not implemented - using no-op');
    }
    initCarouselControls();
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

// Event Binders
function bindInteractions() {
    const subscribeBtn = getElement('subscribeBtn');
    if (subscribeBtn) subscribeBtn.onclick = handleNewsletter;
    
    const themeBtn = getElement('themeBtn');
    if (themeBtn) themeBtn.onclick = toggleTheme;
    
    const searchIcon = getElement('searchIcon');
    if (searchIcon) {
        searchIcon.onclick = () => {
            const overlay = getElement('searchOverlay');
            overlay.classList.toggle('show');
            if(overlay.classList.contains('show')) {
                const searchGlobal = getElement('globalSearch');
                if(searchGlobal) searchGlobal.focus();
            }
        };
    }
    
    const searchInput = getElement('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value;
            renderAll(); // Re-render carousel too
        });
    }
    
    const searchClear = document.querySelector('.search-clear');
    if (searchClear && searchInput) {
        searchClear.onclick = () => {
            searchInput.value = '';
            currentSearchTerm = '';
            renderAll();
            getElement('searchOverlay').classList.remove('show');
        };
    }
    
    const adminBtn = getElement('adminBtn');
    if (adminBtn) adminBtn.onclick = openAdminModal;
    
    getElements('[data-filter]').forEach(btn => {
        btn.onclick = e => {
            e.preventDefault();
            currentFilter = btn.dataset.filter;
            getElements('[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderAll(); // Re-render carousel too
        };
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
    getElements('.carousel-dot').forEach((dot, index) => {
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
    const carouselSection = getElement('heroCarousel')?.closest('.carousel-section');
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
let pauseTimeout = null;

function startCarousel() {
    if (rafId) cancelAnimationFrame(rafId);
    
    function animate() {
        if (isPaused || !document.querySelector('.hero-slide.active')) {
            rafId = requestAnimationFrame(animate);
            return;
        }
        
        const slides = getElements('.hero-slide');
        if (!slides.length) return;
        
        slides.forEach(s => {
            s.classList.remove('active');
        });
        
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
        announceSlideChange(slides[currentSlide]);
        
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
    currentSlide = index;
    const slides = getElements('.hero-slide');
    slides.forEach((s, i) => {
        s.classList.toggle('active', i === index);
    });
    announceSlideChange(slides[index]);
    resumeCarousel(); // Resume auto-play after manual nav
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
    
    // Safe view count
    const supabase = window.supabase;
    if (supabase && supabase.rpc) {
        supabase.rpc('increment_post_views', { post_id: id }).catch(() => {});
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.style.background = 'var(--bg-base)';
    modal.innerHTML = `
        <div class="modal-container" style="width:100vw; max-width:100vw; height:100vh; margin:0; border-radius:0; background:var(--bg-base); display:flex; flex-direction:column; padding:0; overflow-y:auto; overflow-x:hidden;">
            
            <button class="modal-close" onclick="hapticFeed(); this.closest('.modal-overlay').remove()" style="position:fixed; top:20px; right:20px; z-index:10; background:rgba(255,255,255,0.8); backdrop-filter:blur(10px); color:black; border:none; border-radius:16px; width:44px; height:44px; font-size:1.4rem; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.3);">
                <i class="bi bi-x-lg"></i>
            </button>
            
            <img src="${post.image_url || 'latter-view.webp'}" style="width:100%; height:45vh; min-height:350px; object-fit:cover; flex-shrink:0;">
            
            <div class="modal-body" style="flex:1; padding:32px 24px 60px 24px; max-width:680px; margin:0 auto; width:100%;">
                
                <div style="color:var(--primary); font-size:0.85rem; font-weight:800; letter-spacing:1px; text-transform:uppercase; margin-bottom:12px;">${post.category}</div>
                <h1 style="font-size:2.8rem; font-weight:900; line-height:1.15; margin:0 0 24px 0; color:var(--text-primary); letter-spacing:-0.5px;">${post.title}</h1>
                <div style="color:var(--text-muted); font-size:1.1rem; font-weight:600; margin-bottom:32px; display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--glass-border); padding-bottom: 24px;">
                    <div>By <span style="color:var(--text-primary);">${post.author}</span><br><span style="font-size:0.9rem; font-weight:500;">${new Date(post.created_at).toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'})}</span></div>
                    <div style="font-size:0.9rem; border: 1px solid var(--glass-border); padding: 6px 14px; border-radius:100px;">${post.views ? post.views.toLocaleString() : 0} Views</div>
                </div>
                
                <div class="post-content" style="font-family: Georgia, serif; font-size:1.25rem; line-height:1.7; color:var(--text-primary);">
                    ${post.content.replace(/\n/g, '<br><br>')}
                </div>
                
                <div class="modal-actions" style="margin-top:60px; padding-top:40px; border-top:1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center;">
                    <button class="print-btn" onclick="hapticFeed(); printPost(${post.id})" title="Print Article" style="padding:12px 28px; border-radius:100px; border:none; background:var(--primary); color:white; cursor:pointer; font-weight:700; font-size:1.1rem; display:flex; align-items:center; gap:8px; transition:all 0.3s; box-shadow:0 4px 15px rgba(183,28,28,0.3);">
                        <i class="bi bi-printer"></i> Print
                    </button>
                    <div class="share-group" style="display:flex; gap:12px;">
                        <span style="color:var(--text-muted); font-weight:600; align-self:center;">SHARE:</span>
                        <button class="share-btn share-fb" onmousedown="hapticFeed()" onclick="shareFB('${post.title.replace(/'/g, "\\'")}')" title="Facebook">
                            <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </button>
                        <button class="share-btn share-tw" onclick="shareTwitter('${post.title.replace(/'/g, "\\'")}')" title="Twitter / X">
                            <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </button>
                        <button class="share-btn share-wa" onclick="shareWA('${post.title.replace(/'/g, "\\'")}')" title="WhatsApp">
                            <svg viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.388 0 12.039c0 2.122.551 4.195 1.597 6.01L.001 24l6.104-1.601A11.972 11.972 0 0012.031 24c6.643 0 12.03-5.386 12.03-12.04C24.061 5.387 18.674 0 12.031 0m6.534 17.291c-.267.755-1.503 1.488-2.071 1.558-.567.07-1.25.17-3.665-.83-2.903-1.205-4.755-4.223-4.897-4.417-.142-.194-1.171-1.564-1.171-2.986 0-1.422.738-2.125.993-2.395.255-.27.553-.338.737-.338.184 0 .368.002.525.01.17.009.398-.066.623.473.284.685.993 2.434 1.078 2.603.085.17.142.368.028.594-.113.226-.17.368-.34.567-.17.198-.354.434-.51.585-.17.17-.348.358-.142.716.206.358.916 1.536 1.955 2.483 1.341 1.222 2.487 1.597 2.841 1.767.354.17.561.142.774-.103.213-.245.922-1.074 1.177-1.442.255-.368.51-.302.835-.18.326.122 2.055.986 2.41 1.165.354.18.594.264.68.406.085.142.085.83-.182 1.585"/></svg>
                        </button>
                        <button class="share-btn share-native" onclick="nativeShare('${post.title.replace(/'/g, "\\'")}', '${post.excerpt.replace(/'/g, "\\'")}')" title="Share via Device">
                            <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" fill="currentColor"/><circle cx="6" cy="12" r="3" fill="currentColor"/><circle cx="18" cy="19" r="3" fill="currentColor"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" stroke="currentColor" stroke-width="2"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
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

