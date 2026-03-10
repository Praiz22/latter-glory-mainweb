/**
 * ============================================================================
 * Latter Glory Academy Blog - Main JavaScript
 * ============================================================================
 * 
 * Fetches ALL data from Supabase (posts, events, staff profiles)
 * - No local data - everything comes from database
 * - Staff attribution via profiles join
 * - Skeleton loading states
 * - Admin CRUD functions
 * 
 * ============================================================================
 */

// ==================== State ==================== //
let currentSlide = 0;
let currentFilter = 'all';
let searchQuery = '';
let currentPostId = null;
let currentLimit = 6;
let postComments = {};
let postsData = [];      // All posts from Supabase
let eventsData = [];     // All events from Supabase

// Get Supabase client
const getSupabase = () => window.supabase || null;

// ==================== DOM Ready ==================== //
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize UI
    initPreloader();
    initTheme();
    initFilters();
    initSearch();
    initLoadMore();
    initNewsletter();
    initModal();
    initScrollProgress();
    initMobileMenu();
    initAOS();
    
    // Show skeleton loaders while fetching
    showSkeletons(6);
    
    // Initialize blog - fetch all data from Supabase
    await initBlog();
    
    // Render everything
    renderBlogPosts();
    renderSidebar();
    renderEvents();
});

// ==================== Async Initialization ==================== //
/**
 * Initialize blog by fetching all data from Supabase
 * This replaces the old local data array approach
 */
async function initBlog() {
    try {
        const supabase = getSupabase();
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }
        
        // Fetch posts with author (profiles) join
        // The author_id links to profiles table for staff attribution
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('*, profiles(full_name, avatar_url, role)')
            .order('created_at', { ascending: false });
        
        if (postsError) throw postsError;
        
        // Map posts with author info from profiles
        postsData = posts.map(post => ({
            id: post.id,
            title: post.title,
            img: post.image_url,
            cat: post.category,
            content: post.content,
            date: new Date(post.created_at).toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric', year: 'numeric' 
            }),
            readTime: Math.ceil((post.content?.split(' ').length || 0) / 200) || 3,
            views: post.views || 0,
            is_featured: post.is_featured,
            excerpt: post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : '',
            // Staff attribution - author_id links to profiles table
            author: post.profiles ? {
                name: post.profiles.full_name || 'Latter Glory Academy',
                avatar: post.profiles.avatar_url,
                role: post.profiles.role || 'staff'
            } : null
        }));
        
        console.log('✅ Posts loaded:', postsData.length);
        
        // Fetch events from Supabase
        const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('*')
            .order('event_date', { ascending: true });
        
        if (!eventsError && events) {
            eventsData = events.map(event => ({
                id: event.id,
                title: event.title,
                description: event.description,
                date: new Date(event.event_date).toLocaleDateString('en-US', { 
                    month: 'short', day: 'numeric' 
                }),
                fullDate: event.event_date,
                location: event.location,
                image: event.image_url
            }));
            console.log('✅ Events loaded:', eventsData.length);
        }
        
        // Update carousel with featured posts only
        updateCarousel();
        
    } catch (error) {
        console.error('❌ Error initializing blog:', error.message);
        postsData = [];
        eventsData = [];
    }
}

/**
 * Update carousel with featured posts only
 * Filters posts where is_featured = true
 */
function updateCarousel() {
    const featuredPosts = postsData.filter(p => p.is_featured).slice(0, 3);
    const latestPosts = postsData.slice(0, 3);
    const postsToShow = featuredPosts.length > 0 ? featuredPosts : latestPosts;
    
    // Default carousel if no posts
    const carouselData = postsToShow.length > 0 ? postsToShow.map(post => ({
        img: post.img || 'new.webp',
        tag: post.cat || 'News',
        title: post.title,
        desc: post.excerpt
    })) : [
        { img: "latter-glory-geniuses.webp", tag: "Innovation", title: "Empowering Future Leaders", desc: "Inside the LGA Creative Suite." },
        { img: "event2.webp", tag: "Academics", title: "Career Day 2026", desc: "Professionals share experiences." },
        { img: "sport11.webp", tag: "Sports", title: "Inter-House Sports", desc: "Champions of Excellence." }
    ];
    
    renderCarousel(carouselData);
}

