import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// --- DOM Elements ---
const adminContent = document.getElementById('adminContent'); // The container for admin dashboard
const logoutBtnAdmin = document.getElementById('logoutBtnAdmin');

// --- Helper: Format time ago ---
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

// --- Loader Helper ---
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

// --- Load all students grouped by class ---
async function loadAllStudents() {
  if (!adminContent) return;
  adminContent.innerHTML = `<div class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> Loading students...</div>`;

  const studentsSnap = await getDocs(query(collection(db, "students"), orderBy("createdAt", "desc")));
  const students = [];
  studentsSnap.forEach(doc => students.push(doc.data()));

  if (students.length === 0) {
    adminContent.innerHTML = `<div class="text-danger">No students found.</div>`;
    return;
  }

  // Group by class
  const groupByClass = {};
  students.forEach(s => {
    if (!groupByClass[s.class]) groupByClass[s.class] = [];
    groupByClass[s.class].push(s);
  });

  adminContent.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="mb-0"><i class="bi bi-people"></i> All Students</h3>
      <button class="btn btn-outline-primary btn-sm" id="exportCSVBtn"><i class="bi bi-download"></i> Export CSV</button>
    </div>
    <div id="studentGroups"></div>
    <div id="engagementChart" class="my-4"></div>
  `;
  const groupsDiv = adminContent.querySelector('#studentGroups');
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
                  <div class="text-muted small">Matric: ${s.matricNumber}</div>
                  <div class="text-muted small">Gender: ${s.gender || '-'}</div>
                  <div class="text-muted small">Created: <span class="admin-created-at" data-date="${s.createdAt || ''}">${formatTimeAgo(s.createdAt)}</span></div>
                  <button class="btn btn-sm btn-link view-student-btn mt-2 p-0" data-matric="${s.matricNumber}"><i class="bi bi-eye"></i> View Details</button>
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
      const matric = btn.getAttribute('data-matric');
      const student = students.find(s => s.matricNumber === matric);
      if (!student) return;
      showStudentDetailModal(student);
    };
  });

  // Export CSV
  const exportBtn = document.getElementById('exportCSVBtn');
  if (exportBtn) {
    exportBtn.onclick = () => exportStudentsCSV(students, exportBtn);
  }

  // Engagement chart
  renderEngagementChart(students);
}

// --- Export Students as CSV ---
function exportStudentsCSV(students, btn) {
  buttonLoader(btn, true, "Exporting...");
  setTimeout(() => {
    const headers = ["Name", "Matric Number", "Email", "Gender", "Class", "Created At"];
    const rows = students.map(s => [
      s.name, s.matricNumber, s.email, s.gender, s.class, s.createdAt
    ]);
    let csv = headers.join(",") + "\n" + rows.map(r => r.map(x => `"${(x || '').toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    buttonLoader(btn, false, "Export CSV");
  }, 700);
}

// --- Student Details Modal (View, Edit, Delete, Reset Password) ---
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
        <div class="modal-body text-center">
          <img src="${student.passportUrl || 'https://placehold.co/100x100?text=No+Photo'}" class="profile-avatar mb-3" alt="Student Passport">
          <div class="mb-2"><b>Name:</b> <span id="editName">${student.name}</span></div>
          <div class="mb-2"><b>Email:</b> <span id="editEmail">${student.email}</span></div>
          <div class="mb-2"><b>Matric Number:</b> <span id="editMatric">${student.matricNumber}</span></div>
          <div class="mb-2"><b>Class:</b> <span id="editClass">${student.class}</span></div>
          <div class="mb-2"><b>Gender:</b> <span id="editGender">${student.gender || '-'}</span></div>
          <div class="mb-2"><b>Account Created:</b> <span class="student-modal-created-at" data-date="${student.createdAt || ''}">${formatTimeAgo(student.createdAt)}</span> <span class="text-muted small">(${formatCalendarDate(student.createdAt)})</span></div>
          <div class="mb-3 mt-4 d-flex justify-content-center gap-2">
            <button class="btn btn-outline-primary btn-sm" id="editStudentBtn"><i class="bi bi-pencil"></i> Edit</button>
            <button class="btn btn-outline-danger btn-sm" id="deleteStudentBtn"><i class="bi bi-trash"></i> Delete</button>
            <button class="btn btn-outline-warning btn-sm" id="resetPwdBtn"><i class="bi bi-key"></i> Reset Password</button>
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

  // Edit
  modalEl.querySelector('#editStudentBtn').onclick = () => showStudentEditModal(student, bsModal);

  // Delete
  modalEl.querySelector('#deleteStudentBtn').onclick = () => showAdminDeleteModal(student, bsModal);

  // Reset Password
  modalEl.querySelector('#resetPwdBtn').onclick = (e) => resetStudentPassword(student, e.target);
}

