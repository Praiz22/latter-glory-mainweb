import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp
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

// --- Helper Functions ---

function generateMatricNumber(fullName, studentClass) {
  const firstLetter = fullName.trim()[0].toUpperCase();
  const randomDigits = Math.floor(Math.random() * 90 + 10); // two digits
  return `LGA/${studentClass}/${firstLetter}${randomDigits}`;
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

// --- Registration ---
const registerForm = document.getElementById('registerForm');
const registerError = document.getElementById('registerError');

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (registerError) registerError.style.display = "none";

    const fullName = registerForm.studentName.value.trim();
    const email = registerForm.studentEmail.value.trim().toLowerCase();
    const password = registerForm.registerPassword.value;
    const studentClass = registerForm.studentClass.value;
    const gender = registerForm.querySelector('input[name="gender"]:checked')?.value || '';
    const passportFile = registerForm.passport.files[0];

    if (!email || !password || !fullName || !studentClass || !gender) {
      if (registerError) {
        registerError.textContent = "All fields are required.";
        registerError.style.display = "block";
      }
      return;
    }

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
        points: 0
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
  });
}

// --- Profile Section (NO delete button for students) ---
const profileContent = document.getElementById('profileContent');

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
    if (querySnap.empty) {
      profileContent.innerHTML = `<div class="text-danger">Student profile not found.</div>`;
      return;
    }
    const student = querySnap.docs[0].data();

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
  notifList.innerHTML = `<div class="text-center py-3">Loading notifications...</div>`;
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
        // General notification
        html += `
          <div class="alert alert-info mb-2">
            ${n.message}
          </div>
        `;
      }
    });
    notifList.innerHTML = html;
  } catch (err) {
    notifList.innerHTML = `<div class="text-danger">Failed to load notifications.</div>`;
    logError("Notifications Load", err);
  }
}

// --- Leaderboard Loader (no chart, just data for now) ---
async function loadLeaderboard() {
  const leaderboardDiv = document.getElementById('leaderboard-list');
  if (!leaderboardDiv) return;
  leaderboardDiv.innerHTML = `<div class="text-center py-3">Loading leaderboard...</div>`;
  try {
    // Get all students, order by points descending
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

// --- Auth State, Login/Logout/Tab Logic ---
const loginForm = document.getElementById('loginForm');
const loginModal = document.getElementById('loginModal');
const loginBtnNav = document.getElementById('loginBtnNav');
const logoutBtnNav = document.getElementById('logoutBtnNav');
const loginBtnMainDiv = document.getElementById('loginBtnMainDiv');
const mainContent = document.getElementById('mainContent');
const tabNav = document.getElementById('tabNav');
const loginError = document.getElementById('loginError');

function showPortalUI(isLoggedIn) {
  if (tabNav) tabNav.style.display = isLoggedIn ? '' : 'none';
  if (mainContent) mainContent.style.display = isLoggedIn ? '' : 'none';
  if (loginBtnNav) loginBtnNav.style.display = isLoggedIn ? 'none' : '';
  if (logoutBtnNav) logoutBtnNav.style.display = isLoggedIn ? '' : 'none';
  if (loginBtnMainDiv) loginBtnMainDiv.style.display = isLoggedIn ? 'none' : '';
}

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
      logError("Login", err);
      showNotification('Invalid credentials. Please try again.', 'danger');
    }
  });
}

if (logoutBtnNav) {
  logoutBtnNav.addEventListener('click', async () => {
    await signOut(auth);
    showNotification('Logged out.', 'info');
    showPortalUI(false);
  });
}

let studentProfile = null;

// --- ROLE CHECKER AND REDIRECT LOGIC (checks 'admins' collection now) ---
onAuthStateChanged(auth, async (user) => {
  showPortalUI(!!user);
  if (user) {
    // ---- ROLE CHECKER FOR ADMIN (checks 'admins' collection by UID) ----
    try {
      const adminDoc = await getDoc(doc(db, "admins", user.uid));
      if (adminDoc.exists()) {
        window.location.href = "admin.html";
        return; // Stop further student logic
      }
    } catch (err) {
      logError("Admin Check", err);
    }
    // --- STUDENT LOGIC (if not admin) ---
    const studentsSnap = await getDocs(collection(db, "students"));
    studentsSnap.forEach(docSnap => {
      if ((docSnap.data().email || "").toLowerCase() === user.email.toLowerCase()) {
        studentProfile = docSnap.data();
      }
    });
    loadProfile();
    loadAssignments();
    loadNotifications();
    loadLeaderboard();
  } else {
    studentProfile = null;
    if (profileContent) profileContent.innerHTML = '';
    if (assignmentsList) assignmentsList.innerHTML = '';
    const notifList = document.getElementById('notifications-list');
    if (notifList) notifList.innerHTML = '';
    const leaderboardDiv = document.getElementById('leaderboard-list');
    if (leaderboardDiv) leaderboardDiv.innerHTML = '';
  }
});

// --- Assignments (with timer and robust interval logic) ---
const assignmentsList = document.getElementById('assignments-list');
let assignmentTimers = [];

function clearAssignmentTimers() {
  assignmentTimers.forEach(timer => clearInterval(timer));
  assignmentTimers = [];
}

async function loadAssignments() {
  if (!assignmentsList || !studentProfile) return;
  clearAssignmentTimers();
  assignmentsList.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
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
                <button class="btn btn-primary btn-sm">Submit Assignment</button>
              </form>
            `}
          </div>
        </div>
      `;
      // Timer updater (ONE interval per assignment)
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
    logError("Assignments Load", err);
    assignmentsList.innerHTML = "<div class='text-danger p-2'>Failed to load assignments.</div>";
  }
}

// Assignment submission and points/notification
window.submitAssignment = async function (e, assignmentId) {
  e.preventDefault();
  const answer = e.target[0].value;
  if (!answer) return;
  const user = auth.currentUser;
  if (!user || !studentProfile) return;
  try {
    await setDoc(doc(db, 'assignments', assignmentId, 'submissions', user.uid), {
      studentEmail: user.email,
      answer,
      submittedAt: serverTimestamp(),
      approved: false // admin will update this
    });
    // Award points for assignment submission
    const pointsForAssignment = 2;
    const studentRef = doc(db, "students", studentProfile.matricNumber);
    await setDoc(studentRef, { points: (studentProfile.points || 0) + pointsForAssignment }, { merge: true });
    // Add points notification
    await setDoc(doc(collection(db, "notifications")), {
      type: "points",
      message: `${studentProfile.name} from ${studentProfile.class} got ${pointsForAssignment} points for submitting an assignment`,
      student: {
        name: studentProfile.name,
        matricNumber: studentProfile.matricNumber,
        passportUrl: studentProfile.passportUrl || "",
        class: studentProfile.class
      },
      points: pointsForAssignment,
      reason: "submitting an assignment",
      createdAt: new Date().toISOString()
    });
    e.target.reset();
    showNotification("Assignment submitted! Await admin approval. You earned 2 points.", "success");
    loadProfile();
    loadNotifications();
    loadLeaderboard();
  } catch (err) {
    logError("Assignment Submit", err);
  }
};
