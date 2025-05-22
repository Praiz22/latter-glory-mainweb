import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, where
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
const registerForm = document.getElementById('registerForm');
const registerError = document.getElementById('registerError');
const profileContent = document.getElementById('profileContent');
const assignmentsList = document.getElementById('assignments-list');
const eventsList = document.getElementById('events-list');
const updatesList = document.getElementById('updates-list');
const clubsList = document.getElementById('clubs-list');
const registerStudentBtn = document.getElementById('registerStudentBtn');
const addAssignmentBtn = document.getElementById('addAssignmentBtn');
const addEventBtn = document.getElementById('addEventBtn');
const addUpdateBtn = document.getElementById('addUpdateBtn');
const addClubBtn = document.getElementById('addClubBtn');
const addGalleryBtn = document.getElementById('addGalleryBtn');
const addTimetableBtn = document.getElementById('addTimetableBtn');

// --- Helper: Show notification toast ---
function showNotification(message, type = 'primary', timeout = 4000) {
  const toastEl = document.getElementById('mainToast');
  const toastBody = document.getElementById('mainToastBody');
  toastBody.textContent = message;
  toastEl.className = `toast align-items-center text-bg-${type} border-0`;
  const toast = new bootstrap.Toast(toastEl, { delay: timeout });
  toast.show();
}

// --- Helper: Time formatting (Live 'time ago' + calendar) ---
function formatTimeAgo(date) {
  if (!date) return '';
  if (typeof date === 'string') date = new Date(date);
  if (typeof date.toDate === 'function') date = date.toDate();
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) === 1 ? '' : 's'} ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) === 1 ? '' : 's'} ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatCalendarDate(date) {
  if (!date) return '';
  if (typeof date === 'string') date = new Date(date);
  if (typeof date.toDate === 'function') date = date.toDate();
  return date.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// --- Registration: email/password signup ---
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (registerError) registerError.style.display = "none";
    const regNumber = registerForm.regNumber.value.trim();
    const fullName = registerForm.studentName.value.trim();
    const email = registerForm.studentEmail.value.trim().toLowerCase();
    const password = registerForm.registerPassword.value;
    const studentClass = registerForm.studentClass.value;
    const passportFile = registerForm.passport.files[0];
    if (!email || !password) {
      if (registerError) {
        registerError.textContent = "Email and password are required.";
        registerError.style.display = "block";
      }
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName });
      let passportUrl = "";
      if (passportFile) {
        const imgRef = storageRef(storage, `passports/${regNumber}_${Date.now()}.jpg`);
        await uploadBytes(imgRef, passportFile);
        passportUrl = await getDownloadURL(imgRef);
      }
      await setDoc(doc(db, "students", regNumber), {
        registrationNumber: regNumber,
        name: fullName,
        class: studentClass,
        passportUrl,
        email,
        uid: userCredential.user.uid,
        createdAt: new Date().toISOString()
      });
      showNotification("Registration successful! You can now log in.", "success");
      registerForm.reset();
      bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
    } catch (err) {
      if (registerError) {
        registerError.textContent = err.message;
        registerError.style.display = "block";
      }
      showNotification("Registration failed: " + err.message, "danger");
    }
  });
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

    loadAssignments();
    loadEvents();
    loadUpdates();
    loadClubs();
    loadProfile();
    if (isAdmin) loadAdminDashboard();

  } else {
    mainContent.style.display = 'none';
    loginBtnMainDiv.style.display = 'block';
    loginBtnNav.style.display = 'inline-block';
    logoutBtnNav.style.display = 'none';
    if (profileContent) profileContent.innerHTML = '';
    const adminDash = document.getElementById('adminDashboard');
    if (adminDash) adminDash.remove();
  }
});

