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
        selesai: selesai
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
    const board = document.querySelector('.schedule-board');
    const progressText = document.querySelector('.progress-container span');
    const progressFill = document.querySelector('.progress-fill');
    
    // Jika tidak ada jadwal
    if (jadwalList.length === 0) {
        board.innerHTML = `
            <div class="empty-state">
                <p>Belum ada jadwal untuk hari ini.</p>
                <p>Klik tombol <b>+ Tambah Jadwal</b> untuk memulai.</p>
            </div>
        `;
        progressText.innerText = 'Progres: 0%';
        progressFill.style.width = '0%';
        return;
    }

    board.innerHTML = '';
    let jumlahSelesai = 0; // Variabel penampung jumlah jadwal yang berstatus "Selesai"

    // Buat kartu untuk setiap jadwal
    jadwalList.forEach(jadwal => {
        const isSelesai = jadwal.status === 'Selesai';
        if (isSelesai) jumlahSelesai++; // Tambah 1 jika status nya Selesai

        const card = document.createElement('div');
        // Tambahkan class 'selesai' jika isSelesai bernilai true
        card.className = `jadwal-card ${isSelesai ? 'selesai' : ''}`;
        card.style.borderLeft = `5px solid ${jadwal.kode_warna}`;
        
        card.innerHTML = `
            <div class="jadwal-waktu">${jadwal.waktu_mulai} - ${jadwal.waktu_selesai}</div>
            <div class="jadwal-info">
                <h3>${jadwal.judul_aktivitas}</h3>
                <span class="jadwal-kategori" style="background-color: ${jadwal.kode_warna}30; color: ${jadwal.kode_warna}; border: 1px solid ${jadwal.kode_warna}">
                    ${jadwal.nama_kategori}
                </span>
            </div>
            <div class="jadwal-aksi">
                <input type="checkbox" class="cek-status" data-id="${jadwal.id_jadwal}" ${isSelesai ? 'checked' : ''} title="Tandai Selesai">
                <button class="btn-edit" data-id="${jadwal.id_jadwal}" title="Edit Jadwal">✏️</button>
                <button class="btn-hapus" data-id="${jadwal.id_jadwal}" title="Hapus Jadwal">🗑️</button>
            </div>
        `;
        
        board.appendChild(card);
    });

    // --- KALKULASI PROGRES BAR ---
    // Rumus: (Jumlah Selesai / Total Jadwal) * 100, lalu dibulatkan (Math.round)
    const persentase = Math.round((jumlahSelesai / jadwalList.length) * 100);
    progressText.innerText = `Progres: ${persentase}%`;
    progressFill.style.width = `${persentase}%`; // Menggerakkan animasi bar biru

    // --- EVENT LISTENER UNTUK CHECKBOX ---
    // Mencari semua checkbox yang baru saja dibuat di atas
    const checkboxes = document.querySelectorAll('.cek-status');
    checkboxes.forEach(box => {
        box.addEventListener('change', (e) => {
            const idJadwal = e.target.getAttribute('data-id');
            const statusBaru = e.target.checked ? 'Selesai' : 'Belum Mulai';
            
            // Kirim perintah ke main.js untuk update database
            ipcRenderer.send('update-status', { id: idJadwal, status: statusBaru });
        });
    });
    // --- EVENT LISTENER UNTUK TOMBOL HAPUS ---
    const tombolHapus = document.querySelectorAll('.btn-hapus');
    tombolHapus.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idJadwal = e.target.getAttribute('data-id');
            
            // Tampilkan pop-up konfirmasi bawaan sistem
            const yakin = confirm("Apakah Anda yakin ingin menghapus jadwal ini secara permanen?");
            
            if (yakin) {
                // Jika klik OK, kirim perintah hapus ke main.js
                ipcRenderer.send('hapus-jadwal', idJadwal);
            }
        });
    });

    // --- EVENT LISTENER UNTUK TOMBOL EDIT ---
    const tombolEdit = document.querySelectorAll('.btn-edit');
    tombolEdit.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idJadwal = e.target.getAttribute('data-id');
            // Cari data jadwal yang spesifik dari list
            const jadwalEdit = jadwalListGlobal.find(j => j.id_jadwal == idJadwal);
            
            if (jadwalEdit) {
                editId = jadwalEdit.id_jadwal; // Aktifkan mode edit
                document.querySelector('.modal-header h2').innerText = "Edit Jadwal"; // Ubah teks judul pop-up
                
                // Isi form dengan data lama
                document.getElementById('input-judul').value = jadwalEdit.judul_aktivitas;
                document.getElementById('input-kategori').value = jadwalEdit.id_kategori;
                document.getElementById('input-tanggal').value = jadwalEdit.tanggal;
                document.getElementById('input-mulai').value = jadwalEdit.waktu_mulai;
                document.getElementById('input-selesai').value = jadwalEdit.waktu_selesai;

                // Tampilkan form
                modalTambah.classList.add('show');
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