import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp, updateDoc
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

// --- Firebase init ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- Utility Functions (shared logic with admin.js) ---
function generateMatricNumber(fullName, studentClass) {
  const firstLetter = fullName.trim()[0].toUpperCase();
  const randomDigits = Math.floor(Math.random() * 90 + 10);
  return `LGA/${studentClass}/${firstLetter}${randomDigits}`;
}
function generatePassword(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pass = "";
  for (let i = 0; i < length; ++i) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}
function showNotification(message, type = 'primary', timeout = 4000) {
  const toastEl = document.getElementById('mainToast');
  const toastBody = document.getElementById('mainToastBody');
  if (!toastEl || !toastBody) return;
  toastBody.textContent = message;
  toastEl.className = `toast align-items-center text-bg-${type} border-0`;
  const toast = new bootstrap.Toast(toastEl, { delay: timeout });
  toast.show();
}
function logError(context, err) {
  console.error(`[${context}]`, err);
  showNotification(`Error: ${err.message || err}`, "danger", 6000);
}
function setButtonLoading(btn, isLoading = true) {
  if (!btn) return;
  if (isLoading) btn.classList.add('btn-loading');
  else btn.classList.remove('btn-loading');
}
function showPortalUI(isLoggedIn) {
  const tabNav = document.getElementById('tabNav');
  const mainContent = document.getElementById('mainContent');
  const loginBtnNav = document.getElementById('loginBtnNav');
  const logoutBtnNav = document.getElementById('logoutBtnNav');
  const loginBtnMainDiv = document.getElementById('loginBtnMainDiv');
  if (tabNav) tabNav.style.display = isLoggedIn ? '' : 'none';
  if (mainContent) mainContent.style.display = isLoggedIn ? '' : 'none';
  if (loginBtnNav) loginBtnNav.style.display = isLoggedIn ? 'none' : '';
  if (logoutBtnNav) logoutBtnNav.style.display = isLoggedIn ? '' : 'none';
  if (loginBtnMainDiv) loginBtnMainDiv.style.display = isLoggedIn ? 'none' : '';
}

// --- DOMContentLoaded: Hide UI until login state resolved ---
document.addEventListener('DOMContentLoaded', () => {
  showPortalUI(false);
});

// --- Registration ---
const registerForm = document.getElementById('registerForm');
const registerError = document.getElementById('registerError');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (registerError) registerError.style.display = "none";
    const btn = document.getElementById('registerSubmitBtn') || registerForm.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);

    const fullName = registerForm.studentName.value.trim();
    const email = registerForm.studentEmail.value.trim().toLowerCase();
    let password = registerForm.registerPassword.value;
    const studentClass = registerForm.studentClass.value;
    const gender = registerForm.querySelector('input[name="gender"]:checked')?.value || '';
    const passportFile = registerForm.passport.files[0];

    if (!email || !password || !fullName || !studentClass || !gender) {
      if (registerError) {
        registerError.textContent = "All fields are required.";
        registerError.style.display = "block";
      }
      setButtonLoading(btn, false);
      return;
    }
    // Optionally, force generate password if not provided
    if (!password) password = generatePassword(8);

    const matricNumber = generateMatricNumber(fullName, studentClass);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName });
      let passportUrl = "";
      if (passportFile) {
        const imgRef = storageRef(storage, `passports/${matricNumber}_${Date.now()}.jpg`);
        await uploadBytes(imgRef, passportFile);
        passportUrl = await getDownloadURL(imgRef);
      }
      await setDoc(doc(db, "students", matricNumber), {
        matricNumber,
        name: fullName,
        class: studentClass,
        gender,
        passportUrl,
        email,
        uid: userCredential.user.uid,
        createdAt: new Date().toISOString(),
        points: 0,
        status: "active",
        role: "student"
      });
      showNotification("Registration successful! You can now log in.", "success");
      registerForm.reset();
      bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
    } catch (err) {
      if (registerError) {
        registerError.textContent = err.message;
        registerError.style.display = "block";
      }
      logError("Registration", err);
    }
    setButtonLoading(btn, false);
  });
}

