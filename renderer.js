// Memanggil modul database (SQLite)
const Database = require('better-sqlite3');
const path = require('path');

// Menghubungkan ke file database.db yang sudah ada
const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

// Mengambil elemen-elemen dari HTML
const btnTambahJadwal = document.getElementById('btn-tambah-jadwal');
const modalTambah = document.getElementById('modal-tambah');
const btnTutupModal = document.getElementById('btn-tutup-modal');
const formJadwal = document.getElementById('form-jadwal'); // Mengambil elemen form

// Menampilkan hari dan tanggal saat ini di Sidebar
const dateElement = document.getElementById('current-date');
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
dateElement.innerText = new Date().toLocaleDateString('id-ID', options);

// Logika untuk MEMBUKA pop-up modal
btnTambahJadwal.addEventListener('click', () => {
    modalTambah.classList.add('show');
    // Otomatis mengisi tanggal hari ini di form
    document.getElementById('input-tanggal').valueAsDate = new Date();
});

// Logika untuk MENUTUP pop-up modal
btnTutupModal.addEventListener('click', () => {
    modalTambah.classList.remove('show');
});

// Menutup modal jika area gelap di luar kotak di klik
modalTambah.addEventListener('click', (e) => {
    if (e.target === modalTambah) {
        modalTambah.classList.remove('show');
    }
});

// --- LOGIKA BARU: MENYIMPAN DATA KE DATABASE ---
formJadwal.addEventListener('submit', (e) => {
    e.preventDefault(); // Mencegah halaman me-refresh/berkedip saat tombol di submit

    // 1. Ambil nilai yang Anda ketik di form
    const judul = document.getElementById('input-judul').value;
    const kategoriId = document.getElementById('input-kategori').value;
    const tanggal = document.getElementById('input-tanggal').value;
    const mulai = document.getElementById('input-mulai').value;
    const selesai = document.getElementById('input-selesai').value;

    try {
        // 2. Siapkan perintah SQL untuk memasukkan data ke tabel 'jadwal'
        const stmt = db.prepare(`
            INSERT INTO jadwal (id_kategori, judul_aktivitas, tanggal, waktu_mulai, waktu_selesai) 
            VALUES (?, ?, ?, ?, ?)
        `);
        
        // 3. Eksekusi perintah tersebut dengan data dari form
        stmt.run(kategoriId, judul, tanggal, mulai, selesai);

        // 4. Beri tahu bahwa penyimpanan sukses
        alert("Mantap! Jadwal berhasil disimpan ke database.");

        // 5. Tutup modal dan kosongkan isi form untuk pengisian berikutnya
        modalTambah.classList.remove('show');
        formJadwal.reset();

        // (Nantinya kita akan menambahkan kode di sini untuk me-refresh daftar jadwal di layar)

    } catch (error) {
        console.error("Gagal menyimpan data:", error);
        alert("Terjadi kesalahan saat menyimpan jadwal.");
    }
});