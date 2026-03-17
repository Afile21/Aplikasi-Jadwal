const { app, BrowserWindow, ipcMain, Notification } = require("electron"); 
const path = require("path");
require("electron-reload")(path.join(__dirname, "../../"));

// [BARU] Panggil modul database yang sudah dipisah
const db = require("./database");

const initIpcJadwal = require("./ipcJadwal"); // Panggil modul IPC untuk jadwal
initIpcJadwal();

// [BARU] Panggil dan jalankan modul IPC Proyek
const initIpcProyek = require("./ipcProyek");
initIpcProyek();


// [BARU] Daftarkan ID Aplikasi agar Windows mengizinkan notifikasi
app.setAppUserModelId("Aplikasi.Jadwal.Ku"); 

// ... (Kode database biarkan saja seperti sebelumnya) ...

// [BARU] Logika untuk memunculkan notifikasi dari sistem operasi
ipcMain.on('tampilkan-notifikasi', (event, data) => {
    // Mengecek apakah sistem OS mendukung notifikasi
    if (Notification.isSupported()) {
        const notif = new Notification({
            title: data.title,
            body: data.body
        });
        notif.show(); // Tampilkan!
    }
});

// -------------------------------------------------------------------------
function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.setMenuBarVisibility(false);
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    db.close(); 
    if (process.platform !== "darwin") {
        app.quit();
    }
});


// --- SISTEM STATISTIK & DASHBOARD (OPSI B: BERBOBOT) ---
function formatTglDB(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

ipcMain.on('ambil-statistik', (event) => {
    try {
        // 1. Logika Hitung Poin Berbobot
        const hitungPoin = (tanggal) => {
            const tugasSelesai = db.prepare(`SELECT prioritas FROM jadwal WHERE tanggal = ? AND status = 'Done'`).all(tanggal);
            let poin = 0;
            tugasSelesai.forEach(t => {
                if (t.prioritas === 'Tinggi') poin += 3;
                else if (t.prioritas === 'Sedang') poin += 2;
                else poin += 1; // Rendah
            });
            return poin;
        };

        const hariIni = new Date();
        const kemarin = new Date(); kemarin.setDate(kemarin.getDate() - 1);
        
        const poinHariIni = hitungPoin(formatTglDB(hariIni));
        const poinKemarin = hitungPoin(formatTglDB(kemarin));

        // 2. Logika Tarik Data Grafik 7 Hari Terakhir
        const labelHari = [];
        const dataSelesai = [];
        const dataBelum = [];
        const namaHariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

        for (let i = 6; i >= 0; i--) {
            const tgl = new Date(); tgl.setDate(tgl.getDate() - i);
            const strTglDB = formatTglDB(tgl);
            
            // Format label sumbu X (Misal: "Senin")
            labelHari.push(i === 0 ? 'Hari Ini' : namaHariArr[tgl.getDay()]);

            const selesai = db.prepare(`SELECT COUNT(*) as jml FROM jadwal WHERE tanggal = ? AND status = 'Done'`).get(strTglDB).jml;
            const belum = db.prepare(`SELECT COUNT(*) as jml FROM jadwal WHERE tanggal = ? AND status != 'Done'`).get(strTglDB).jml;

            dataSelesai.push(selesai);
            dataBelum.push(belum);
        }

        // Kirim data matang ke frontend
        event.reply('data-statistik', {
            skor: { hariIni: poinHariIni, kemarin: poinKemarin },
            grafik: { label: labelHari, selesai: dataSelesai, belum: dataBelum }
        });
    } catch (err) { console.error(err); }
});



// ==========================================
// SISTEM PENGATURAN (KATEGORI & RUTINITAS)
// ==========================================

// Ambil data untuk ditampilkan di halaman pengaturan
ipcMain.on('ambil-pengaturan', (event) => {
    try {
        const kategoriList = db.prepare(`SELECT * FROM kategori`).all();
        const rutinitasList = db.prepare(`SELECT * FROM rutinitas`).all();
        event.reply('data-pengaturan', { kategori: kategoriList, rutinitas: rutinitasList });
    } catch (err) { console.error(err); }
});

// CRUD Kategori
ipcMain.on('tambah-kategori', (event, data) => {
    db.prepare(`INSERT INTO kategori (nama_kategori, kode_warna) VALUES (?, ?)`).run(data.nama, data.warna);
    event.reply('update-pengaturan-sukses');
});

ipcMain.on('hapus-kategori', (event, idKategori) => {
    // Hindari menghapus kategori yang sedang dipakai oleh jadwal
    const cekTerpakai = db.prepare(`SELECT COUNT(*) as total FROM jadwal WHERE id_kategori = ?`).get(idKategori);
    if (cekTerpakai.total > 0) {
        event.reply('gagal-hapus-kategori', 'Kategori ini sedang digunakan pada jadwal/rutinitas dan tidak bisa dihapus.');
    } else {
        db.prepare(`DELETE FROM kategori WHERE id_kategori = ?`).run(idKategori);
        event.reply('update-pengaturan-sukses');
    }
});

// CRUD Rutinitas
ipcMain.on('tambah-rutinitas', (event, data) => {
    // Kita set default kategori ke 1 (atau bebas) untuk rutinitas baru
    db.prepare(`INSERT INTO rutinitas (id_kategori, judul_aktivitas, waktu_mulai, waktu_selesai, prioritas) VALUES (?, ?, ?, ?, ?)`).run(1, data.judul, data.mulai, data.selesai, 'Sedang');
    event.reply('update-pengaturan-sukses');
});

ipcMain.on('hapus-rutinitas', (event, idRutinitas) => {
    db.prepare(`DELETE FROM rutinitas WHERE id_rutinitas = ?`).run(idRutinitas);
    event.reply('update-pengaturan-sukses');
});

// --- MENGAMBIL KATEGORI UNTUK DROPDOWN FORM ---
ipcMain.on('ambil-kategori-dropdown', (event) => {
    try {
        const kategori = db.prepare(`SELECT * FROM kategori`).all();
        event.reply('data-kategori-dropdown', kategori);
    } catch (err) { console.error(err); }
});


// --- SISTEM PENGATURAN NOTIFIKASI ---
ipcMain.on('ambil-pengaturan-notif', (event) => {
    try {
        const suara = db.prepare(`SELECT nilai FROM pengaturan_sistem WHERE kunci = 'suara_notif'`).get();
        const mute = db.prepare(`SELECT nilai FROM pengaturan_sistem WHERE kunci = 'mute_notif'`).get();
        
        event.reply('data-pengaturan-notif', {
            suara: suara ? suara.nilai : 'sounds/suara-1.mp3',
            mute: mute ? mute.nilai : '0'
        });
    } catch (err) { console.error(err); }
});

ipcMain.on('simpan-pengaturan-notif', (event, data) => {
    try {
        db.prepare(`UPDATE pengaturan_sistem SET nilai = ? WHERE kunci = 'suara_notif'`).run(data.suara);
        db.prepare(`UPDATE pengaturan_sistem SET nilai = ? WHERE kunci = 'mute_notif'`).run(data.mute);
        event.reply('update-notif-sukses');
    } catch (err) { console.error(err); }
});