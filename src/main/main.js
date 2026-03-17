const { app, BrowserWindow, ipcMain, Notification } = require("electron"); 
const path = require("path");
require("electron-reload")(__dirname);
const Database = require("better-sqlite3");

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

// 1. Inisialisasi Database
const dbPath = path.join(__dirname, "../../database.db");
const db = new Database(dbPath);

// 2. Membuat Tabel dan Mengisi Data Default Kategori
db.exec(`
    CREATE TABLE IF NOT EXISTS kategori (
        id_kategori INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_kategori TEXT NOT NULL,
        kode_warna TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS jadwal (
        id_jadwal INTEGER PRIMARY KEY AUTOINCREMENT,
        id_kategori INTEGER,
        judul_aktivitas TEXT NOT NULL,
        tanggal TEXT NOT NULL,
        waktu_mulai TEXT NOT NULL,
        waktu_selesai TEXT NOT NULL,
        prioritas TEXT DEFAULT 'Sedang', -- [BARU] Kolom prioritas
        status TEXT DEFAULT 'To Do',     -- [DIUBAH] Default status untuk Kanban
        is_berulang INTEGER DEFAULT 0,
        FOREIGN KEY (id_kategori) REFERENCES kategori (id_kategori)
    );


    -- Masukkan kategori default ini jika tabel kategori masih kosong
    INSERT OR IGNORE INTO kategori (id_kategori, nama_kategori, kode_warna) VALUES (1, 'Belajar', '#89b4fa');
    INSERT OR IGNORE INTO kategori (id_kategori, nama_kategori, kode_warna) VALUES (2, 'Istirahat', '#f9e2af');
    INSERT OR IGNORE INTO kategori (id_kategori, nama_kategori, kode_warna) VALUES (3, 'Hiburan', '#a6e3a1');

    CREATE TABLE IF NOT EXISTS rutinitas (
        id_rutinitas INTEGER PRIMARY KEY AUTOINCREMENT,
        id_kategori INTEGER,
        judul_aktivitas TEXT NOT NULL,
        waktu_mulai TEXT NOT NULL,
        waktu_selesai TEXT NOT NULL,
        prioritas TEXT DEFAULT 'Sedang'
    );

    -- Contoh Rutinitas Default (Otomatis masuk ke jadwal setiap harinya)
    INSERT OR IGNORE INTO rutinitas (id_rutinitas, id_kategori, judul_aktivitas, waktu_mulai, waktu_selesai, prioritas) 
    VALUES (1, 2, 'Tidur & Istirahat', '22:00', '05:00', 'Tinggi');
    
    INSERT OR IGNORE INTO rutinitas (id_rutinitas, id_kategori, judul_aktivitas, waktu_mulai, waktu_selesai, prioritas) 
    VALUES (2, 2, 'Makan Siang & Istirahat', '12:00', '13:00', 'Sedang');


    CREATE TABLE IF NOT EXISTS proyek (
        id_proyek INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_proyek TEXT NOT NULL,
        target_tanggal TEXT
    );

    CREATE TABLE IF NOT EXISTS milestone (
        id_milestone INTEGER PRIMARY KEY AUTOINCREMENT,
        id_proyek INTEGER,
        nama_tugas TEXT NOT NULL,
        is_selesai INTEGER DEFAULT 0,
        FOREIGN KEY (id_proyek) REFERENCES proyek (id_proyek) ON DELETE CASCADE
    );

    -- (Tabel yang sudah ada biarkan saja, tambahkan kode ini di bagian paling bawah dalam db.exec) --
    CREATE TABLE IF NOT EXISTS pengaturan_sistem (
        kunci TEXT PRIMARY KEY,
        nilai TEXT NOT NULL
    );

    -- Berikan nilai default saat aplikasi pertama kali diinstal
    INSERT OR IGNORE INTO pengaturan_sistem (kunci, nilai) VALUES ('suara_notif', '../assets/sounds/suara-1.mp3');
    INSERT OR IGNORE INTO pengaturan_sistem (kunci, nilai) VALUES ('mute_notif', '0');
`);

// --- LOGIKA BARU: MENERIMA DATA DARI RENDERER LALU SIMPAN KE DATABASE ---
ipcMain.on('simpan-jadwal', (event, data) => {
    try {
        const stmt = db.prepare(`
            INSERT INTO jadwal (id_kategori, judul_aktivitas, tanggal, waktu_mulai, waktu_selesai, prioritas, status) 
            VALUES (?, ?, ?, ?, ?, ?, 'To Do')
        `);
        stmt.run(data.kategoriId, data.judul, data.tanggal, data.mulai, data.selesai, data.prioritas);
        
        event.reply('simpan-sukses', 'Mantap! Jadwal berhasil disimpan.');
    } catch (error) {
        console.error("Database error:", error);
        // Kita ubah pesannya agar memunculkan error asli dari mesin database
        event.reply('simpan-gagal', 'Gagal menyimpan: ' + error.message);
    }
});
// -------------------------------------------------------------------------
// ... (kode simpan-jadwal sebelumnya ada di atas sini) ...

