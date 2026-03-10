/**
 * Latter Glory Academy Blog - Main JavaScript
 * Handles blog functionality: posts, carousel, modal, comments, newsletter, theme
 */

// ==================== Blog Data ====================
const blogData = [
    {
        id: 0,
        category: "academics",
        tag: "Academic Excellence",
        title: "Empowering Future Leaders through Digital Innovation",
        date: "Mar 06, 2026",
        readTime: 5,
        img: "latter-glory-geniuses.webp",
        excerpt: "Inside the LGA Creative Suite and Robotics Lab.",
        content: `<p>At Latter Glory Academy, we're committed to preparing our students for the digital future. Our innovative approach to education integrates cutting-edge technology with proven teaching methodologies.</p>
        <p>Through our state-of-the-art robotics lab and advanced coding programs, students from primary to secondary level are gaining hands-on experience with the technologies that will shape their futures.</p>
        <p>Our dedicated faculty members have undergone specialized training to deliver engaging, technology-enhanced lessons that make learning both fun and impactful.</p>`
    },
    {
        id: 1,
        category: "events",
        tag: "School News",
        title: "Children's Day 2025: A Celebration of Joy and Creativity",
        date: "May 27, 2025",
        readTime: 4,
        img: "childrens day.webp",
        excerpt: "Our students participated in various activities that showcased their talents.",
        content: `<p>Children's Day 2025 was a spectacular celebration at Latter Glory Academy! Our students participated in various activities that showcased their talents and creativity.</p>
        <p>The day began with a special assembly where students performed poems, songs, and dances celebrating childhood. The highlight of the event was the art exhibition featuring masterpieces created by our young artists.</p>`
    },
    {
        id: 2,
        category: "sports",
        tag: "Sports",
        title: "Inter-House Sports: LGA Eagles Clinch Championship Title",
        date: "Feb 15, 2026",
        readTime: 3,
        img: "sport11.webp",
        excerpt: "Our athletes showcase incredible talent and teamwork.",
        content: `<p>In an action-packed finale, the LGA Eagles emerged victorious in this year's Inter-House Sports Competition. The team displayed exceptional athleticism and teamwork throughout the event.</p>
        <p>Our athletes competed in various events including track and field, relay races, and team sports. The competition was fierce but friendly, with all participants demonstrating great sportsmanship.</p>`
    },
    {
        id: 3,
        category: "academics",
        tag: "Academics",
        title: "The Power of Music in Early Childhood Development",
        date: "Jan 15, 2026",
        readTime: 4,
        img: "latter-music1.webp",
        excerpt: "Music education plays a crucial role in the holistic development of children.",
        content: `<p>Music education plays a crucial role in the holistic development of children. At Latter Glory Academy, we believe in nurturing musical talents from an early age.</p>
        <p>Our comprehensive music program introduces students to various instruments and musical concepts. Research shows that children who receive music education develop better cognitive abilities.</p>`
    },
    {
        id: 4,
        category: "events",
        tag: "News",
        title: "Career Day 2026: Inspiring Future Professionals",
        date: "Feb 25, 2026",
        readTime: 4,
        img: "event2.webp",
        excerpt: "Professionals from various fields share their experiences.",
        content: `<p>Our annual Career Day brought together professionals from various fields to share their experiences and insights with our students.</p>
        <p>Guest speakers included doctors, lawyers, engineers, entrepreneurs, and tech professionals who inspired students to dream big and work towards their goals.</p>`
    },
    {
        id: 5,
        category: "admissions",
        tag: "Admissions",
        title: "Enrollment Opens for 2026/2027 Academic Session",
        date: "Jan 01, 2026",
        readTime: 3,
        img: "new.webp",
        excerpt: "Latter Glory Academy continues to be the preferred choice for quality education.",
        content: `<p>We are now accepting applications for the 2026/2027 academic session! Latter Glory Academy continues to be the preferred choice for quality education in Ogbomoso.</p>
        <p>Our admission process is designed to identify students who will thrive in our nurturing academic environment.</p>`
    },
    {
        id: 6,
        category: "academics",
        tag: "Academics",
        title: "Science Fair 2026: Young Inventors Showcase Their Projects",
        date: "Mar 15, 2026",
        readTime: 4,
        img: "new.webp",
        excerpt: "Students from all grade levels presented their projects spanning physics and chemistry.",
        content: `<p>Our annual Science Fair was a remarkable display of scientific curiosity and innovation! Students from all grade levels presented their projects.</p>
        <p>Highlights included a working model of a solar-powered water purification system and experiments demonstrating renewable energy concepts.</p>`
    },
    {
        id: 7,
        category: "sports",
        tag: "Sports",
        title: "LGA Badminton Team Wins State Championship",
        date: "Mar 20, 2026",
        readTime: 3,
        img: "sport11.webp",
        excerpt: "Congratulations to our badminton team for winning the Oyo State Championship!",
        content: `<p>Congratulations to our badminton team for winning the Oyo State Secondary Schools Badminton Championship!</p>
        <p>The team trained diligently under the guidance of our experienced coaches and demonstrated exceptional skill.</p>`
    },
    {
        id: 8,
        category: "events",
        tag: "Clubs",
        title: "Debate Club Wins Regional Competition",
        date: "Feb 28, 2026",
        readTime: 4,
        img: "new.webp",
        excerpt: "Our debate club has done it again!",
        content: `<p>Our debate club has done it again! The team recently won the Regional Secondary Schools Debate Competition.</p>
        <p>Students argued convincingly on topics ranging from climate change to the future of education.</p>`
    }
];

