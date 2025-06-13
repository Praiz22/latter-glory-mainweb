// ---- Firebase Imports & Config ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getFirestore, collection, getDoc, doc, query, where, orderBy, getDocs, updateDoc, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getStorage, ref as storageRef, getDownloadURL
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

// ---- DOM Elements (assumes these IDs exist in student-portal-ui.html) ----
const studentLoginSection = document.getElementById('studentLoginSection');
const studentLoginForm = document.getElementById('studentLoginForm');
const studentLoginBtn = document.getElementById('studentLoginBtn');
const studentLoginError = document.getElementById('studentLoginError');

const studentPortalSection = document.getElementById('studentPortalSection');
const logoutBtnStudent = document.getElementById('logoutBtnStudent');

// Student Profile Dashboard
const studentNameDisplay = document.getElementById('studentNameDisplay');
const studentMatricDisplay = document.getElementById('studentMatricDisplay');
const studentClassDisplay = document.getElementById('studentClassDisplay');
const studentEmailDisplay = document.getElementById('studentEmailDisplay');
const studentGenderDisplay = document.getElementById('studentGenderDisplay');
const studentAvatarDisplay = document.getElementById('studentAvatarDisplay');
const studentPointsDisplay = document.getElementById('studentPointsDisplay'); // New: Points display
const studentLastLoginDisplay = document.getElementById('studentLastLoginDisplay'); // New: Last Login display

// Frozen Account Overlay
const frozenAccountOverlay = document.getElementById('frozenAccountOverlay'); // New element for frozen state
const frozenMessageDisplay = document.getElementById('frozenMessageDisplay'); // Message within frozen overlay

// Tabs
const tabLinks = document.querySelectorAll(".student-tab-link");
const tabContents = document.querySelectorAll(".student-tab-content");

// Content Areas
const assignmentsList = document.getElementById('assignmentsList');
const testsList = document.getElementById('testsList');
const announcementsList = document.getElementById('announcementsList');
const notificationsList = document.getElementById('notificationsList'); // For all notifications, including points
const galleryList = document.getElementById('galleryList');
const leaderboardList = document.getElementById('leaderboardList');

// Current User Data
let currentStudent = null; // Stores logged-in student's Firestore data

