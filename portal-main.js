// portal-main.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// --- Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyDgReNsNbU6-Cnx-ej0HPcHSrCXVppohJQ",
  authDomain: "latter-glory.firebaseapp.com",
  projectId: "latter-glory",
  storageBucket: "latter-glory.appspot.com",
  messagingSenderId: "133970297722",
  appId: "1:133970297722:web:33758b76625c70930dccc3",
  measurementId: "G-5G1BYM7Q3Y"
};

const adminEmails = [
  "praiseola22@gmail.com",
  "thelattergloryacademy@gmail.com",
  "sunbam16@gmail.com"
];

// --- Firebase init ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- DOM Elements ---
const loginForm = document.getElementById('loginForm');
const loginModal = document.getElementById('loginModal');
const loginBtnNav = document.getElementById('loginBtnNav');
const logoutBtnNav = document.getElementById('logoutBtnNav');
const loginBtnMainDiv = document.getElementById('loginBtnMainDiv');
const mainContent = document.getElementById('mainContent');
const loginError = document.getElementById('loginError');

// Section containers
const assignmentsList = document.getElementById('assignments-list');
const eventsList = document.getElementById('events-list');
const updatesList = document.getElementById('updates-list');
const clubsList = document.getElementById('clubs-list');

// Admin controls (if present in your HTML)
const registerStudentBtn = document.getElementById('registerStudentBtn');
const addAssignmentBtn = document.getElementById('addAssignmentBtn');
const addEventBtn = document.getElementById('addEventBtn');
const addUpdateBtn = document.getElementById('addUpdateBtn');
const addClubBtn = document.getElementById('addClubBtn');
const addGalleryBtn = document.getElementById('addGalleryBtn');
const addTimetableBtn = document.getElementById('addTimetableBtn');

// Helper: Show notification toast
function showNotification(message, type = 'primary', timeout = 4000) {
  const toastEl = document.getElementById('mainToast');
  const toastBody = document.getElementById('mainToastBody');
  toastBody.textContent = message;
  toastEl.className = `toast align-items-center text-bg-${type} border-0`;
  const toast = new bootstrap.Toast(toastEl, { delay: timeout });
  toast.show();
}

// --- Auth: login/logout ---
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = "none";
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      bootstrap.Modal.getInstance(loginModal).hide();
      showNotification('Login successful!', 'success');
    } catch (err) {
      loginError.style.display = "block";
      showNotification('Invalid credentials. Please try again.', 'danger');
    }
  });
}

if (logoutBtnNav) {
  logoutBtnNav.addEventListener('click', async () => {
    await signOut(auth);
    showNotification('Logged out.', 'info');
  });
}

// --- UI State on Auth ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    mainContent.style.display = 'block';
    loginBtnMainDiv.style.display = 'none';
    loginBtnNav.style.display = 'none';
    logoutBtnNav.style.display = 'inline-block';

    // Admin controls
    const isAdmin = adminEmails.includes(user.email);
    if (registerStudentBtn) registerStudentBtn.style.display = isAdmin ? '' : 'none';
    if (addAssignmentBtn) addAssignmentBtn.style.display = isAdmin ? '' : 'none';
    if (addEventBtn) addEventBtn.style.display = isAdmin ? '' : 'none';
    if (addUpdateBtn) addUpdateBtn.style.display = isAdmin ? '' : 'none';
    if (addClubBtn) addClubBtn.style.display = isAdmin ? '' : 'none';
    if (addGalleryBtn) addGalleryBtn.style.display = isAdmin ? '' : 'none';
    if (addTimetableBtn) addTimetableBtn.style.display = isAdmin ? '' : 'none';

    // Load all sections
    loadAssignments();
    loadEvents();
    loadUpdates();
    loadClubs();
    // ...add loadGallery(), loadTimetable(), loadProfile() if you have these sections

  } else {
    mainContent.style.display = 'none';
    loginBtnMainDiv.style.display = 'block';
    loginBtnNav.style.display = 'inline-block';
    logoutBtnNav.style.display = 'none';
  }
});