// Carousel data
const carouselData = [
    { img: "latter-glory-geniuses.webp", tag: "Innovation", title: "Empowering Future Leaders through Digital Innovation", desc: "Inside the LGA Creative Suite and Robotics Lab." },
    { img: "event2.webp", tag: "Academics", title: "Career Day 2026: Inspiring Tomorrow's Leaders", desc: "Professionals from various fields share their experiences." },
    { img: "sport11.webp", tag: "Sports", title: "Inter-House Sports: Champions of Excellence", desc: "Our athletes showcase incredible talent and teamwork." }
];

// Upcoming events
const upcomingEvents = [
    { date: "15", month: "Mar", title: "Science Fair", desc: "Annual Science Fair Competition" },
    { date: "20", month: "Mar", title: "Sports Day", desc: "Inter-House Sports Competition" },
    { date: "05", month: "Apr", title: "Parent-Teacher", desc: "Conference Meeting" }
];

// ==================== State ====================
let currentSlide = 0;
let currentFilter = 'all';
let searchQuery = '';
let currentPostId = null;
let currentLimit = 6;
let postComments = {};

// ==================== DOM Ready ====================
document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    initTheme();
    initCarousel();
    renderBlogPosts();
    renderSidebar();
    initFilters();
    initSearch();
    initLoadMore();
    initNewsletter();
    initModal();
    initScrollProgress();
    initMobileMenu();
    initAOS();
});

// ==================== Preloader ====================
function initPreloader() {
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('hidden');
        }
    }, 1500);
}

// ==================== Theme ====================
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
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        const icon = themeBtn.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
        }
    }
}

// ==================== Carousel ====================
function initCarousel() {
    renderCarousel();
    
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    
    if (prevBtn) prevBtn.addEventListener('click', () => changeSlide(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeSlide(1));
    
    // Auto-advance every 6 seconds
    setInterval(() => changeSlide(1), 6000);
}

function renderCarousel() {
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
        dots.innerHTML = carouselData.map((_, index) => `
            <button class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></button>
        `).join('');
        
        dots.querySelectorAll('.carousel-dot').forEach(dot => {
            dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.index)));
        });
    }
}

function changeSlide(direction) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    
    currentSlide = (currentSlide + direction + slides.length) % slides.length;
    
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    
    currentSlide = index;
    
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
}

// ==================== Blog Posts ====================
function renderBlogPosts() {
    const grid = document.getElementById('blogGrid');
    if (!grid) return;
    
    const filtered = blogData.filter(post => {
        const matchesFilter = currentFilter === 'all' || post.category === currentFilter;
        const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });
    
    const postsToShow = filtered.slice(0, currentLimit);
    
    grid.innerHTML = postsToShow.map((post, index) => `
        <article class="blog-card" onclick="openPost(${post.id})" data-aos="fade-up" data-aos-delay="${index * 100}">
            <div class="card-image">
                <img src="${post.img}" alt="${post.title}" loading="lazy">
                <span class="card-category">${post.tag}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${post.title}</h3>
                <p class="card-excerpt">${post.excerpt}</p>
                <div class="card-meta">
                    <span><i class="bi bi-calendar3"></i> ${post.date}</span>
                    <span><i class="bi bi-clock"></i> ${post.readTime} min</span>
                </div>
            </div>
        </article>
    `).join('');
    
    // Show/hide load more button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.classList.toggle('hidden', currentLimit >= filtered.length);
    }
}

// ==================== Sidebar ====================
function renderSidebar() {
    renderPopularPosts();
    renderUpcomingEvents();
}

function renderPopularPosts() {
    const container = document.getElementById('popularPosts');
    if (!container) return;
    
    const popular = [...blogData].sort(() => Math.random() - 0.5).slice(0, 3);
    
    container.innerHTML = popular.map(post => `
        <div class="popular-post" onclick="openPost(${post.id})">
            <img src="${post.img}" alt="${post.title}">
            <div class="popular-post-info">
                <h4>${post.title}</h4>
                <span>${post.date}</span>
            </div>
        </div>
    `).join('');
}

function renderUpcomingEvents() {
    const container = document.getElementById('eventsList');
    if (!container) return;
    
    container.innerHTML = upcomingEvents.map(event => `
        <div class="event-item">
            <div class="event-date">
                <span class="day">${event.date}</span>
                <span class="month">${event.month}</span>
            </div>
            <div class="event-info">
                <h4>${event.title}</h4>
                <span>${event.desc}</span>
            </div>
        </div>
    `).join('');
}

