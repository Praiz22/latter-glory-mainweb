// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, updateDoc, getDoc, setDoc, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// --- Your Firebase config (if not already loaded elsewhere) ---
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

// --- Utility Toast ---
function showToast(msg, type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = "position-fixed top-0 end-0 p-3";
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ------------------------------------------------------------------
// ----------------- ADMIN FUNCTIONALITY (admin.html) ---------------
// ------------------------------------------------------------------

/** Post new assignment (admin) */
const assignmentForm = document.getElementById('assignmentForm');
if (assignmentForm) {
  assignmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('assignmentTitle').value.trim();
    const desc = document.getElementById('assignmentDesc').value.trim();
    const classVal = document.getElementById('assignmentClass').value;
    const dueHours = parseInt(document.getElementById('assignmentDueHours').value);
    const btn = document.getElementById('postAssignmentBtn');
    const spinner = document.getElementById('assignmentSpinner');
    const error = document.getElementById('assignmentError');
    error.textContent = "";
    btn.disabled = true;
    spinner.classList.remove('d-none');
    try {
      if (!title || !desc || !classVal || !dueHours || dueHours < 1) throw new Error("All fields required, and due hours must be >= 1.");
      const now = new Date();
      const dueDate = new Date(now.getTime() + dueHours * 60 * 60 * 1000);
      await addDoc(collection(db, 'assignments'), {
        title,
        description: desc,
        class: classVal,
        postedAt: serverTimestamp(),
        dueDate,
        closed: false
      });
      showToast("Assignment posted!", "success");
      assignmentForm.reset();
      loadAdminAssignments();
    } catch (err) {
      error.textContent = err.message || "Failed to post assignment.";
      showToast("Failed: " + (err.message || "Error"), "danger");
    }
    btn.disabled = false;
    spinner.classList.add('d-none');
  });
}

/** List all assignments (admin, per class) */
async function loadAdminAssignments() {
  const assignmentAdminList = document.getElementById('assignmentAdminList');
  if (!assignmentAdminList) return;
  assignmentAdminList.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Loading...';
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
    assignmentAdminList.innerHTML = "<p class='text-danger'>Failed to load assignments.</p>";
    showToast("Failed to load assignments.", "danger");
  }
}
window.loadAdminAssignments = loadAdminAssignments;

function getAssignmentStatus(a) {
  const now = new Date();
  const due = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
  if (a.closed) return `<span class="text-danger">Closed</span>`;
  if (now > due) return `<span class="text-danger">Closed</span>`;
  return `<span class="text-success">Open</span>`;
}

/** Close assignment early (admin) */
window.closeAssignment = async function (id) {
  if (!confirm("Are you sure you want to close this assignment?")) return;
  try {
    await updateDoc(doc(db, 'assignments', id), { closed: true });
    showToast("Assignment closed!", "danger");
    loadAdminAssignments();
  } catch (err) {
    showToast("Close failed: " + err.message, "danger");
  }
};