// --- Profile Section ---
const profileContent = document.getElementById('profileContent');
let studentProfile = null;
async function loadProfile() {
  if (!profileContent) return;
  profileContent.innerHTML = `
    <div class="d-flex justify-content-center align-items-center py-5">
      <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
    </div>`;
  try {
    const user = auth.currentUser;
    if (!user) {
      profileContent.innerHTML = `<div class="text-danger">You are not logged in.</div>`;
      return;
    }
    // Find student by email
    const q = query(collection(db, "students"), where("email", "==", user.email));
    const querySnap = await getDocs(q);
    if (querySnap.empty) {
      profileContent.innerHTML = `<div class="text-danger">Student profile not found.</div>`;
      return;
    }
    const student = querySnap.docs[0].data();
    studentProfile = student;
    // Handle frozen accounts
    if (student.status === "frozen") {
      profileContent.innerHTML = `
        <div class="alert alert-warning text-center">
          <b>Your account has been frozen by the administrator.</b><br>
          You cannot access the portal until it is unfrozen.
        </div>`;
      showPortalUI(false);
      await signOut(auth);
      return;
    }
    profileContent.innerHTML = `
      <div class="d-flex flex-column align-items-center justify-content-center">
        <img src="${student.passportUrl || 'https://placehold.co/100x100?text=No+Photo'}" class="profile-avatar mb-3" alt="Student Passport">
        <h4 class="fw-bold mb-1">${student.name || user.displayName || 'No Name'}</h4>
        <div class="mb-2 text-secondary">${student.email || user.email}</div>
        <div class="mb-2"><b>Matric Number:</b> ${student.matricNumber || '-'}</div>
        <div class="mb-2"><b>Class:</b> ${student.class || '-'}</div>
        <div class="mb-2"><b>Gender:</b> ${student.gender || '-'}</div>
        <div class="mb-2"><b>Points:</b> <span id="points-value">${student.points || 0}</span></div>
        <div class="mb-2"><b>Account Created:</b> <span>${student.createdAt || '-'}</span></div>
      </div>
    `;
  } catch (err) {
    logError("Profile Load", err);
    profileContent.innerHTML = `<div class="text-danger">Error loading profile.</div>`;
  }
}

// --- Notification System ---
async function loadNotifications() {
  const notifList = document.getElementById('notifications-list');
  if (!notifList) return;
  notifList.innerHTML = `
    <div class="d-flex justify-content-center align-items-center py-5">
      <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
    </div>`;
  try {
    const snap = await getDocs(query(collection(db, "notifications"), orderBy("createdAt", "desc")));
    if (snap.empty) {
      notifList.innerHTML = `<div class="text-muted">No notifications yet.</div>`;
      return;
    }
    let html = "";
    snap.forEach(docSnap => {
      const n = docSnap.data();
      if (n.type === "points") {
        html += `
          <div class="alert alert-success mb-2">
            <b>${n.student?.name}</b> from <b>${n.student?.class}</b> got <b>${n.points} points</b> for <i>${n.reason}</i>
          </div>
        `;
      } else {
        html += `<div class="alert alert-info mb-2">${n.message}</div>`;
      }
    });
    notifList.innerHTML = html;
  } catch (err) {
    notifList.innerHTML = `<div class="text-danger">Failed to load notifications.</div>`;
    logError("Notifications Load", err);
  }
}

