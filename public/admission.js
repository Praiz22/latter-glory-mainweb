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

    // --- 4. PDF GENERATION ---

    async function generatePDF(data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Styles
        doc.setFillColor(183, 28, 28); // LGA Red
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("LATTER GLORY ACADEMY", 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text("ADMISSION APPLICATION CONFIRMATION", 105, 30, { align: 'center' });

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("STUDENT DETAILS", 20, 60);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Name: ${data.student_name}`, 20, 70);
        doc.text(`DOB: ${data.date_of_birth}`, 20, 75);
        doc.text(`Gender: ${data.gender}`, 20, 80);
        doc.text(`Class: ${data.applying_for}`, 20, 85);

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("PARENT / GUARDIAN", 20, 105);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Parent Name: ${data.parent_name} (${data.relationship})`, 20, 115);
        doc.text(`Phone: ${data.parent_phone}`, 20, 120);
        doc.text(`Email: ${data.parent_email}`, 20, 125);

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("ADDRESSES & MEDICAL", 20, 145);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Address: ${data.home_address}, ${data.city}, ${data.state}`, 20, 155);
        doc.text(`Medical Info: ${data.medical_info || 'None'}`, 20, 160);

        // Passport Placeholder or Image if we want to be fancy (skipped for now for speed)
        if (data.passport_url) {
            doc.text("Passport uploaded to registry.", 150, 70);
        }

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 280);
        doc.text(`Application ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 20, 285);

        doc.save(`Admission_${data.student_name.replace(/\s+/g, '_')}.pdf`);
    }
});
