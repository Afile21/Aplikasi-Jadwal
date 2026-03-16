const { ipcRenderer } = require('electron'); // Memanggil kurir komunikasi

// Mengambil elemen-elemen dari HTML
const btnTambahJadwal = document.getElementById('btn-tambah-jadwal');
const modalTambah = document.getElementById('modal-tambah');
const btnTutupModal = document.getElementById('btn-tutup-modal');
const formJadwal = document.getElementById('form-jadwal');
// Variabel untuk melacak tanggal mana yang sedang dilihat di layar utama
let tanggalAktif = new Date();
let editId = null; // Menyimpan ID jadwal jika sedang dalam mode edit
let jadwalListGlobal = []; // Menyimpan data jadwal sementara agar mudah di edit

// Menampilkan hari dan tanggal saat ini di Sidebar
const dateElement = document.getElementById('current-date');
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
dateElement.innerText = new Date().toLocaleDateString('id-ID', options);

// Buka modal
btnTambahJadwal.addEventListener('click', () => {
    editId = null; // Pastikan ini mode tambah, bukan edit
    document.querySelector('.modal-header h2').innerText = "Tambah Jadwal Baru";
    formJadwal.reset();
    document.getElementById('input-tanggal').valueAsDate = new Date();
    modalTambah.classList.add('show');
});

// Tutup modal
btnTutupModal.addEventListener('click', () => {
    modalTambah.classList.remove('show');
});

modalTambah.addEventListener('click', (e) => {
    if (e.target === modalTambah) {
        modalTambah.classList.remove('show');
    }
});

// --- LOGIKA BARU: KIRIM DATA KE MAIN.JS ---
formJadwal.addEventListener('submit', (e) => {
    e.preventDefault(); 

    const mulai = document.getElementById('input-mulai').value;
    const selesai = document.getElementById('input-selesai').value;

    // --- VALIDASI WAKTU ---
    if (selesai <= mulai) {
        alert("Oops! Jam Selesai tidak boleh lebih awal atau sama dengan Jam Mulai.");
        return; // Hentikan proses eksekusi kode di bawahnya
    }

    const dataJadwal = {
        judul: document.getElementById('input-judul').value,
        kategoriId: document.getElementById('input-kategori').value,
        tanggal: document.getElementById('input-tanggal').value,
        mulai: mulai,
        selesai: selesai,
        prioritas: document.getElementById('input-prioritas').value // [BARU]
    };

    // --- CEK MODE EDIT ATAU TAMBAH BARU ---
    if (editId) {
        dataJadwal.id = editId; // Masukkan ID jadwal yang mau di edit
        ipcRenderer.send('edit-jadwal', dataJadwal);
    } else {
        ipcRenderer.send('simpan-jadwal', dataJadwal);
    }
});

// --- MENDENGARKAN JAWABAN DARI MAIN.JS ---
ipcRenderer.on('simpan-sukses', (event, pesan) => {
    modalTambah.classList.remove('show'); // Tutup pop-up
    formJadwal.reset(); // Kosongkan form
    loadJadwal(); // <--- Refresh data di layar secara otomatis!
});

ipcRenderer.on('simpan-gagal', (event, pesan) => {
    alert(pesan); // Munculkan notifikasi gagal
});


// --- LOGIKA BARU: MENAMPILKAN JADWAL KE LAYAR ---