// --- Assignments Section ---
async function loadAssignments() {
  assignmentsList.innerHTML = '<div class="text-center w-100 py-3">Loading...</div>';
  const q = query(collection(db, 'assignments'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    assignmentsList.innerHTML = '';
    if (snapshot.empty) {
      assignmentsList.innerHTML = '<div class="text-center py-3">No assignments posted yet.</div>';
      return;
    }
    snapshot.forEach(docSnap => {
      const a = docSnap.data();
      const id = docSnap.id;
      assignmentsList.innerHTML += assignmentCardHtml(a, id);
    });
    if (window.AOS) setTimeout(() => AOS.refresh(), 200);
    addAssignmentEngagementListeners();
  });
}

// Assignment card template
function assignmentCardHtml(a, id) {
  return `
    <div class="col-md-6 col-lg-4">
      <div class="card h-100" data-aos="zoom-in" data-id="${id}">
        <div class="card-body">
          <h5 class="card-title">${a.title || 'Untitled'}</h5>
          ${a.class ? `<span class="badge">${a.class}</span>` : ''}
          ${a.subject ? `<span class="badge">${a.subject}</span>` : ''}
          <p class="card-text">${a.description || ''}</p>
        </div>
        <div class="card-footer d-flex align-items-center justify-content-between">
          <div>
            Due: <b>${a.dueDate ? a.dueDate : ''}</b>
            ${a.fileUrl ? `<a href="${a.fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary ms-2"><i class="bi bi-download"></i></a>` : ''}
          </div>
          <div>
            <button class="btn btn-sm like-btn ${a.likes && a.likes[auth.currentUser?.uid] ? 'active' : ''}" data-id="${id}" title="Like">
              <i class="bi bi-heart"></i> <span>${a.likes ? Object.keys(a.likes).length : 0}</span>
            </button>
            <button class="btn btn-sm comment-btn" data-id="${id}" title="Comment"><i class="bi bi-chat-left-dots"></i></button>
            ${adminEmails.includes(auth.currentUser?.email) ?
              `<button class="btn btn-sm btn-danger ms-1 delete-assignment-btn" data-id="${id}"><i class="bi bi-trash"></i></button>` : ''}
          </div>
        </div>
        <div class="card-footer comment-section" style="display:none;"></div>
      </div>
    </div>
  `;
}

// Assignment engagement
function addAssignmentEngagementListeners() {
  // Like
  assignmentsList.querySelectorAll('.like-btn').forEach(btn => {
    btn.onclick = async function () {
      const id = btn.dataset.id;
      const ref = doc(db, 'assignments', id);
      const snap = await getDoc(ref);
      let likes = snap.data().likes || {};
      const userId = auth.currentUser.uid;
      if (likes[userId]) delete likes[userId];
      else likes[userId] = true;
      await updateDoc(ref, { likes });
    };
  });
  // Comment
  assignmentsList.querySelectorAll('.comment-btn').forEach(btn => {
    btn.onclick = function () {
      const card = btn.closest('.card');
      const section = card.querySelector('.comment-section');
      section.style.display = (section.style.display === 'none' || !section.style.display) ? 'block' : 'none';
      if (section.innerHTML === '') renderComments('assignments', btn.dataset.id, section);
    };
  });
  // Delete (admin)
  assignmentsList.querySelectorAll('.delete-assignment-btn').forEach(btn => {
    btn.onclick = async function () {
      if (confirm('Delete this assignment?')) {
        await deleteDoc(doc(db, 'assignments', btn.dataset.id));
      }
    };
  });
}

