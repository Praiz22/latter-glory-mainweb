/* 
   LGA Student Portal Core Engine (High-Contrast Redesign)
   I rebuilt this logic to support the new Fintrixity UI and fixed the login flow.
   Ensure you run this on a local server (http/https) to avoid CORS issues.
*/

let supabase;
let currentUser = null;
let currentProfile = null;
let chatChannel = null;

// UI Selection
const authSection = document.getElementById('authSection');
const portalSection = document.getElementById('portalSection');
const loginForm = document.getElementById('loginForm');
const authError = document.getElementById('authError');
const authBtn = document.getElementById('authBtn');

document.addEventListener('DOMContentLoaded', () => {
    // I delayed initialization to ensure supabase-init.js is ready
    setTimeout(initPortal, 500);
});

async function initPortal() {
    supabase = window.getSupabase();
    if (!supabase) {
        console.warn('I could not find the Supabase client. Running in debug mode.');
        authSection.classList.remove('d-none'); // I show login by default if init fails
        return;
    }

    // I set up the Auth listener to manage view states
    supabase.auth.onAuthStateChanged((event, session) => {
        if (session) {
            currentUser = session.user;
            showPortal();
        } else {
            currentUser = null;
            showAuth();
        }
    });

    setupAuthListeners();
}

function showAuth() {
    authSection.classList.remove('d-none');
    portalSection.classList.add('d-none');
}

async function showPortal() {
    authSection.classList.add('d-none');
    portalSection.classList.remove('d-none');
    
    // I start loading the student data once authenticated
    await loadStudentProfile();
    loadDashboardData();
    initRealtimeChat();
    setupPortalListeners();
}

function setupAuthListeners() {
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            authError.textContent = '';
            authBtn.disabled = true;
            authBtn.innerText = 'Signing in...';

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            const { error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                authError.textContent = error.message;
                authBtn.disabled = false;
                authBtn.innerText = 'Sign In';
            }
        };
    }
}

async function loadStudentProfile() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) throw error;
        currentProfile = data;

        // I updated the UI with student info
        document.getElementById('userName').textContent = data.full_name || 'Student';
        document.getElementById('userClass').textContent = data.class_group || 'Unassigned';
        if (data.avatar_url) document.getElementById('userAvatar').src = data.avatar_url;
        
        if (document.getElementById('pointsDisplay')) {
            document.getElementById('pointsDisplay').textContent = data.points || 0;
        }
    } catch (err) {
        console.error('I had trouble fetching the profile:', err);
    }
}

async function loadDashboardData() {
    // I fetch assignments tailored to the student's class
    const { data: assignments, error } = await supabase
        .from('assignments')
        .select('*')
        .or(`target_class.eq.${currentProfile.class_group},target_class.eq.All`)
        .order('due_date', { ascending: true })
        .limit(4);

    if (error) {
        console.error('I failed to load assignments:', error);
    } else {
        renderRecentAssignments(assignments);
    }
}

function renderRecentAssignments(assignments) {
    const list = document.getElementById('recentAssignmentsList');
    if (!list) return;

    if (!assignments || assignments.length === 0) {
        list.innerHTML = `<p class="text-muted small">I found no pending tasks for your class.</p>`;
        return;
    }

    list.innerHTML = assignments.map(a => `
        <div class="assignment-item" onclick="openAssignmentModal('${a.id}')" style="cursor: pointer;">
            <div class="d-flex justify-content-between align-items-center">
                <div class="assignment-info">
                    <h4 class="mb-1">${a.title}</h4>
                    <p class="text-muted small mb-0">${a.type.toUpperCase()} &bull; Due ${new Date(a.due_date).toLocaleDateString()}</p>
                </div>
                <i class="bi bi-arrow-right-short fs-3 text-muted"></i>
            </div>
        </div>
    `).join('');
}

/* CHAT & PRESENCE */
async function initRealtimeChat() {
    if (chatChannel) return;

    chatChannel = supabase.channel('global-chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'portal_messages' }, 
            payload => { renderChatMessage(payload.new); })
        .on('presence', { event: 'sync' }, () => { updatePresenceUI(); })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await chatChannel.track({
                    user_id: currentUser.id,
                    name: currentProfile.full_name,
                    avatar: currentProfile.avatar_url
                });
            }
        });

    loadChatHistory();
}

async function loadChatHistory() {
    const { data, error } = await supabase
        .from('portal_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(40);

    if (error) return;
    const chatArea = document.getElementById('chatArea');
    if (chatArea) {
        chatArea.innerHTML = '';
        data.forEach(msg => renderChatMessage(msg));
        chatArea.scrollTop = chatArea.scrollHeight;
    }
}

function renderChatMessage(msg) {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;

    const isMe = msg.sender_id === currentUser.id;
    const wrapper = document.createElement('div');
    wrapper.className = `chat-bubble-wrapper ${isMe ? 'me' : 'them'} d-flex flex-column`;
    wrapper.innerHTML = `
        <div class="smallest text-muted mb-1 px-2">${isMe ? 'You' : msg.sender_name}</div>
        <div class="chat-bubble">${msg.content}</div>
    `;
    chatArea.appendChild(wrapper);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function updatePresenceUI() {
    const state = chatChannel.presenceState();
    const onlineList = document.getElementById('onlinePeersList');
    const chatPeersList = document.getElementById('chatPeersList');
    
    const onlineUsers = [];
    Object.values(state).forEach(pres => {
        pres.forEach(p => {
            if (!onlineUsers.find(u => u.user_id === p.user_id)) onlineUsers.push(p);
        });
    });

    const html = onlineUsers.map(u => `
        <div class="d-flex align-items-center gap-3 mb-3">
            <img src="${u.avatar || 'latter-glory-logo.png'}" width="36" height="36" style="border-radius:10px; border:1px solid #27272a;">
            <div class="small fw-600">${u.user_id === currentUser.id ? 'You' : u.name}</div>
            <div style="width:8px; height:8px; background:#4ade80; border-radius:50%; margin-left:auto;"></div>
        </div>
    `).join('');

    if (onlineList) onlineList.innerHTML = html || '<p class="text-muted smaller">No one else is online.</p>';
    if (chatPeersList) chatPeersList.innerHTML = html;
}

function setupPortalListeners() {
    const chatForm = document.getElementById('chatForm');
    if (chatForm) {
        chatForm.onsubmit = async (e) => {
            e.preventDefault();
            const input = document.getElementById('chatInput');
            const content = input.value.trim();
            if (!content) return;
            input.value = '';
            
            await supabase.from('portal_messages').insert([{
                sender_id: currentUser.id,
                sender_name: currentProfile.full_name,
                sender_avatar: currentProfile.avatar_url,
                content: content
            }]);
        };
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => supabase.auth.signOut();
    }
}