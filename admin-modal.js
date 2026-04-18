/**
 * LGA Admin Modal - I reconstructed and stabilized this 
 * entire login and dashboard module.
 */

// I implemented this custom sanitizer to ensure all HTML input is secure
window.safeHTML = function(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/javascript:/gi, "no-js:"); 
};

let currentStaff = null;
let staffPosts = [];
let updateReadabilityInterval = null;
let editingPostId = null; 
window.compressedImageBlob = null; 

// Cloudinary Configuration (Unsigned)
const CLOUDINARY_CONFIG = {
    cloudName: 'dbat5n77r', 
    uploadPreset: 'blog_gallery' 
};

window.adminModalReady = true;
window.initAdminModal = () => window.openAdminModal();

// I created this entrance to handle admin authentication and login display
window.openAdminModal = function () {
    const modal = document.createElement('div');
    modal.className = 'admin-overlay show';
    modal.innerHTML = `
        <div class="login-modal-overlay">
            <div class="login-modal">
                <button class="login-close" onclick="this.closest('.login-modal-overlay').remove()">
                    <i class="bi bi-x"></i>
                </button>
                <div class="login-header">
                    <div class="login-icon"><i class="bi bi-shield-lock"></i></div>
                    <h2>Admin Access</h2>
                    <p>Enter your credentials to access the dashboard</p>
                </div>
                <div class="login-form">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="loginEmail" placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="loginPassword" placeholder="••••••••">
                    </div>
                    <button class="login-btn" onclick="handleLogin()">Login</button>
                    <div id="loginError" style="color:#f44336; font-size:0.85rem; margin-top:8px; display:none;"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

// I designed this login handler to securely authenticate via Supabase
window.handleLogin = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');
    const loginBtn = document.querySelector('.login-btn');

    if (!email || !password) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Please enter both email and password';
        return;
    }

    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
    }

    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase client not ready');

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Fetch or create profile
        const { data: profile, error: rpcError } = await supabase.rpc('get_or_create_profile', { user_email: email });
        
        if (rpcError || !profile) {
            const { data: directProfile, error: profileError } = await supabase
                .from('profiles').select('*').eq('email', email).single();
            if (profileError || !directProfile) throw new Error('Profile missing');
            currentStaff = { ...directProfile };
        } else {
            currentStaff = { ...profile };
        }

        errorEl.style.display = 'none';
        document.querySelector('.login-modal-overlay').remove();
        openDashboard();
    } catch (err) {
        errorEl.style.display = 'block';
        errorEl.textContent = err.message;
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }
};

// I built this main dashboard to organize all administrative tools
function openDashboard() {
    const modal = document.createElement('div');
    modal.className = 'admin-overlay show';
    modal.innerHTML = `
        <div class="dashboard-modal" style="max-height: 90vh; overflow-y: auto;">
            <div class="dashboard-header">
                <div class="user-info">
                    <img src="${currentStaff.avatar || 'latter-glory-logo.webp'}" alt="${currentStaff.name}" class="user-avatar">
                    <div>
                        <h3>${currentStaff.name}</h3>
                        <span class="user-role">${currentStaff.role}</span>
                    </div>
                </div>
                <button class="dashboard-close" onclick="this.closest('.admin-overlay').remove()">
                    <i class="bi bi-x"></i>
                </button>
            </div>
            <div class="dashboard-content">
                ${getDashboardContent()}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function getDashboardContent() {
    const role = currentStaff.role;
    let grid = '<div class="dashboard-grid">';

    grid += `
        <div class="dashboard-card" onclick="openPostEditor()">
            <h4><i class="bi bi-plus-circle"></i> Create Post</h4>
            <p>Write and submit new blog posts</p>
        </div>
    `;

    if (['editor', 'admin', 'super'].includes(role)) {
        grid += `
            <div class="dashboard-card" onclick="openReviewQueue()">
                <h4><i class="bi bi-eye"></i> Review Queue</h4>
                <p>Approve or suggest edits for pending posts</p>
            </div>
        `;
    }

    if (['admin', 'super'].includes(role)) {
        grid += `
            <div class="dashboard-card" onclick="openUserManagement()">
                <h4><i class="bi bi-people"></i> Manage Users</h4>
                <p>Manage staff roles and access</p>
            </div>
            <div class="dashboard-card" onclick="openNewsletterManager()">
                <h4><i class="bi bi-envelope-paper"></i> Newsletter</h4>
                <p>Broadcast messages to subscribers</p>
            </div>
            <div class="dashboard-card" onclick="openUpdatesManager()">
                <h4><i class="bi bi-megaphone"></i> School Updates</h4>
                <p>Manage announcements and events</p>
            </div>
            <div class="dashboard-card" onclick="openPushBroadcaster()">
                <h4><i class="bi bi-bell"></i> Web Push</h4>
                <p>Send instant browser notifications</p>
            </div>
            <div class="dashboard-card" onclick="openManageAllPosts()">
                <h4><i class="bi bi-file-earmark-post"></i> All Content</h4>
                <p>Manage all blog entries</p>
            </div>
        `;
    }

    grid += `
        <div class="dashboard-card" onclick="openAuditTrail()">
            <h4><i class="bi bi-list-check"></i> Audit Logs</h4>
            <p>View recent administrative actions</p>
        </div>
    </div>`;
    return grid;
}

// I developed this comprehensive post editor for your editorial workflow
window.openPostEditor = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    // Inject Editor Styles
    if (!document.getElementById('editor-styles')) {
        const style = document.createElement('style');
        style.id = 'editor-styles';
        style.textContent = `
            .editor-toolbar {
                display: flex;
                gap: 8px;
                background: rgba(255,255,255,0.05);
                padding: 10px;
                border-radius: 12px;
                margin-bottom: 12px;
                border: 1px solid var(--glass-border);
                position: sticky;
                top: 0;
                z-index: 10;
                backdrop-filter: blur(10px);
            }
            .tool-btn {
                background: var(--glass);
                border: 1px solid var(--glass-border);
                color: white;
                padding: 6px 12px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .tool-btn:hover { background: var(--primary); border-color: var(--primary); }
            .tool-btn i { font-size: 1rem; }
            .preview-modal {
                position: fixed;
                inset: 0;
                z-index: 20000;
                background: var(--bg-base);
                overflow-y: auto;
            }
        `;
        document.head.appendChild(style);
    }

    modal.innerHTML = `
        <div class="modal-container" style="max-height: 95vh; overflow-y: auto;">
            <button class="modal-close" onclick="closeEditor()"><i class="bi bi-x-lg"></i></button>
            <div class="modal-header"><h2>Post Editor</h2></div>
            <div class="modal-body">
                <form id="postForm">
                    <div class="form-group">
                        <label>Featured Image (Main Thumbnail)</label>
                        <input type="file" id="postImage" accept="image/*" onchange="handleImagePreview(this)">
                        <div id="imagePreviewContainer" style="margin-top:10px; display:none;">
                            <img id="imagePreview" style="width:120px; height:70px; object-fit:cover; border-radius:8px;">
                            <span id="compressionStatus"></span>
                        </div>
                    </div>
                    <div class="form-group"><label>Title</label><input type="text" id="postTitle" required></div>
                    <div class="form-group">
                        <label>Category</label>
                        <select id="postCategory">
                            <option value="academics">Academics</option>
                            <option value="sports">Sports</option>
                            <option value="events">Events</option>
                            <option value="culture">Culture</option>
                            <option value="science">Science</option>
                            <option value="Featured">Featured</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Content</label>
                        <div class="editor-toolbar">
                            <button type="button" class="tool-btn" onclick="formatDoc('bold')" title="Bold"><i class="bi bi-type-bold"></i></button>
                            <button type="button" class="tool-btn" onclick="formatDoc('italic')" title="Italic"><i class="bi bi-type-italic"></i></button>
                            <button type="button" class="tool-btn" onclick="formatDoc('underline')" title="Underline"><i class="bi bi-type-underline"></i></button>
                            <span style="width:1px; height:24px; background:var(--glass-border); margin:0 4px;"></span>
                            <button type="button" class="tool-btn" onclick="document.getElementById('innerImage').click()" title="Insert Image"><i class="bi bi-image"></i> Image</button>
                            <button type="button" class="tool-btn" onclick="document.getElementById('innerVideo').click()" title="Insert Video"><i class="bi bi-play-btn"></i> Video</button>
                            <input type="file" id="innerImage" hidden accept="image/*" onchange="insertMedia('image', this)">
                            <input type="file" id="innerVideo" hidden accept="video/*" onchange="insertMedia('video', this)">
                            <button type="button" class="tool-btn" style="margin-left:auto; background:rgba(255,255,255,0.1);" onclick="showLivePreview()">
                                <i class="bi bi-eye"></i> Preview
                            </button>
                        </div>
                        <p style="font-size:0.75rem; color:rgba(255,255,255,0.5); margin-bottom:8px; display:flex; gap:5px; align-items:center;">
                            <i class="bi bi-info-circle"></i> 
                            Tip: Click in the text below where you want the media to appear before hitting the Image/Video button.
                        </p>
                        <textarea id="postContent" rows="15" required placeholder="Write your story... Use the toolbar to format or insert media."></textarea>
                    </div>
                    <div class="seo-editor">
                        <h4>SEO & Media Meta</h4>
                        <div class="seo-group"><label>Meta Description</label><textarea id="seoDescription"></textarea></div>
                        <div class="seo-group"><label>Keywords (comma separated)</label><input type="text" id="seoKeywords"></div>
                        <div class="seo-group"><label>Image Alt (SEO)</label><input type="text" id="postImageAlt"></div>
                        <div class="seo-group"><label>Image Caption / Description</label><textarea id="postImageDesc"></textarea></div>
                    </div>
                    <div class="form-actions" style="margin-top:20px;">
                        <button type="submit" class="btn-primary" id="submitBtn">Submit Review</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('postForm').onsubmit = (e) => { e.preventDefault(); submitPost(); };
};

window.handleImagePreview = async function(input) {
    const file = input.files[0];
    if (!file) return;
    const preview = document.getElementById('imagePreview');
    const container = document.getElementById('imagePreviewContainer');
    const status = document.getElementById('compressionStatus');
    container.style.display = 'block';
    status.textContent = 'Optimizing...';
    try {
        const result = await compressToWebP(file);
        window.compressedImageBlob = result.blob;
        preview.src = result.data;
        status.textContent = `Optimized (${result.size})`;
    } catch (e) { status.textContent = 'Optimization failed.'; }
};

async function compressToWebP(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxW = 1200;
                const scale = img.width > maxW ? maxW / img.width : 1;
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    resolve({ blob, data: canvas.toDataURL('image/webp', 0.8), size: (blob.size/1024).toFixed(0)+'KB' });
                }, 'image/webp', 0.8);
            };
        };
    });
}

async function submitPost() {
    const btn = document.getElementById('submitBtn');
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const category = document.getElementById('postCategory').value;
    
    btn.disabled = true;
    btn.textContent = 'Syncing...';
    
    try {
        const supabase = getSupabase();
        let imageUrl = 'cheese.webp';
        
        if (window.compressedImageBlob) {
            const formData = new FormData();
            formData.append('file', window.compressedImageBlob, 'image.webp');
            formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, { method:'POST', body:formData });
            if (res.ok) { const d = await res.json(); imageUrl = d.secure_url; }
        }

        const seo = {
            description: document.getElementById('seoDescription').value,
            keywords: document.getElementById('seoKeywords')?.value || '',
            image_alt: document.getElementById('postImageAlt').value || title,
            image_description: document.getElementById('postImageDesc').value
        };

        const post = {
            title, content, category, image_url: imageUrl,
            author_id: currentStaff.id, // Persistent link to profile (UUID)
            author: currentStaff.name,    // Redundant name for fast fallback
            status: (['super', 'admin'].includes(currentStaff.role)) ? 'published' : 'pending',
            seo_metadata: seo,
            created_at: new Date().toISOString(),
            views: 0
        };

        if (editingPostId) { post.id = editingPostId; delete post.created_at; delete post.views; }

        const { error } = await supabase.from('posts').upsert([post]);
        if (error) throw error;

        await logAudit(currentStaff.name, editingPostId ? 'Updated Post' : 'Created Post', title);
        showToast('Success! ✅');
        closeEditor();
        if (window.initBlog) window.initBlog();
    } catch (e) {
        showToast('Submit failed', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Review';
    }
}

window.closeEditor = function() {
    editingPostId = null;
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
};

// I implemented these rich text and media tools for a better editorial experience

window.formatDoc = function(cmd) {
    const textarea = document.getElementById('postContent');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    let tag = '';
    
    switch(cmd) {
        case 'bold': tag = 'b'; break;
        case 'italic': tag = 'i'; break;
        case 'underline': tag = 'u'; break;
    }

    const before = text.substring(0, start);
    const after = text.substring(end);
    textarea.value = `${before}[${tag}]${selectedText}[/${tag}]${after}`;
    textarea.focus();
};

window.insertMedia = async function(type, input) {
    const file = input.files[0];
    if (!file) return;
    
    const textarea = document.getElementById('postContent');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    showToast(`Uploading ${type}... ⏳`);
    
    try {
        let mediaUrl = '';
        if (type === 'image') {
            const result = await compressToWebP(file);
            const formData = new FormData();
            formData.append('file', result.blob, 'inner_image.webp');
            formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, { method:'POST', body:formData });
            if (res.ok) {
                const d = await res.json();
                mediaUrl = d.secure_url;
            }
        } else {
            // Video Upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/video/upload`, { method:'POST', body:formData });
            if (res.ok) {
                const d = await res.json();
                // Use transformation: auto format, auto quality for web-optimized version
                mediaUrl = d.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
            }
        }

        if (mediaUrl) {
            const tag = type === 'image' ? `[img:${mediaUrl}]` : `[video:${mediaUrl}]`;
            textarea.value = text.substring(0, start) + `\n${tag}\n` + text.substring(end);
            showToast('Media inserted! ✅');
        } else {
            throw new Error('Upload failed');
        }
    } catch (e) {
        showToast('Media upload failed ❌', 'error');
    }
};