// ---- Utility Functions ----
function showToast(message, type = "success") {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn("Toast container not found.");
        return;
    }
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type} border-0 show`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    toastContainer.append(toastEl);
    const bsToast = new bootstrap.Toast(toastEl, { delay: 5000 });
    bsToast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

async function logActivity(studentEmail, action, details = {}) {
    try {
        await addDoc(collection(db, "logs"), {
            email: studentEmail, // Log student's email
            action: action,
            details: details,
            timestamp: serverTimestamp()
        });
        console.log("Student activity logged:", action, details);
    } catch (err) {
        console.error("Error logging student activity:", err);
    }
}

function logError(context, err) {
    console.error(`Error in ${context}:`, err);
    showToast(`Error in ${context}: ${err.message}`, "danger");
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


// ---- Loader: Hide loader on DOMContentLoaded ----
document.addEventListener('DOMContentLoaded', () => {
    const loaderBg = document.getElementById('loaderBg');
    if (loaderBg) {
        setTimeout(() => {
            loaderBg.classList.add('fade-out');
            setTimeout(() => { loaderBg.style.display = 'none'; }, 500);
        }, 1200); // Give a little time for the animation to play
    }
});

// ---- Auth Listener ----
// Initial state
if (studentPortalSection) studentPortalSection.style.display = "none";
if (logoutBtnStudent) logoutBtnStudent.style.display = "none";
if (studentLoginSection) studentLoginSection.style.display = "";
if (frozenAccountOverlay) frozenAccountOverlay.style.display = "none";

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // No user logged in, show login section
        if (studentPortalSection) studentPortalSection.style.display = "none";
        if (studentLoginSection) studentLoginSection.style.display = "";
        if (logoutBtnStudent) logoutBtnStudent.style.display = "none";
        if (frozenAccountOverlay) frozenAccountOverlay.style.display = "none";
        currentStudent = null;
        return;
    }

    // User is logged in, fetch student profile
    try {
        const studentDocRef = doc(db, "students", user.uid); // Assuming student docs are indexed by UID
        const studentDocSnap = await getDoc(studentDocRef);

        if (!studentDocSnap.exists()) {
            showToast("Student profile not found. Logging out.", "danger");
            await signOut(auth);
            return;
        }

        currentStudent = { id: studentDocSnap.id, ...studentDocSnap.data() };

        // Check for frozen status
        if (currentStudent.status === 'frozen') {
            displayFrozenAccountUI(currentStudent.name);
            // Hide normal portal section
            if (studentPortalSection) studentPortalSection.style.display = "none";
            if (studentLoginSection) studentLoginSection.style.display = "none";
            if (logoutBtnStudent) logoutBtnStudent.style.display = "block"; // Still allow logout
            return; // Stop further rendering of normal portal
        } else {
            // Normal portal display
            if (frozenAccountOverlay) frozenAccountOverlay.style.display = "none"; // Hide frozen overlay
            if (studentPortalSection) studentPortalSection.style.display = "";
            if (studentLoginSection) studentLoginSection.style.display = "none";
            if (logoutBtnStudent) logoutBtnStudent.style.display = "";

            // Update student's last login and login count (using a transaction for safety)
            await runTransaction(db, async (transaction) => {
                const latestDocSnap = await transaction.get(studentDocRef);
                const currentLoginCount = latestDocSnap.data().loginCount || 0;
                transaction.update(studentDocRef, {
                    lastLogin: serverTimestamp(),
                    loginCount: currentLoginCount + 1
                });
            });

            // Log the successful student login
            await logActivity(currentStudent.email, "Student Login", { matricNumber: currentStudent.matricNumber });

            // Populate dashboard
            updateDashboardUI();

            // Load initial tab and data
            showTab("tabDashboard");
            loadAssignments();
            loadTests();
            loadAnnouncements();
            loadNotifications(); // Load all notifications, including points
            loadLeaderboard();
            loadGallery();

            showToast("Welcome back!", "success");
        }
    } catch (err) {
        logError("AuthCheck/StudentProfile", err);
        showToast("Error loading profile. Logging out.", "danger");
        await signOut(auth);
    }
});

// ---- Student Login ----
if (studentLoginForm) {
    studentLoginForm.onsubmit = async function(e) {
        e.preventDefault();
        studentLoginError.textContent = "";
        buttonLoader(studentLoginBtn, true, "Logging in...");
        try {
            const email = document.getElementById('studentLoginEmail').value.trim().toLowerCase();
            const password = document.getElementById('studentLoginPassword').value;

            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged will handle displaying the portal and updating last login
        } catch (err) {
            studentLoginError.textContent = err.message || "Login failed.";
            showToast(err.message || "Login failed.", "danger");
        }
        buttonLoader(studentLoginBtn, false);
    };
}
if (logoutBtnStudent) {
    logoutBtnStudent.onclick = async function() {
        buttonLoader(logoutBtnStudent, true, "Logging out...");
        await signOut(auth);
        showToast("Logged out successfully!", "info");
        // onAuthStateChanged will handle redirecting to login
    }
}

// ---- Frozen Account UI ----
function displayFrozenAccountUI(studentName) {
    if (frozenAccountOverlay) {
        frozenAccountOverlay.style.display = "flex"; // Use flex for centering
        if (frozenMessageDisplay) {
            frozenMessageDisplay.innerHTML = `
                <h2 style="color:#b71c1c; font-size: 2.5em; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">Account Frozen!</h2>
                <p class="lead" style="color:#333;">Dear ${studentName},</p>
                <p style="color:#555;">Your account has been temporarily frozen by the school administration.</p>
                <p style="color:#555;">Please contact the admin for more information regarding this action. You will not be able to access the portal's features until your account is unfrozen.</p>
                <p class="mt-4"><button class="btn btn-outline-danger" id="logoutBtnFrozen">Logout</button></p>
            `;
            // Add event listener to the dynamically created logout button
            document.getElementById('logoutBtnFrozen').addEventListener('click', async () => {
                await signOut(auth);
            });
        }
    }
}

// ---- Dashboard UI Update (Student Profile) ----
function updateDashboardUI() {
    if (!currentStudent) return;

    studentNameDisplay.textContent = currentStudent.name || "N/A";
    studentMatricDisplay.textContent = currentStudent.matricNumber || "N/A";
    studentClassDisplay.textContent = currentStudent.class || "N/A";
    studentEmailDisplay.textContent = currentStudent.email || "N/A";
    studentGenderDisplay.textContent = currentStudent.gender || "N/A";
    studentAvatarDisplay.src = currentStudent.passportUrl || "https://placehold.co/60x60?text=S";
    studentPointsDisplay.textContent = currentStudent.points || 0; // Display student points
    studentLastLoginDisplay.textContent = currentStudent.lastLogin ? new Date(currentStudent.lastLogin.seconds * 1000).toLocaleString() : "Never"; // Display last login
}

// ---- Tabs Logic ----
function showTab(tabName) {
    tabContents.forEach(c => c.style.display = "none");
    tabLinks.forEach(l => l.classList.remove("active"));
    const contentTab = document.getElementById(tabName);
    if (contentTab) contentTab.style.display = "";
    const link = document.querySelector(`[data-tab="${tabName}"]`);
    if (link) link.classList.add("active");
}

tabLinks.forEach(link => {
    link.addEventListener("click", function (e) {
        e.preventDefault();
        showTab(this.dataset.tab);
        // Reload content for respective tabs
        if (this.dataset.tab === "tabDashboard") updateDashboardUI();
        if (this.dataset.tab === "tabAssignments") loadAssignments();
        if (this.dataset.tab === "tabTests") loadTests();
        if (this.dataset.tab === "tabAnnouncements") loadAnnouncements();
        if (this.dataset.tab === "tabNotifications") loadNotifications();
        if (this.dataset.tab === "tabLeaderboard") loadLeaderboard();
        if (this.dataset.tab === "tabGallery") loadGallery();
    });
});

// ---- Load Assignments (filtered by class or 'All') ----
async function loadAssignments() {
    if (!assignmentsList || !currentStudent) return;
    assignmentsList.innerHTML = '<div class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> Loading assignments...</div>';
    try {
        const studentClass = currentStudent.class;
        const q = query(
            collection(db, "assignments"),
            where("targetClass", "in", [studentClass, "All"]), // Filter by student's class OR 'All'
            orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        let html = `<ul class="list-group">`;
        if (snap.empty) {
            html += `<li class="list-group-item text-center text-muted">No assignments available for your class.</li>`;
        } else {
            snap.forEach(doc => {
                const a = doc.data();
                const dueDate = a.dueDate && a.dueDate.seconds ? new Date(a.dueDate.seconds * 1000).toLocaleDateString() : "N/A";
                html += `
                    <li class="list-group-item">
                        <h5 class="mb-1">${a.title || "No Title"}</h5>
                        <p class="mb-1">${a.description || "No Description"}</p>
                        <small class="text-muted d-block">Class: ${a.class || 'N/A'} | Due: ${dueDate} | Target: ${a.targetClass || 'N/A'}</small>
                        <button class="btn btn-sm btn-primary mt-2">View Details</button>
                    </li>
                `;
            });
        }
        html += `</ul>`;
        assignmentsList.innerHTML = html;
    } catch (err) {
        logError("LoadAssignments", err);
        assignmentsList.innerHTML = `<div class="alert alert-danger">Error loading assignments: ${err.message}</div>`;
    }
}

// ---- Load Tests (filtered by class or 'All') ----
async function loadTests() {
    if (!testsList || !currentStudent) return;
    testsList.innerHTML = '<div class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> Loading tests...</div>';
    try {
        const studentClass = currentStudent.class;
        const q = query(
            collection(db, "tests"),
            where("targetClass", "in", [studentClass, "All"]), // Filter by student's class OR 'All'
            orderBy("postedAt", "desc")
        );
        const snap = await getDocs(q);
        let html = `<ul class="list-group">`;
        if (snap.empty) {
            html += `<li class="list-group-item text-center text-muted">No CBT tests available for your class.</li>`;
        } else {
            snap.forEach(doc => {
                const t = doc.data();
                const postedAt = t.postedAt && t.postedAt.seconds ? new Date(t.postedAt.seconds * 1000).toLocaleDateString() : "N/A";
                html += `
                    <li class="list-group-item">
                        <h5 class="mb-1">${t.title || "No Title"}</h5>
                        <p class="mb-1">Subject: ${t.subject || 'N/A'} | Duration: ${t.duration || 'N/A'} mins</p>
                        <small class="text-muted d-block">Class: ${t.class || 'N/A'} | Posted: ${postedAt} | Target: ${t.targetClass || 'N/A'}</small>
                        <button class="btn btn-sm btn-success mt-2">Start Test</button>
                    </li>
                `;
            });
        }
        html += `</ul>`;
        testsList.innerHTML = html;
    } catch (err) {
        logError("LoadTests", err);
        testsList.innerHTML = `<div class="alert alert-danger">Error loading tests: ${err.message}</div>`;
    }
}

// ---- Load Announcements (filtered by class or 'All') ----
async function loadAnnouncements() {
    if (!announcementsList || !currentStudent) return;
    announcementsList.innerHTML = '<div class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> Loading announcements...</div>';
    try {
        const studentClass = currentStudent.class;
        const q = query(
            collection(db, "announcements"),
            where("targetClass", "in", [studentClass, "All"]), // Filter by student's class OR 'All'
            orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        let html = `<ul class="list-group">`;
        if (snap.empty) {
            html += `<li class="list-group-item text-center text-muted">No announcements available for your class.</li>`;
        } else {
            snap.forEach(doc => {
                const a = doc.data();
                const createdAt = a.createdAt && a.createdAt.seconds ? new Date(a.createdAt.seconds * 1000).toLocaleDateString() : "N/A";
                html += `
                    <li class="list-group-item">
                        <h5 class="mb-1">${a.title || "No Title"}</h5>
                        <p class="mb-1">${a.body || "No Content"}</p>
                        <small class="text-muted d-block">Posted: ${createdAt} | Target: ${a.targetClass || 'N/A'}</small>
                    </li>
                `;
            });
        }
        html += `</ul>`;
        announcementsList.innerHTML = html;
    } catch (err) {
        logError("LoadAnnouncements", err);
        announcementsList.innerHTML = `<div class="alert alert-danger">Error loading announcements: ${err.message}</div>`;
    }
}

// ---- Load Notifications (general and personal, including points) ----
async function loadNotifications() {
    if (!notificationsList || !currentStudent) return;
    notificationsList.innerHTML = '<div class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> Loading notifications...</div>';

    try {
        const studentEmail = currentStudent.email;
        const studentClass = currentStudent.class;

        // Query for personal notifications (to student's email)
        const personalQ = query(
            collection(db, "notifications"),
            where("to", "==", studentEmail),
            orderBy("createdAt", "desc")
        );
        const personalSnap = await getDocs(personalQ);

        // Query for general notifications (to "All", filtered by student's class if applicable)
        const generalQ = query(
            collection(db, "notifications"),
            where("to", "==", "All"),
            orderBy("createdAt", "desc")
        );
        const generalSnap = await getDocs(generalQ);

        let notifications = [];

        personalSnap.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });

        generalSnap.forEach(doc => {
            const data = doc.data();
            // Only add general notifications if targetClass matches student's class OR is "All"
            if (data.targetClass === "All" || data.targetClass === studentClass) {
                 notifications.push({ id: doc.id, ...data });
            }
        });

        // Sort all notifications by creation date (most recent first)
        notifications.sort((a, b) => {
            const timeA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
            const timeB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
            return timeB - timeA;
        });

        let html = `<ul class="list-group">`;
        if (notifications.length === 0) {
            html += `<li class="list-group-item text-center text-muted">No notifications for you.</li>`;
        } else {
            notifications.forEach(n => {
                const createdAt = n.createdAt && n.createdAt.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleString() : "N/A";
                const notificationTypeClass = n.type === 'points' ? 'list-group-item-success' : ''; // Highlight point notifications
                html += `
                    <li class="list-group-item ${notificationTypeClass}">
                        <h5 class="mb-1">${n.to === "All" ? 'General Announcement' : 'Personal Notification'}</h5>
                        <p class="mb-1">${n.message || "No Message"}</p>
                        <small class="text-muted d-block">Sent: ${createdAt}</small>
                    </li>
                `;
            });
        }
        html += `</ul>`;
        notificationsList.innerHTML = html;
    } catch (err) {
        logError("LoadNotifications", err);
        notificationsList.innerHTML = `<div class="alert alert-danger">Error loading notifications: ${err.message}</div>`;
    }
}

// ---- Load Leaderboard (ordered by points) ----
async function loadLeaderboard() {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '<div class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> Loading leaderboard...</div>';
    try {
        const q = query(
            collection(db, "students"),
            orderBy("points", "desc"), // Order by points descending
            orderBy("name", "asc")     // Then by name for tie-breaking
        );
        const snap = await getDocs(q);
        let html = `<table class="table table-striped table-hover"><thead><tr>
            <th>Rank</th><th>Name</th><th>Class</th><th>Points</th></tr></thead><tbody>`;
        if (snap.empty) {
            html += `<tr><td colspan="4" class="text-center">No students on the leaderboard yet.</td></tr>`;
        } else {
            let rank = 1;
            snap.forEach(doc => {
                const s = doc.data();
                html += `<tr>
                    <td>${rank}</td>
                    <td>${s.name || "N/A"}</td>
                    <td>${s.class || "N/A"}</td>
                    <td><span class="badge bg-success fs-6">${s.points || 0}</span></td>
                </tr>`;
                rank++;
            });
        }
        html += `</tbody></table>`;
        leaderboardList.innerHTML = html;
    } catch (err) {
        logError("LoadLeaderboard", err);
        leaderboardList.innerHTML = `<div class="alert alert-danger">Error loading leaderboard: ${err.message}</div>`;
    }
}

// ---- Load Gallery ----
async function loadGallery() {
    if (!galleryList) return;
    galleryList.innerHTML = '<div class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> Loading gallery...</div>';
    try {
        const snap = await getDocs(query(collection(db, "gallery"), orderBy("date", "desc")));
        let html = '<div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">';
        if (snap.empty) {
            html += `<div class="col-12"><div class="alert alert-info text-center">No images in gallery yet.</div></div>`;
        } else {
            snap.forEach(doc => {
                const data = doc.data();
                html += `
                    <div class="col">
                        <div class="card h-100 shadow-sm">
                            <img src="${data.imageUrl}" class="card-img-top" alt="${data.caption || 'Gallery Image'}" style="height:200px; object-fit:cover;">
                            <div class="card-body">
                                <h6 class="card-subtitle mb-2 text-muted">${data.date ? (data.date.seconds ? new Date(data.date.seconds * 1000).toLocaleDateString() : "") : ""}</h6>
                                <p class="card-text">${data.caption || "No caption provided."}</p>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        html += `</div>`;
        galleryList.innerHTML = html;
    } catch (err) {
        logError("LoadGallery", err);
        galleryList.innerHTML = `<div class="alert alert-danger">Error loading gallery: ${err.message}</div>`;
    }
}