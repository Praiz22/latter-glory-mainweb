import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut, sendPasswordResetEmail
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

// --- DOM Elements ---
const adminContent = document.getElementById('adminContent');
const logoutBtnAdmin = document.getElementById('logoutBtnAdmin');
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
const toastContainer = document.getElementById('toast-container');
// Assignment
const assignmentForm = document.getElementById('assignmentForm');
const assignmentTitle = document.getElementById('assignmentTitle');
const assignmentDesc = document.getElementById('assignmentDesc');
const assignmentClass = document.getElementById('assignmentClass');
const assignmentDueHours = document.getElementById('assignmentDueHours');
const postAssignmentBtn = document.getElementById('postAssignmentBtn');
const assignmentSpinner = document.getElementById('assignmentSpinner');
const assignmentError = document.getElementById('assignmentError');
const assignmentAdminList = document.getElementById('assignmentAdminList');

// --- Toast Function ---
function showToast(message, type = 'success') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
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

// --- GALLERY UPLOAD HANDLER ---
if (galleryUploadForm) {
  galleryUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    uploadError.textContent = '';
    uploadBtn.disabled = true;
    uploadSpinner.classList.remove('d-none');

    const file = galleryImage.files[0];
    const caption = galleryCaption.value.trim();
    const date = galleryDate.value;
    const type = galleryType.value;

    if (!file || !caption || !date || !type) {
      uploadError.textContent = "All fields are required.";
      uploadBtn.disabled = false;
      uploadSpinner.classList.add('d-none');
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
      uploadError.textContent = err.message || "Upload failed.";
    }
    uploadBtn.disabled = false;
    uploadSpinner.classList.add('d-none');
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
  }
}
if (galleryType) {
  galleryType.addEventListener('change', () => loadGalleryPreview(galleryType.value === 'both' ? 'gallery' : galleryType.value));
}
window.addEventListener('DOMContentLoaded', () => loadGalleryPreview('gallery'));

// --- ASSIGNMENT POSTING HANDLER ---
if (assignmentForm) {
  assignmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    assignmentError.textContent = "";
    postAssignmentBtn.disabled = true;
    assignmentSpinner.classList.remove('d-none');

    const title = assignmentTitle.value.trim();
    const description = assignmentDesc.value.trim();
    const classVal = assignmentClass.value;
    const dueHours = parseInt(assignmentDueHours.value);

    if (!title || !description || !classVal || !dueHours || dueHours < 1) {
      assignmentError.textContent = "All fields are required and due hours must be >= 1.";
      postAssignmentBtn.disabled = false;
      assignmentSpinner.classList.add('d-none');
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
    } catch (err) {
      assignmentError.textContent = err.message || "Failed to post assignment.";
    }
    postAssignmentBtn.disabled = false;
    assignmentSpinner.classList.add('d-none');
  });
}

// --- LOAD ASSIGNMENTS FOR ADMIN ---
async function loadAdminAssignments() {
  if (!assignmentAdminList) return;
  assignmentAdminList.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
  // Group by class
  try {
    const q = query(collection(db, 'assignments'), orderBy('dueDate', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      assignmentAdminList.innerHTML = "<p>No assignments posted yet.</p>";
      return;
    }
    // Group by class
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
              <b>${a.title}</b> - 
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
  }
}
function getAssignmentStatus(a) {
  const now = new Date();
  const due = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
  if (a.closed) return `<span class="text-danger">Closed</span>`;
  if (now > due) return `<span class="text-danger">Closed</span>`;
  return `<span class="text-success">Open</span>`;
}

// --- CLOSE ASSIGNMENT MANUALLY ---
window.closeAssignment = async function (id) {
  if (!confirm("Are you sure you want to close this assignment?")) return;
  try {
    await updateDoc(doc(db, 'assignments', id), { closed: true });
    showToast("Assignment closed!", "danger");
    loadAdminAssignments();
  } catch (err) {
    showToast("Failed to close assignment.", "danger");
  }
};

// --- SUBMISSIONS AND APPROVAL ---
window.showSubmissions = async function (assignmentId, classVal) {
  // Modal UI for submissions
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

  // Load submissions
  const submissionList = modalEl.querySelector('#submissionList');
  submissionList.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Loading...';
  // Get submissions
  const q = query(collection(db, 'assignments', assignmentId, 'submissions'));
  const snaps = await getDocs(q);
  if (snaps.empty) {
    submissionList.innerHTML = '<p>No submissions yet.</p>';
    return;
  }
  // Load students for names/matric
  const studentsSnap = await getDocs(collection(db, 'students'));
  const students = {};
  studentsSnap.forEach(doc => students[doc.data().email] = doc.data());

  // List with approve buttons
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
  // Mark submission as approved
  try {
    await updateDoc(doc(db, 'assignments', assignmentId, 'submissions', submissionId), { approved: true });
    // Increment student points
    const studentsSnap = await getDocs(query(collection(db, "students")));
    let studentDocId = null;
    studentsSnap.forEach(docSnap => {
      if ((docSnap.data().email || "").toLowerCase() === studentEmail.toLowerCase()) {
        studentDocId = docSnap.id;
      }
    });
    if (studentDocId) {
      const studentRef = doc(db, "students", studentDocId);
      const studentDoc = await getDocs(query(collection(db, "students")));
      const curr = studentDoc.docs.find(d => d.id === studentDocId);
      const prevPoints = (curr ? curr.data().points : 0) || 0;
      await updateDoc(studentRef, { points: prevPoints + 1 });
    }
    showToast("Submission approved & point awarded!", "success");
    loadAdminAssignments();
    // Close modal and reopen to refresh list
    document.querySelector('.btn-close[data-bs-dismiss="modal"]')?.click();
    setTimeout(() => window.showSubmissions(assignmentId), 400);
  } catch (e) {
    showToast("Failed to approve submission.", "danger");
  }
};

// --- LOGOUT ---
if (logoutBtnAdmin) {
  logoutBtnAdmin.addEventListener('click', async function() {
    buttonLoader(logoutBtnAdmin, true, "Logging out...");
    await signOut(auth);
    window.location.reload();
  });
}

// --- LOAD ON AUTH ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadAdminAssignments();
    // ...call any other initial loads you want
  } else {
    if (adminContent) adminContent.innerHTML = `<div class="alert alert-warning">You must be logged in as an admin to view this page.</div>`;
  }
});
