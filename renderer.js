const { ipcRenderer } = require('electron'); // Memanggil kurir komunikasi

// Mengambil elemen-elemen dari HTML
const btnTambahJadwal = document.getElementById('btn-tambah-jadwal');
const modalTambah = document.getElementById('modal-tambah');
const btnTutupModal = document.getElementById('btn-tutup-modal');
const formJadwal = document.getElementById('form-jadwal');

// Menampilkan hari dan tanggal saat ini di Sidebar
const dateElement = document.getElementById('current-date');
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
dateElement.innerText = new Date().toLocaleDateString('id-ID', options);

// Buka modal
btnTambahJadwal.addEventListener('click', () => {
    modalTambah.classList.add('show');
    document.getElementById('input-tanggal').valueAsDate = new Date();
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

    // 1. Bungkus data dari form
    const dataJadwal = {
        judul: document.getElementById('input-judul').value,
        kategoriId: document.getElementById('input-kategori').value,
        tanggal: document.getElementById('input-tanggal').value,
        mulai: document.getElementById('input-mulai').value,
        selesai: document.getElementById('input-selesai').value
    };

    // 2. Serahkan data ke kurir untuk dikirim ke main.js
    ipcRenderer.send('simpan-jadwal', dataJadwal);
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
function getTanggalHariIni() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 2. Fungsi untuk meminta data jadwal ke main.js
function loadJadwal() {
    const tanggal = getTanggalHariIni();
    ipcRenderer.send('ambil-jadwal', tanggal);
}

// 3. Menerima data dari main.js dan merakit HTML-nya
ipcRenderer.on('data-jadwal', (event, jadwalList) => {
    const board = document.querySelector('.schedule-board');
    
    // Jika tidak ada jadwal hari ini, tampilkan pesan kosong
    if (jadwalList.length === 0) {
        board.innerHTML = `
            <div class="empty-state">
                <p>Belum ada jadwal untuk hari ini.</p>
                <p>Klik tombol <b>+ Tambah Jadwal</b> untuk memulai.</p>
            </div>
        `;
        return;
    }

    // Jika ada, kosongkan area papan
    board.innerHTML = '';

    // Buat kartu untuk setiap jadwal
    jadwalList.forEach(jadwal => {
        const card = document.createElement('div');
        card.className = 'jadwal-card';
        // Memberi garis warna di sebelah kiri sesuai kategori
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
                <input type="checkbox" title="Tandai Selesai">
            </div>
        `;
        
        board.appendChild(card);
    });
});

// 4. Panggil fungsi loadJadwal saat aplikasi pertama kali dibuka
loadJadwal();