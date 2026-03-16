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