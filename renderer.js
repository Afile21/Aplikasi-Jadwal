// Mengambil elemen-elemen dari HTML
const btnTambahJadwal = document.getElementById('btn-tambah-jadwal');
const modalTambah = document.getElementById('modal-tambah');
const btnTutupModal = document.getElementById('btn-tutup-modal');

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

// Menutup modal jika area gelap di luar kotak diklik
modalTambah.addEventListener('click', (e) => {
    if (e.target === modalTambah) {
        modalTambah.classList.remove('show');
    }
});