// 1. Fungsi untuk mendapatkan format tanggal hari ini (YYYY-MM-DD)
// 1. Fungsi mengubah objek tanggal menjadi format YYYY-MM-DD untuk database
function getTanggalFormatDB(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 2. Fungsi memperbarui judul H1 (Tulis "Fokus Hari Ini" jika hari ini, atau tulis tanggal nya jika hari lain)
function updateTeksTanggal() {
    const h1 = document.getElementById('teks-tanggal-fokus');
    const opsi = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const hariIni = new Date();
    
    if (getTanggalFormatDB(tanggalAktif) === getTanggalFormatDB(hariIni)) {
        h1.innerText = "Fokus Hari Ini";
    } else {
        h1.innerText = tanggalAktif.toLocaleDateString('id-ID', opsi);
    }
}

// 2.1. Fungsi memuat jadwal sesuai 'tanggalAktif'
function loadJadwal() {
    const tanggalDB = getTanggalFormatDB(tanggalAktif);
    updateTeksTanggal(); // Ubah teks judul H1
    ipcRenderer.send('ambil-jadwal', tanggalDB); // Minta data ke database
}

// 4. Logika Tombol Panah (Kemarin & Besok)
document.getElementById('btn-kemarin').addEventListener('click', () => {
    tanggalAktif.setDate(tanggalAktif.getDate() - 1); // Mundur 1 hari
    loadJadwal(); // Muat ulang layar
});

document.getElementById('btn-besok').addEventListener('click', () => {
    tanggalAktif.setDate(tanggalAktif.getDate() + 1); // Maju 1 hari
    loadJadwal(); // Muat ulang layar
});

// 3. Menerima data dari main.js dan merakit HTML-nya
ipcRenderer.on('data-jadwal', (event, jadwalList) => {
    jadwalListGlobal = jadwalList; 

    const listTodo = document.getElementById('list-todo');
    const listProgress = document.getElementById('list-progress');
    const listDone = document.getElementById('list-done');
    
    // Kosongkan kolom terlebih dahulu
    listTodo.innerHTML = ''; listProgress.innerHTML = ''; listDone.innerHTML = '';

    const progressText = document.querySelector('.progress-container span');
    const progressFill = document.querySelector('.progress-fill');

    if (jadwalList.length === 0) {
        listTodo.innerHTML = `<p class="empty-state">Belum ada jadwal.</p>`;
        progressText.innerText = 'Progres: 0%';
        progressFill.style.width = '0%';
        return;
    }

    let jumlahSelesai = 0; 

    jadwalList.forEach(jadwal => {
        if (jadwal.status === 'Done') jumlahSelesai++; 

        // Penentuan warna prioritas
        let classPrioritas = 'sedang';
        if(jadwal.prioritas === 'Tinggi') classPrioritas = 'tinggi';
        if(jadwal.prioritas === 'Rendah') classPrioritas = 'rendah';

        const card = document.createElement('div');
        card.className = `jadwal-card ${jadwal.status === 'Done' ? 'selesai' : ''}`;
        card.style.borderLeft = `5px solid ${jadwal.kode_warna}`;
        
        card.innerHTML = `
            <div class="jadwal-badge-container">
                <span class="jadwal-kategori" style="background-color: ${jadwal.kode_warna}30; color: ${jadwal.kode_warna};">
                    ${jadwal.nama_kategori}
                </span>
                <span class="badge-prioritas ${classPrioritas}">${jadwal.prioritas}</span>
            </div>
            
            <div class="jadwal-info">
                <h3>${jadwal.judul_aktivitas}</h3>
                <div style="color: var(--text-secondary); font-size: 13px;">🕒 ${jadwal.waktu_mulai} - ${jadwal.waktu_selesai}</div>
            </div>
            
            <div class="jadwal-aksi" style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                <select class="status-dropdown" data-id="${jadwal.id_jadwal}">
                    <option value="To Do" ${jadwal.status === 'To Do' ? 'selected' : ''}>To Do</option>
                    <option value="In Progress" ${jadwal.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Done" ${jadwal.status === 'Done' ? 'selected' : ''}>Done</option>
                </select>
                <div>
                    <button class="btn-edit" data-id="${jadwal.id_jadwal}" title="Edit">✏️</button>
                    <button class="btn-hapus" data-id="${jadwal.id_jadwal}" title="Hapus">🗑️</button>
                </div>
            </div>
        `;
        
        // Masukkan ke kolom yang tepat
        if (jadwal.status === 'To Do') listTodo.appendChild(card);
        else if (jadwal.status === 'In Progress') listProgress.appendChild(card);
        else if (jadwal.status === 'Done') listDone.appendChild(card);
    });

    // Kalkulasi Progres Bar
    const persentase = Math.round((jumlahSelesai / jadwalList.length) * 100);
    progressText.innerText = `Progres: ${persentase}%`;
    progressFill.style.width = `${persentase}%`; 

    // Event Listener untuk Pindah Kolom (Dropdown Status)
    document.querySelectorAll('.status-dropdown').forEach(dropdown => {
        dropdown.addEventListener('change', (e) => {
            const idJadwal = e.target.getAttribute('data-id');
            const statusBaru = e.target.value;
            ipcRenderer.send('update-status', { id: idJadwal, status: statusBaru });
        });
    });

    // Tambahkan kembali event listener untuk hapus & edit seperti sebelumnya
    document.querySelectorAll('.btn-hapus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm("Hapus jadwal ini?")) ipcRenderer.send('hapus-jadwal', btn.getAttribute('data-id'));
        });
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idJadwal = btn.getAttribute('data-id'); 
            const jadwalEdit = jadwalListGlobal.find(j => j.id_jadwal == idJadwal);
            if (jadwalEdit) {
                editId = jadwalEdit.id_jadwal; 
                document.querySelector('.modal-header h2').innerText = "Edit Jadwal"; 
                document.getElementById('input-judul').value = jadwalEdit.judul_aktivitas;
                document.getElementById('input-kategori').value = jadwalEdit.id_kategori;
                document.getElementById('input-tanggal').value = jadwalEdit.tanggal;
                document.getElementById('input-mulai').value = jadwalEdit.waktu_mulai;
                document.getElementById('input-selesai').value = jadwalEdit.waktu_selesai;
                // Jangan lupa isi dropdown prioritas
                document.getElementById('input-prioritas').value = jadwalEdit.prioritas || 'Sedang';
                document.getElementById('modal-tambah').classList.add('show');
            }
        });
    });
});