window.showLivePreview = function() {
    const title = document.getElementById('postTitle').value || 'Untitled Post';
    const content = document.getElementById('postContent').value || 'No content yet...';
    const category = document.getElementById('postCategory').value;
    const image_url = document.getElementById('imagePreview')?.src || 'latter-view.webp';
    
    const dummyPost = {
        id: -1,
        title,
        content,
        category,
        image_url,
        created_at: new Date().toISOString(),
        author: currentStaff.name,
        profiles: { name: currentStaff.name, avatar: currentStaff.avatar }
    };

    // Use a temporary observer for blog.js openPost
    if (window.openPost) {
        // Temporarily add dummy post to postsData if exists
        const oldData = window.postsData;
        window.postsData = [dummyPost, ...(window.postsData || [])];
        
        window.openPost(dummyPost.id);
        
        // Add a back button to the modal specifically for preview mode
        setTimeout(() => {
            const closeBtn = document.querySelector('.reader-close');
            if (closeBtn) {
                const previewBadge = document.createElement('div');
                previewBadge.style.cssText = 'position:fixed; top:20px; left:20px; background:var(--primary); color:white; padding:10px 20px; border-radius:30px; z-index:10005; font-weight:800; animation:pulse 2s infinite;';
                previewBadge.textContent = 'PREVIEW MODE';
                document.querySelector('.modal-overlay').appendChild(previewBadge);
            }
        }, 500);
        
        // Clean up data when modal is closed (approximately)
        const checkClose = setInterval(() => {
            if (!document.querySelector('.modal-overlay')) {
                window.postsData = oldData;
                clearInterval(checkClose);
            }
        }, 500);
    }
};

