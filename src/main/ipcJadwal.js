// File: src/main/ipcJadwal.js
const { ipcMain } = require("electron");
const db = require("./database"); // Panggil database yang sudah kita pisah tadi

function initIpcJadwal() {
    // --- SIMPAN JADWAL ---
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
            event.reply('simpan-gagal', 'Gagal menyimpan: ' + error.message);
        }
    });

    // --- AMBIL JADWAL ---
    ipcMain.on('ambil-jadwal', (event, tanggalHariIni) => {
        try {
            const cekRutinitas = db.prepare(`SELECT COUNT(*) as total FROM jadwal WHERE tanggal = ? AND is_berulang = 1`).get(tanggalHariIni);
            
            if (cekRutinitas.total === 0) {
                const rutinitasList = db.prepare(`SELECT * FROM rutinitas`).all();
                if (rutinitasList.length > 0) {
                    const insertStmt = db.prepare(`
                        INSERT INTO jadwal (id_kategori, judul_aktivitas, tanggal, waktu_mulai, waktu_selesai, prioritas, status, is_berulang) 
                        VALUES (?, ?, ?, ?, ?, ?, 'To Do', 1)
                    `);
                    const insertBanyak = db.transaction((rutinitas) => {
                        for (const r of rutinitas) {
                            insertStmt.run(r.id_kategori, r.judul_aktivitas, tanggalHariIni, r.waktu_mulai, r.waktu_selesai, r.prioritas);
                        }
                    });
                    insertBanyak(rutinitasList);
                }
            }

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
            // [TAMBAHAN BARU] Beritahu UI kalau terjadi error saat mengambil data
            event.reply('simpan-gagal', 'Gagal memuat jadwal: ' + error.message); 
        }
    });

    // --- UPDATE STATUS (DRAG & DROP) ---
    ipcMain.on('update-status', (event, data) => {
        try {
            const stmt = db.prepare(`UPDATE jadwal SET status = ? WHERE id_jadwal = ?`);
            stmt.run(data.status, data.id);
            event.reply('update-sukses');
        } catch (error) {
            console.error("Gagal update status:", error);
            // [TAMBAHAN BARU]
            event.reply('simpan-gagal', 'Gagal memindahkan kartu: ' + error.message);
        }
    });

    // --- HAPUS JADWAL ---
    ipcMain.on('hapus-jadwal', (event, idJadwal) => {
        try {
            const stmt = db.prepare(`DELETE FROM jadwal WHERE id_jadwal = ?`);
            stmt.run(idJadwal);
            event.reply('update-sukses');
        } catch (error) {
            console.error("Gagal menghapus jadwal:", error);
            // [TAMBAHAN BARU]
            event.reply('simpan-gagal', 'Gagal menghapus jadwal: ' + error.message);
        }
    });

    // --- EDIT JADWAL ---
    ipcMain.on('edit-jadwal', (event, data) => {
        try {
            const stmt = db.prepare(`
                UPDATE jadwal 
                SET id_kategori = ?, judul_aktivitas = ?, tanggal = ?, waktu_mulai = ?, waktu_selesai = ?, prioritas = ?
                WHERE id_jadwal = ?
            `);
            stmt.run(data.kategoriId, data.judul, data.tanggal, data.mulai, data.selesai, data.prioritas, data.id);
            event.reply('simpan-sukses', 'Jadwal berhasil diperbarui.');
        } catch (error) {
            console.error("Gagal edit jadwal:", error);
            event.reply('simpan-gagal', 'Gagal memperbarui: ' + error.message);
        }
    });
}

// Ekspor fungsi ini agar bisa dipanggil dari main.js
module.exports = initIpcJadwal;