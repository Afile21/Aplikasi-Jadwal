// File: src/renderer/js/proyek.js

export function initProyek() {
    // --- MENERIMA DATA PROYEK (GOALS) ---
    window.electronAPI.receive('data-proyek', (proyekList) => {
        const container = document.getElementById('list-proyek-container');
        container.innerHTML = '';

        if (proyekList.length === 0) {
            container.innerHTML = `<p class="empty-state">Belum ada tujuan jangka panjang.</p>`;
            return;
        }

        proyekList.forEach(proyek => {
            // Kalkulasi persentase milestone
            const totalMs = proyek.milestones.length;
            const selesaiMs = proyek.milestones.filter(m => m.is_selesai === 1).length;
            const persen = totalMs === 0 ? 0 : Math.round((selesaiMs / totalMs) * 100);

            let htmlMilestones = '';
            proyek.milestones.forEach(m => {
                htmlMilestones += `
                    <div style="display: flex; align-items: center; gap: 10px; margin-top: 8px;">
                        <input type="checkbox" class="cek-milestone" data-id="${m.id_milestone}" ${m.is_selesai ? 'checked' : ''} style="accent-color: var(--accent-color); width: 18px; height: 18px;">
                        <span style="${m.is_selesai ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${m.nama_tugas}</span>
                    </div>
                `;
            });

            const card = document.createElement('div');
            card.className = 'jadwal-card';
            card.style.flexDirection = 'column';
            card.style.alignItems = 'stretch';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h3 style="margin: 0; font-size: 20px; color: var(--accent-color);">${proyek.nama_proyek}</h3>
                        <span style="font-size: 12px; color: var(--text-secondary);">Target: ${proyek.target_tanggal}</span>
                    </div>
                    <button class="btn-hapus-proyek" data-id="${proyek.id_proyek}" style="background: transparent; border: none; cursor: pointer; font-size: 16px;" title="Hapus Proyek">🗑️</button>
                </div>
                
                <div style="background-color: var(--bg-main); height: 8px; border-radius: 4px; margin-top: 10px; overflow: hidden;">
                    <div style="background-color: var(--accent-color); height: 100%; width: ${persen}%; transition: width 0.3s;"></div>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); text-align: right; margin-bottom: 15px;">Progress: ${persen}%</div>
                
                <div style="background-color: var(--bg-sidebar); padding: 15px; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0;">Milestones (Langkah-langkah):</h4>
                    ${htmlMilestones || '<p style="font-size: 12px; color: var(--text-secondary);">Belum ada langkah.</p>'}
                </div>
            `;
            container.appendChild(card);
        });

        // Event Listener untuk Centang Milestone
        document.querySelectorAll('.cek-milestone').forEach(box => {
            box.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const isSelesai = e.target.checked ? 1 : 0;
                window.electronAPI.send('update-milestone', { id, is_selesai: isSelesai });
            });
        });

        // Event Listener untuk Tombol Hapus Proyek
        document.querySelectorAll('.btn-hapus-proyek').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idProyek = e.currentTarget.getAttribute('data-id');
                if(confirm("Apakah kamu yakin ingin menghapus tujuan ini secara permanen?")) {
                    window.electronAPI.send('hapus-proyek', idProyek);
                }
            });
        });
    });

    // Refresh otomatis jika milestone diupdate
    window.electronAPI.receive('update-proyek-sukses', () => {
        window.electronAPI.send('ambil-proyek');
    });

    // ==========================================
    // LOGIKA CRUD PROYEK (MY GOALS)
    // ==========================================
    const modalProyek = document.getElementById('modal-proyek');
    const btnTutupProyek = document.getElementById('btn-tutup-proyek');
    const formProyek = document.getElementById('form-proyek');
    const wadahMilestone = document.getElementById('wadah-milestone');
    const btnTambahMs = document.getElementById('btn-tambah-ms');

    // Buka Modal Proyek
    document.getElementById('btn-tambah-proyek').addEventListener('click', () => {
        formProyek.reset();
        wadahMilestone.innerHTML = ''; // Kosongkan wadah
        tambahInputMilestone(); // Tambahkan 1 input kosong sebagai awalan
        modalProyek.classList.add('show');
    });

    // Tutup Modal Proyek
    btnTutupProyek.addEventListener('click', () => { modalProyek.classList.remove('show'); });

    // Fungsi untuk menambah kotak input langkah (milestone)
    function tambahInputMilestone() {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; gap: 10px; align-items: center;';
        div.innerHTML = `
            <input type="text" class="input-milestone" placeholder="Deskripsi langkah..." required style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid var(--text-secondary); background: var(--bg-main); color: var(--text-primary);">
            <button type="button" class="btn-hapus-ms" style="cursor: pointer; background: transparent; border: none; color: #f38ba8; font-size: 16px;">✖</button>
        `;
        wadahMilestone.appendChild(div);
    }

    // Event saat tombol "+ Tambah Langkah" diklik
    btnTambahMs.addEventListener('click', tambahInputMilestone);

    // Event untuk menghapus salah satu input langkah jika batal
    wadahMilestone.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-hapus-ms')) {
            e.target.parentElement.remove();
        }
    });

    // Saat Form Disimpan
    formProyek.addEventListener('submit', (e) => {
        e.preventDefault();
        const nama = document.getElementById('input-nama-proyek').value;
        const target = document.getElementById('input-target-proyek').value;
        
        // Kumpulkan semua teks dari kotak input milestone
        const milestoneInputs = document.querySelectorAll('.input-milestone');
        const milestones = [];
        milestoneInputs.forEach(input => {
            if(input.value.trim() !== '') milestones.push(input.value.trim());
        });

        if(milestones.length === 0) {
            alert("Minimal harus ada 1 langkah (milestone) untuk mencapai tujuan ini!");
            return;
        }

        // Kirim data ke main.js
        window.electronAPI.send('tambah-proyek', { nama, target, milestones });
        modalProyek.classList.remove('show');
    });
}