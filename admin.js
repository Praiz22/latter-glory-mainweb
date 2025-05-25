// ---- Firebase Imports & Config ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, setDoc, where, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
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

// ---- DOM Elements ----
const adminContent = document.getElementById('adminContent');
const logoutBtnAdmin = document.getElementById('logoutBtnAdmin');
const toastContainer = document.getElementById('toast-container');

// Registration Modal
const adminRegisterForm = document.getElementById('adminRegisterForm');
const matricDiv = document.getElementById('matricNumberDisplay');
const matricNameSpan = document.getElementById('matricStudentName');
const matricEmailSpan = document.getElementById('matricStudentEmail');
const matricNumberSpan = document.getElementById('matricNumberValue');

// Assignments
const assignmentForm = document.getElementById('assignmentForm');
const assignmentTitle = document.getElementById('assignmentTitle');
const assignmentDesc = document.getElementById('assignmentDesc');
const assignmentClass = document.getElementById('assignmentClass');
const assignmentDueHours = document.getElementById('assignmentDueHours');
const postAssignmentBtn = document.getElementById('postAssignmentBtn');
const assignmentSpinner = document.getElementById('assignmentSpinner');
const assignmentError = document.getElementById('assignmentError');
const assignmentAdminList = document.getElementById('adminAssignmentClassList');

// Gallery
const galleryUploadForm = document.getElementById('galleryUploadForm');
const galleryType = document.getElementById('galleryType');
const galleryImage = document.getElementById('galleryImage');
const galleryCaption = document.getElementById('galleryCaption');
const galleryDate = document.getElementById('galleryDate');
const uploadBtn = document.getElementById('uploadBtn');
const uploadSpinner = document.getElementById('uploadSpinner');
const uploadError = document.getElementById('uploadError');
const galleryPreview = document.getElementById('galleryPreview');
const galleryPreviewType = document.getElementById('galleryPreviewType');

// Students
const studentsList = document.getElementById('studentsClassList');

// ---- Utility Functions ----
function showToast(message, type = 'success') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}
function logError(context, err) {
  console.error(`[${context}]`, err);
  showToast(`Error: ${err.message || err}`, "danger");
}
function generateMatricNumber(fullName, studentClass) {
  if (!fullName || !studentClass) return "";
  const firstLetter = fullName.trim()[0]?.toUpperCase() || "X";
  const randomDigits = Math.floor(Math.random() * 90 + 10);
  return `LGA/${studentClass}/${firstLetter}${randomDigits}`;
}
function generatePassword(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pass = "";
  for (let i = 0; i < length; ++i) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}
function buttonLoader(btn, loading = true, text = "") {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${text || btn.textContent.trim()}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || text || "";
  }
}

// ---- Overview Stats ----
async function loadOverviewStats() {
  const statsDiv = document.getElementById('overviewStats');
  if (!statsDiv) return;
  statsDiv.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
  try {
    const studentsSnap = await getDocs(collection(db, 'students'));
    const totalStudents = studentsSnap.size;
    const assignmentsSnap = await getDocs(collection(db, 'assignments'));
    const totalAssignments = assignmentsSnap.size;
    const classSet = new Set();
    studentsSnap.forEach(doc => classSet.add(doc.data().class));
    const adminsSnap = await getDocs(collection(db, 'users'));
    let totalAdmins = 0;
    adminsSnap.forEach(doc => { if(doc.data().role === "admin") totalAdmins++; });

    statsDiv.innerHTML = `
      <div class="row g-3">
        <div class="col-md-3"><div class="card p-3 text-center"><div class="fw-bold fs-3">${totalStudents}</div><div>Total Students</div></div></div>
        <div class="col-md-3"><div class="card p-3 text-center"><div class="fw-bold fs-3">${classSet.size}</div><div>Classes</div></div></div>
        <div class="col-md-3"><div class="card p-3 text-center"><div class="fw-bold fs-3">${totalAssignments}</div><div>Assignments</div></div></div>
        <div class="col-md-3"><div class="card p-3 text-center"><div class="fw-bold fs-3">${totalAdmins}</div><div>Admins</div></div></div>
      </div>
    `;
  } catch (err) {
    statsDiv.innerHTML = `<div class="text-danger">Failed to load overview stats.</div>`;
    logError("OverviewStats", err);
  }
}