// ==================== Filters & Search ====================
function initFilters() {
    const filterPills = document.querySelectorAll('.filter-pill');
    
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
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

// ==================== Modal ====================
function initModal() {
    const modal = document.getElementById('postModal');
    const closeBtn = document.getElementById('modalClose');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
    
    // Comment form
    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', handleCommentSubmit);
    }
}

function openPost(id) {
    const post = blogData.find(p => p.id === id);
    if (!post) return;
    
    currentPostId = id;
    
    // Update modal content
    document.getElementById('modalImg').src = post.img;
    document.getElementById('modalCategory').textContent = post.tag;
    document.getElementById('modalTitle').textContent = post.title;
    document.getElementById('modalDate').textContent = post.date;
    document.getElementById('modalReadTime').textContent = post.readTime + ' min read';
    document.getElementById('modalBody').innerHTML = post.content;
    
    // Load comments
    loadComments(id);
    
    // Load related posts
    renderRelatedPosts(post);
    
    // Track view
    const views = incrementViewCount(id);
    document.getElementById('modalViews').textContent = views;
    
    // Show modal
    const modal = document.getElementById('postModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('postModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    currentPostId = null;
}

function renderRelatedPosts(post) {
    const grid = document.getElementById('relatedGrid');
    if (!grid) return;
    
    const related = blogData.filter(p => p.category === post.category && p.id !== post.id).slice(0, 3);
    
    if (related.length === 0) {
        grid.parentElement.style.display = 'none';
        return;
    }
    
    grid.parentElement.style.display = 'block';
    grid.innerHTML = related.map(p => `
        <div class="related-item" onclick="openPost(${p.id})">
            <img src="${p.img}" alt="${p.title}">
            <h4>${p.title}</h4>
        </div>
    `).join('');
}

// ==================== Comments ====================
function loadComments(postId) {
    const list = document.getElementById('commentsList');
    const count = document.getElementById('commentCount');
    
    if (!list) return;
    
    const comments = postComments[postId] || [];
    
    if (count) count.textContent = comments.length;
    
    if (comments.length === 0) {
        list.innerHTML = '<p class="no-comments">No comments yet. Be the first to share your thoughts!</p>';
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
    
    if (!postComments[currentPostId]) {
        postComments[currentPostId] = [];
    }
    
    postComments[currentPostId].push({
        name,
        text,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    });
    
    loadComments(currentPostId);
    
    if (nameInput) nameInput.value = '';
    if (textInput) textInput.value = '';
    
    showToast('Comment posted successfully!', 'success');
}

function incrementViewCount(postId) {
    const key = `post_views_${postId}`;
    const views = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, views.toString());
    return views;
}

// ==================== Newsletter ====================
function initNewsletter() {
    const form = document.getElementById('newsletterForm');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('emailInput');
            const email = emailInput?.value?.trim();
            
            if (!email || !email.includes('@')) {
                showToast('Please enter a valid email address', 'error');
                return;
            }
            
            // Simulate subscription (in production, send to backend)
            console.log('Newsletter subscription:', email);
            
            showToast('Thank you for subscribing!', 'success');
            
            if (emailInput) emailInput.value = '';
        });
    }
}

// ==================== Sharing ====================
function shareArticle(platform) {
    const post = blogData.find(p => p.id === currentPostId);
    if (!post) return;
    
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(post.title);
    
    let shareUrl;
    
    switch (platform) {
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${text}%20${url}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
            break;
        case 'copy':
            navigator.clipboard.writeText(window.location.href);
            showToast('Link copied to clipboard!', 'success');
            return;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

function printArticle() {
    const post = blogData.find(p => p.id === currentPostId);
    if (!post) return;
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${post.title} - Latter Glory Academy</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                h1 { color: #b71c1c; }
                .meta { color: #666; margin-bottom: 20px; }
                .content { line-height: 1.8; }
            </style>
        </head>
        <body>
            <h1>${post.title}</h1>
            <div class="meta">
                <span>${post.date}</span> | <span>${post.readTime} min read</span> | <span>${post.tag}</span>
            </div>
            <div class="content">
                ${post.content}
            </div>
            <hr>
            <p style="color: #666; font-size: 12px;">
                Published by Latter Glory Academy - Building Tomorrow's Leaders<br>
                www.latterglory.com.ng
            </p>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    }
}

// ==================== Scroll Progress ====================
function initScrollProgress() {
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = scrolled + '%';
        }
    });
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        }
    });
}

// ==================== Mobile Menu ====================
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('mobile-open');
        });
        
        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('mobile-open');
            });
        });
    }
}

// ==================== AOS ====================
function initAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            offset: 100
        });
    }
}

// ==================== Toast ====================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.className = 'toast show ' + type;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ==================== Global Functions ====================
window.openPost = openPost;
window.closeModal = closeModal;
window.shareArticle = shareArticle;
window.printArticle = printArticle;