// --- Leaderboard Loader ---
async function loadLeaderboard() {
  const leaderboardDiv = document.getElementById('leaderboard-list');
  if (!leaderboardDiv) return;
  leaderboardDiv.innerHTML = `
    <div class="d-flex justify-content-center align-items-center py-5">
      <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
    </div>`;
  try {
    const snap = await getDocs(query(collection(db, "students"), orderBy("points", "desc")));
    if (snap.empty) {
      leaderboardDiv.innerHTML = `<div class="text-muted">No students yet.</div>`;
      return;
    }
    let html = "<h5>Top Students</h5>";
    let rank = 1;
    snap.forEach(docSnap => {
      const s = docSnap.data();
      html += `
        <div class="d-flex align-items-center mb-1">
          <span class="badge bg-secondary me-2">${rank++}</span>
          <img src="${s.passportUrl || 'https://placehold.co/40x40?text=No+Photo'}" class="rounded-circle me-2" style="width:40px;height:40px;object-fit:cover;">
          <span class="fw-bold">${s.name}</span> &mdash; <span class="text-muted ms-1">${s.class}</span>
          <span class="ms-auto badge bg-primary">${s.points || 0} pts</span>
        </div>
      `;
    });
    leaderboardDiv.innerHTML = html;
  } catch (err) {
    leaderboardDiv.innerHTML = `<div class="text-danger">Failed to load leaderboard.</div>`;
    logError("Leaderboard Load", err);
  }
}

// --- Assignments ---
const assignmentsList = document.getElementById('assignments-list');
let assignmentTimers = [];
function clearAssignmentTimers() {
  assignmentTimers.forEach(timer => clearInterval(timer));
  assignmentTimers = [];
}
async function loadAssignments() {
  if (!assignmentsList || !studentProfile) return;
  clearAssignmentTimers();
  assignmentsList.innerHTML = `
    <div class="d-flex justify-content-center align-items-center py-5">
      <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
    </div>`;
  try {
    const q = query(collection(db, 'assignments'), orderBy('dueDate', 'desc'));
    const snap = await getDocs(q);
    if (snap.empty) {
      assignmentsList.innerHTML = "<p>No assignments yet.</p>";
      return;
    }
    let html = "";
    snap.forEach(docSnap => {
      const a = docSnap.data();
      if (a.class !== studentProfile.class) return;
      const now = new Date();
      const due = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
      const closed = a.closed || now > due;
      const timerId = `timer-${docSnap.id}`;
      html += `
        <div class="card mb-3">
          <div class="card-body">
            <h5>${a.title}</h5>
            <div>${a.description}</div>
            <div><b>Due:</b> ${due.toLocaleString()} <span class="assignment-status">${closed ? '<span class="text-danger">Closed</span>' : `<span class="text-success" id="${timerId}"></span>`}</span></div>
            ${closed ? "<div class='alert alert-warning mt-2'>Assignment has closed.</div>" : `
              <form onsubmit="window.submitAssignment(event, '${docSnap.id}')">
                <input type="text" class="form-control mb-2" required placeholder="Enter your answer or link">
                <button class="btn btn-primary btn-sm" type="submit">
                  <svg width="16" height="16" fill="currentColor" class="bi bi-send" viewBox="0 0 16 16">
                    <path d="M15.964 0.686a.5.5 0 0 1 .036.708l-15 15a.5.5 0 0 1-.708-.708l15-15a.5.5 0 0 1 .672-.036z"/>
                    <path d="M6.56 11.56l-2.122-2.122A.5.5 0 0 1 5.707 8h7.586a.5.5 0 0 1 .353.854l-2.122 2.122a.5.5 0 0 1-.707 0l-2.121-2.121a.5.5 0 0 1 0-.707z"/>
                  </svg>
                  <span>Submit Assignment</span>
                  <span class="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>
                </button>
              </form>
            `}
          </div>
        </div>
      `;
      if (!closed) {
        setTimeout(() => {
          const timerElem = document.getElementById(timerId);
          if (!timerElem) return;
          function updateTimer() {
            const left = due - new Date();
            if (left > 0) {
              const h = Math.floor(left/3600000), m = Math.floor((left%3600000)/60000), s = Math.floor((left%60000)/1000);
              timerElem.textContent = `Time left: ${h}h ${m}m ${s}s`;
            } else {
              timerElem.textContent = `Closed`;
              clearInterval(interval);
            }
          }
          updateTimer();
          const interval = setInterval(updateTimer, 1000);
          assignmentTimers.push(interval);
        }, 200);
      }
    });
    assignmentsList.innerHTML = html;
  } catch (err) {
    assignmentsList.innerHTML = "<div class='text-danger p-2'>Failed to load assignments.</div>";
    logError("Assignments Load", err);
  }
}