// ---- ADMIN AUTH & ACCESS GUARD ----
async function immediateAdminAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "portal.html";
      return;
    }
    let userDoc;
    try {
      userDoc = await getDoc(doc(db, "users", user.uid));
    } catch (e) {
      showToast("Cannot verify admin status. Try again.", "danger");
      await signOut(auth);
      window.location.href = "portal.html";
      return;
    }
    if (!userDoc.exists() || userDoc.data().role !== "admin") {
      showToast("Access denied: Not an admin.", "danger");
      await signOut(auth);
      window.location.href = "portal.html";
      return;
    }
    // Only now show admin UI
    adminContent.style.display = "";
    let name = user.displayName || user.email || userDoc.data().email || "Admin";
    let greetingTarget = document.getElementById("adminGreeting");
    if (!greetingTarget) {
      greetingTarget = document.createElement('div');
      greetingTarget.className = "mb-3";
      greetingTarget.id = "adminGreeting";
      adminContent?.prepend(greetingTarget);
    }
    greetingTarget.innerHTML = `<div class="alert alert-primary">Welcome Admin <b>${name}</b></div>`;
    loadOverviewStats();
    loadAllStudents();
    loadAdminAssignments();
    loadGalleryPreview('gallery');
  });
}
// Hide all UI by default until auth passes:
if (adminContent) adminContent.style.display = "none";
immediateAdminAuth();

// ---- LOGOUT ----
if (logoutBtnAdmin) {
  logoutBtnAdmin.addEventListener('click', async function () {
    buttonLoader(logoutBtnAdmin, true, "Logging out...");
    await signOut(auth);
    window.location.href = "portal.html";
  });
}

// ---- STUDENT REGISTRATION ----
if (adminRegisterForm) {
  adminRegisterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (matricDiv) matricDiv.style.display = "none";

    const fullName = document.getElementById('studentName').value.trim();
    const email = document.getElementById('studentEmail').value.trim().toLowerCase();
    const studentClass = document.getElementById('studentClass').value.trim();
    const gender = document.getElementById('studentGender').value;
    const passportFile = document.getElementById('studentPassport').files[0];
    const passwordField = document.getElementById('studentPassword');
    const password = passwordField && passwordField.value ? passwordField.value : generatePassword(8);

    if (!email || !fullName || !studentClass || !gender) {
      showToast("All fields are required.", "danger");
      return;
    }

    const matricNumber = generateMatricNumber(fullName, studentClass);

    try {
      // Register student in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName });
      let passportUrl = "";
      if (passportFile) {
        const imgRef = storageRef(storage, `passports/${matricNumber}_${Date.now()}.jpg`);
        await uploadBytes(imgRef, passportFile);
        passportUrl = await getDownloadURL(imgRef);
      }
      // Add to students collection
      await setDoc(doc(db, "students", matricNumber), {
        matricNumber,
        registrationNumber: matricNumber,
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
      // Add to users collection for role management
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        role: "student",
        matricNumber,
        name: fullName
      });

      if (matricNameSpan) matricNameSpan.textContent = fullName;
      if (matricEmailSpan) matricEmailSpan.textContent = email;
      if (matricNumberSpan) matricNumberSpan.textContent = matricNumber;
      if (matricDiv) matricDiv.style.display = 'block';

      showToast(`Student registered! Matric: ${matricNumber}, Password: ${password}`, "success");
      if (adminRegisterForm) adminRegisterForm.reset();
      if (typeof loadAllStudents === "function") loadAllStudents();
      loadOverviewStats();
    } catch (err) {
      showToast("Registration failed: " + err.message, "danger");
    }
  });
}