// --- Events Section ---
function loadEvents() {
  eventsList.innerHTML = '<div class="text-center w-100 py-3">Loading...</div>';
  const q = query(collection(db, 'events'), orderBy('date', 'desc'));
  onSnapshot(q, (snapshot) => {
    eventsList.innerHTML = '';
    if (snapshot.empty) {
      eventsList.innerHTML = '<div class="text-center py-3">No events posted yet.</div>';
      return;
    }
    snapshot.forEach(docSnap => {
      const e = docSnap.data();
      const id = docSnap.id;
      eventsList.innerHTML += eventCardHtml(e, id);
    });
    if (window.AOS) setTimeout(() => AOS.refresh(), 200);
    addEventEngagementListeners();
  });
}
function eventCardHtml(e, id) {
  return `
    <div class="col-md-6 col-lg-4">
      <div class="card h-100 event-card" data-aos="fade-right" data-id="${id}">
        ${e.imageUrl ? `<img src="${e.imageUrl}" class="event-img" alt="${e.title}">` : ''}
        <div class="card-body">
          <h5 class="card-title">${e.title || 'Untitled'}</h5>
          <p class="mb-2"><i class="bi bi-calendar"></i> ${e.date || ''}</p>
          <p class="mb-2"><i class="bi bi-geo-alt"></i> ${e.venue || ''}</p>
          <p>${e.description || ''}</p>
        </div>
        <div class="card-footer d-flex align-items-center justify-content-between">
          <div>
            <button class="btn btn-sm like-btn ${e.likes && e.likes[auth.currentUser?.uid] ? 'active' : ''}" data-id="${id}" title="Like">
              <i class="bi bi-heart"></i> <span>${e.likes ? Object.keys(e.likes).length : 0}</span>
            </button>
            <button class="btn btn-sm comment-btn" data-id="${id}" title="Comment"><i class="bi bi-chat-left-dots"></i></button>
            ${adminEmails.includes(auth.currentUser?.email) ?
              `<button class="btn btn-sm btn-danger ms-1 delete-event-btn" data-id="${id}"><i class="bi bi-trash"></i></button>` : ''}
          </div>
        </div>
        <div class="card-footer comment-section" style="display:none;"></div>
      </div>
    </div>
  `;
}
function addEventEngagementListeners() {
  // Like
  eventsList.querySelectorAll('.like-btn').forEach(btn => {
    btn.onclick = async function () {
      const id = btn.dataset.id;
      const ref = doc(db, 'events', id);
      const snap = await getDoc(ref);
      let likes = snap.data().likes || {};
      const userId = auth.currentUser.uid;
      if (likes[userId]) delete likes[userId];
      else likes[userId] = true;
      await updateDoc(ref, { likes });
    };
  });
  // Comment
  eventsList.querySelectorAll('.comment-btn').forEach(btn => {
    btn.onclick = function () {
      const card = btn.closest('.card');
      const section = card.querySelector('.comment-section');
      section.style.display = (section.style.display === 'none' || !section.style.display) ? 'block' : 'none';
      if (section.innerHTML === '') renderComments('events', btn.dataset.id, section);
    };
  });
  // Delete (admin)
  eventsList.querySelectorAll('.delete-event-btn').forEach(btn => {
    btn.onclick = async function () {
      if (confirm('Delete this event?')) {
        await deleteDoc(doc(db, 'events', btn.dataset.id));
      }
    };
  });
}