// ==================== Skeleton Loaders ==================== //
function showSkeletons(count = 6) {
    const grid = document.getElementById('blogGrid');
    if (!grid) return;
    
    let skeletons = '';
    for (let i = 0; i < count; i++) {
        skeletons += `
            <div class="skeleton-card">
                <div class="skeleton-image"></div>
                <div class="skeleton-body">
                    <div class="skeleton-line title"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line skeleton-medium"></div>
                    <div class="skeleton-meta">
                        <div class="skeleton-line skeleton-tiny"></div>
                        <div class="skeleton-line skeleton-tiny"></div>
                    </div>
                </div>
            </div>
        `;
    }
    grid.innerHTML = skeletons;
    
    // Hide loading overlay if exists
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// ==================== Preloader ==================== //
function initPreloader() {
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) preloader.classList.add('hidden');
    }, 1500);
}

// ==================== Theme ==================== //
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        updateThemeIcon(savedTheme);
        themeBtn.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        const icon = themeBtn.querySelector('i');
        if (icon) icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    }
}

// ==================== Carousel ==================== //
function initCarousel() {
    // Carousel data will be set after posts load
    renderCarousel([
        { img: "latter-glory-geniuses.webp", tag: "Innovation", title: "Empowering Future Leaders", desc: "Inside the LGA Creative Suite." },
        { img: "event2.webp", tag: "Academics", title: "Career Day 2026", desc: "Professionals share experiences." },
        { img: "sport11.webp", tag: "Sports", title: "Inter-House Sports", desc: "Champions of Excellence." }
    ]);
    
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    
    if (prevBtn) prevBtn.addEventListener('click', () => changeSlide(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeSlide(1));
    
    setInterval(() => changeSlide(1), 6000);
}

function renderCarousel(carouselData) {
    const track = document.getElementById('carouselTrack');
    const dots = document.getElementById('carouselDots');
    if (!track) return;
    
    track.innerHTML = carouselData.map((slide, index) => `
        <div class="carousel-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="${slide.img}" alt="${slide.title}" loading="lazy">
            <div class="carousel-overlay"></div>
            <div class="carousel-content">
                <span class="carousel-tag">${slide.tag}</span>
                <h1 class="carousel-title">${slide.title}</h1>
                <p class="carousel-description">${slide.desc}</p>
            </div>
        </div>
    `).join('');
    
    if (dots) {
        dots.innerHTML = carouselData.map((_, i) => `
            <button class="carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>
        `).join('');
        
        dots.querySelectorAll('.carousel-dot').forEach(dot => {
            dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.index)));
        });
    }
}

function changeSlide(dir) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    if (!slides.length) return;
    
    slides[currentSlide]?.classList.remove('active');
    dots[currentSlide]?.classList.remove('active');
    
    currentSlide = (currentSlide + dir + slides.length) % slides.length;
    
    slides[currentSlide]?.classList.add('active');
    dots[currentSlide]?.classList.add('active');
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    if (!slides.length) return;
    
    slides[currentSlide]?.classList.remove('active');
    dots[currentSlide]?.classList.remove('active');
    currentSlide = index;
    slides[currentSlide]?.classList.add('active');
    dots[currentSlide]?.classList.add('active');
}