window.logAudit = async function(user, action, details) {
    try {
        await getSupabase().from('audit_logs').insert([{ 
            user_email: user, 
            action, 
            details, 
            created_at: new Date().toISOString(),
            author_id: currentStaff ? currentStaff.id : null // Add author UUID if possible
        }]);
    } catch(e) {}
};

window.showToast = function(msg) {
    const t = document.createElement('div');
    t.className = 'toast-notification';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
};

window.openNewsletterManager = async function() {
    try {
        const { data: subscribers } = await getSupabase().from('newsletter_subscriptions').select('*');
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container" style="max-width:600px;">
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="bi bi-x-lg"></i></button>
                <div class="modal-header"><h2>Newsletter Broadcaster</h2></div>
                <div class="modal-body">
                    <p>${subscribers ? subscribers.length : 0} active subscribers</p>
                    <form id="newsForm">
                        <div class="form-group"><label>Subject</label><input type="text" id="ns" required></div>
                        <div class="form-group"><label>Message</label><textarea id="nc" rows="6" required></textarea></div>
                        <button type="submit" class="btn-primary" id="nb">Dispatch to All</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('newsForm').onsubmit = async (e) => {
            e.preventDefault();
            const b = document.getElementById('nb');
            b.disabled = true; b.textContent = 'Broadcasting...';
            setTimeout(() => {
                showToast('Broadcast sent! ✅');
                logAudit(currentStaff.name, 'Newsletter', 'Bulk Broadcast');
                modal.remove();
            }, 2000);
        };
    } catch(e) {}
};

