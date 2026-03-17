// File: src/main/ipcProyek.js
const { ipcMain } = require("electron");
const db = require("./database");

function initIpcProyek() {
    // --- AMBIL DATA PROYEK & MILESTONE ---
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

    // --- MENYIMPAN PROYEK BARU ---
    ipcMain.on('tambah-proyek', (event, data) => {
        try {
            // 1. Simpan nama dan target proyek
            const insertProyek = db.prepare(`INSERT INTO proyek (nama_proyek, target_tanggal) VALUES (?, ?)`).run(data.nama, data.target);
            const idBaru = insertProyek.lastInsertRowid; 
            
            // 2. Simpan semua langkah (milestones) ke proyek tersebut
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
            // ON DELETE CASCADE akan otomatis menghapus milestone terkait
            db.prepare(`DELETE FROM proyek WHERE id_proyek = ?`).run(idProyek);
            event.reply('update-proyek-sukses');
        } catch (err) { console.error(err); }
    });

    // --- UPDATE STATUS MILESTONE (CHECKBOX) ---
    ipcMain.on('update-milestone', (event, data) => {
        try {
            db.prepare(`UPDATE milestone SET is_selesai = ? WHERE id_milestone = ?`).run(data.is_selesai, data.id);
            event.reply('update-proyek-sukses');
        } catch (err) { console.error(err); }
    });
}

module.exports = initIpcProyek;