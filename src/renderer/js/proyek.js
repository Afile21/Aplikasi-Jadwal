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

            const card = document.createElement('div');
            // Menggabungkan class bawaan jadwal-card dengan class Bento proyek-card
            card.className = 'jadwal-card proyek-card';
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text-primary);">${proyek.nama_proyek}</h3>
                        <span style="font-size: 12px; color: var(--text-secondary);">🎯 Target: ${proyek.target_tanggal || '-'}</span>
                    </div>
                    <button class="btn-hapus-proyek btn-close" data-id="${proyek.id_proyek}" style="width: 28px; height: 28px; font-size: 14px;" title="Hapus Proyek">✖</button>
                </div>
                
                <div>
                    <div class="proyek-progress-bg">
                        <div class="proyek-progress-fill" style="width: ${persen}%;"></div>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); text-align: right; font-weight: 600;">Progres: ${persen}% (${selesaiMs}/${totalMs})</div>
                </div>
            `;

            // Event Listener Buka Modal Detail saat kartu diklik
            card.addEventListener('click', (e) => {
                // Jangan buka modal jika yang diklik adalah tombol hapus
                if(e.target.classList.contains('btn-hapus-proyek')) return;
                bukaModalDetail(proyek, persen);
            });

            container.appendChild(card);
        });

        // Event Listener untuk Tombol Hapus Proyek
        document.querySelectorAll('.btn-hapus-proyek').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Mencegah klik menembus ke kartu dan membuka modal
                const idProyek = e.currentTarget.getAttribute('data-id');
                if(confirm("Apakah kamu yakin ingin menghapus tujuan ini secara permanen?")) {
                    window.electronAPI.send('hapus-proyek', idProyek);
                }
            });
        });
    });

    // Refresh otomatis jika proyek atau milestone diupdate (dari database)
    window.electronAPI.receive('update-proyek-sukses', () => {
        window.electronAPI.send('ambil-proyek');
    });

    // ==========================================
    // LOGIKA MODAL DETAIL PROYEK (BARU)
    // ==========================================
    const modalDetail = document.getElementById('modal-detail-proyek');
    const btnTutupDetail = document.getElementById('btn-tutup-detail');
    
    btnTutupDetail.addEventListener('click', () => {
        modalDetail.classList.remove('show');
    });

    function bukaModalDetail(proyek, persen) {
        // Isi info header modal
        document.getElementById('detail-judul').innerText = proyek.nama_proyek;
        document.getElementById('detail-target').innerText = "Target: " + (proyek.target_tanggal || '-');
        document.getElementById('detail-progress-teks').innerText = `Progres: ${persen}%`;
        document.getElementById('detail-progress-bar').style.width = `${persen}%`;

        // Render milestone dengan gaya UI baru
        const wadahMilestone = document.getElementById('detail-list-milestone');
        wadahMilestone.innerHTML = '';

        if (proyek.milestones.length === 0) {
            wadahMilestone.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">Belum ada langkah (milestone).</p>';
        } else {
            proyek.milestones.forEach(m => {
                wadahMilestone.innerHTML += `
                    <label class="milestone-item ${m.is_selesai ? 'selesai' : ''}">
                        <input type="checkbox" class="cek-milestone-detail" data-id="${m.id_milestone}" ${m.is_selesai ? 'checked' : ''}>
                        <span>${m.nama_tugas}</span>
                    </label>
                `;
            });
        }

        // Pasang event listener untuk checkbox di dalam modal
        document.querySelectorAll('.cek-milestone-detail').forEach(box => {
            box.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const isSelesai = e.target.checked ? 1 : 0;
                
                // Beri efek animasi teks dicoret langsung di UI modal
                if(e.target.checked) {
                    e.target.parentElement.classList.add('selesai');
                } else {
                    e.target.parentElement.classList.remove('selesai');
                }
                
                // Update ke database
                window.electronAPI.send('update-milestone', { id, is_selesai: isSelesai });
            });
        });

        // Tampilkan modalnya
        modalDetail.classList.add('show');
    }

    // ==========================================
    // LOGIKA CRUD PROYEK FORM TAMBAH
    // ==========================================
    const modalProyek = document.getElementById('modal-proyek');
    const btnTutupProyek = document.getElementById('btn-tutup-proyek');
    const formProyek = document.getElementById('form-proyek');
    const wadahMilestoneForm = document.getElementById('wadah-milestone');
    const btnTambahMs = document.getElementById('btn-tambah-ms');

    document.getElementById('btn-tambah-proyek').addEventListener('click', () => {
        formProyek.reset();
        wadahMilestoneForm.innerHTML = ''; 
        tambahInputMilestone(); 
        modalProyek.classList.add('show');
    });

    btnTutupProyek.addEventListener('click', () => { modalProyek.classList.remove('show'); });

    function tambahInputMilestone() {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; gap: 10px; align-items: center;';
        // Memperbarui desain input agar lebih selaras dengan UI Soft Mode
        div.innerHTML = `
            <input type="text" class="input-milestone" placeholder="Deskripsi langkah..." required style="flex: 1; padding: 10px; border-radius: var(--radius-sm); border: var(--border-light); background: var(--bg-main); color: var(--text-primary); outline: none;">
            <button type="button" class="btn-hapus-ms" style="cursor: pointer; background: var(--bg-main); border: var(--border-light); border-radius: var(--radius-sm); color: #f38ba8; font-size: 14px; width: 34px; height: 34px;">✖</button>
        `;
        wadahMilestoneForm.appendChild(div);
    }

    btnTambahMs.addEventListener('click', tambahInputMilestone);

    wadahMilestoneForm.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-hapus-ms')) e.target.parentElement.remove();
    });

    formProyek.addEventListener('submit', (e) => {
        e.preventDefault();
        const nama = document.getElementById('input-nama-proyek').value;
        const target = document.getElementById('input-target-proyek').value;
        
        const milestoneInputs = document.querySelectorAll('.input-milestone');
        const milestones = [];
        milestoneInputs.forEach(input => {
            if(input.value.trim() !== '') milestones.push(input.value.trim());
        });

        if(milestones.length === 0) {
            alert("Minimal harus ada 1 langkah (milestone) untuk mencapai tujuan ini!");
            return;
        }

        window.electronAPI.send('tambah-proyek', { nama, target, milestones });
        modalProyek.classList.remove('show');
    });
}