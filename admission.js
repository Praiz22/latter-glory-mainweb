// Cloudinary Configuration (Reused from Admin)
const CLOUDINARY_CONFIG = {
    cloudName: 'dbat5n77r',
    uploadPreset: 'blog_gallery'
};

document.addEventListener('DOMContentLoaded', () => {
    const admissionForm = document.getElementById('admissionForm');
    const confirmModal = document.getElementById('confirmModal');
    const finalSubmitBtn = document.getElementById('finalSubmitBtn');
    const successOverlay = document.getElementById('successOverlay');
    const emailNotifyForm = document.getElementById('emailNotifyForm');

    if (!admissionForm) return;

    // --- 1. UTILITIES ---

    // Passport Preview & Compression logic
    window.previewPassport = function(input) {
        const preview = document.getElementById('passportPreview');
        const placeholder = document.getElementById('uploadPlaceholder');
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
            }
            reader.readAsDataURL(input.files[0]);
        }
    };

    async function compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxW = 800; // Passport doesn't need high res
                    const scale = img.width > maxW ? maxW / img.width : 1;
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/webp', 0.8);
                };
            };
        });
    }

    async function uploadToCloudinary(blob) {
        const formData = new FormData();
        formData.append('file', blob, 'passport.webp');
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, { 
            method: 'POST', 
            body: formData 
        });
        if (!res.ok) throw new Error('Cloudinary Upload Failed');
        const data = await res.json();
        return data.secure_url;
    }

    // --- 2. MODAL HANDLERS ---

    window.showConfirmModal = function() {
        if (!admissionForm.checkValidity()) {
            admissionForm.reportValidity();
            return;
        }
        confirmModal.classList.add('show');
    };

    window.closeConfirmModal = function() {
        confirmModal.classList.remove('show');
    };

    // --- 3. FINAL SUBMISSION ---

    window.handleFinalSubmission = async function() {
        finalSubmitBtn.disabled = true;
        finalSubmitBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Processing...`;

        try {
            // A. Get Data
            const formData = {
                student_name: document.getElementById('studentName').value,
                date_of_birth: document.getElementById('studentDOB').value,
                gender: document.getElementById('studentGender').value,
                applying_for: document.getElementById('applyingFor').value,
                previous_school: document.getElementById('prevSchool').value,
                parent_name: document.getElementById('parentName').value,
                relationship: document.getElementById('relationship').value,
                parent_phone: document.getElementById('parentPhone').value,
                parent_email: document.getElementById('parentEmail').value,
                occupation: document.getElementById('occupation').value,
                home_address: document.getElementById('homeAddress').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                medical_info: document.getElementById('medicalInfo').value,
                referral_source: document.getElementById('referralSource').value,
                passport_url: ''
            };

            // B. Upload Passport if exists
            const passportInput = document.getElementById('passportInput');
            if (passportInput.files && passportInput.files[0]) {
                const compressedBlob = await compressImage(passportInput.files[0]);
                formData.passport_url = await uploadToCloudinary(compressedBlob);
            }

            // C. Supabase Save
            const { error: sbError } = await supabase
                .from('admissions')
                .insert([formData]);
            
            if (sbError) throw sbError;

            // D. FormSubmit Email Notification
            document.getElementById('emailDetails').value = JSON.stringify(formData, null, 2);
            const emailData = new FormData(emailNotifyForm);
            fetch(emailNotifyForm.action, {
                method: 'POST',
                body: emailData,
                headers: { 'Accept': 'application/json' }
            }).catch(e => console.warn('Email notify failed, but record saved.'));

            // E. Generate PDF
            await generatePDF(formData);

            // F. Success UI
            closeConfirmModal();
            successOverlay.classList.add('show');
            admissionForm.reset();

        } catch (err) {
            console.error('Final Submission Error:', err);
            alert('Submission Failed: ' + err.message + '\n\nNote: Ensure you have run the ADMISSIONS_SETUP.sql in Supabase SQL Editor.');
            finalSubmitBtn.disabled = false;
            finalSubmitBtn.innerHTML = `Retry Submission <i class="bi bi-arrow-repeat"></i>`;
        }
    };

    // --- 4. PDF GENERATION (PREMIUM BRANDING) ---

    async function generatePDF(data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const primaryColor = [183, 28, 28]; // LGA RED

        // Header Background
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 45, 'F');
        
        // Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(26);
        doc.text("LATTER GLORY ACADEMY", 105, 22, { align: 'center' });
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Kajola Area, Ogbomoso, Oyo State, Nigeria", 105, 30, { align: 'center' });
        doc.setFontSize(14);
        doc.text("ADMISSION APPLICATION RECEIPT", 105, 38, { align: 'center' });

        // Content Styling
        doc.setTextColor(40, 40, 40);
        let y = 65;

        // Section Helper
        const drawSection = (title, fields) => {
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...primaryColor);
            doc.text(title, 20, y);
            doc.setDrawColor(...primaryColor);
            doc.line(20, y + 2, 60, y + 2);
            
            y += 12;
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(60, 60, 60);

            fields.forEach(f => {
                doc.setFont("helvetica", "bold");
                doc.text(`${f.label}:`, 20, y);
                doc.setFont("helvetica", "normal");
                doc.text(`${f.value || 'N/A'}`, 65, y);
                y += 8;
            });
            y += 10;
        };

        // Student Section
        drawSection("STUDENT INFORMATION", [
            { label: "Full Name", value: data.student_name },
            { label: "Date of Birth", value: data.date_of_birth },
            { label: "Gender", value: data.gender },
            { label: "Applying For", value: data.applying_for },
            { label: "Previous School", value: data.previous_school }
        ]);

        // Parent Section
        drawSection("PARENT / GUARDIAN", [
            { label: "Full Name", value: data.parent_name },
            { label: "Relationship", value: data.relationship },
            { label: "Phone Number", value: data.parent_phone },
            { label: "Email Address", value: data.parent_email },
            { label: "Occupation", value: data.occupation }
        ]);

        // Address Section
        drawSection("RESIDENTIAL & MEDICAL", [
            { label: "Address", value: `${data.home_address}, ${data.city}, ${data.state}` },
            { label: "Medical Info", value: data.medical_info }
        ]);

        // Footer
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 275, 190, 275);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const dateStr = new Date().toLocaleString();
        doc.text(`This is an acknowledgement receipt. Generated on: ${dateStr}`, 105, 282, { align: 'center' });
        doc.text("Latter Glory Academy © 2026 | Excellence in Education", 105, 287, { align: 'center' });

        // Application ID Stamp
        const appId = Math.random().toString(36).substr(2, 9).toUpperCase();
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text(`APP ID: LGA-${appId}`, 150, 60);

        doc.save(`LGA_Admission_${data.student_name.replace(/\s+/g, '_')}.pdf`);
    }
});
