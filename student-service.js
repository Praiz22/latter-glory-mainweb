import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where
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

// Generate Matric Number
function generateMatricNumber(fullName, studentClass) {
  // fullName: "John Doe", studentClass: "J1"
  const firstLetter = fullName.trim()[0].toUpperCase();
  const randomDigits = Math.floor(Math.random() * 90 + 10); // two digits
  // Use only the class part (J1, J2, S1, S2, etc)
  return `LGA/${studentClass}/${firstLetter}${randomDigits}`;
}

// Show Notification Toast
function showNotification(message, type = 'primary', timeout = 4000) {
  const toastEl = document.getElementById('mainToast');
  const toastBody = document.getElementById('mainToastBody');
  if (!toastEl || !toastBody) return;
  toastBody.textContent = message;
  toastEl.className = `toast align-items-center text-bg-${type} border-0`;
  const toast = new bootstrap.Toast(toastEl, { delay: timeout });
  toast.show();
}

// --- Registration: email/password/signup with gender & matric ---
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
    // Gender from radio buttons
    const gender = registerForm.querySelector('input[name="gender"]:checked')?.value || '';
    const passportFile = registerForm.passport.files[0];

    if (!email || !password || !fullName || !studentClass || !gender) {
      if (registerError) {
        registerError.textContent = "All fields are required.";
        registerError.style.display = "block";
      }
      return;
    }

    // Generate matric number
    const matricNumber = generateMatricNumber(fullName, studentClass);

    try {
      // Create user in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName });

      // Upload passport
      let passportUrl = "";
      if (passportFile) {
        const imgRef = storageRef(storage, `passports/${matricNumber}_${Date.now()}.jpg`);
        await uploadBytes(imgRef, passportFile);
        passportUrl = await getDownloadURL(imgRef);
      }

      // Create student doc in Firestore
      await setDoc(doc(db, "students", matricNumber), {
        matricNumber,
        name: fullName,
        class: studentClass,
        gender,
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

// --- Profile Section ---
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
        <div class="mb-2"><b>Account Created:</b> <span>${student.createdAt || '-'}</span></div>
        <div class="mb-3">
          <button class="btn btn-danger" id="deleteStudentBtn">
            <i class="bi bi-trash"></i> Delete My Account
          </button>
        </div>
      </div>
    `;
    // Attach delete handler
    const deleteBtn = document.getElementById('deleteStudentBtn');
    if (deleteBtn) {
      deleteBtn.onclick = showDeleteAccountModal;
    }
  } catch (err) {
    profileContent.innerHTML = `<div class="text-danger">Error loading profile.</div>`;
  }
}

// --- Delete Account Modal and Logic ---
function showDeleteAccountModal() {
  let modalEl = document.getElementById('deleteAccountModal');
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.className = 'modal fade';
  modalEl.id = 'deleteAccountModal';
  modalEl.tabIndex = -1;
  modalEl.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content glassmorphism">
        <div class="modal-header">
          <h5 class="modal-title text-danger">Delete Account</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body text-center">
          <p>Enter admin password to confirm deletion. This cannot be undone.</p>
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
    // Replace with your secure admin key!
    if (key !== 'YOUR_ADMIN_KEY') {
      alert('Invalid admin key!');
      return;
    }
    try {
      const user = auth.currentUser;
      // Find and delete student Firestore doc
      const q = query(collection(db, "students"), where("email", "==", user.email));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        await deleteDoc(querySnap.docs[0].ref);
      }
      // Delete Auth user
      await user.delete();
      await signOut(auth);
      showNotification('Account deleted.', 'danger');
      bsModal.hide();
      window.location.reload();
    } catch (e) {
      alert('Failed to delete account: ' + e.message);
      bsModal.hide();
    }
  };

  modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
}

// --- Auth State Change (student only) ---
const loginForm = document.getElementById('loginForm');
const loginModal = document.getElementById('loginModal');
const loginBtnNav = document.getElementById('loginBtnNav');
const logoutBtnNav = document.getElementById('logoutBtnNav');
const loginBtnMainDiv = document.getElementById('loginBtnMainDiv');
const mainContent = document.getElementById('mainContent');
const loginError = document.getElementById('loginError');

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

onAuthStateChanged(auth, async (user) => {
  if (user) {
    mainContent.style.display = 'block';
    loginBtnMainDiv.style.display = 'none';
    loginBtnNav.style.display = 'none';
    logoutBtnNav.style.display = 'inline-block';
    loadProfile();
  } else {
    mainContent.style.display = 'none';
    loginBtnMainDiv.style.display = 'block';
    loginBtnNav.style.display = 'inline-block';
    logoutBtnNav.style.display = 'none';
    if (profileContent) profileContent.innerHTML = '';
  }
});


const assignmentsList = document.getElementById('assignments-list');
let studentProfile = null;

// Load student's own profile to know class/email
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Load profile from students collection
    const studentsSnap = await getDocs(collection(db, "students"));
    studentsSnap.forEach(docSnap => {
      if ((docSnap.data().email || "").toLowerCase() === user.email.toLowerCase()) {
        studentProfile = docSnap.data();
      }
    });
    loadAssignments();
  }
});

async function loadAssignments() {
  if (!assignmentsList || !studentProfile) return;
  assignmentsList.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
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
    html += `
      <div class="card mb-3">
        <div class="card-body">
          <h5>${a.title}</h5>
          <div>${a.description}</div>
          <div><b>Due:</b> ${due.toLocaleString()} <span class="assignment-status">${closed ? '<span class="text-danger">Closed</span>' : '<span class="text-success" id="timer-${docSnap.id}"></span>'}</span></div>
          ${closed ? "<div class='alert alert-warning mt-2'>Assignment has closed.</div>" : `
            <form onsubmit="window.submitAssignment(event, '${docSnap.id}')">
              <input type="text" class="form-control mb-2" required placeholder="Enter your answer or link">
              <button class="btn btn-primary btn-sm">Submit Assignment</button>
            </form>
          `}
        </div>
      </div>
    `;
    // Timer updater
    if (!closed) {
      setInterval(() => {
        const left = due - new Date();
        if (left > 0) {
          const h = Math.floor(left/3600000), m = Math.floor((left%3600000)/60000), s = Math.floor((left%60000)/1000);
          document.getElementById(`timer-${docSnap.id}`).textContent = `Time left: ${h}h ${m}m ${s}s`;
        } else {
          document.getElementById(`timer-${docSnap.id}`).textContent = `Closed`;
        }
      }, 1000);
    }
  });
  assignmentsList.innerHTML = html;
}

// Assignment submission
window.submitAssignment = async function (e, assignmentId) {
  e.preventDefault();
  const answer = e.target[0].value;
  if (!answer) return;
  const user = auth.currentUser;
  if (!user || !studentProfile) return;
  // Save submission
  await setDoc(doc(db, 'assignments', assignmentId, 'submissions', user.uid), {
    studentEmail: user.email,
    answer,
    submittedAt: serverTimestamp(),
    approved: false // admin will update this
  });
  e.target.reset();
  alert("Assignment submitted! Await admin approval.");
};
