// ---- Firebase Imports ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, query, where, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ---- Firebase Config (Ensure this matches your main portal.js config) ----
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

// ---- DOM Elements (Assumes these exist in student-portal-ui.html) ----
const serviceRequestForm = document.getElementById('serviceRequestForm');
const submitServiceRequestBtn = document.getElementById('submitServiceRequestBtn');
const requestTypeError = document.getElementById('requestTypeError');
const requestDetailsError = document.getElementById('requestDetailsError');
const myRequestsList = document.getElementById('myRequestsList');
const serviceRequestSuccess = document.getElementById('serviceRequestSuccess');

// Current User Data (will be populated by auth listener)
let currentStudentUid = null;
let currentStudentEmail = null;

// ---- Utility Functions (Copied from portal.js for consistency, or import if common file) ----
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

function logError(context, err) {
    console.error(`Error in ${context}:`, err);
    showToast(`Error in ${context}: ${err.message}`, "danger");
}

// ---- Auth State Listener for Service Requests ----
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentStudentUid = user.uid;
        currentStudentEmail = user.email;
        loadMyServiceRequests(); // Load requests once user is confirmed
    } else {
        currentStudentUid = null;
        currentStudentEmail = null;
        if (myRequestsList) {
            myRequestsList.innerHTML = '<div class="alert alert-info text-center">Please log in to view your service requests.</div>';
        }
    }
});

// ---- Handle Service Request Form Submission ----
if (serviceRequestForm) {
    serviceRequestForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentStudentUid || !currentStudentEmail) {
            showToast("You must be logged in to submit a service request.", "danger");
            return;
        }

        // Clear previous errors
        requestTypeError.textContent = '';
        requestDetailsError.textContent = '';
        serviceRequestSuccess.style.display = 'none';

        const requestType = document.getElementById('requestType').value;
        const requestDetails = document.getElementById('requestDetails').value.trim();

        let isValid = true;
        if (!requestType) {
            requestTypeError.textContent = 'Please select a request type.';
            isValid = false;
        }
        if (!requestDetails) {
            requestDetailsError.textContent = 'Please provide details for your request.';
            isValid = false;
        }

        if (!isValid) {
            showToast("Please fill in all required fields.", "warning");
            return;
        }

        buttonLoader(submitServiceRequestBtn, true, "Submitting...");

        try {
            await addDoc(collection(db, "serviceRequests"), {
                studentUid: currentStudentUid,
                studentEmail: currentStudentEmail,
                requestType: requestType,
                details: requestDetails,
                status: 'pending', // Initial status
                submittedAt: new Date(),
                respondedAt: null,
                response: null
            });

            serviceRequestForm.reset(); // Clear the form
            serviceRequestSuccess.style.display = 'block'; // Show success message
            showToast("Service request submitted successfully!", "success");
            loadMyServiceRequests(); // Reload requests to show the new one
        } catch (err) {
            logError("SubmitServiceRequest", err);
            showToast("Failed to submit request. Please try again.", "danger");
            serviceRequestSuccess.style.display = 'none'; // Hide success message on error
        } finally {
            buttonLoader(submitServiceRequestBtn, false, "Submit Request");
        }
    });
}

// ---- Load My Service Requests ----
async function loadMyServiceRequests() {
    if (!myRequestsList || !currentStudentUid) {
        if (myRequestsList) myRequestsList.innerHTML = '<div class="alert alert-info text-center">Log in to see your requests.</div>';
        return;
    }

    myRequestsList.innerHTML = '<div class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> Loading your requests...</div>';

    try {
        const q = query(
            collection(db, "serviceRequests"),
            where("studentUid", "==", currentStudentUid),
            orderBy("submittedAt", "desc")
        );
        const snap = await getDocs(q);

        let html = `<ul class="list-group">`;
        if (snap.empty) {
            html += `<li class="list-group-item text-center text-muted">You haven't submitted any service requests yet.</li>`;
        } else {
            snap.forEach(doc => {
                const request = doc.data();
                const submittedDate = request.submittedAt ? new Date(request.submittedAt.seconds * 1000).toLocaleString() : "N/A";
                const statusClass = {
                    'pending': 'bg-warning text-dark',
                    'resolved': 'bg-success',
                    'in-progress': 'bg-info text-dark',
                    'rejected': 'bg-danger'
                }[request.status] || 'bg-secondary';

                html += `
                    <li class="list-group-item d-flex justify-content-between align-items-start">
                        <div class="ms-2 me-auto">
                            <div class="fw-bold">${request.requestType}</div>
                            ${request.details.substring(0, 100)}${request.details.length > 100 ? '...' : ''}
                            <small class="text-muted d-block mt-1">Submitted: ${submittedDate}</small>
                            ${request.response ? `<div class="mt-2 alert alert-light p-2 mb-0"><strong>Response:</strong> ${request.response}</div>` : ''}
                        </div>
                        <span class="badge ${statusClass} rounded-pill p-2 mt-1">${request.status.replace(/-/g, ' ').toUpperCase()}</span>
                    </li>
                `;
            });
        }
        html += `</ul>`;
        myRequestsList.innerHTML = html;
    } catch (err) {
        logError("LoadMyServiceRequests", err);
        myRequestsList.innerHTML = `<div class="alert alert-danger">Error loading your requests: ${err.message}</div>`;
    }
}

// Export functions if needed by other modules (e.g., if loaded dynamically by portal.js)
// export { loadMyServiceRequests }; // Example, if you need to call this from portal.js's tab logic