// ---- STUDENT MANAGEMENT ----
async function loadAllStudents() {
  if (!studentsList) return;
  studentsList.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db, 'students'), orderBy('createdAt', 'desc')));
    if (snap.empty) {
      studentsList.innerHTML = "<p>No students registered yet.</p>";
      return;
    }
    let html = `<input type="text" class="form-control mb-3" id="studentSearchInput" placeholder="Search students by name, email, class, or matric...">`;
    html += '<div class="list-group">';
    snap.forEach(docSnap => {
      const s = docSnap.data();
      html += `
        <div class="list-group-item d-flex justify-content-between align-items-center ${s.status === 'frozen' ? 'glass-blur' : ''}">
          <div>
            <b>${s.name}</b>
            <span class="text-muted small ms-2">${s.class}</span>
            <br>
            <span class="text-secondary">${s.matricNumber}</span><br>
            <span class="text-secondary">${s.email}</span>
            ${s.status === 'frozen' ? '<span class="badge bg-info text-dark ms-2">Frozen</span>' : ''}
          </div>
          <div>
            <button class="btn btn-sm btn-outline-info me-2" onclick="window.viewStudentDetail('${docSnap.id}')">View</button>
            <button class="btn btn-sm btn-outline-warning me-2" onclick="window.toggleProbation('${docSnap.id}', '${s.status}')">${s.status === 'frozen' ? "Unfreeze" : "Freeze"}</button>
            <button class="btn btn-sm btn-outline-danger" onclick="window.adminDeleteStudent('${docSnap.id}', '${s.email}')">Delete</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    studentsList.innerHTML = html;

    // Search handler
    const searchInput = document.getElementById('studentSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        const val = this.value.toLowerCase();
        document.querySelectorAll('.list-group-item').forEach(item => {
          item.style.display = item.textContent.toLowerCase().includes(val) ? '' : 'none';
        });
      });
    }
  } catch (err) {
    logError("LoadAllStudents", err);
    studentsList.innerHTML = "<p class='text-danger'>Failed to load students.</p>";
  }
}
window.loadAllStudents = loadAllStudents;

window.viewStudentDetail = async function(studentId) {
  const docSnap = await getDoc(doc(db, "students", studentId));
  if (!docSnap.exists()) return showToast("Student not found.", "danger");
  const student = docSnap.data();
  let modalEl = document.getElementById('studentDetailModal');
  if (modalEl) modalEl.remove();
  modalEl = document.createElement('div');
  modalEl.className = 'modal fade';
  modalEl.id = 'studentDetailModal';
  modalEl.tabIndex = -1;
  modalEl.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content ${student.status === 'frozen' ? 'glass-blur' : ''}">
        <div class="modal-header">
          <h5 class="modal-title">Student Details</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body text-center">
          <img src="${student.passportUrl || 'https://placehold.co/100x100?text=No+Photo'}" class="profile-avatar mb-2" alt="Passport" style="width:80px;height:80px;">
          <div><b>${student.name}</b></div>
          <div>${student.email}</div>
          <div>${student.matricNumber}</div>
          <div>Class: ${student.class}</div>
          <div>Gender: ${student.gender}</div>
          <div>Points: ${student.points || 0}</div>
          <div>Status: ${student.status === 'frozen' ? '<span class="text-info">Frozen</span>' : '<span class="text-success">Active</span>'}</div>
          <div class="mt-3">
            <button class="btn btn-outline-warning me-2" onclick="window.toggleProbation('${studentId}', '${student.status}')">${student.status === 'frozen' ? "Unfreeze Account" : "Freeze Account"}</button>
            <button class="btn btn-outline-danger" onclick="window.adminDeleteStudent('${studentId}', '${student.email}')">Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
  modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
};

window.toggleProbation = async function(studentId, status) {
  const isFrozen = status === "frozen";
  const msg = isFrozen ? "Unfreeze this account (allow login)?" : "Freeze this account (prevent login/portal access, glass effect)?";
  if (!confirm(msg)) return;
  try {
    await updateDoc(doc(db, "students", studentId), { status: isFrozen ? "active" : "frozen" });
    showToast(isFrozen ? "Account unfrozen." : "Account frozen.", isFrozen ? "success" : "info");
    loadAllStudents();
  } catch (err) {
    logError("Probation", err);
  }
};

window.adminDeleteStudent = function(studentId, studentEmail) {
  let modalEl = document.getElementById('deleteStudentModal');
  if (modalEl) modalEl.remove();
  modalEl = document.createElement('div');
  modalEl.className = 'modal fade';
  modalEl.id = 'deleteStudentModal';
  modalEl.tabIndex = -1;
  modalEl.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title text-danger">Delete Student Account</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body text-center">
          <p>Enter admin key to confirm deletion of <b>${studentEmail}</b>.<br><span class="text-danger">This cannot be undone.</span></p>
          <input type="password" class="form-control mb-3" id="adminDeleteKey" placeholder="Admin Key/Password">
          <button class="btn btn-danger" id="confirmDeleteBtn">Delete Account</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
  modalEl.querySelector('#confirmDeleteBtn').onclick = async function() {
    const key = modalEl.querySelector('#adminDeleteKey').value;
    if (key !== 'YOUR_ADMIN_KEY') {
      showToast('Invalid admin key!', 'danger');
      return;
    }
    try {
      await deleteDoc(doc(db, "students", studentId));
      showToast('Student account deleted.', 'danger');
      bsModal.hide();
      loadAllStudents();
      loadOverviewStats();
    } catch (e) {
      logError("DeleteStudent", e);
      bsModal.hide();
    }
  };
  modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
};

// ---- GALLERY SECTION ----
if (galleryUploadForm) {
  galleryUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (uploadError) uploadError.textContent = '';
    if (uploadBtn) uploadBtn.disabled = true;
    if (uploadSpinner) uploadSpinner.classList.remove('d-none');
    const file = galleryImage.files[0];
    const caption = galleryCaption.value.trim();
    const date = galleryDate.value;
    const type = galleryType.value;
    if (!file || !caption || !date || !type) {
      if (uploadError) uploadError.textContent = "All fields are required.";
      if (uploadBtn) uploadBtn.disabled = false;
      if (uploadSpinner) uploadSpinner.classList.add('d-none');
      return;
    }
    try {
      const fileRef = storageRef(storage, `gallery/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const imageUrl = await getDownloadURL(fileRef);
      const docData = {
        imageUrl,
        caption,
        date: new Date(date),
        createdAt: serverTimestamp()
      };
      if (type === 'both') {
        await addDoc(collection(db, 'gallery'), docData);
        await addDoc(collection(db, 'portalGallery'), docData);
      } else {
        await addDoc(collection(db, type), docData);
      }
      showToast("Image uploaded!", "success");
      galleryUploadForm.reset();
      loadGalleryPreview(type === 'both' ? 'gallery' : type);
    } catch (err) {
      if (uploadError) uploadError.textContent = err.message || "Upload failed.";
      logError("GalleryUpload", err);
    }
    if (uploadBtn) uploadBtn.disabled = false;
    if (uploadSpinner) uploadSpinner.classList.add('d-none');
  });
}
async function loadGalleryPreview(which = 'gallery') {
  if (!galleryPreview) return;
  galleryPreview.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
  if (galleryPreviewType) {
    galleryPreviewType.textContent = (
      which === 'gallery' ? 'School Gallery' :
      which === 'portalGallery' ? 'Portal Gallery' : 'School Gallery'
    );
  }
  try {
    const q = query(collection(db, which), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      galleryPreview.innerHTML = "<p class='text-center p-3'>No images yet.</p>";
      return;
    }
    galleryPreview.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const col = document.createElement('div');
      col.className = "col-12 col-md-6";
      col.innerHTML = `
        <div class="card mb-3">
          <img src="${data.imageUrl}" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;" />
          <div class="card-body">
            <div class="caption mb-1">${data.caption || ""}</div>
            <div class="date text-muted">${data.date ? (new Date(data.date.seconds ? data.date.seconds * 1000 : data.date)).toLocaleDateString() : ""}</div>
          </div>
        </div>
      `;
      galleryPreview.appendChild(col);
    });
  } catch (error) {
    galleryPreview.innerHTML = '<p class="text-danger p-3">Failed to load preview.</p>';
    logError("GalleryPreview", error);
  }
}
if (galleryType) {
  galleryType.addEventListener('change', () => loadGalleryPreview(galleryType.value === 'both' ? 'gallery' : galleryType.value));
}
window.addEventListener('DOMContentLoaded', () => loadGalleryPreview('gallery'));

