

let postsData = [];
let eventsData = [];
let currentSlide = 0;
let currentFilter = 'all';
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
function handleNewsletter() {
    const emailEl = getElement('newsletterEmail');
    const statusEl = getElement('newsletterStatus');
    if (!emailEl || !statusEl) return;
    
    const email = emailEl.value.trim();
    if (email && email.includes('@')) {
        statusEl.textContent = 'Subscribed! Thank you.';
        statusEl.style.color = '#4CAF50';
        emailEl.value = '';
        setTimeout(() => statusEl.textContent = '', 3000);
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
        // LGA Blog Ready
    } catch (error) {
        console.error('Init error:', error);
        loadFallbackData();
        renderAll();
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
        <div style="display:flex; gap:16px; align-items:center;">
            <div style="background:var(--primary); padding:12px; border-radius:50%; box-shadow:0 10px 20px rgba(139,92,246,0.3);">
                <i class="bi bi-bell-fill" style="color:white; font-size:1.2rem;"></i>
            </div>
            <div>
                <h4 style="margin:0 0 6px 0; font-size:1rem; color:var(--text-primary);">New Post Published!</h4>
                <p style="margin:0; font-size:0.9rem; color:var(--text-muted);">${post.title}</p>
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
    if (hero) {
        hero.innerHTML = postsData.slice(0, 3).map((p, i) => `
            <div class="hero-slide ${i === 0 ? 'active' : ''}" 
                 style="background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.3)), url(${p.image_url}) center/cover no-repeat fixed">
                <div class="hero-overlay">
                    <div class="hero-content">
                        <h1>${p.title}</h1>
                        <p>${p.excerpt}</p>
                    </div>
                </div>
            </div>
        `).join('') || `
            <div class="hero-slide active" style="background: linear-gradient(135deg, var(--primary), #d32f2f)">
                <div class="hero-content">
                    <h1>Welcome to LGA Blog</h1>
                    <p>Your trusted source for excellence</p>
                </div>
            </div>
        `;
    }
}

function renderBlogGrid() {
    const grid = getElement('mainBlogGrid');
    if (grid) {
        const filtered = postsData.filter(p => currentFilter === 'all' || p.category === currentFilter);
        grid.innerHTML = filtered.slice(0, 12).map(p => `
            <article class="blog-card horizontal fluid-glass" onmousedown="hapticFeed()" onclick="openPost(${p.id})">
                <div class="card-image-container">
                    <img src="${p.image_url || 'latter-view.webp'}" alt="${p.title}" loading="lazy">
                </div>
                <div class="card-content-container">
                    <h3>${p.title}</h3>
                    <p>${p.excerpt}</p>
                    <div class="meta">
                        <span><i class="bi bi-person"></i> ${p.author}</span>
                        <span>•</span>
                        <span><i class="bi bi-calendar"></i> ${new Date(p.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span><i class="bi bi-eye"></i> ${p.views ? p.views.toLocaleString() : 0} views</span>
                    </div>
                </div>
            </article>
        `).join('') || `
            <div class="empty-state">
                <i class="bi bi-newspaper" style="font-size:3rem; color:var(--text-muted); opacity:0.5;"></i>
                <h3 style="margin-top:16px;">No posts found</h3>
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
    if (searchIcon) searchIcon.onclick = () => getElement('searchOverlay').classList.toggle('show');
    
    const adminBtn = getElement('adminBtn');
    if (adminBtn) adminBtn.onclick = openAdminModal;
    
    getElements('[data-filter]').forEach(btn => {
        btn.onclick = e => {
            e.preventDefault();
            currentFilter = btn.dataset.filter;
            getElements('[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderBlogGrid();
        };
    });
}

// Debug admin
// Clean - no test functions


// Carousel Auto-Play
function startCarousel() {
    slideInterval = setInterval(() => {
        const slides = getElements('.hero-slide');
        if (!slides.length) return;
        
        slides.forEach(s => s.classList.remove('active'));
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 4000);
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
    modal.innerHTML = `
        <div class="modal-container" style="max-width:1000px; width:95%; height:90vh; display:flex; flex-direction:column; padding:0; overflow:hidden; border-radius:32px; background:var(--glass); border:1px solid var(--glass-border); backdrop-filter:blur(40px); -webkit-backdrop-filter:blur(40px); box-shadow:0 30px 100px rgba(0,0,0,0.6);">
            
            <button class="modal-close" onclick="hapticFeed(); this.closest('.modal-overlay').remove()" style="position:absolute; top:24px; right:24px; z-index:10; background:rgba(0,0,0,0.5); backdrop-filter:blur(10px); color:white; border:none; border-radius:50%; width:48px; height:48px; font-size:1.5rem; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.3s;">
                <i class="bi bi-x-lg"></i>
            </button>
            
            <div class="modal-hero" style="height:45vh; min-height:300px; position:relative; background: url('${post.image_url || 'latter-view.webp'}') center/cover; flex-shrink:0;">
                <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);"></div>
                <div style="position:absolute; bottom:0; padding:40px; width:100%;">
                    <h1 style="font-size:3rem; font-weight:900; line-height:1.2; margin:0; text-shadow:0 4px 20px rgba(0,0,0,0.8); background:linear-gradient(135deg, #fff, #cbd5e1); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">${post.title}</h1>
                </div>
            </div>
            
            <div class="modal-body" style="flex:1; overflow-y:auto; padding:40px; background:transparent;">
                <div class="modal-meta" style="display:flex; align-items:center; gap:20px; padding-bottom:30px; border-bottom:1px solid var(--glass-border); margin-bottom:30px; color:var(--text-muted); font-size:1.05rem;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--secondary)); display:flex; align-items:center; justify-content:center; color:white; font-size:1.5rem; box-shadow:0 4px 15px rgba(139,92,246,0.3);">
                            <i class="bi bi-person"></i>
                        </div>
                        <div>
                            <strong style="color:var(--text-primary); display:block;">${post.author}</strong>
                            <span style="font-size:0.85rem;">Author / Department</span>
                        </div>
                    </div>
                    <span style="width:1px; height:30px; background:var(--glass-border);"></span>
                    <div>
                        <i class="bi bi-calendar3" style="margin-right:8px; color:var(--primary);"></i>
                        <time>${new Date(post.created_at).toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</time>
                    </div>
                    <span style="width:1px; height:30px; background:var(--glass-border);"></span>
                    <div style="color:var(--accent);">
                        <i class="bi bi-eye-fill" style="margin-right:8px;"></i>
                        <span class="views">${post.views ? post.views.toLocaleString() : 0} Views</span>
                    </div>
                </div>
                
                <div class="post-content" style="font-size:1.15rem; line-height:1.8; color:var(--text-primary);">
                    ${post.content.replace(/\n/g, '<br>')}
                </div>
                
                <div class="modal-actions" style="margin-top:60px; padding-top:30px; border-top:1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center;">
                    <button class="print-btn" onclick="hapticFeed(); printPost(${post.id})" title="Print Article" style="padding:10px 24px; border-radius:100px; border:1px solid var(--glass-border); background:var(--glass); color:var(--text-primary); cursor:pointer; font-weight:600; display:flex; align-items:center; gap:8px; transition:all 0.3s;">
                        <i class="bi bi-printer"></i> Print Article
                    </button>
                    <div class="share-group" style="display:flex; gap:16px;">
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