// --- Profile Section: Show Student Details ---
async function loadProfile() {
  if (!profileContent) return;
  profileContent.innerHTML = `<div class="text-center w-100 py-3">Loading...</div>`;
  try {
    const user = auth.currentUser;
    if (!user) {
      profileContent.innerHTML = `<div class="text-danger">You are not logged in.</div>`;
      return;
    }
    const q = query(collection(db, "students"), where("email", "==", user.email));
    const querySnap = await getDocs(q);
    let studentSnap;
    if (!querySnap.empty) {
      studentSnap = querySnap.docs[0];
    }
    if (!studentSnap || !studentSnap.exists()) {
      profileContent.innerHTML = `<div class="text-danger">Student profile not found.</div>`;
      return;
    }
    const student = studentSnap.data();
    profileContent.innerHTML = `
      <div class="d-flex flex-column align-items-center justify-content-center">
        <img src="${student.passportUrl || 'https://placehold.co/100x100?text=No+Photo'}" class="profile-avatar mb-3" alt="Student Passport">
        <h4 class="fw-bold mb-1">${student.name || user.displayName || 'No Name'}</h4>
        <div class="mb-2 text-secondary">${student.email || user.email}</div>
        <div class="mb-2"><b>Reg No:</b> ${student.registrationNumber || '-'}</div>
        <div class="mb-2"><b>Class:</b> ${student.class || '-'}</div>
        <div class="mb-2"><b>Account Created:</b> <span class="profile-created-at" data-date="${student.createdAt || ''}">${formatTimeAgo(student.createdAt)}</span> <span class="text-muted small">(${formatCalendarDate(student.createdAt)})</span></div>
      </div>
    `;
    setInterval(() => {
      const createdAtSpan = profileContent.querySelector('.profile-created-at');
      if (createdAtSpan) {
        createdAtSpan.textContent = formatTimeAgo(student.createdAt);
      }
    }, 60000);
  } catch (err) {
    profileContent.innerHTML = `<div class="text-danger">Error loading profile.</div>`;
  }
}