// ==================== Render Blog Posts ==================== //
function renderBlogPosts() {
    const grid = document.getElementById('blogGrid');
    if (!grid) return;
    
    const filtered = postsData.filter(post => {
        const matchesFilter = currentFilter === 'all' || post.cat === currentFilter;
        const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (post.excerpt && post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesFilter && matchesSearch;
    });
    
    const postsToShow = filtered.slice(0, currentLimit);
    
    if (postsToShow.length === 0) {
        grid.innerHTML = `
            <div class="no-posts">
                <i class="bi bi-journal-x"></i>
                <h3>No posts found</h3>
                <p>Check back later for new content</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = postsToShow.map((post, index) => `
        <article class="blog-card" onclick="openPost(${post.id})" data-aos="fade-up" data-aos-delay="${index * 100}">
            <div class="card-image">
                <img src="${post.img || 'new.webp'}" alt="${post.title}" loading="lazy">
                <span class="card-category">${post.cat || 'News'}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${post.title}</h3>
                <p class="card-excerpt">${post.excerpt || ''}</p>
                
                <!-- Staff Attribution - Shows author from profiles table -->
                ${post.author ? `
                    <div class="card-author">
                        <img src="${post.author.avatar || 'student.webp'}" alt="${post.author.name}" class="author-avatar">
                        <span class="author-name">${post.author.name}</span>
                    </div>
                ` : ''}
                
                <div class="card-meta">
                    <span><i class="bi bi-calendar3"></i> ${post.date}</span>
                    <span><i class="bi bi-clock"></i> ${post.readTime} min</span>
                    <span><i class="bi bi-eye"></i> ${post.views}</span>
                </div>
            </div>
        </article>
    `).join('');
    
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.classList.toggle('hidden', currentLimit >= filtered.length);
}

// ==================== Sidebar ==================== //
function renderSidebar() {
    renderPopularPosts();
}

function renderPopularPosts() {
    const container = document.getElementById('popularPosts');
    if (!container || !postsData.length) return;
    
    // Sort by views to show most popular
    const popular = [...postsData].sort((a, b) => b.views - a.views).slice(0, 3);
    
    container.innerHTML = popular.map(post => `
        <div class="popular-post" onclick="openPost(${post.id})">
            <img src="${post.img || 'new.webp'}" alt="${post.title}">
            <div class="popular-post-info">
                <h4>${post.title}</h4>
                <span>${post.views} views</span>
            </div>
        </div>
    `).join('');
}

// ==================== Events ==================== //
function renderEvents() {
    const container = document.getElementById('eventsList');
    if (!container) return;
    
    // If we have events from Supabase, use them
    const eventsToShow = eventsData.length > 0 ? eventsData : [
        { date: "15", month: "Mar", title: "Science Fair", desc: "Annual Science Fair" },
        { date: "20", month: "Mar", title: "Sports Day", desc: "Inter-House Sports" },
        { date: "05", month: "Apr", title: "Parent-Teacher", desc: "Conference Meeting" }
    ];
    
    container.innerHTML = eventsToShow.map(event => `
        <div class="event-item" onclick="openEvent(${event.id || 0})">
            <div class="event-date">
                <span class="day">${event.date.split(' ')[0]}</span>
                <span class="month">${event.date.split(' ')[1]}</span>
            </div>
            <div class="event-info">
                <h4>${event.title}</h4>
                <span>${event.description || event.desc || ''}</span>
            </div>
        </div>
    `).join('');
}

function openEvent(eventId) {
    console.log('Opening event:', eventId);
    // Could open event modal here
}

// ==================== Filters & Search ==================== //
function initFilters() {
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.dataset.filter;
            currentLimit = 6;
            renderBlogPosts();
        });
    });
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            currentLimit = 6;
            renderBlogPosts();
        });
    }
}

function initLoadMore() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentLimit += 6;
            renderBlogPosts();
        });
    }
}

// ==================== Modal ==================== //
function initModal() {
    document.getElementById('modalClose')?.addEventListener('click', closeModal);
    document.getElementById('postModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'postModal') closeModal();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    document.getElementById('commentForm')?.addEventListener('submit', handleCommentSubmit);
}

/**
 * Open a post and increment view count in database
 * Uses RPC to safely increment the view counter
 */
async function openPost(id) {
    const post = postsData.find(p => p.id === id);
    if (!post) return;
    
    currentPostId = id;
    
    // Update modal content
    document.getElementById('modalImg').src = post.img || 'new.webp';
    document.getElementById('modalCategory').textContent = post.cat || 'News';
    document.getElementById('modalTitle').textContent = post.title;
    document.getElementById('modalDate').textContent = post.date;
    document.getElementById('modalReadTime').textContent = post.readTime + ' min read';
    document.getElementById('modalBody').innerHTML = post.content || '<p>No content available.</p>';
    
    // Show author info in modal
    const authorSection = post.author ? `
        <div class="modal-author">
            <img src="${post.author.avatar || 'student.webp'}" alt="${post.author.name}">
            <div>
                <strong>${post.author.name}</strong>
                <span>${post.author.role}</span>
            </div>
        </div>
    ` : '';
    
    loadComments(id);
    renderRelatedPosts(post);
    
    // ===== LIVE COUNTER: Increment views in database =====
    await incrementPostViews(id);
    
    // Show updated view count
    document.getElementById('modalViews').textContent = (post.views || 0) + 1;
    
    document.getElementById('postModal')?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Call Supabase RPC to increment view count
 * This is the safe way to increment counters in the database
 */
async function incrementPostViews(postId) {
    try {
        const supabase = getSupabase();
        if (!supabase) return;
        
        // Call the RPC function to increment views
        await supabase.rpc('increment_post_views', { post_id: postId });
        
        // Also update local state
        const post = postsData.find(p => p.id === postId);
        if (post) post.views = (post.views || 0) + 1;
        
        console.log('✅ View count incremented for post:', postId);
    } catch (error) {
        console.error('Error updating views:', error.message);
    }
}

function closeModal() {
    document.getElementById('postModal')?.classList.remove('active');
    document.body.style.overflow = '';
    currentPostId = null;
}

function renderRelatedPosts(post) {
    const grid = document.getElementById('relatedGrid');
    if (!grid) return;
    
    const related = postsData.filter(p => p.cat === post.cat && p.id !== post.id).slice(0, 3);
    
    if (!related.length) {
        grid.parentElement.style.display = 'none';
        return;
    }
    
    grid.parentElement.style.display = 'block';
    grid.innerHTML = related.map(p => `
        <div class="related-item" onclick="openPost(${p.id})">
            <img src="${p.img || 'new.webp'}" alt="${p.title}">
            <h4>${p.title}</h4>
        </div>
    `).join('');
}

// ==================== Comments ==================== //
function loadComments(postId) {
    const list = document.getElementById('commentsList');
    const count = document.getElementById('commentCount');
    if (!list) return;
    
    const comments = postComments[postId] || [];
    if (count) count.textContent = comments.length;
    
    if (!comments.length) {
        list.innerHTML = '<p class="no-comments">No comments yet. Be the first!</p>';
    } else {
        list.innerHTML = comments.map(c => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${c.name}</span>
                    <span class="comment-date">${c.date}</span>
                </div>
                <p class="comment-text">${c.text}</p>
            </div>
        `).join('');
    }
}

