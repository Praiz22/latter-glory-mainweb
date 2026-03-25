/**
 * LGA Admin Modal - Complete Login + Dashboard
 * Fixed - Works on button click!
 */

let currentStaff = null;
let staffPosts = [];
let leaderboard = [];

// Real users already populated via populate-users.js
// No auto-init needed



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
                    <div class="login-icon">
                        <i class="bi bi-shield-lock"></i>
                    </div>
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
                <div class="login-footer">

                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

// Handle login
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!email || !password) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Please enter both email and password';
        return;
    }

    try {
        // Try Supabase authentication first
        const supabase = window.supabase;
        if (supabase && supabase.auth && supabase.from) {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            // Get user profile from Supabase
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();

            if (profileError || !profile) {
                throw new Error('User profile not found');
            }

            currentStaff = {
                username: profile.username,
                password: password, // Keep for fallback
                name: profile.name,
                avatar: profile.avatar,
                role: profile.role
            };

            errorEl.style.display = 'none';
            document.querySelector('.login-modal-overlay').remove();
            openDashboard();
            return;
        }
    } catch (supabaseError) {
        console.log('Supabase auth failed, using fallback:', supabaseError.message);
    }

    // Fallback to local database (if available)
    const db = (typeof staffDatabase !== 'undefined') ? staffDatabase : {};
    const staff = db[email];
    if (!staff || staff.password !== password) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Invalid credentials';
        return;
    }

    currentStaff = staff;
    errorEl.style.display = 'none';
    document.querySelector('.login-modal-overlay').remove();
    openDashboard();
};