// --- Updates Section ---
function loadUpdates() {
  updatesList.innerHTML = '<div class="text-center w-100 py-3">Loading...</div>';
  const q = query(collection(db, 'updates'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    updatesList.innerHTML = '';
    if (snapshot.empty) {
      updatesList.innerHTML = '<div class="text-center py-3">No updates posted yet.</div>';
      return;
    }
    snapshot.forEach(docSnap => {
      const u = docSnap.data();
      const id = docSnap.id;
      updatesList.innerHTML += updateCardHtml(u, id);
    });
    if (window.AOS) setTimeout(() => AOS.refresh(), 200);
    addUpdateEngagementListeners();
  });
}
function updateCardHtml(u, id) {
  return `
    <div class="col-md-6">
      <div class="card h-100" data-aos="flip-up" data-id="${id}">
        <div class="card-body">
          <h5 class="card-title">${u.title || ''}</h5>
          <p>${u.content || ''}</p>
          <div class="text-end">
            <small>by ${u.author || 'Admin'} | ${u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : ''}</small>
          </div>
        </div>
        <div class="card-footer d-flex align-items-center justify-content-between">
          <div>
            <button class="btn btn-sm like-btn ${u.likes && u.likes[auth.currentUser?.uid] ? 'active' : ''}" data-id="${id}" title="Like">
              <i class="bi bi-heart"></i> <span>${u.likes ? Object.keys(u.likes).length : 0}</span>
            </button>
            <button class="btn btn-sm comment-btn" data-id="${id}" title="Comment"><i class="bi bi-chat-left-dots"></i></button>
            ${adminEmails.includes(auth.currentUser?.email) ?
              `<button class="btn btn-sm btn-danger ms-1 delete-update-btn" data-id="${id}"><i class="bi bi-trash"></i></button>` : ''}
          </div>
        </div>
        <div class="card-footer comment-section" style="display:none;"></div>
      </div>
    </div>
  `;
}
function addUpdateEngagementListeners() {
  // Like
  updatesList.querySelectorAll('.like-btn').forEach(btn => {
    btn.onclick = async function () {
      const id = btn.dataset.id;
      const ref = doc(db, 'updates', id);
      const snap = await getDoc(ref);
      let likes = snap.data().likes || {};
      const userId = auth.currentUser.uid;
      if (likes[userId]) delete likes[userId];
      else likes[userId] = true;
      await updateDoc(ref, { likes });
    };
  });
  // Comment
  updatesList.querySelectorAll('.comment-btn').forEach(btn => {
    btn.onclick = function () {
      const card = btn.closest('.card');
      const section = card.querySelector('.comment-section');
      section.style.display = (section.style.display === 'none' || !section.style.display) ? 'block' : 'none';
      if (section.innerHTML === '') renderComments('updates', btn.dataset.id, section);
    };
  });
  // Delete (admin)
  updatesList.querySelectorAll('.delete-update-btn').forEach(btn => {
    btn.onclick = async function () {
      if (confirm('Delete this update?')) {
        await deleteDoc(doc(db, 'updates', btn.dataset.id));
      }
    };
  });
}