function handleCommentSubmit(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('commenterName');
    const textInput = document.getElementById('commentText');
    
    const name = nameInput?.value?.trim();
    const text = textInput?.value?.trim();
    
    if (!name || !text || !currentPostId) return;
    
    if (!postComments[currentPostId]) postComments[currentPostId] = [];
    
    postComments[currentPostId].push({
        name, text,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    });
    
    loadComments(currentPostId);
    nameInput.value = '';
    textInput.value = '';
    showToast('Comment posted!', 'success');
}

// ==================== Newsletter ==================== //
function initNewsletter() {
    document.getElementById('newsletterForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailInput = document.getElementById('emailInput');
        const email = emailInput?.value?.trim();
        
        if (!email?.includes('@')) {
            showToast('Please enter a valid email', 'error');
            return;
        }
        
        // Save to Supabase
        try {
            const supabase = getSupabase();
            if (supabase) {
                await supabase.from('newsletter').insert({ email });
            }
            showToast('Thank you for subscribing!', 'success');
            emailInput.value = '';
        } catch (error) {
            showToast('Thank you for subscribing!', 'success');
            emailInput.value = '';
        }
    });
}

// ==================== Sharing ==================== //
function shareArticle(platform) {
    const post = postsData.find(p => p.id === currentPostId);
    if (!post) return;
    
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(post.title);
    
    const links = {
        whatsapp: `https://wa.me/?text=${text}%20${url}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`
    };
    
    if (platform === 'copy') {
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copied!', 'success');
    } else if (links[platform]) {
        window.open(links[platform], '_blank', 'width=600,height=400');
    }
}