// Assignment submission and points/notification (points are only awarded after admin approval!)
window.submitAssignment = async function (e, assignmentId) {
  e.preventDefault();
  const answer = e.target[0].value;
  if (!answer) return;
  const btn = e.target.querySelector('button');
  setButtonLoading(btn, true);
  const user = auth.currentUser;
  if (!user || !studentProfile) return;
  try {
    // Submissions will be approved by admin before points are awarded!
    await setDoc(doc(db, 'assignments', assignmentId, 'submissions', user.uid), {
      studentEmail: user.email,
      answer,
      submittedAt: serverTimestamp(),
      approved: false
    });
    showNotification("Assignment submitted! Await admin approval.", "success");
    e.target.reset();
    loadProfile();
    loadNotifications();
    loadLeaderboard();
  } catch (err) {
    logError("Assignment Submit", err);
  }
  setButtonLoading(btn, false);
};

// --- Login/Logout Handlers ---
const loginForm = document.getElementById('loginForm');
const loginModal = document.getElementById('loginModal');
const loginBtnNav = document.getElementById('loginBtnNav');
const logoutBtnNav = document.getElementById('logoutBtnNav');
const loginBtnMainDiv = document.getElementById('loginBtnMainDiv');
const loginError = document.getElementById('loginError');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = "none";
    const btn = document.getElementById('loginSubmitBtn') || loginForm.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      bootstrap.Modal.getInstance(loginModal).hide();
      showNotification('Login successful!', 'success');
      showPortalUI(true);
      const tabTrigger = document.querySelector('[data-bs-toggle="tab"][href="#profileTab"]');
      if (tabTrigger) new bootstrap.Tab(tabTrigger).show();
    } catch (err) {
      loginError.style.display = "block";
      logError("Login", err);
      showNotification('Invalid credentials. Please try again.', 'danger');
    }
    setButtonLoading(btn, false);
  });
}

if (logoutBtnNav) {
  logoutBtnNav.addEventListener('click', async () => {
    setButtonLoading(logoutBtnNav, true);
    await signOut(auth);
    showNotification('Logged out.', 'info');
    showPortalUI(false);
    setButtonLoading(logoutBtnNav, false);
  });
}

// --- Auth State, Role Check and Portal Logic ---
onAuthStateChanged(auth, async user => {
  showPortalUI(!!user);
  if (user) {
    // Admin redirect check
    try {
      const adminDoc = await getDoc(doc(db, "admins", user.uid));
      if (adminDoc.exists()) {
        window.location.replace("admin.html");
        return;
      }
    } catch (err) {
      logError("Admin Check", err);
    }
    // Student logic
    const studentsSnap = await getDocs(collection(db, "students"));
    studentProfile = null;
    studentsSnap.forEach(docSnap => {
      if ((docSnap.data().email || "").toLowerCase() === user.email.toLowerCase()) {
        studentProfile = docSnap.data();
      }
    });
    loadProfile();
    loadAssignments();
    loadNotifications();
    loadLeaderboard();
    // Always default to profile tab on login
    const tabTrigger = document.querySelector('[data-bs-toggle="tab"][href="#profileTab"]');
    if (tabTrigger) new bootstrap.Tab(tabTrigger).show();
  } else {
    studentProfile = null;
    showPortalUI(false);
    if (profileContent) profileContent.innerHTML = '';
    if (assignmentsList) assignmentsList.innerHTML = '';
    const notifList = document.getElementById('notifications-list');
    if (notifList) notifList.innerHTML = '';
    const leaderboardDiv = document.getElementById('leaderboard-list');
    if (leaderboardDiv) leaderboardDiv.innerHTML = '';
  }
});