// ---- ASSIGNMENTS: POST, LIST, CLOSE, SUBMISSIONS, APPROVE ----
if (assignmentForm) {
  assignmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (assignmentError) assignmentError.textContent = "";
    if (postAssignmentBtn) postAssignmentBtn.disabled = true;
    if (assignmentSpinner) assignmentSpinner.classList.remove('d-none');
    const title = assignmentTitle.value.trim();
    const description = assignmentDesc.value.trim();
    const classVal = assignmentClass.value;
    const dueHours = parseInt(assignmentDueHours.value);

    if (!title || !description || !classVal || !dueHours || dueHours < 1) {
      if (assignmentError) assignmentError.textContent = "All fields are required and due hours must be >= 1.";
      if (postAssignmentBtn) postAssignmentBtn.disabled = false;
      if (assignmentSpinner) assignmentSpinner.classList.add('d-none');
      return;
    }
    try {
      const now = new Date();
      const dueDate = new Date(now.getTime() + dueHours * 60 * 60 * 1000);
      await addDoc(collection(db, 'assignments'), {
        title,
        description,
        class: classVal,
        postedAt: serverTimestamp(),
        dueDate,
        closed: false
      });
      showToast("Assignment posted!", "success");
      assignmentForm.reset();
      loadAdminAssignments();
      loadOverviewStats();
    } catch (err) {
      if (assignmentError) assignmentError.textContent = err.message || "Failed to post assignment.";
      logError("AssignmentPost", err);
    }
    if (postAssignmentBtn) postAssignmentBtn.disabled = false;
    if (assignmentSpinner) assignmentSpinner.classList.add('d-none');
  });
}