// Open dashboard
function openDashboard() {
    const modal = document.createElement('div');
    modal.className = 'admin-overlay show';
    modal.innerHTML = `
        <div class="dashboard-modal">
            <div class="dashboard-header">
                <div class="user-info">
                    <img src="${currentStaff.avatar}" alt="${currentStaff.name}" class="user-avatar">
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

// Get dashboard content based on role
function getDashboardContent() {
    const role = currentStaff.role;
    let content = '';

    // Common sections for all roles
    content += `
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <h4><i class="bi bi-plus-circle"></i> Create Post</h4>
                <p>Write and submit new blog posts</p>
                <button class="card-btn" onclick="openPostEditor()">Create Post</button>
            </div>
    `;

    // Editor-specific sections (Tier 1)
    if (role === 'editor' || role === 'staff') {
        content += `
            <div class="dashboard-card">
                <h4><i class="bi bi-list-stars"></i> My Drafts</h4>
                <p>Manage your drafts and versions</p>
                <button class="card-btn" onclick="openMyDrafts()">My Drafts</button>
            </div>
            <div class="dashboard-card readability-meter-card">
                <h4><i class="bi bi-bar-chart-line"></i> Readability <span id="liveScore">--</span></h4>
                <p>Live analysis (target: 60-70)</p>
                <div class="readability-bar">
                    <div id="readabilityFill" style="width:0%; background:var(--success); height:8px; border-radius:4px; transition:width 0.3s;"></div>
                </div>
                <small>Short sentences, active voice</small>
            </div>
        `;
    }

    // Curator-specific sections (Tier 2)
    if (role === 'curator' || role === 'teacher') {
        content += `
            <div class="dashboard-card">
                <h4><i class="bi bi-eye"></i> Review Queue</h4>
                <p>Review posts with feedback & SEO</p>
                <button class="card-btn" onclick="openReviewQueue()">Review Queue</button>
            </div>
        `;
    }

    // Admin-specific sections (Tier 3)
    if (role === 'admin' || role === 'super') {
        content += `
            <div class="dashboard-card">
                <h4><i class="bi bi-people"></i> Manage Users</h4>
                <p>Role management & oversight</p>
                <button class="card-btn" onclick="openUserManagement()">Manage Users</button>
            </div>
            <div class="dashboard-card">
                <h4><i class="bi bi-graph-up"></i> Editor Analytics</h4>
                <p>Performance per contributor</p>
                <button class="card-btn" onclick="openAnalytics()">Analytics</button>
            </div>
            <div class="dashboard-card">
                <h4><i class="bi bi-list-check"></i> Audit Trail</h4>
                <p>Full change history</p>
                <button class="card-btn" onclick="openAuditTrail()">Audit Trail</button>
            </div>
        `;
    }

    content += `
            <div class="dashboard-card">
                <h4><i class="bi bi-list-ul"></i> My Posts</h4>
                <p>View your submitted posts</p>
                <button class="card-btn" onclick="openMyPosts()">My Posts</button>
            </div>
        </div>
    `;

    return content;
}

// Post editor
function openPostEditor() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                <i class="bi bi-x-lg"></i>
            </button>
            <div class="modal-header">
                <h2>Create/Edit Post <span id="postVersion">(Version 1)</span></h2>
            </div>
            <div class="modal-body">
                <form id="postForm">
                    <div class="version-control">
                        <label><strong>Version:</strong></label>
                        <select id="postVersionSelect">
                            <option value="1">Version 1 (Current)</option>
                        </select>
                        <button type="button" class="btn-outline btn-sm" onclick="newVersion()">Create New Version</button>
                    </div>
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" id="postTitle" placeholder="Enter post title">
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select id="postCategory">
                            <option value="academics">Academics</option>
                            <option value="sports">Sports</option>
                            <option value="events">Events</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Content <small id="readabilityLive">-- Live Score</small></label>
                        <textarea id="postContent" rows="10" placeholder="Write your post... Short sentences (15-20w), active voice for 60-70 score." oninput="updateReadability()"></textarea>
                        <div class="readability-meter">
                            <span>Score: <span id="readabilityScore">0</span> 
                            <small id="readabilityAdvice">Start typing...</small>
                        </div>
                    </div>
                    <div class="seo-editor">
                        <h4><i class="bi bi-search"></i> SEO Metadata</h4>
                        <div class="seo-group">
                            <label>Meta Description</label>
                            <textarea id="seoDescription" rows="2" placeholder="Brief description for search engines..."></textarea>
                        </div>
                        <div class="seo-group">
                            <label>Keywords (comma separated)</label>
                            <input type="text" id="seoKeywords" placeholder="education, school, events">
                        </div>
                    </div>
                    <div class="form-actions" style="margin-top: 20px;">
                        <button type="button" class="btn-secondary" onclick="saveDraft()">Save Draft</button>
                        <button type="submit" class="btn-primary">Submit Review</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Live readability on content
    updateReadabilityInterval = setInterval(updateReadability, 1000);

    document.getElementById('postForm').onsubmit = function (e) {
        e.preventDefault();
        submitPost();
    };
}

// Simple Flesch Reading Ease (client-side)
function updateReadability() {
    const content = document.getElementById('postContent').value;
    if (!content) return;

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10).length || 1;
    const words = content.split(/\s+/).filter(w => w.length > 0).length || 1;
    const syllables = content.match(/[aeiouy]+/gi)?.reduce((a, w) => a + (w.length > 0 ? 1 : 0), 0) || 1;

    const asl = words / sentences;
    const asw = syllables / words;
    const score = 206.835 - (1.015 * asl) - (84.6 * asw);

    const scoreEl = document.getElementById('readabilityScore');
    const adviceEl = document.getElementById('readabilityAdvice');
    const fill = document.querySelector('#readabilityFill');

    scoreEl.textContent = Math.round(score);

    if (score > 70) {
        adviceEl.textContent = 'Perfect! Easy reading.';
        fill.style.background = 'var(--success)';
        fill.style.width = '100%';
    } else if (score > 50) {
        adviceEl.textContent = 'Good - shorten sentences.';
        fill.style.background = 'var(--warning)';
        fill.style.width = '75%';
    } else {
        adviceEl.textContent = 'Hard - use shorter sentences/active voice.';
        fill.style.background = 'var(--danger)';
        fill.style.width = '50%';
    }

    document.querySelector('#readabilityLive').textContent = ` (Live: ${Math.round(score)})`;
}

// Submit post
async function submitPost(isDraft = false) {
    const title = document.getElementById('postTitle').value.trim();
    const category = document.getElementById('postCategory').value;
    const content = document.getElementById('postContent').value.trim();
    const seoDesc = document.getElementById('seoDescription') ? document.getElementById('seoDescription').value.trim() : '';
    const seoKeys = document.getElementById('seoKeywords') ? document.getElementById('seoKeywords').value.trim() : '';
    const version = document.getElementById('postVersionSelect') ? parseInt(document.getElementById('postVersionSelect').value) : 1;

    if (!title || !content) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const supabase = window.supabase;

        // Check if Supabase is available
        if (!supabase || !supabase.from) {
            throw new Error('Supabase not available');
        }

        // Determine status based on role and action
        let status = currentStaff.role === 'super' ? 'published' : 'pending';
        if (isDraft) status = 'draft';

        // Create post object
        const seoData = { description: seoDesc, keywords: seoKeys };

        const newPost = {
            title: title,
            category: category,
            content: content,
            author: currentStaff.name,
            status: status,
            seo_metadata: seoData,
            version: version,
            created_at: new Date().toISOString(),
            views: 0
        };

        // If editing existing, we'd use update, but for now we insert
        // Insert into Supabase
        const { data, error } = await supabase
            .from('posts')
            .upsert([newPost])
            .select()
            .single();

        if (error) throw error;

        // Log Audit Trail
        await logAudit(currentStaff.name, isDraft ? 'Saved Draft' : 'Submitted Post', `Title: ${title}, Version: ${version}`);
        
        showToast(isDraft ? 'Draft saved!' : `Post ${status === 'published' ? 'published' : 'submitted for review'} successfully!`);
        const overlay = document.querySelector('.modal-overlay');
        if(overlay) overlay.remove();
        
        // Refresh blog content if published
        if (status === 'published' && window.initBlog) {
            window.initBlog();
        }
        
    } catch (error) {
        console.error('Error submitting post:', error);
        showToast('Error submitting post. Please try again.');
    }
}

function saveDraft() {
    submitPost(true);
}

function newVersion() {
    const select = document.getElementById('postVersionSelect');
    if(select) {
        const currentV = parseInt(select.value);
        const newV = currentV + 1;
        const opt = document.createElement('option');
        opt.value = newV;
        opt.textContent = `Version ${newV} (New)`;
        select.appendChild(opt);
        select.value = newV;
        showToast(`Switched to Version ${newV}`);
    }
}

// Review queue (for teachers)
async function openReviewQueue() {
    const supabase = window.supabase;
    const { data: pendingPosts = [], error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    
    // We also need to fetch drafts for review if needed, but for now just pending
    if (error) {
        console.error('Error fetching pending posts:', error);
    }
    
    const postsList = Array.isArray(pendingPosts) ? pendingPosts : [];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                <i class="bi bi-x-lg"></i>
            </button>
            <div class="modal-header">
                <h2>Review Queue</h2>
                <span class="badge">${postsList.length} pending</span>
            </div>
            <div class="modal-body">
                ${postsList.length === 0 ? '<p style="text-align:center; color:var(--text-muted);">No posts to review.</p>' : postsList.map(post => `
                    <div class="review-card" style="background:var(--glass); border:1px solid var(--glass-border); border-radius:12px; padding:16px; margin-bottom:16px;">
                        <div class="review-header" style="display:flex; justify-content:space-between; margin-bottom:12px;">
                            <div>
                                <h4 style="margin-bottom:4px;">${post.title} <span class="badge" style="background:rgba(255,255,255,0.1); font-size:0.7rem;">v${post.version || 1}</span></h4>
                                <span class="review-meta" style="font-size:0.8rem; color:var(--text-muted);">${post.author} • ${post.category}</span>
                            </div>
                        </div>
                        <div class="review-content" style="font-size:0.9rem; line-height:1.5; color:var(--text-muted); margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-radius:8px;">
                            ${post.content.substring(0, 200)}...
                        </div>
                        
                        <div class="feedback-input-group">
                            <label style="font-size:0.85rem; color:var(--text-primary);"><i class="bi bi-chat-text"></i> Curator Feedback / Rejection Reason</label>
                            <textarea id="feedback-${post.id}" rows="2" placeholder="Leave feedback for the editor before approving or rejecting..."></textarea>
                        </div>
                        
                        <div class="review-actions" style="margin-top:16px; display:flex; gap:12px; justify-content:flex-end;">
                            <button class="btn-danger" onclick="rejectPost(${post.id})"><i class="bi bi-x-circle"></i> Return to Editor</button>
                            <button class="btn-success" onclick="approvePost(${post.id})"><i class="bi bi-check-circle"></i> Approve & Publish</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Demo approve/reject with Audit Log
async function approvePost(id) {
    const feedbackInput = document.getElementById(`feedback-${id}`);
    const feedback = feedbackInput ? feedbackInput.value.trim() : '';
    
    try {
        const supabase = window.supabase;
        
        // Update post with feedback and status
        const updateData = { status: 'published' };
        if(feedback) {
            updateData.feedback_history = feedback; // in real app, we'd append to JSONB
        }
        
        const { error } = await supabase
            .from('posts')
            .update(updateData)
            .eq('id', id);
        
        if (error) throw error;
        
        await logAudit(currentStaff.name, 'Approved Post', `Post ID: ${id}, Feedback: ${feedback}`);
        
        showToast('Post approved and published!');
        const overlay = document.querySelector('.modal-overlay');
        if(overlay) overlay.remove();
        openReviewQueue(); // Refresh queue
    } catch (error) {
        showToast('Error approving post: ' + error.message, 'error');
    }
}

async function rejectPost(id) {
    const feedbackInput = document.getElementById(`feedback-${id}`);
    const feedback = feedbackInput ? feedbackInput.value.trim() : '';
    
    if(!feedback) {
        alert('Please provide feedback/reason when returning to editor.');
        return;
    }
    
    try {
        const supabase = window.supabase;
        
        const { error } = await supabase
            .from('posts')
            .update({ status: 'draft', feedback_history: feedback })
            .eq('id', id);
        
        if (error) throw error;
        
        await logAudit(currentStaff.name, 'Returned Post', `Post ID: ${id}, Reason: ${feedback}`);
        
        showToast('Post returned to editor as draft with feedback.');
        const overlay = document.querySelector('.modal-overlay');
        if(overlay) overlay.remove();
        openReviewQueue(); // Refresh
    } catch (error) {
        showToast('Error rejecting post: ' + error.message, 'error');
    }
}

// Simple Audit logger
async function logAudit(user, action, details) {
    try {
        const supabase = window.supabase;
        if(supabase && supabase.from) {
            await supabase.from('audit_logs').insert([{
                user_email: user,
                action: action,
                details: details,
                created_at: new Date().toISOString()
            }]);
        }
    } catch(e) {
        console.error('Audit log failed', e);
    }
}

// User management (for super admins)
async function openUserManagement() {
    try {
        const supabase = window.supabase;
        
        // Get all users from Supabase
        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="bi bi-x-lg"></i>
                </button>
                <div class="modal-header">
                    <h2>Manage Users</h2>
                    <span class="badge">${users.length} users</span>
                </div>
                <div class="modal-body">
                    <div class="user-list">
                        ${users.map(user => `
                            <div class="user-card">
                                <img src="${user.avatar || 'latter-glory-logo.webp'}" alt="${user.name}" class="user-avatar">
                                <div class="user-details">
                                    <h4>${user.name}</h4>
                                    <p>${user.email}</p>
                                    <span class="user-role">${user.role}</span>
                                </div>
                                <div class="user-actions">
                                    <button class="btn-secondary" onclick="editUser('${user.email}')">Edit</button>
                                    <button class="btn-danger" onclick="deleteUser('${user.email}')">Delete</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error loading users');
    }
}

// Edit user
async function editUser(email) {
    try {
        const supabase = window.supabase;
        
        // Get user data
        const { data: user, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error) throw error;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="bi bi-x-lg"></i>
                </button>
                <div class="modal-header">
                    <h2>Edit User</h2>
                </div>
                <div class="modal-body">
                    <form id="userForm">
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" id="editName" value="${user.name}">
                        </div>
                        <div class="form-group">
                            <label>Role</label>
                            <select id="editRole">
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin (Tier 3)</option>
                                <option value="curator" ${user.role === 'curator' ? 'selected' : ''}>Curator (Tier 2)</option>
                                <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>Editor (Tier 1)</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                            <button type="submit" class="btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('userForm').onsubmit = async function(e) {
            e.preventDefault();
            
            try {
                const { error } = await supabase
                    .from('profiles')
                    .update({ 
                        name: document.getElementById('editName').value,
                        role: document.getElementById('editRole').value
                    })
                    .eq('email', email);
                
                if (error) throw error;
                
                showToast('User updated successfully!');
                document.querySelector('.modal-overlay').remove();
                openUserManagement(); // Refresh the user list
                
            } catch (updateError) {
                console.error('Error updating user:', updateError);
                showToast('Error updating user');
            }
        };
        
    } catch (error) {
        console.error('Error editing user:', error);
        showToast('Error editing user');
    }
}

// Delete user
async function deleteUser(email) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const supabase = window.supabase;
        
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('email', email);
        
        if (error) throw error;
        
        showToast('User deleted successfully!');
        openUserManagement(); // Refresh the user list
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Error deleting user');
    }
}

// Analytics (for super admins)
async function openAnalytics() {
    const supabase = window.supabase;
    const { data: posts = [], error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching posts for analytics:', error);
        posts = [];
    }
    
    const totalPosts = posts.length;
    const publishedPosts = posts.filter(p => p.status === 'published' || p.status === 'approved').length;
    const pendingPosts = posts.filter(p => p.status === 'pending').length;
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    
    const categoryCounts = {
        academics: posts.filter(p => p.category === 'academics').length,
        sports: posts.filter(p => p.category === 'sports').length,
        events: posts.filter(p => p.category === 'events').length
    };
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                <i class="bi bi-x-lg"></i>
            </button>
            <div class="modal-header">
                <h2>Blog Analytics</h2>
                <span class="badge">Live Data</span>
            </div>
            <div class="modal-body">
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <h4>Total Posts</h4>
                        <div class="analytics-value">${totalPosts}</div>
                    </div>
                    <div class="analytics-card">
                        <h4>Published</h4>
                        <div class="analytics-value">${publishedPosts}</div>
                    </div>
                    <div class="analytics-card">
                        <h4>Pending</h4>
                        <div class="analytics-value">${pendingPosts}</div>
                    </div>
                    <div class="analytics-card">
                        <h4>Total Views</h4>
                        <div class="analytics-value">${totalViews.toLocaleString()}</div>
                    </div>
                </div>
                <div class="analytics-chart">
                    <h4>Posts by Category</h4>
                    <div class="chart-bars">
                        ${Object.entries(categoryCounts).map(([cat, count]) => {
                            const percentage = Math.min((count / Math.max(1, totalPosts)) * 100, 100);
                            return `
                                <div class="chart-bar">
                                    <span>${cat}</span>
                                    <div class="bar-container">
                                        <div class="bar-fill" style="width: ${percentage}%"></div>
                                    </div>
                                    <span>${count}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// My posts
function openMyPosts() {
    const myPosts = staffPosts.filter(p => p.author === currentStaff.name);
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                <i class="bi bi-x-lg"></i>
            </button>
            <div class="modal-header">
                <h2>My Posts</h2>
                <span class="badge">${myPosts.length} total</span>
            </div>
            <div class="modal-body">
                ${myPosts.length === 0 ? 
                    '<p style="text-align:center; color:var(--text-muted);">No posts yet</p>' :
                    myPosts.map(post => `
                        <div class="post-card">
                            <div class="post-header">
                                <h4>${post.title}</h4>
                                <span class="post-status ${post.status}">${post.status}</span>
                            </div>
                            <div class="post-meta">
                                ${post.category} • ${new Date(post.createdAt).toLocaleDateString()}
                            </div>
                            <div class="post-actions">
                                <button class="btn-secondary" onclick="editMyPost(${post.id})">Edit</button>
                                <button class="btn-danger" onclick="deleteMyPost(${post.id})">Delete</button>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Edit my post
function editMyPost(id) {
    const post = staffPosts.find(p => p.id === id);
    if (!post) return;
    
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postCategory').value = post.category;
    document.getElementById('postContent').value = post.content;
    
    // Remove existing modal and open editor
    document.querySelector('.modal-overlay').remove();
    openPostEditor();
}

// Delete my post
function deleteMyPost(id) {
    if (confirm('Are you sure you want to delete this post?')) {
        staffPosts = staffPosts.filter(p => p.id !== id);
        showToast('Post deleted successfully!');
        document.querySelector('.modal-overlay').remove();
    }
}

// Toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// My Drafts
async function openMyDrafts() {
    const supabase = window.supabase;
    const { data: drafts = [], error } = await supabase
        .from('posts')
        .select('*')
        .eq('author', currentStaff.name)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });
        
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                <i class="bi bi-x-lg"></i>
            </button>
            <div class="modal-header">
                <h2>My Drafts</h2>
                <span class="badge">${drafts.length} total</span>
            </div>
            <div class="modal-body">
                ${drafts.length === 0 ? 
                    '<p style="text-align:center; color:var(--text-muted);">No drafts found</p>' :
                    drafts.map(post => `
                        <div class="post-card">
                            <div class="post-header">
                                <h4>${post.title}</h4>
                                <span class="post-status ${post.status}">${post.status}</span>
                            </div>
                            <div class="post-meta">
                                Version ${post.version || 1} • ${new Date(post.created_at).toLocaleDateString()}
                            </div>
                            <div class="post-actions">
                                <button class="btn-secondary" onclick="editMyPost(${post.id})">Resume Editing</button>
                                <button class="btn-primary" onclick="submitDraftForReview(${post.id})">Submit for Review</button>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function submitDraftForReview(id) {
    try {
        const supabase = window.supabase;
        const { error } = await supabase
            .from('posts')
            .update({ status: 'pending' })
            .eq('id', id);
        if (error) throw error;
        showToast('Draft submitted for review!');
        document.querySelector('.modal-overlay').remove();
    } catch (e) {
        showToast('Error submitting draft');
    }
}

// Audit Trail
async function openAuditTrail() {
    const supabase = window.supabase;
    const { data: logs = [], error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container" style="max-width:800px;">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                <i class="bi bi-x-lg"></i>
            </button>
            <div class="modal-header">
                <h2>Audit Trail</h2>
                <p>Recent system activity</p>
            </div>
            <div class="modal-body">
                <div class="audit-log-container">
                    <table class="audit-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.length === 0 ? '<tr><td colspan="4" style="text-align:center;">No logs found</td></tr>' : logs.map(log => `
                                <tr>
                                    <td>${new Date(log.created_at).toLocaleString()}</td>
                                    <td><strong>${log.user_email}</strong></td>
                                    <td><span class="status-badge" style="background:#4b5563;">${log.action}</span></td>
                                    <td style="color:var(--text-muted);">${log.details}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}