/** Show submissions modal (admin) */
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
      <th>Name</th><th>Matric</th><th>Email</th><th>Answer</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
  let exportRows = [["Name","Matric","Email","Answer","Status"]];
  snaps.forEach(sub => {
    const data = sub.data();
    const student = students[data.studentEmail] || {};
    html += `<tr>
      <td>${student.name || "-"}</td>
      <td>${student.matricNumber || "-"}</td>
      <td>${data.studentEmail}</td>
      <td>${data.answer || ""}</td>
      <td>${data.approved ? '<span class="text-success">Approved</span>' : '<span class="text-warning">Pending</span>'}</td>
      <td>
        ${data.approved ? '' : `<button class="btn btn-sm btn-success" onclick="window.approveSubmission('${assignmentId}','${sub.id}','${student.email}')">Approve</button>`}
      </td>
    </tr>`;
    exportRows.push([student.name || "-", student.matricNumber || "-", data.studentEmail, data.answer || "", data.approved ? "Approved" : "Pending"]);
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

/** Approve student submission (admin) */
window.approveSubmission = async function (assignmentId, submissionId, studentEmail) {
  try {
    // Approve submission
    await updateDoc(doc(db, 'assignments', assignmentId, 'submissions', submissionId), { approved: true });
    // Increment student points
    const studentsSnap = await getDocs(query(collection(db, "students"), where("email", "==", studentEmail)));
    let studentDocId = null;
    studentsSnap.forEach(docSnap => { studentDocId = docSnap.id; });
    if (studentDocId) {
      const studentRef = doc(db, "students", studentDocId);
      const studentDoc = await getDoc(studentRef);
      const prevPoints = (studentDoc.data()?.points || 0);
      await updateDoc(studentRef, { points: prevPoints + 1 });
    }
    showToast("Submission approved & point awarded!", "success");
    loadAdminAssignments();
    document.querySelector('.btn-close[data-bs-dismiss="modal"]')?.click();
    setTimeout(() => window.showSubmissions(assignmentId), 400);
  } catch (e) {
    showToast("Approve failed: " + e.message, "danger");
  }
};

// ------------------------------------------------------------------
// ----------------- STUDENT FUNCTIONALITY (portal.html) ------------
// ------------------------------------------------------------------

/** List assignments for student (class filter) */
async function loadStudentAssignments(studentClass) {
  const assignmentsList = document.getElementById('assignments-list');
  if (!assignmentsList) return;
  assignmentsList.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Loading...`;

  try {
    const snap = await getDocs(query(collection(db, 'assignments'), orderBy('dueDate', 'desc')));
    if (snap.empty) {
      assignmentsList.innerHTML = "<p>No assignments yet.</p>";
      return;
    }
    let html = "";
    const now = new Date();
    snap.forEach(docSnap => {
      const a = docSnap.data();
      if (a.class !== studentClass) return;
      const due = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
      const closed = a.closed || now > due;
      const timerId = `timer-${docSnap.id}`;
      html += `
        <div class="card mb-3">
          <div class="card-body">
            <h5>${a.title}</h5>
            <div>${a.description}</div>
            <div><b>Due:</b> ${due.toLocaleString()} 
              <span class="assignment-status">${closed ? '<span class="text-danger">Closed</span>' : `<span class="text-success" id="${timerId}"></span>`}</span>
            </div>
            ${closed ? "<div class='alert alert-warning mt-2'>Assignment has closed.</div>" : `
              <form onsubmit="window.submitAssignment(event, '${docSnap.id}')">
                <input type="text" class="form-control mb-2" required placeholder="Enter your answer or link">
                <button class="btn btn-primary btn-sm" type="submit">
                  <span class="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>
                  Submit Assignment
                </button>
              </form>
            `}
          </div>
        </div>
      `;
      // Timer logic
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
        }, 200);
      }
    });
    assignmentsList.innerHTML = html;
  } catch (err) {
    assignmentsList.innerHTML = "<div class='text-danger p-2'>Failed to load assignments.</div>";
    showToast("Failed to load assignments.", "danger");
  }
}
window.loadStudentAssignments = loadStudentAssignments;

/** Student assignment submission */
window.submitAssignment = async function (e, assignmentId) {
  e.preventDefault();
  const answer = e.target[0].value;
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.querySelector('.spinner-border').style.display = "inline-block";
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    // Get student's Firestore document by email
    const studentsSnap = await getDocs(query(collection(db, "students"), where("email", "==", user.email)));
    let studentDoc = null;
    studentsSnap.forEach(doc => studentDoc = doc.data());
    if (!studentDoc) throw new Error("Student profile not found.");
    await setDoc(doc(db, 'assignments', assignmentId, 'submissions', user.uid), {
      studentEmail: user.email,
      answer,
      submittedAt: serverTimestamp(),
      approved: false
    });
    showToast("Assignment submitted. Await admin approval.", "success");
    e.target.reset();
  } catch (err) {
    showToast("Submission failed: " + err.message, "danger");
  }
  btn.disabled = false;
  btn.querySelector('.spinner-border').style.display = "none";
};

// ------------------------------------------------------------------
// ------------- AUTO INIT FOR ADMIN & PORTAL -----------------------
// ------------------------------------------------------------------

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  // For portal.html: Load assignments for the student's class
  if (document.getElementById('assignments-list')) {
    // Get student class
    const studentsSnap = await getDocs(query(collection(db, "students"), where("email", "==", user.email)));
    let studentDoc = null;
    studentsSnap.forEach(doc => studentDoc = doc.data());
    if (studentDoc && studentDoc.class) {
      loadStudentAssignments(studentDoc.class);
    }
  }
  // For admin.html: Load assignments for admin
  if (document.getElementById('assignmentAdminList')) {
    loadAdminAssignments();
  }
});