// Mendengarkan jika update database sukses, maka otomatis refresh layar
ipcRenderer.on('update-sukses', () => {
    loadJadwal(); 
});

// 4. Panggil fungsi loadJadwal saat aplikasi pertama kali dibuka
loadJadwal();


// --- SISTEM NOTIFIKASI PENGINGAT ---
let jadwalYangSudahDiberitahu = []; // Menyimpan ID jadwal agar tidak di-spam notifikasi

setInterval(() => {
    // Pastikan kita hanya mengecek jadwal di hari ini (bukan saat melihat hari besok/kemarin)
    const hariIni = getTanggalFormatDB(new Date());
    const tanggalSedangDilihat = getTanggalFormatDB(tanggalAktif);
    
    if (hariIni !== tanggalSedangDilihat) return; // Berhenti jika sedang tidak di tab "Hari Ini"

    const now = new Date();
    // Format jam menjadi HH:MM (Contoh: 08:05)
    const jamSekarang = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');

    jadwalListGlobal.forEach(jadwal => {
        // Jika waktunya tiba, status belum Done, dan belum pernah di notifikasi
        if (jadwal.waktu_mulai === jamSekarang && jadwal.status !== 'Done' && !jadwalYangSudahDiberitahu.includes(jadwal.id_jadwal)) {
            
            // [DIUBAH] Minta main.js yang memunculkan notifikasi
            ipcRenderer.send('tampilkan-notifikasi', {
                title: "Waktunya Fokus! 🎯",
                body: `${jadwal.judul_aktivitas}\nJam: ${jadwal.waktu_mulai} - ${jadwal.waktu_selesai}\nPrioritas: ${jadwal.prioritas}`
            });
            
            // Catat ID jadwal ini agar 10 detik kemudian tidak bunyi lagi
            jadwalYangSudahDiberitahu.push(jadwal.id_jadwal);
        }
    });
}, 10000); // Mengecek setiap 10.000 milidetik (10 detik)


// --- SISTEM NAVIGASI TAB ---
const viewBeranda = document.getElementById('view-beranda');
const viewProyek = document.getElementById('view-proyek');
const viewStatistik = document.getElementById('view-statistik');

document.getElementById('nav-beranda').addEventListener('click', (e) => {
    e.preventDefault(); gantiTab(viewBeranda, e.target);
    loadJadwal();
});

document.getElementById('nav-proyek').addEventListener('click', (e) => {
    e.preventDefault(); gantiTab(viewProyek, e.target);
    ipcRenderer.send('ambil-proyek'); // Minta data proyek ke main.js
});

document.getElementById('nav-statistik').addEventListener('click', (e) => {
    e.preventDefault(); gantiTab(viewStatistik, e.target);
    ipcRenderer.send('ambil-statistik'); // Minta data statistik ke main.js
});

function gantiTab(viewAktif, menuAktif) {
    // Sembunyikan semua
    viewBeranda.style.display = 'none';
    viewProyek.style.display = 'none';
    viewStatistik.style.display = 'none';
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    
    // Tampilkan yang dipilih
    viewAktif.style.display = 'block';
    menuAktif.classList.add('active');
}

// --- MENERIMA DATA STATISTIK ---
ipcRenderer.on('data-statistik', (event, data) => {
    const persen = data.total === 0 ? 0 : Math.round((data.selesai / data.total) * 100);
    document.getElementById('teks-stat-persen').innerText = `${persen}%`;
    document.getElementById('teks-stat-detail').innerText = `${data.selesai} dari ${data.total} Total Tugas Keseluruhan Selesai`;
});

// --- MENERIMA DATA PROYEK (GOALS) ---
ipcRenderer.on('data-proyek', (event, proyekList) => {
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
            ipcRenderer.send('update-milestone', { id, is_selesai: isSelesai });
        });
    });

    // Event Listener untuk Tombol Hapus Proyek
    document.querySelectorAll('.btn-hapus-proyek').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idProyek = e.currentTarget.getAttribute('data-id');
            if(confirm("Apakah kamu yakin ingin menghapus tujuan ini secara permanen?")) {
                ipcRenderer.send('hapus-proyek', idProyek);
            }
        });
    });
});

// Refresh otomatis jika milestone diupdate
ipcRenderer.on('update-proyek-sukses', () => {
    ipcRenderer.send('ambil-proyek');
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
    ipcRenderer.send('tambah-proyek', { nama, target, milestones });
    modalProyek.classList.remove('show');
});