// --- Edit Student Modal ---
function showStudentEditModal(student, parentBsModal) {
  parentBsModal.hide();
  let modalEl = document.getElementById('studentEditModal');
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.className = 'modal fade';
  modalEl.id = 'studentEditModal';
  modalEl.tabIndex = -1;
  modalEl.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content glassmorphism">
        <form id="editStudentForm">
          <div class="modal-header">
            <h5 class="modal-title">Edit Student</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-start">
            <label class="form-label">Name</label>
            <input class="form-control mb-2" name="name" value="${student.name}" required>
            <label class="form-label">Class</label>
            <input class="form-control mb-2" name="class" value="${student.class}" required>
            <label class="form-label">Gender</label>
            <select name="gender" class="form-control mb-2" required>
              <option value="Male" ${student.gender === "Male" ? "selected" : ""}>Male</option>
              <option value="Female" ${student.gender === "Female" ? "selected" : ""}>Female</option>
              <option value="Other" ${student.gender === "Other" ? "selected" : ""}>Other</option>
            </select>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" id="saveEditStudentBtn" type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();

  modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); parentBsModal.show(); });

  const form = modalEl.querySelector('#editStudentForm');
  const saveBtn = modalEl.querySelector('#saveEditStudentBtn');
  form.onsubmit = async function(e) {
    e.preventDefault();
    buttonLoader(saveBtn, true, "Saving...");
    try {
      const newName = form.name.value.trim();
      const newClass = form.class.value.trim();
      const newGender = form.gender.value;
      await updateDoc(doc(db, "students", student.matricNumber), {
        name: newName,
        class: newClass,
        gender: newGender
      });
      buttonLoader(saveBtn, false, "Save");
      bsModal.hide();
      loadAllStudents();
    } catch (err) {
      alert("Failed to save: " + err.message);
      buttonLoader(saveBtn, false, "Save");
    }
  };
}

// --- Delete Student (with Admin Key Modal) ---
function showAdminDeleteModal(student, parentBsModal) {
  parentBsModal.hide();
  let modalEl = document.getElementById('adminDeleteModal');
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.className = 'modal fade';
  modalEl.id = 'adminDeleteModal';
  modalEl.tabIndex = -1;
  modalEl.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content glassmorphism">
        <div class="modal-header">
          <h5 class="modal-title text-danger">Delete Student</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body text-center">
          <p>Enter admin password to confirm deletion.<br>This cannot be undone.</p>
          <input type="password" class="form-control mb-3" id="adminDeleteKey" placeholder="Admin Key/Password">
          <button class="btn btn-danger" id="confirmAdminDeleteBtn">Delete Student</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();

  modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); parentBsModal.show(); });

  const confirmBtn = modalEl.querySelector('#confirmAdminDeleteBtn');
  confirmBtn.onclick = async function() {
    buttonLoader(confirmBtn, true, "Deleting...");
    const key = modalEl.querySelector('#adminDeleteKey').value;
    if (key !== 'YOUR_ADMIN_KEY') {
      alert('Invalid admin key!');
      buttonLoader(confirmBtn, false, "Delete Student");
      return;
    }
    try {
      await deleteDoc(doc(db, "students", student.matricNumber));
      buttonLoader(confirmBtn, false, "Delete Student");
      bsModal.hide();
      loadAllStudents();
    } catch (e) {
      alert('Failed to delete student: ' + e.message);
      buttonLoader(confirmBtn, false, "Delete Student");
    }
  };
}

// --- Reset Student Password ---
function resetStudentPassword(student, btn) {
  buttonLoader(btn, true, "Sending...");
  sendPasswordResetEmail(auth, student.email)
    .then(() => {
      alert("Password reset email sent to " + student.email);
      buttonLoader(btn, false, "Reset Password");
    })
    .catch(err => {
      alert("Failed to send reset email: " + err.message);
      buttonLoader(btn, false, "Reset Password");
    });
}

// --- Placeholder: Engagement Analytics Chart ---
function renderEngagementChart(students) {
  const chartDiv = document.getElementById('engagementChart');
  // For now, just count students per class as a sample
  const classCounts = {};
  students.forEach(s => {
    classCounts[s.class] = (classCounts[s.class] || 0) + 1;
  });
  chartDiv.innerHTML = `<h5>Student Distribution (Sample)</h5>
    <div>
      ${Object.entries(classCounts).map(([cls, count]) =>
        `<div>${cls}: <b>${count}</b></div>`
      ).join('')}
    </div>
    <div class="alert alert-info small mt-2">Real engagement analytics (pie/bar charts) can be added here using Chart.js or similar, by logging actions/events in Firestore and reading them here.</div>
  `;
}

// --- Logout (with loader) ---
if (logoutBtnAdmin) {
  logoutBtnAdmin.addEventListener('click', async function() {
    buttonLoader(logoutBtnAdmin, true, "Logging out...");
    await signOut(auth);
    window.location.reload();
  });
}

// --- Auth ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadAllStudents();
  } else {
    if (adminContent) adminContent.innerHTML = `<div class="alert alert-warning">You must be logged in as an admin to view this page.</div>`;
  }
});
