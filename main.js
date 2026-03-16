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
const dbPath = path.join(__dirname, "database.db");
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
    win.loadFile("index.html");
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