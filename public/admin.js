// ---- Firebase Imports & Config ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, setDoc, where, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ---- Firebase Config ----
const firebaseConfig = {
  apiKey: "AIzaSyDgReNsNbU6-Cnx-ej0HPcHSrCXVppohJQ",
  authDomain: "latter-glory.firebaseapp.com",
  projectId: "latter-glory",
  storageBucket: "latter-glory.appspot.com",
  messagingSenderId: "133970297722",
  appId: "1:133970297722:web:33758b76625c70930dccc3",
  measurementId: "G-5G1BYM7Q3Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ---- Toast & Loader Utilities ----
function showToast(message, type = "success") {
  let toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2 position-fixed bottom-0 end-0 m-4`;
  toast.style.zIndex = 9999;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}
function logError(context, err) {
  console.error(`[${context}]`, err);
  showToast(`Error: ${err.message || err}`, "danger");
}
function buttonLoader(btn, loading = true, text = "") {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${text || btn.textContent.trim()}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || text || "";
  }
}

// ---- DOM Elements ----
const adminLoginSection = document.getElementById('adminLoginSection');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminLoginError = document.getElementById('adminLoginError');
const logoutBtnAdmin = document.getElementById('logoutBtnAdmin');
const adminPanelSection = document.getElementById('adminPanelSection');

// Profile
const adminPanelName = document.getElementById('adminPanelName');
const adminPanelEmail = document.getElementById('adminPanelEmail');
const adminPanelAvatar = document.getElementById('adminPanelAvatar');

// Tabs
const tabLinks = document.querySelectorAll(".admin-tab-link");
const tabContents = document.querySelectorAll(".admin-tab-content");

// Students
const adminStudentList = document.getElementById('adminStudentList');
const studentRegisterForm = document.getElementById('studentRegisterForm');
const registerStudentBtn = document.getElementById('registerStudentBtn');

// Assignments
const adminAssignmentList = document.getElementById('adminAssignmentList');
const assignmentUploadForm = document.getElementById('assignmentUploadForm');
const assignmentUploadInput = document.getElementById('assignmentUploadInput');
const assignmentUploadBtn = document.getElementById('assignmentUploadBtn');

// Tests
const adminTestList = document.getElementById('adminTestList');
const testUploadForm = document.getElementById('testUploadForm');
const testUploadInput = document.getElementById('testUploadInput');
const testUploadBtn = document.getElementById('testUploadBtn');

// Announcements
const adminAnnouncementList = document.getElementById('adminAnnouncementList');
const announcementForm = document.getElementById('announcementForm');
const announcementBtn = document.getElementById('announcementBtn');

// Notifications
const adminNotificationList = document.getElementById('adminNotificationList');
const notificationForm = document.getElementById('notificationForm');
const notificationBtn = document.getElementById('notificationBtn');

// Leaderboard
const adminLeaderboardList = document.getElementById('adminLeaderboardList');

// Gallery
const galleryUploadForm = document.getElementById('galleryUploadForm');
const galleryUploadInput = document.getElementById('galleryUploadInput');
const adminGalleryList = document.getElementById('adminGalleryList');

// Logs
const adminLogsSection = document.getElementById('adminLogsSection');

// ---- Loader: Hide loader on DOMContentLoaded ----
document.addEventListener('DOMContentLoaded', () => {
  const loaderBg = document.getElementById('loaderBg');
  if (loaderBg) {
    setTimeout(() => {
      loaderBg.classList.add('fade-out');
      setTimeout(() => { loaderBg.style.display = 'none'; }, 500);
    }, 1200);
  }
});

// ---- Tabs Logic ----
function showTab(tabName) {
  tabContents.forEach(c => c.style.display = "none");
  tabLinks.forEach(l => l.classList.remove("active"));
  const content = document.getElementById(tabName);
  if (content) content.style.display = "";
  const link = document.querySelector(`[data-tab="${tabName}"]`);
  if (link) link.classList.add("active");
}

// ---- Default Admin Creation (on login only) ----
async function ensureDefaultAdmin() {
  const email = "praiseola22@gmail.com";
  const password = "@Michaelpraise23";
  const adminSnap = await getDocs(query(collection(db, "admins"), where("email", "==", email)));
  if (adminSnap.empty) {
    try {
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(auth, email, password);
      } catch (e) {
        cred = await signInWithEmailAndPassword(auth, email, password);
      }
      await setDoc(doc(db, "admins", cred.user.uid), {
        name: "Super Admin",
        email: email,
        role: "admin",
        createdAt: new Date().toISOString()
      });
      showToast("Default admin created/verified!", "success");
    } catch (e) {
      // Ignore error (account may already exist)
    }
  }
}

// ---- Auth Listener ----
if (adminPanelSection) adminPanelSection.style.display = "none";
if (logoutBtnAdmin) logoutBtnAdmin.style.display = "none";
if (adminLoginSection) adminLoginSection.style.display = "";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (adminPanelSection) adminPanelSection.style.display = "none";
    if (adminLoginSection) adminLoginSection.style.display = "";
    if (logoutBtnAdmin) logoutBtnAdmin.style.display = "none";
    return;
  }
  const adminDoc = await getDoc(doc(db, "admins", user.uid));
  if (adminDoc.exists() && adminDoc.data().role === "admin") {
    if (adminPanelSection) adminPanelSection.style.display = "";
    if (adminLoginSection) adminLoginSection.style.display = "none";
    if (logoutBtnAdmin) logoutBtnAdmin.style.display = "";
    const profile = adminDoc.data();
    if (adminPanelName) adminPanelName.textContent = profile.name || "Admin";
    if (adminPanelEmail) adminPanelEmail.textContent = profile.email || user.email;
    if (adminPanelAvatar) adminPanelAvatar.src = profile.photoURL || "https://placehold.co/60x60?text=Admin";
    showTab("tabDashboard");
    loadDashboard();
    loadStudents();
    loadAssignments();
    loadTests();
    loadAnnouncements();
    loadNotifications();
    loadLeaderboard();
    loadGallery();
    loadLogs();
  } else {
    showToast("Not authorized as admin.", "danger");
    await signOut(auth);
    if (adminPanelSection) adminPanelSection.style.display = "none";
    if (adminLoginSection) adminLoginSection.style.display = "";
    if (logoutBtnAdmin) logoutBtnAdmin.style.display = "none";
  }
});

// ---- Login Form ----
if (adminLoginForm) {
  adminLoginForm.onsubmit = async function(e) {
    e.preventDefault();
    adminLoginError.textContent = "";
    buttonLoader(adminLoginBtn, true, "Logging in...");
    try {
      await ensureDefaultAdmin(); // Always check on login
      const email = document.getElementById('adminLoginEmail').value.trim().toLowerCase();
      const password = document.getElementById('adminLoginPassword').value;
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Login successful!", "success");
    } catch (err) {
      adminLoginError.textContent = err.message || "Login failed.";
      showToast(err.message || "Login failed.", "danger");
    }
    buttonLoader(adminLoginBtn, false);
  };
}
if (logoutBtnAdmin) {
  logoutBtnAdmin.onclick = async function() {
    buttonLoader(logoutBtnAdmin, true, "Logging out...");
    await signOut(auth);
    window.location.href = "portal.html";
  }
}

// ---- Tabs Navigation ----
tabLinks.forEach(link => {
  link.addEventListener("click", function () {
    showTab(this.dataset.tab);
    if (this.dataset.tab === "tabDashboard") loadDashboard();
    if (this.dataset.tab === "tabStudents") loadStudents();
    if (this.dataset.tab === "tabAssignments") loadAssignments();
    if (this.dataset.tab === "tabTests") loadTests();
    if (this.dataset.tab === "tabAnnouncements") loadAnnouncements();
    if (this.dataset.tab === "tabNotifications") loadNotifications();
    if (this.dataset.tab === "tabLeaderboard") loadLeaderboard();
    if (this.dataset.tab === "tabGallery") loadGallery();
    if (this.dataset.tab === "tabLogs") loadLogs();
  });
});

// ---- Dashboard (empty, placeholder for stats) ----
async function loadDashboard() {
  // Implement stats, recent logs, etc if desired.
}

// ---- Students ----
async function loadStudents() {
  if (!adminStudentList) return;
  adminStudentList.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
  const snap = await getDocs(collection(db, "students"));
  let html = `<table class="table table-striped"><thead><tr>
    <th>Name</th><th>Matric</th><th>Email</th><th>Class</th><th>Points</th><th>Actions</th></tr></thead><tbody>`;
  snap.forEach(doc => {
    const s = doc.data();
    html += `<tr>
      <td>${s.name || ""}</td>
      <td>${s.matricNumber || ""}</td>
      <td>${s.email || ""}</td>
      <td>${s.class || ""}</td>
      <td>${s.points || 0}</td>
      <td>
        <button class="btn btn-sm btn-info" onclick="alert('Show/edit student details in modal')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-danger" onclick="window.deleteStudent('${doc.id}')"><i class="bi bi-x"></i></button>
      </td>
    </tr>`;
  });
  html += "</tbody></table>";
  adminStudentList.innerHTML = html;
}
window.deleteStudent = async function(id) {
  if (confirm("Delete this student?")) {
    await deleteDoc(doc(db, "students", id));
    showToast("Student deleted!", "danger");
    loadStudents();
  }
};

// ---- Assignment Upload (JSON) ----
if (assignmentUploadForm && assignmentUploadInput) {
  assignmentUploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = assignmentUploadInput.files[0];
    if (!file) return showToast("Choose a JSON file.", "danger");
    buttonLoader(assignmentUploadBtn, true, "Uploading...");
    try {
      const text = await file.text();
      let data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("File must be an array of assignments.");
      for (const a of data) {
        await addDoc(collection(db, "assignments"), {
          ...a,
          createdAt: serverTimestamp()
        });
      }
      showToast("Assignments uploaded!", "success");
      assignmentUploadForm.reset();
      loadAssignments();
    } catch (err) {
      logError("AssignmentUpload", err);
    }
    buttonLoader(assignmentUploadBtn, false);
  });
}

// ---- Assignments List ----
async function loadAssignments() {
  if (!adminAssignmentList) return;
  adminAssignmentList.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
  const snap = await getDocs(collection(db, "assignments"));
  let html = `<table class="table table-striped"><thead><tr>
    <th>Title</th><th>Class</th><th>Due</th><th>Actions</th></tr></thead><tbody>`;
  snap.forEach(doc => {
    const a = doc.data();
    html += `<tr>
      <td>${a.title || ""}</td>
      <td>${a.class || ""}</td>
      <td>${a.dueDate && a.dueDate.seconds ? new Date(a.dueDate.seconds * 1000).toLocaleString() : "N/A"}</td>
      <td>
        <button class="btn btn-sm btn-info" onclick="alert('Edit assignment (modal)')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-danger" onclick="window.deleteAssignment('${doc.id}')"><i class="bi bi-x"></i></button>
      </td>
    </tr>`;
  });
  html += "</tbody></table>";
  adminAssignmentList.innerHTML = html;
}
window.deleteAssignment = async function(id) {
  if (confirm("Delete this assignment?")) {
    await deleteDoc(doc(db, "assignments", id));
    showToast("Assignment deleted!", "danger");
    loadAssignments();
  }
};

// ---- CBT Test Upload (JSON, shuffle questions) ----
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
if (testUploadForm && testUploadInput) {
  testUploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = testUploadInput.files[0];
    if (!file) return showToast("Choose a JSON file.", "danger");
    buttonLoader(testUploadBtn, true, "Uploading...");
    try {
      const text = await file.text();
      let data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("File must be an array of tests.");
      for (const t of data) {
        if (!Array.isArray(t.questions)) throw new Error("Missing questions array in test.");
        t.questions = shuffleArray(t.questions);
        await addDoc(collection(db, "tests"), {
          ...t,
          postedAt: serverTimestamp()
        });
      }
      showToast("CBT tests uploaded and shuffled!", "success");
      testUploadForm.reset();
      loadTests();
    } catch (err) {
      logError("CBTTestUpload", err);
    }
    buttonLoader(testUploadBtn, false);
  });
}

// ---- CBT Tests List ----
async function loadTests() {
  if (!adminTestList) return;
  adminTestList.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
  const snap = await getDocs(collection(db, "tests"));
  let html = `<table class="table table-striped"><thead><tr>
    <th>Title</th><th>Class</th><th>Duration</th><th>Posted</th><th>Actions</th></tr></thead><tbody>`;
  snap.forEach(doc => {
    const t = doc.data();
    html += `<tr>
      <td>${t.title || ""}</td>
      <td>${t.class || ""}</td>
      <td>${t.duration || ""} min</td>
      <td>${t.postedAt && t.postedAt.seconds ? new Date(t.postedAt.seconds * 1000).toLocaleString() : "N/A"}</td>
      <td>
        <button class="btn btn-sm btn-info" onclick="alert('Edit test (modal)')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-danger" onclick="window.deleteTest('${doc.id}')"><i class="bi bi-x"></i></button>
      </td>
    </tr>`;
  });
  html += "</tbody></table>";
  adminTestList.innerHTML = html;
}
window.deleteTest = async function(id) {
  if (confirm("Delete this test?")) {
    await deleteDoc(doc(db, "tests", id));
    showToast("Test deleted!", "danger");
    loadTests();
  }
};

// ---- Announcements ----
if (announcementForm) {
  announcementForm.onsubmit = async function(e) {
    e.preventDefault();
    buttonLoader(announcementBtn, true, "Posting...");
    try {
      const title = announcementForm.elements["announcementTitle"].value.trim();
      const body = announcementForm.elements["announcementBody"].value.trim();
      await addDoc(collection(db, "announcements"), {
        title,
        body,
        createdAt: serverTimestamp()
      });
      showToast("Announcement posted!", "success");
      announcementForm.reset();
      loadAnnouncements();
    } catch (err) {
      logError("Announcement", err);
    }
    buttonLoader(announcementBtn, false);
  };
}
async function loadAnnouncements() {
  if (!adminAnnouncementList) return;
  adminAnnouncementList.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
  const snap = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")));
  let html = `<table class="table table-striped"><thead><tr>
    <th>Title</th><th>Body</th><th>Date</th><th>Actions</th></tr></thead><tbody>`;
  snap.forEach(doc => {
    const a = doc.data();
    html += `<tr>
      <td>${a.title || ""}</td>
      <td>${a.body || ""}</td>
      <td>${a.createdAt && a.createdAt.seconds ? new Date(a.createdAt.seconds * 1000).toLocaleString() : ""}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="window.deleteAnnouncement('${doc.id}')"><i class="bi bi-x"></i></button>
      </td>
    </tr>`;
  });
  html += "</tbody></table>";
  adminAnnouncementList.innerHTML = html;
}
window.deleteAnnouncement = async function(id) {
  if (confirm("Delete this announcement?")) {
    await deleteDoc(doc(db, "announcements", id));
    showToast("Announcement deleted!", "danger");
    loadAnnouncements();
  }
};

// ---- Notifications ----
if (notificationForm) {
  notificationForm.onsubmit = async function(e) {
    e.preventDefault();
    buttonLoader(notificationBtn, true, "Sending...");
    try {
      const to = notificationForm.elements["notificationTo"].value.trim();
      const message = notificationForm.elements["notificationMessage"].value.trim();
      await addDoc(collection(db, "notifications"), {
        to,
        message,
        createdAt: serverTimestamp()
      });
      showToast("Notification sent!", "success");
      notificationForm.reset();
      loadNotifications();
    } catch (err) {
      logError("Notification", err);
    }
    buttonLoader(notificationBtn, false);
  };
}
async function loadNotifications() {
  if (!adminNotificationList) return;
  adminNotificationList.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
  const snap = await getDocs(query(collection(db, "notifications"), orderBy("createdAt", "desc")));
  let html = `<table class="table table-striped"><thead><tr>
    <th>To</th><th>Message</th><th>Date</th><th>Actions</th></tr></thead><tbody>`;
  snap.forEach(doc => {
    const n = doc.data();
    html += `<tr>
      <td>${n.to || "All"}</td>
      <td>${n.message || ""}</td>
      <td>${n.createdAt && n.createdAt.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleString() : ""}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="window.deleteNotification('${doc.id}')"><i class="bi bi-x"></i></button>
      </td>
    </tr>`;
  });
  html += "</tbody></table>";
  adminNotificationList.innerHTML = html;
}
window.deleteNotification = async function(id) {
  if (confirm("Delete this notification?")) {
    await deleteDoc(doc(db, "notifications", id));
    showToast("Notification deleted!", "danger");
    loadNotifications();
  }
};

// ---- Leaderboard ----
async function loadLeaderboard() {
  if (!adminLeaderboardList) return;
  adminLeaderboardList.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
  const snap = await getDocs(query(collection(db, "students"), orderBy("points", "desc")));
  let html = `<table class="table table-striped"><thead><tr>
    <th>#</th><th>Name</th><th>Matric</th><th>Points</th></tr></thead><tbody>`;
  let rank = 1;
  snap.forEach(doc => {
    const s = doc.data();
    html += `<tr>
      <td>${rank}</td>
      <td>${s.name}</td>
      <td>${s.matricNumber}</td>
      <td><span class="badge bg-success fs-6">${s.points || 0}</span></td>
    </tr>`;
    rank++;
  });
  html += "</tbody></table>";
  adminLeaderboardList.innerHTML = html;
}

// ---- Gallery Management ----
if (galleryUploadForm && galleryUploadInput) {
  galleryUploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = galleryUploadInput.files[0];
    if (!file) return showToast("Choose an image file.", "danger");
    buttonLoader(galleryUploadBtn, true, "Uploading...");
    try {
      const fileRef = storageRef(storage, `gallery/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const imageUrl = await getDownloadURL(fileRef);
      await addDoc(collection(db, "gallery"), {
        imageUrl,
        caption: galleryUploadForm.elements["galleryCaption"].value.trim(),
        date: new Date(galleryUploadForm.elements["galleryDate"].value),
        createdAt: serverTimestamp()
      });
      showToast("Gallery image uploaded!", "success");
      galleryUploadForm.reset();
      loadGallery();
    } catch (err) {
      logError("GalleryUpload", err);
    }
    buttonLoader(galleryUploadBtn, false);
  });
}
async function loadGallery() {
  if (!adminGalleryList) return;
  adminGalleryList.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
  const snap = await getDocs(query(collection(db, "gallery"), orderBy("date", "desc")));
  let html = "";
  snap.forEach(doc => {
    const data = doc.data();
    html += `
      <div class="card mb-3">
        <img src="${data.imageUrl}" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;" />
        <div class="card-body">
          <div class="caption mb-1">${data.caption || ""}</div>
          <div class="date text-muted">${data.date ? (data.date.seconds ? new Date(data.date.seconds * 1000).toLocaleDateString() : "") : ""}</div>
          <button class='btn btn-sm btn-outline-danger delete-gallery-btn' onclick="window.deleteGalleryImg('${doc.id}')">Delete</button>
        </div>
      </div>
    `;
  });
  adminGalleryList.innerHTML = html || "<div>No images yet.</div>";
}
window.deleteGalleryImg = async function(id) {
  if (!confirm("Delete this image?")) return;
  try {
    await deleteDoc(doc(db, "gallery", id));
    showToast("Image deleted!", "danger");
    loadGallery();
  } catch (e) {
    logError("GalleryDelete", e);
  }
};

// ---- Logs ----
async function loadLogs() {
  if (!adminLogsSection) return;
  adminLogsSection.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
  const snap = await getDocs(query(collection(db, "logs"), orderBy("timestamp", "desc")));
  let html = "<ul class='list-group'>";
  let i = 0;
  snap.forEach(doc => {
    if (i >= 50) return;
    const l = doc.data();
    html += `<li class='list-group-item small'>
      <b>${l.email || ''}</b>: ${l.action || ''} <span class="text-muted">${l.timestamp && l.timestamp.seconds ? new Date(l.timestamp.seconds * 1000).toLocaleString() : ""}</span>
    </li>`;
    i++;
  });
  html += "</ul>";
  adminLogsSection.innerHTML = html;
}

// ---- Student Registration ----
if (studentRegisterForm && registerStudentBtn) {
  studentRegisterForm.onsubmit = async function(e) {
    e.preventDefault();
    buttonLoader(registerStudentBtn, true, "Registering...");
    try {
      const fullName = studentRegisterForm.elements["regName"].value.trim();
      const email = studentRegisterForm.elements["regEmail"].value.trim().toLowerCase();
      const studentClass = studentRegisterForm.elements["regClass"].value.trim();
      const gender = studentRegisterForm.elements["regGender"].value;
      const password = studentRegisterForm.elements["regPassword"].value || Math.random().toString(36).slice(-8);
      const matricNumber = `LGA/${studentClass}/${fullName[0].toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
      // Create Auth
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(auth, email, password);
      } catch (err) {
        showToast("Account exists or error.", "danger");
        buttonLoader(registerStudentBtn, false);
        return;
      }
      // Save to Firestore
      await setDoc(doc(db, "students", matricNumber), {
        matricNumber,
        registrationNumber: matricNumber,
        name: fullName,
        class: studentClass,
        gender,
        email,
        uid: cred.user.uid,
        createdAt: new Date().toISOString(),
        points: 0,
        status: "active",
        role: "student"
      });
      showToast(`Student registered! Matric: ${matricNumber}, Password: ${password}`, "success");
      studentRegisterForm.reset();
      loadStudents();
    } catch (err) {
      logError("StudentRegister", err);
    }
    buttonLoader(registerStudentBtn, false);
  };
}