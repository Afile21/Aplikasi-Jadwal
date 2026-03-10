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
    alert(pesan); // Munculkan notifikasi sukses
    modalTambah.classList.remove('show'); // Tutup pop-up
    formJadwal.reset(); // Kosongkan form
});

ipcRenderer.on('simpan-gagal', (event, pesan) => {
    alert(pesan); // Munculkan notifikasi gagal
});