// --- Clubs Section ---
function loadClubs() {
  clubsList.innerHTML = '<div class="text-center w-100 py-3">Loading...</div>';
  const q = query(collection(db, 'clubs'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    clubsList.innerHTML = '';
    if (snapshot.empty) {
      clubsList.innerHTML = '<div class="text-center py-3">No clubs posted yet.</div>';
      return;
    }
    snapshot.forEach(docSnap => {
      const c = docSnap.data();
      const id = docSnap.id;
      clubsList.innerHTML += clubCardHtml(c, id);
    });
    if (window.AOS) setTimeout(() => AOS.refresh(), 200);
    addClubEngagementListeners();
  });
}
function clubCardHtml(c, id) {
  return `
    <div class="col-md-6 col-lg-4">
      <div class="card h-100 club-card" data-aos="fade-left" data-id="${id}">
        ${c.imageUrl ? `<img src="${c.imageUrl}" class="club-img" alt="${c.name}">` : ''}
        <div class="card-body">
          <h5 class="card-title">${c.name || ''}</h5>
          <p>${c.description || ''}</p>
          ${c.supervisor ? `<p><b>Supervisor:</b> ${c.supervisor}</p>` : ''}
        </div>
        <div class="card-footer d-flex align-items-center justify-content-between">
          <div>
            <button class="btn btn-sm like-btn ${c.likes && c.likes[auth.currentUser?.uid] ? 'active' : ''}" data-id="${id}" title="Like">
              <i class="bi bi-heart"></i> <span>${c.likes ? Object.keys(c.likes).length : 0}</span>
            </button>
            <button class="btn btn-sm comment-btn" data-id="${id}" title="Comment"><i class="bi bi-chat-left-dots"></i></button>
            ${adminEmails.includes(auth.currentUser?.email) ?
              `<button class="btn btn-sm btn-danger ms-1 delete-club-btn" data-id="${id}"><i class="bi bi-trash"></i></button>` : ''}
          </div>
        </div>
        <div class="card-footer comment-section" style="display:none;"></div>
      </div>
    </div>
  `;
}
function addClubEngagementListeners() {
  // Like
  clubsList.querySelectorAll('.like-btn').forEach(btn => {
    btn.onclick = async function () {
      const id = btn.dataset.id;
      const ref = doc(db, 'clubs', id);
      const snap = await getDoc(ref);
      let likes = snap.data().likes || {};
      const userId = auth.currentUser.uid;
      if (likes[userId]) delete likes[userId];
      else likes[userId] = true;
      await updateDoc(ref, { likes });
    };
  });
  // Comment
  clubsList.querySelectorAll('.comment-btn').forEach(btn => {
    btn.onclick = function () {
      const card = btn.closest('.card');
      const section = card.querySelector('.comment-section');
      section.style.display = (section.style.display === 'none' || !section.style.display) ? 'block' : 'none';
      if (section.innerHTML === '') renderComments('clubs', btn.dataset.id, section);
    };
  });
  // Delete (admin)
  clubsList.querySelectorAll('.delete-club-btn').forEach(btn => {
    btn.onclick = async function () {
      if (confirm('Delete this club?')) {
        await deleteDoc(doc(db, 'clubs', btn.dataset.id));
      }
    };
  });
}

// --- Comments (generic for all collections) ---
function renderComments(collectionName, parentId, section) {
  section.innerHTML = '<div class="text-center py-2">Loading comments...</div>';
  const q = query(collection(db, `${collectionName}/${parentId}/comments`), orderBy('createdAt', 'asc'));
  onSnapshot(q, (snapshot) => {
    let html = `<div>`;
    snapshot.forEach(docSnap => {
      const c = docSnap.data();
      html += `<div class="mb-1"><b>${c.author || 'Anon'}:</b> ${c.text || ''} <span class="text-muted small">(${c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : ''})</span></div>`;
    });
    html += `</div>
      <form class="mt-2 add-comment-form">
        <div class="input-group">
          <input class="form-control" type="text" name="comment" placeholder="Add a comment..." required>
          <button class="btn btn-brand" type="submit"><i class="bi bi-send"></i></button>
        </div>
      </form>
    `;
    section.innerHTML = html;
    const form = section.querySelector('.add-comment-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const text = form.comment.value;
      await addDoc(collection(db, `${collectionName}/${parentId}/comments`), {
        text,
        author: auth.currentUser.displayName || auth.currentUser.email,
        createdAt: serverTimestamp()
      });
      form.reset();
    };
  });
}

// --- You can add similar functions for Gallery, Timetable, Profile ---

// --- AOS Refresh on tab change (optional) ---
document.querySelectorAll('a.nav-link[href^="#"]').forEach(anchor => {
  anchor.addEventListener('shown.bs.tab', function () {
    if (window.AOS) setTimeout(() => AOS.refresh(), 200);
  });
});

// --- File uploads for assignments, gallery, etc. ---
// ...Add event listeners for admin upload modals, use Firebase Storage

// --- Real-time engagement: likes/comments auto-refresh via onSnapshot is already implemented ---

// --- Admin CRUD for each section (add/edit/delete) ---
// ...Add event listeners to modals/forms for each section, call Firestore accordingly

// --- Profile loading, Gallery, Timetable, etc. can follow similar patterns above ---

// End of portal-main.jsn