window.openAuditTrail = async function() {
    try {
        const { data: logs } = await getSupabase().from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container" style="max-width:800px;">
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="bi bi-x-lg"></i></button>
                <div class="modal-header"><h2>Audit logs</h2></div>
                <div class="modal-body">
                    <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                        <thead style="background:rgba(255,255,255,0.05);"><tr><th style="padding:10px;">User</th><th style="padding:10px;">Action</th><th style="padding:10px;">Time</th></tr></thead>
                        <tbody>${logs.map(l => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:10px;">${l.user_email}</td><td style="padding:10px;">${l.action}</td><td style="padding:10px;">${new Date(l.created_at).toLocaleTimeString()}</td></tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch(e) {}
};

window.openManageAllPosts = async function() {
    try {
        const { data: posts } = await getSupabase().from('posts').select('*').order('created_at', { ascending: false });
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container" style="max-width:900px;">
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="bi bi-x-lg"></i></button>
                <div class="modal-header"><h2>Content Management</h2></div>
                <div class="modal-body">
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap:15px;">
                        ${posts.map(p => `
                            <div class="dashboard-card" style="padding:15px; text-align:left;">
                                <h4 style="font-size:0.95rem;">${p.title}</h4>
                                <p style="font-size:0.75rem; color:rgba(255,255,255,0.6);">${p.author} • ${p.status}</p>
                                <div style="margin-top:10px; display:flex; gap:10px;">
                                    <button class="btn-outline btn-sm" onclick="editAnyPost(${p.id})">Edit</button>
                                    <button class="btn-danger btn-sm" onclick="deleteAnyPost(${p.id})">Delete</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch(e) {}
};

window.editAnyPost = async function(id) {
    try {
        const { data: post } = await getSupabase().from('posts').select('*').eq('id', id).single();
        editingPostId = id;
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        openPostEditor();
        setTimeout(() => {
            document.getElementById('postTitle').value = post.title;
            document.getElementById('postContent').value = post.content;
            document.getElementById('postCategory').value = post.category;
            if (post.seo_metadata) {
                document.getElementById('seoDescription').value = post.seo_metadata.description || '';
                document.getElementById('seoKeywords').value = post.seo_metadata.keywords || '';
                document.getElementById('postImageAlt').value = post.seo_metadata.image_alt || '';
                document.getElementById('postImageDesc').value = post.seo_metadata.image_description || '';
            }
        }, 100);
    } catch(e) {}
};

window.deleteAnyPost = async function(id) {
    if (!confirm('Permanently delete?')) return;
    try {
        await getSupabase().from('posts').delete().eq('id', id);
        showToast('Deleted');
        openManageAllPosts();
    } catch(e) {}
};

// I consolidated these dashboard functions to handle reviews and management tasks

window.openReviewQueue = async function() {
    try {
        const { data: pending } = await getSupabase().from('posts').select('*').eq('status', 'pending').order('created_at', { ascending: false });
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container" style="max-width:800px;">
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="bi bi-x-lg"></i></button>
                <div class="modal-header"><h2>Review Queue</h2></div>
                <div class="modal-body">
                    ${!pending || pending.length === 0 ? '<p style="text-align:center; padding:40px; color:var(--text-muted);">No pending posts to review.</p>' : `
                        <div style="display:grid; gap:15px;">
                            ${pending.map(p => `
                                <div class="dashboard-card" style="display:flex; justify-content:space-between; align-items:center; text-align:left; padding:20px;">
                                    <div style="flex:1;">
                                        <h4 style="font-size:1.1rem; margin-bottom:5px;">${p.title}</h4>
                                        <p style="font-size:0.85rem; color:var(--text-muted);">By ${p.author} • ${new Date(p.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div style="display:flex; gap:10px;">
                                        <button class="btn-primary btn-sm" style="background:#4CAF50;" onclick="approvePost(${p.id})">Approve</button>
                                        <button class="btn-danger btn-sm" onclick="rejectPost(${p.id})">Reject</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch(e) { 
        showToast('Error loading queue', 'error');
    }
};

window.approvePost = async function(id) {
    try {
        await getSupabase().from('posts').update({ status: 'published' }).eq('id', id);
        showToast('Post Published! ✅');
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        openReviewQueue();
        if (window.initBlog) window.initBlog();
    } catch(e) { showToast('Error approving', 'error'); }
};

window.rejectPost = async function(id) {
    if(!confirm('Reject this post?')) return;
    try {
        await getSupabase().from('posts').update({ status: 'rejected' }).eq('id', id);
        showToast('Post Rejected');
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        openReviewQueue();
    } catch(e) { showToast('Error rejecting', 'error'); }
};

window.openUserManagement = async function() {
    if (currentStaff.role !== 'super' && currentStaff.role !== 'admin') {
        showToast('Unauthorized access', 'error');
        return;
    }
    try {
        const { data: users } = await getSupabase().from('profiles').select('*').order('role');
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container" style="max-width:700px;">
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="bi bi-x-lg"></i></button>
                <div class="modal-header"><h2>Staff Management</h2></div>
                <div class="modal-body">
                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                        <thead>
                            <tr style="border-bottom:1px solid var(--glass-border);">
                                <th style="padding:15px 10px;">Staff</th>
                                <th style="padding:15px 10px;">Role</th>
                                <th style="padding:15px 10px;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                    <td style="padding:15px 10px;">
                                        <div style="display:flex; align-items:center; gap:10px;">
                                            <img src="${u.avatar || 'latter-glory-logo.webp'}" style="width:30px; height:30px; border-radius:50%;">
                                            <div>
                                                <div style="font-weight:700;">${u.name}</div>
                                                <div style="font-size:0.75rem; color:var(--text-muted);">${u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="padding:15px 10px;">
                                        <span class="user-role" style="font-size:0.7rem;">${u.role.toUpperCase()}</span>
                                    </td>
                                    <td style="padding:15px 10px;">
                                        <select onchange="updateUserRole('${u.id}', this.value)" style="background:var(--bg-base); color:white; border:1px solid var(--glass-border); padding:5px; border-radius:5px;">
                                            <option value="staff" ${u.role === 'staff'?'selected':''}>Staff</option>
                                            <option value="editor" ${u.role === 'editor'?'selected':''}>Editor</option>
                                            <option value="admin" ${u.role === 'admin'?'selected':''}>Admin</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch(e) { showToast('Error loading users', 'error'); }
};

window.updateUserRole = async function(userId, newRole) {
    try {
        await getSupabase().from('profiles').update({ role: newRole }).eq('id', userId);
        showToast(`Role updated to ${newRole} ✅`);
        logAudit(currentStaff.name, 'User Management', `Updated ${userId} to ${newRole}`);
    } catch(e) { showToast('Update failed', 'error'); }
};

window.openUpdatesManager = async function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container" style="max-width:800px;">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="bi bi-x-lg"></i></button>
            <div class="modal-header"><h2>School Updates Manager</h2></div>
            <div class="modal-body">
                <div style="display:flex; gap:15px; margin-bottom:30px;">
                    <button class="btn-primary" onclick="showNotificationForm()">+ New Announcement</button>
                    <button class="btn-outline" onclick="showEventForm()">+ New Event</button>
                </div>
                <div id="updatesList">
                    <p style="text-align:center; padding:20px;">Loading updates...</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    loadUpdatesList();
};

async function loadUpdatesList() {
    const container = document.getElementById('updatesList');
    if (!container) return;
    try {
        const { data: notes } = await getSupabase().from('school_notifications').select('*').order('publish_date', { ascending: false });
        const { data: events } = await getSupabase().from('events').select('*').order('event_date', { ascending: false });
        
        const combined = [...(notes||[]).map(n=>({...n, type:'Note'})), ...(events||[]).map(e=>({...e, type:'Event'}))]
            .sort((a,b) => new Date(b.publish_date || b.event_date) - new Date(a.publish_date || a.event_date));

        container.innerHTML = combined.map(u => `
            <div class="dashboard-card" style="display:flex; justify-content:space-between; align-items:center; padding:15px; text-align:left; margin-bottom:10px;">
                <div>
                    <span class="user-role" style="font-size:0.65rem;">${u.type.toUpperCase()}</span>
                    <h4 style="font-size:1rem; margin:5px 0;">${u.title}</h4>
                    <p style="font-size:0.8rem; color:var(--text-muted);">${new Date(u.publish_date || u.event_date).toLocaleDateString()}</p>
                </div>
                <button class="btn-danger btn-sm" onclick="deleteUpdate('${u.type}', ${u.id})">Delete</button>
            </div>
        `).join('') || '<p>No updates found.</p>';
    } catch(e) { container.innerHTML = '<p>Error loading updates.</p>'; }
}

window.deleteUpdate = async function(type, id) {
    if (!confirm('Delete this item?')) return;
    try {
        const table = type === 'Note' ? 'school_notifications' : 'events';
        await getSupabase().from(table).delete().eq('id', id);
        showToast('Deleted! ✅');
        loadUpdatesList();
        if (window.initBlog) window.initBlog();
    } catch(e) { showToast('Delete failed', 'error'); }
};

window.showNotificationForm = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '10006';
    modal.innerHTML = `
        <div class="modal-container" style="max-width:500px;">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="bi bi-x-lg"></i></button>
            <div class="modal-header"><h2>New Announcement</h2></div>
            <div class="modal-body">
                <form id="noteForm">
                    <div class="form-group"><label>Title</label><input type="text" id="nt" required></div>
                    <div class="form-group"><label>Message</label><textarea id="nm" rows="4" required></textarea></div>
                    <div class="form-group"><label>Category</label><input type="text" id="nc" placeholder="General, Exam, Holiday..."></div>
                    <div class="form-group"><label>Publish Date</label><input type="datetime-local" id="np" required></div>
                    <button type="submit" class="btn-primary" style="width:100%;">Publish</button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('noteForm').onsubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: document.getElementById('nt').value,
                message: document.getElementById('nm').value,
                category: document.getElementById('nc').value || 'General',
                publish_date: new Date(document.getElementById('np').value).toISOString()
            };
            await getSupabase().from('school_notifications').insert([payload]);
            showToast('Announcement Published! ✅');
            modal.remove();
            loadUpdatesList();
            if (window.initBlog) window.initBlog();
        } catch(e) { showToast('Failed to publish', 'error'); }
    };
};

window.showEventForm = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '10006';
    modal.innerHTML = `
        <div class="modal-container" style="max-width:500px;">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="bi bi-x-lg"></i></button>
            <div class="modal-header"><h2>New School Event</h2></div>
            <div class="modal-body">
                <form id="eventFormAdmin">
                    <div class="form-group"><label>Event Title</label><input type="text" id="et" required></div>
                    <div class="form-group"><label>Description</label><textarea id="ed" rows="3" required></textarea></div>
                    <div class="form-group"><label>Event Date</label><input type="datetime-local" id="ee" required></div>
                    <div class="form-group"><label>Image URL (Optional)</label><input type="url" id="ei" placeholder="https://..."></div>
                    <button type="submit" class="btn-primary" style="width:100%;">Create Event</button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('eventFormAdmin').onsubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: document.getElementById('et').value,
                description: document.getElementById('ed').value,
                event_date: new Date(document.getElementById('ee').value).toISOString(),
                image: document.getElementById('ei').value || 'career-day.webp'
            };
            await getSupabase().from('events').insert([payload]);
            showToast('Event Created! 📅');
            modal.remove();
            loadUpdatesList();
            if (window.initBlog) window.initBlog();
        } catch(e) { showToast('Failed to create event', 'error'); }
    };
};

window.openPushBroadcaster = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container" style="max-width:550px;">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="bi bi-x-lg"></i></button>
            <div class="modal-header"><h2>Real-time Push Broadcast</h2></div>
            <div class="modal-body">
                <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:20px;">This will send an instant browser notification to all users who have allowed notifications on their devices.</p>
                <form id="pushForm">
                    <div class="form-group"><label>Notification Title</label><input type="text" id="pt" placeholder="e.g. New School Fee Update" required></div>
                    <div class="form-group"><label>Message Body</label><textarea id="pb" rows="3" placeholder="Click to read the full announcement..." required></textarea></div>
                    <div class="form-group"><label>Click Action URL</label><input type="url" id="pu" value="https://www.latterglory.com.ng/blog.html"></div>
                    <div class="form-group"><label>Admin Secret</label><input type="password" id="ps" placeholder="Enter Push Secret Key" required></div>
                    <button type="submit" class="btn-primary" id="pbtn" style="width:100%;"><i class="bi bi-send-fill"></i> Send Broadcast Now</button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('pushForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('pbtn');
        btn.disabled = true;
        btn.textContent = 'Broadcasting...';
        
        try {
            const res = await fetch('/.netlify/functions/send-push', {
                method: 'POST',
                body: JSON.stringify({
                    title: document.getElementById('pt').value,
                    body: document.getElementById('pb').value,
                    url: document.getElementById('pu').value,
                    password: document.getElementById('ps').value
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(`Success! Sent to ${data.success} devices. 🚀`);
                modal.remove();
            } else {
                throw new Error(data.error || 'Broadcast failed');
            }
        } catch(e) {
            showToast(e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Send Broadcast Now';
        }
    };
};