async function loadAdminAssignments() {
  if (!assignmentAdminList) return;
  assignmentAdminList.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
  try {
    const q = query(collection(db, 'assignments'), orderBy('dueDate', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      assignmentAdminList.innerHTML = "<p>No assignments posted yet.</p>";
      return;
    }
    const grouped = {};
    snapshot.forEach(docSnap => {
      const a = docSnap.data();
      a._id = docSnap.id;
      if (!grouped[a.class]) grouped[a.class] = [];
      grouped[a.class].push(a);
    });
    assignmentAdminList.innerHTML = "";
    Object.keys(grouped).forEach(cls => {
      assignmentAdminList.innerHTML += `
        <h6>${cls}</h6>
        <ul class="list-group mb-3">
          ${grouped[cls].map(a => `
            <li class="list-group-item">
              <b>${a.title}</b>
              <span class="assignment-status">${getAssignmentStatus(a)}</span>
              <br/>
              <small>Due: ${a.dueDate?.toDate ? a.dueDate.toDate().toLocaleString() : new Date(a.dueDate).toLocaleString()}</small>
              <br/>
              <button class="btn btn-sm btn-outline-secondary mb-1" onclick="window.showSubmissions('${a._id}','${cls}')">Submissions</button>
              <button class="btn btn-sm btn-outline-danger mb-1" onclick="window.closeAssignment('${a._id}')">Force Close</button>
            </li>
          `).join('')}
        </ul>
      `;
    });
  } catch (err) {
    logError("LoadAdminAssignments", err);
    assignmentAdminList.innerHTML = "<p class='text-danger'>Failed to load assignments.</p>";
  }
}
function getAssignmentStatus(a) {
  const now = new Date();
  const due = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
  if (a.closed) return `<span class="text-danger">Closed</span>`;
  if (now > due) return `<span class="text-danger">Closed</span>`;
  return `<span class="text-success">Open</span>`;
}
window.closeAssignment = async function (id) {
  if (!confirm("Are you sure you want to close this assignment?")) return;
  try {
    await updateDoc(doc(db, 'assignments', id), { closed: true });
    showToast("Assignment closed!", "danger");
    loadAdminAssignments();
    loadOverviewStats();
  } catch (err) {
    logError("CloseAssignment", err);
  }
};

// ---- ASSIGNMENT SUBMISSIONS & APPROVAL ----
window.showSubmissions = async function (assignmentId, classVal) {
  let modalEl = document.getElementById('submissionModal');
  if (modalEl) modalEl.remove();
  modalEl = document.createElement('div');
  modalEl.className = 'modal fade';
  modalEl.id = 'submissionModal';
  modalEl.tabIndex = -1;
  modalEl.innerHTML = `
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Assignment Submissions (${classVal})</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div id="submissionList"></div>
          <button class="btn btn-outline-primary mt-2" id="exportSubmissionsBtn">Export CSV</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();

  const submissionList = modalEl.querySelector('#submissionList');
  submissionList.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Loading...';
  const q = query(collection(db, 'assignments', assignmentId, 'submissions'));
  const snaps = await getDocs(q);
  if (snaps.empty) {
    submissionList.innerHTML = '<p>No submissions yet.</p>';
    return;
  }
  const studentsSnap = await getDocs(collection(db, 'students'));
  const students = {};
  studentsSnap.forEach(doc => students[doc.data().email] = doc.data());

  let html = `<table class="table table-bordered"><thead><tr>
      <th>Name</th><th>Matric</th><th>Email</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
  let exportRows = [["Name","Matric","Email","Status"]];
  snaps.forEach(sub => {
    const data = sub.data();
    const student = students[data.studentEmail] || {};
    html += `<tr>
      <td>${student.name || "-"}</td>
      <td>${student.matricNumber || "-"}</td>
      <td>${data.studentEmail}</td>
      <td>${data.approved ? '<span class="text-success">Approved</span>' : '<span class="text-warning">Pending</span>'}</td>
      <td>
        ${data.approved ? '' : `<button class="btn btn-sm btn-success" onclick="window.approveSubmission('${assignmentId}','${sub.id}','${student.email}')">Approve</button>`}
      </td>
    </tr>`;
    exportRows.push([student.name || "-", student.matricNumber || "-", data.studentEmail, data.approved ? "Approved" : "Pending"]);
  });
  html += "</tbody></table>";
  submissionList.innerHTML = html;

  // Export CSV
  modalEl.querySelector('#exportSubmissionsBtn').onclick = () => {
    let csv = exportRows.map(row => row.map(x=> `"${x}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type: "text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissions_${assignmentId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
};
window.approveSubmission = async function (assignmentId, submissionId, studentEmail) {
  try {
    await updateDoc(doc(db, 'assignments', assignmentId, 'submissions', submissionId), { approved: true });
    // Increment student points
    const studentsSnap = await getDocs(query(collection(db, "students"), where("email", "==", studentEmail)));
    let studentDocId = null;
    studentsSnap.forEach(docSnap => { studentDocId = docSnap.id; });
    if (studentDocId) {
      const studentRef = doc(db, "students", studentDocId);
      const studentDoc = await getDocs(query(collection(db, "students"), where("email", "==", studentEmail)));
      const prevPoints = (studentDoc.docs[0]?.data().points || 0);
      await updateDoc(studentRef, { points: prevPoints + 1 });
    }
    showToast("Submission approved & point awarded!", "success");
    loadAdminAssignments();
    document.querySelector('.btn-close[data-bs-dismiss="modal"]')?.click();
    setTimeout(() => window.showSubmissions(assignmentId), 400);
  } catch (e) {
    logError("ApproveSubmission", e);
  }
};