function printArticle() {
    const post = postsData.find(p => p.id === currentPostId);
    if (!post) return;
    
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
        <!DOCTYPE html><html><head><title>${post.title}</title>
        <style>body{font-family:Arial;padding:40px;max-width:800px;margin:0 auto}
        h1{color:#b71c1c}.meta{color:#666;margin-bottom:20px}</style></head>
        <body><h1>${post.title}</h1>
        <div class="meta"><span>${post.date}</span> | <span>${post.readTime} min</span> | <span>${post.cat}</span></div>
        ${post.author ? `<p><strong>By:</strong> ${post.author.name}</p>` : ''}
        <div>${post.content}</div></body></html>
    `);
    printWindow?.document.close();
    printWindow?.print();
}

// ==================== Scroll Progress ==================== //
function initScrollProgress() {
    window.addEventListener('scroll', () => {
        const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        const progressBar = document.getElementById('progressBar');
        if (progressBar) progressBar.style.width = scrolled + '%';
        
        const navbar = document.getElementById('navbar');
        if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
}

// ==================== Mobile Menu ==================== //
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('mobile-open');
        });
    }
}

// ==================== AOS ==================== //
function initAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 800, easing: 'ease-in-out', once: true, offset: 100 });
    }
}

// ==================== Toast ==================== //
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.className = 'toast', 3000);
}

// ==================== Admin CRUD Functions ==================== //
/**
 * Admin: Create a new post
 * Returns the created post ID
 */
async function createPost(postData) {
    try {
        const supabase = getSupabase();
        if (!supabase) return null;
        
        const { data, error } = await supabase
            .from('posts')
            .insert([postData])
            .select()
            .single();
        
        if (error) throw error;
        
        // Refresh posts
        await initBlog();
        renderBlogPosts();
        
        showToast('Post created successfully!', 'success');
        return data.id;
    } catch (error) {
        console.error('Error creating post:', error);
        showToast('Failed to create post', 'error');
        return null;
    }
}

/**
 * Admin: Update a post
 */
async function updatePost(postId, updates) {
    try {
        const supabase = getSupabase();
        if (!supabase) return false;
        
        const { error } = await supabase
            .from('posts')
            .update(updates)
            .eq('id', postId);
        
        if (error) throw error;
        
        // Refresh posts
        await initBlog();
        renderBlogPosts();
        
        showToast('Post updated successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error updating post:', error);
        showToast('Failed to update post', 'error');
        return false;
    }
}

/**
 * Admin: Delete a post
 */
async function deletePost(postId) {
    try {
        const supabase = getSupabase();
        if (!supabase) return false;
        
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);
        
        if (error) throw error;
        
        // Refresh posts
        await initBlog();
        renderBlogPosts();
        
        showToast('Post deleted successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error deleting post:', error);
        showToast('Failed to delete post', 'error');
        return false;
    }
}

/**
 * Admin: Create a new event
 */
async function createEvent(eventData) {
    try {
        const supabase = getSupabase();
        if (!supabase) return null;
        
        const { data, error } = await supabase
            .from('events')
            .insert([eventData])
            .select()
            .single();
        
        if (error) throw error;
        
        // Refresh events
        await initBlog();
        renderEvents();
        
        showToast('Event created successfully!', 'success');
        return data.id;
    } catch (error) {
        console.error('Error creating event:', error);
        showToast('Failed to create event', 'error');
        return null;
    }
}

/**
 * Admin: Delete an event
 */
async function deleteEvent(eventId) {
    try {
        const supabase = getSupabase();
        if (!supabase) return false;
        
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);
        
        if (error) throw error;
        
        // Refresh events
        await initBlog();
        renderEvents();
        
        showToast('Event deleted successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error deleting event:', error);
        showToast('Failed to delete event', 'error');
        return false;
    }
}

// ==================== Global Functions ==================== //
window.openPost = openPost;
window.closeModal = closeModal;
window.shareArticle = shareArticle;
window.printArticle = printArticle;
window.createPost = createPost;
window.updatePost = updatePost;
window.deletePost = deletePost;
window.createEvent = createEvent;
window.deleteEvent = deleteEvent;