// --- LOGIKA BARU: MENGAMBIL JADWAL DARI DATABASE ---
ipcMain.on('ambil-jadwal', (event, tanggalHariIni) => {
    try {
        // 1. Cek apakah rutinitas harian sudah di suntikkan ke hari ini? (is_berulang = 1)
        const cekRutinitas = db.prepare(`SELECT COUNT(*) as total FROM jadwal WHERE tanggal = ? AND is_berulang = 1`).get(tanggalHariIni);
        
        // 2. Jika belum ada rutinitas di hari ini, kita suntikkan (Generate)
        if (cekRutinitas.total === 0) {
            const rutinitasList = db.prepare(`SELECT * FROM rutinitas`).all();
            
            if (rutinitasList.length > 0) {
                const insertStmt = db.prepare(`
                    INSERT INTO jadwal (id_kategori, judul_aktivitas, tanggal, waktu_mulai, waktu_selesai, prioritas, status, is_berulang) 
                    VALUES (?, ?, ?, ?, ?, ?, 'To Do', 1)
                `);
                
                // Gunakan transaction agar proses insert banyak data lebih cepat dan aman
                const insertBanyak = db.transaction((rutinitas) => {
                    for (const r of rutinitas) {
                        insertStmt.run(r.id_kategori, r.judul_aktivitas, tanggalHariIni, r.waktu_mulai, r.waktu_selesai, r.prioritas);
                    }
                });
                insertBanyak(rutinitasList);
            }
        }

        // 3. Ambil seluruh jadwal (yang manual + yang rutin) untuk ditampilkan
        const stmt = db.prepare(`
            SELECT jadwal.*, kategori.nama_kategori, kategori.kode_warna 
            FROM jadwal 
            JOIN kategori ON jadwal.id_kategori = kategori.id_kategori 
            WHERE jadwal.tanggal = ? 
            ORDER BY jadwal.waktu_mulai ASC
        `);
        
        const jadwalList = stmt.all(tanggalHariIni);
        event.reply('data-jadwal', jadwalList);
    } catch (error) {
        console.error("Gagal mengambil jadwal:", error);
    }
});


// --- LOGIKA BARU: MENGUBAH STATUS JADWAL (CHECKBOX) ---
ipcMain.on('update-status', (event, data) => {
    try {
        // Mengubah status di tabel jadwal berdasarkan id_jadwal
        const stmt = db.prepare(`UPDATE jadwal SET status = ? WHERE id_jadwal = ?`);
        stmt.run(data.status, data.id);
        
        // Beri tahu layar bahwa update berhasil agar layar me-refresh otomatis
        event.reply('update-sukses');
    } catch (error) {
        console.error("Gagal update status:", error);
    }
});

// --- LOGIKA BARU: MENGHAPUS JADWAL (DELETE) ---
ipcMain.on('hapus-jadwal', (event, idJadwal) => {
    try {
        const stmt = db.prepare(`DELETE FROM jadwal WHERE id_jadwal = ?`);
        stmt.run(idJadwal);
        
        // Gunakan sinyal 'update-sukses' yang sudah ada agar layar langsung me-refresh
        event.reply('update-sukses');
    } catch (error) {
        console.error("Gagal menghapus jadwal:", error);
    }
});

// --- LOGIKA BARU: MENGEDIT JADWAL (UPDATE) ---
ipcMain.on('edit-jadwal', (event, data) => {
    try {
        const stmt = db.prepare(`
            UPDATE jadwal 
            SET id_kategori = ?, judul_aktivitas = ?, tanggal = ?, waktu_mulai = ?, waktu_selesai = ?, prioritas = ?
            WHERE id_jadwal = ?
        `);
        stmt.run(data.kategoriId, data.judul, data.tanggal, data.mulai, data.selesai, data.prioritas, data.id);
        
        // Kita bisa menggunakan sinyal 'simpan-sukses' agar form di-reset dan layar me-refresh
        event.reply('simpan-sukses', 'Jadwal berhasil diperbarui.');
    } catch (error) {
        console.error("Gagal edit jadwal:", error);
        event.reply('simpan-gagal', 'Gagal memperbarui: ' + error.message);
    }
});
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
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
    win.loadFile("../renderer/index.html");
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

// --- SISTEM PROYEK (GOALS) ---
ipcMain.on('ambil-proyek', (event) => {
    try {
        const proyekList = db.prepare(`SELECT * FROM proyek`).all();
        // Ambil milestone untuk setiap proyek
        proyekList.forEach(p => {
            p.milestones = db.prepare(`SELECT * FROM milestone WHERE id_proyek = ?`).all(p.id_proyek);
        });
        event.reply('data-proyek', proyekList);
    } catch (err) { console.error(err); }
});

// --- MENYIMPAN PROYEK ASLI ---
ipcMain.on('tambah-proyek', (event, data) => {
    try {
        // 1. Simpan nama dan target proyeknya dulu
        const insertProyek = db.prepare(`INSERT INTO proyek (nama_proyek, target_tanggal) VALUES (?, ?)`).run(data.nama, data.target);
        const idBaru = insertProyek.lastInsertRowid; // Ambil ID proyek yang baru saja dibuat
        
        // 2. Simpan semua langkah-langkahnya (milestones) ke proyek tersebut
        const insertMilestone = db.prepare(`INSERT INTO milestone (id_proyek, nama_tugas) VALUES (?, ?)`);
        const insertBanyak = db.transaction((milestones) => {
            for (const ms of milestones) {
                insertMilestone.run(idBaru, ms);
            }
        });
        insertBanyak(data.milestones);
        
        event.reply('update-proyek-sukses');
    } catch (err) { console.error(err); }
});

// --- MENGHAPUS PROYEK ---
ipcMain.on('hapus-proyek', (event, idProyek) => {
    try {
        // Karena di schema kita pakai ON DELETE CASCADE, menghapus proyek otomatis menghapus semua milestone-nya
        db.prepare(`DELETE FROM proyek WHERE id_proyek = ?`).run(idProyek);
        event.reply('update-proyek-sukses');
    } catch (err) { console.error(err); }
});

ipcMain.on('update-milestone', (event, data) => {
    db.prepare(`UPDATE milestone SET is_selesai = ? WHERE id_milestone = ?`).run(data.is_selesai, data.id);
    event.reply('update-proyek-sukses');
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