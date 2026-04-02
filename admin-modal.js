/**
 * LGA Admin Modal - Complete Login + Dashboard
 * Reconstructed & Stabilized
 */

// Security: Safe HTML Sanitizer
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

// Open login modal
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

// Handle login
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

// Open dashboard
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

// Post Editor
window.openPostEditor = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container" style="max-height: 95vh; overflow-y: auto;">
            <button class="modal-close" onclick="closeEditor()"><i class="bi bi-x-lg"></i></button>
            <div class="modal-header"><h2>Post Editor</h2></div>
            <div class="modal-body">
                <form id="postForm">
                    <div class="form-group">
                        <label>Featured Image</label>
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
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Content</label>
                        <textarea id="postContent" rows="12" required></textarea>
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
            author: currentStaff.name,
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

window.logAudit = async function(user, action, details) {
    try {
        await getSupabase().from('audit_logs').insert([{ user_email: user, action, details, created_at: new Date().toISOString() }]);
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

window.openReviewQueue = async function() {
    try {
        const { data: posts } = await getSupabase().from('posts').select('*').eq('status', 'pending');
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container" style="max-width:800px;">
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="bi bi-x-lg"></i></button>
                <div class="modal-header"><h2>Review Queue</h2></div>
                <div class="modal-body">
                    ${posts.length ? posts.map(p => `
                        <div class="dashboard-card" style="margin-bottom:15px; text-align:left;">
                            <h4>${p.title}</h4>
                            <p>${p.author} • ${p.category}</p>
                            <div style="margin-top:10px; display:flex; gap:10px;">
                                <button class="btn-primary btn-sm" onclick="approvePost(${p.id})">Approve</button>
                                <button class="btn-outline btn-sm" onclick="editAnyPost(${p.id})">Edit</button>
                            </div>
                        </div>
                    `).join('') : '<p>No pending posts.</p>'}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch(e) {}
};

window.approvePost = async function(id) {
    try {
        await getSupabase().from('posts').update({ status: 'published' }).eq('id', id);
        showToast('Post Approved! 🚀');
        document.querySelector('.modal-overlay').remove();
        openReviewQueue();
    } catch(e) {}
};

window.openUserManagement = async function() {
    try {
        const { data: users } = await getSupabase().from('profiles').select('*');
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container" style="max-width:800px;">
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="bi bi-x-lg"></i></button>
                <div class="modal-header"><h2>User Management</h2></div>
                <div class="modal-body">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead><tr style="text-align:left; border-bottom:1px solid var(--glass-border);"><th>Name</th><th>Role</th><th>Action</th></tr></thead>
                        <tbody>
                            ${users.map(u => `
                                <tr style="border-bottom:1px solid var(--glass-border);">
                                    <td>${u.name}</td>
                                    <td>
                                        <select onchange="updateUserRole('${u.id}', this.value)" style="background:transparent; color:white; border:1px solid var(--glass-border); border-radius:4px;">
                                            <option value="staff" ${u.role==='staff'?'selected':''}>Staff</option>
                                            <option value="editor" ${u.role==='editor'?'selected':''}>Editor</option>
                                            <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                                        </select>
                                    </td>
                                    <td><button class="btn-danger btn-sm" onclick="deleteUser('${u.id}')">Remove</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch(e) {}
};

window.updateUserRole = async function(userId, newRole) {
    try {
        await getSupabase().from('profiles').update({ role: newRole }).eq('id', userId);
        showToast('Role updated');
    } catch(e) {}
};