// --- Admin Dashboard: List Students by Class ---
async function loadAdminDashboard() {
  const existing = document.getElementById('adminDashboard');
  if (existing) existing.remove();

  const dash = document.createElement('section');
  dash.id = "adminDashboard";
  dash.className = 'container my-4 glassmorphism p-4';
  dash.setAttribute('data-aos', 'fade-up');
  dash.innerHTML = `<h3 class="mb-4"><i class="bi bi-people"></i> All Students (Admin View)</h3><div id="studentGroups"></div>`;
  profileContent && profileContent.parentNode.insertBefore(dash, profileContent.nextSibling);

  const studentsSnap = await getDocs(collection(db, "students"));
  const students = [];
  studentsSnap.forEach(doc => students.push(doc.data()));

  const groupByClass = {};
  students.forEach(s => {
    if (!groupByClass[s.class]) groupByClass[s.class] = [];
    groupByClass[s.class].push(s);
  });

  const groupsDiv = dash.querySelector('#studentGroups');
  groupsDiv.innerHTML = '';
  Object.keys(groupByClass).sort().forEach(cls => {
    groupsDiv.innerHTML += `
      <div class="mb-4">
        <h5 class="mb-3"><span class="badge bg-dark">${cls}</span></h5>
        <div class="row g-3">
          ${groupByClass[cls].map(s => `
          <div class="col-md-4">
            <div class="card glassmorphism p-2">
              <div class="d-flex align-items-center">
                <img src="${s.passportUrl || 'https://placehold.co/60x60?text=No+Photo'}" alt="Passport" style="width:60px;height:60px;border-radius:50%;margin-right:1rem;">
                <div>
                  <div class="fw-bold">${s.name}</div>
                  <div class="text-muted small">Reg: ${s.registrationNumber}</div>
                  <div class="text-muted small">Created: <span class="admin-created-at" data-date="${s.createdAt || ''}">${formatTimeAgo(s.createdAt)}</span></div>
                  <button class="btn btn-sm btn-link view-student-btn mt-2 p-0" data-reg="${s.registrationNumber}"><i class="bi bi-eye"></i> View Details</button>
                </div>
              </div>
            </div>
          </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  setInterval(() => {
    groupsDiv.querySelectorAll('.admin-created-at').forEach(span => {
      const date = span.getAttribute('data-date');
      span.textContent = formatTimeAgo(date);
    });
  }, 60000);

  groupsDiv.querySelectorAll('.view-student-btn').forEach(btn => {
    btn.onclick = function () {
      const reg = btn.getAttribute('data-reg');
      const student = students.find(s => s.registrationNumber === reg);
      if (!student) return;
      showStudentDetailModal(student);
    };
  });
}

// --- Admin: Show Student Detail Modal ---
function showStudentDetailModal(student) {
  let modalEl = document.getElementById('studentDetailModal');
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.className = 'modal fade';
  modalEl.id = 'studentDetailModal';
  modalEl.tabIndex = -1;
  modalEl.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content glassmorphism">
        <div class="modal-header">
          <h5 class="modal-title">Student Details</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="d-flex flex-column align-items-center text-center">
            <img src="${student.passportUrl || 'https://placehold.co/100x100?text=No+Photo'}" class="profile-avatar mb-3" alt="Student Passport">
            <h5 class="fw-bold mb-1">${student.name || ''}</h5>
            <div class="mb-2 text-secondary">${student.email || ''}</div>
            <div class="mb-2"><b>Reg No:</b> ${student.registrationNumber || '-'}</div>
            <div class="mb-2"><b>Class:</b> ${student.class || '-'}</div>
            <div class="mb-2"><b>Account Created:</b> <span class="student-modal-created-at" data-date="${student.createdAt || ''}">${formatTimeAgo(student.createdAt)}</span> <span class="text-muted small">(${formatCalendarDate(student.createdAt)})</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
  modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
  setInterval(() => {
    const span = modalEl.querySelector('.student-modal-created-at');
    if (span) {
      const date = span.getAttribute('data-date');
      span.textContent = formatTimeAgo(date);
    }
  }, 60000);
}

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
function addAssignmentEngagementListeners() {
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
  assignmentsList.querySelectorAll('.comment-btn').forEach(btn => {
    btn.onclick = function () {
      const card = btn.closest('.card');
      const section = card.querySelector('.comment-section');
      section.style.display = (section.style.display === 'none' || !section.style.display) ? 'block' : 'none';
      if (section.innerHTML === '') renderComments('assignments', btn.dataset.id, section);
    };
  });
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
  eventsList.querySelectorAll('.comment-btn').forEach(btn => {
    btn.onclick = function () {
      const card = btn.closest('.card');
      const section = card.querySelector('.comment-section');
      section.style.display = (section.style.display === 'none' || !section.style.display) ? 'block' : 'none';
      if (section.innerHTML === '') renderComments('events', btn.dataset.id, section);
    };
  });
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
  updatesList.querySelectorAll('.comment-btn').forEach(btn => {
    btn.onclick = function () {
      const card = btn.closest('.card');
      const section = card.querySelector('.comment-section');
      section.style.display = (section.style.display === 'none' || !section.style.display) ? 'block' : 'none';
      if (section.innerHTML === '') renderComments('updates', btn.dataset.id, section);
    };
  });
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
  clubsList.querySelectorAll('.comment-btn').forEach(btn => {
    btn.onclick = function () {
      const card = btn.closest('.card');
      const section = card.querySelector('.comment-section');
      section.style.display = (section.style.display === 'none' || !section.style.display) ? 'block' : 'none';
      if (section.innerHTML === '') renderComments('clubs', btn.dataset.id, section);
    };
  });
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

// --- AOS Refresh on tab change (optional) ---
document.querySelectorAll('a.nav-link[href^="#"]').forEach(anchor => {
  anchor.addEventListener('shown.bs.tab', function () {
    if (window.AOS) setTimeout(() => AOS.refresh(), 200);
  });
});

// End of portal-main.js
