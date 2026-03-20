import { initStatistik } from './statistik.js';
import { initProyek } from './proyek.js';
import { initPengaturan, loadKategori, suaraNotifPilihan, isMuteNotif } from './pengaturan.js';

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
        window.electronAPI.send('edit-jadwal', dataJadwal);
    } else {
        window.electronAPI.send('simpan-jadwal', dataJadwal);
    }
});

// --- MENDENGARKAN JAWABAN DARI MAIN.JS ---
window.electronAPI.receive('simpan-sukses', (pesan) => {
    modalTambah.classList.remove('show'); // Tutup pop-up
    formJadwal.reset(); // Kosongkan form
    loadJadwal(); // <--- Refresh data di layar secara otomatis!
});

window.electronAPI.receive('simpan-gagal', (pesan) => {
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
    window.electronAPI.send('ambil-jadwal', tanggalDB); // Minta data ke database
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
window.electronAPI.receive('data-jadwal', (jadwalList) => {
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
        card.setAttribute('data-id', jadwal.id_jadwal);
        // Catatan: Saya menghapus card.style.borderLeft agar kartu 100% menggunakan gaya Soft UI tanpa border kaku.
        
        card.innerHTML = `
            <div class="jadwal-badge-container">
                <span class="jadwal-kategori" style="background-color: ${jadwal.kode_warna}30; color: ${jadwal.kode_warna};">
                    ${jadwal.nama_kategori}
                </span>
                <span class="badge-prioritas ${classPrioritas}">${jadwal.prioritas}</span>
            </div>
            
            <div class="jadwal-info">
                <h3>${jadwal.judul_aktivitas}</h3>
                <div class="jadwal-waktu">⏱️ ${jadwal.waktu_mulai} - ${jadwal.waktu_selesai}</div>
            </div>
            
            <div class="jadwal-aksi">
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
            window.electronAPI.send('update-status', { id: idJadwal, status: statusBaru });
        });
    });

    // Tambahkan kembali event listener untuk hapus & edit seperti sebelumnya
    document.querySelectorAll('.btn-hapus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm("Hapus jadwal ini?")) window.electronAPI.send('hapus-jadwal', btn.getAttribute('data-id'));
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
window.electronAPI.receive('update-sukses', () => {
    loadJadwal(); 
});

// 4. Panggil fungsi loadJadwal saat aplikasi pertama kali dibuka
loadJadwal();


// ==========================================
// SISTEM NOTIFIKASI KUSTOM (VISUAL & AUDIO)
// ==========================================
let jadwalDimulaiNotif = []; 
let jadwalSelesaiNotif = []; 


function tampilkanNotifKustom(judul, pesan, tipe) {
    // 1. Mainkan Suara (Hanya jika tidak di-mute)
    if (!isMuteNotif) {
        try {
            const audio = new Audio(suaraNotifPilihan); 
            audio.play();
        } catch (err) { console.error("Gagal memutar suara:", err); }
    }
    // 2. Buat Elemen Visual (Pop-up)
    const container = document.getElementById('notif-container');
    const notifEl = document.createElement('div');
    notifEl.className = 'custom-notif';
    
    // Warna berbeda: Hijau untuk mulai, Merah untuk selesai
    if (tipe === 'mulai') {
        notifEl.style.borderLeftColor = '#a6e3a1'; // Hijau
        notifEl.innerHTML = `<h4 style="color: #a6e3a1;">${judul}</h4><p>${pesan}</p>`;
    } else {
        notifEl.style.borderLeftColor = '#f38ba8'; // Merah
        notifEl.innerHTML = `<h4 style="color: #f38ba8;">${judul}</h4><p>${pesan}</p>`;
    }

    container.appendChild(notifEl);

    // 3. Hilangkan otomatis setelah 7 detik
    setTimeout(() => {
        notifEl.style.animation = 'fadeOutUp 0.5s ease-out forwards';
        setTimeout(() => notifEl.remove(), 500); 
    }, 7000);
}

// Cek Waktu Setiap 10 Detik
setInterval(() => {
    // Ambil fungsi getTanggalFormatDB (pastikan fungsi ini ada di kodemu sebelumnya)
    function formatTgl(date) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0') + "-" + String(date.getDate()).padStart(2, '0');
    }

    const hariIni = formatTgl(new Date());
    const tanggalSedangDilihat = formatTgl(tanggalAktif);
    
    // Hanya periksa notifikasi jika kita sedang membuka jadwal hari ini
    if (hariIni !== tanggalSedangDilihat) return;

    const now = new Date();
    const jamSekarang = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');

    jadwalListGlobal.forEach(jadwal => {

        // A. Cek Waktu Mulai
        if (jadwal.waktu_mulai === jamSekarang && jadwal.status !== 'Done' && !jadwalDimulaiNotif.includes(jadwal.id_jadwal)) {
            
            jadwalDimulaiNotif.push(jadwal.id_jadwal); // <--- PINDAHKAN KE SINI

            tampilkanNotifKustom(
                "▶️ Waktunya Memulai!", 
                `${jadwal.judul_aktivitas}<br>Jam: ${jadwal.waktu_mulai} - ${jadwal.waktu_selesai}`, 
                'mulai'
            );
        }

        // B. Cek Waktu Selesai
        if (jadwal.waktu_selesai === jamSekarang && !jadwalSelesaiNotif.includes(jadwal.id_jadwal)) {
            
            jadwalSelesaiNotif.push(jadwal.id_jadwal); // <--- PINDAHKAN KE SINI

            tampilkanNotifKustom(
                "🛑 Waktu Habis!", 
                `Fokus untuk aktivitas <strong>${jadwal.judul_aktivitas}</strong> telah berakhir. Ayo evaluasi progresmu!`, 
                'selesai'
            );
        }
    });
}, 10000);


// --- SISTEM NAVIGASI TAB ---
const viewBeranda = document.getElementById('view-beranda');
const viewProyek = document.getElementById('view-proyek');
const viewStatistik = document.getElementById('view-statistik');
const viewPengaturan = document.getElementById('view-pengaturan'); // [BARU] Pindahkan variabel ini ke atas

function gantiTab(viewAktif, menuAktif) {
    // Sembunyikan SEMUA view terlebih dahulu
    if(viewBeranda) viewBeranda.style.display = 'none';
    if(viewProyek) viewProyek.style.display = 'none';
    if(viewStatistik) viewStatistik.style.display = 'none';
    if(viewPengaturan) viewPengaturan.style.display = 'none'; // [BARU] Pastikan pengaturan juga disembunyikan
    
    // Hilangkan warna aktif dari semua menu
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    
    // Tampilkan view yang sedang diklik dan beri warna aktif pada menunya
    if(viewAktif) viewAktif.style.display = 'block';
    if(menuAktif) menuAktif.classList.add('active');
}

document.getElementById('nav-beranda').addEventListener('click', (e) => {
    e.preventDefault(); gantiTab(viewBeranda, e.target);
    loadJadwal();
});

document.getElementById('nav-proyek').addEventListener('click', (e) => {
    e.preventDefault(); gantiTab(viewProyek, e.target);
    window.electronAPI.send('ambil-proyek'); // Minta data proyek ke main.js
});

document.getElementById('nav-statistik').addEventListener('click', (e) => {
    e.preventDefault(); gantiTab(viewStatistik, e.target);
    window.electronAPI.send('ambil-statistik'); // Minta data statistik ke main.js
});

// ==========================================
// SISTEM DRAG-AND-DROP (KANBAN SORTABLE)
// ==========================================
function aktifkanDragAndDrop() {
    const kolomTodo = document.getElementById('list-todo');
    const kolomProgress = document.getElementById('list-progress');
    const kolomDone = document.getElementById('list-done');

    const opsiSortable = {
        group: 'kanban', // Menghubungkan ketiga kolom agar jadwal bisa berpindah
        animation: 150,  // Animasi mulus saat digeser (dalam milidetik)
        ghostClass: 'kartu-bayangan', // Class CSS untuk efek visual saat kartu ditarik
        onEnd: function (evt) {
            // Fungsi yang otomatis berjalan saat mouse dilepas (kartu dijatuhkan)
            const kartu = evt.item;          // Elemen kartu HTML yang ditarik
            const kolomTujuan = evt.to.id;   // ID kolom tempat kartu dijatuhkan
            const idJadwal = kartu.getAttribute('data-id'); // Mengambil ID dari database

            // Menentukan status baru berdasarkan nama kolom
            let statusBaru = 'To Do';
            if (kolomTujuan === 'list-progress') statusBaru = 'In Progress';
            else if (kolomTujuan === 'list-done') statusBaru = 'Done';

            // Ubah teks di dropdown agar tetap sinkron dengan posisi kartu
            kartu.querySelector('.status-dropdown').value = statusBaru;

            // Kirim perintah ke main.js untuk langsung menyimpan posisi baru ke Database!
            window.electronAPI.send('update-status', { id: idJadwal, status: statusBaru });
        }
    };

    // Terapkan ke ketiga wadah list
    new Sortable(kolomTodo, opsiSortable);
    new Sortable(kolomProgress, opsiSortable);
    new Sortable(kolomDone, opsiSortable);
}

// Panggil fungsinya
aktifkanDragAndDrop();


// ==========================================
// LOGIKA MENU PENGATURAN
// ==========================================


document.getElementById('nav-pengaturan').addEventListener('click', (e) => {
    e.preventDefault(); 
    gantiTab(viewPengaturan, e.target); // Menggunakan fungsi gantiTab yang sudah ada
    window.electronAPI.send('ambil-pengaturan'); // Minta data terbaru dari database
});

initStatistik();
initProyek();
initPengaturan();
loadKategori();
// ==========================================
// SISTEM TEMA (LIGHT/DARK MODE)
// ==========================================
const btnToggleTema = document.getElementById('btn-toggle-tema');

// Cek tema apa yang terakhir kali dipakai oleh user (simpan di LocalStorage)
const temaTersimpan = localStorage.getItem('tema-jadwalku') || 'dark';
if (temaTersimpan === 'light') {
    document.body.setAttribute('data-theme', 'light');
    btnToggleTema.innerText = '☀️';
} else {
    document.body.removeAttribute('data-theme');
    btnToggleTema.innerText = '🌙';
}

// Event saat tombol ditekan
btnToggleTema.addEventListener('click', () => {
    // Berikan efek animasi putar sedikit saat diklik
    btnToggleTema.style.transform = 'rotate(360deg)';
    setTimeout(() => btnToggleTema.style.transform = 'rotate(0deg)', 300);

    const temaSaatIni = document.body.getAttribute('data-theme');
    
    if (temaSaatIni === 'light') {
        document.body.removeAttribute('data-theme'); // Kembali ke Dark
        btnToggleTema.innerText = '🌙';
        localStorage.setItem('tema-jadwalku', 'dark');
    } else {
        document.body.setAttribute('data-theme', 'light'); // Pindah ke Light
        btnToggleTema.innerText = '☀️';
        localStorage.setItem('tema-jadwalku', 'light');
    }
});

// ==========================================
// SISTEM NAVIGASI MOBILE (HAMBURGER MENU & OVERLAY)
// ==========================================
const btnHamburger = document.getElementById('btn-hamburger');
const btnTutupSidebar = document.getElementById('btn-tutup-sidebar');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('sidebar-overlay');

// Fungsi pembantu untuk mengatur state sidebar
function toggleSidebar(buka) {
    if (buka) {
        sidebar.classList.add('terbuka');
        overlay.classList.add('muncul');
    } else {
        sidebar.classList.remove('terbuka');
        overlay.classList.remove('muncul');
    }
}

if (btnHamburger && sidebar && overlay && btnTutupSidebar) {
    // Membuka sidebar (dari tombol di layar utama)
    btnHamburger.addEventListener('click', () => toggleSidebar(true));

    // METODE TUTUP 1: Klik tombol di dalam sidebar
    btnTutupSidebar.addEventListener('click', () => toggleSidebar(false));

    // METODE TUTUP 2: Klik area gelap di luar sidebar (Overlay)
    overlay.addEventListener('click', () => toggleSidebar(false));

    // Otomatis menutup sidebar setelah menu navigasi diklik (Hanya di layar sempit)
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 850) { 
                toggleSidebar(false);
            }
        });
    });
}