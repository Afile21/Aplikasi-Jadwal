BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "jadwal" (
	"id_jadwal"	INTEGER,
	"id_kategori"	INTEGER,
	"judul_aktivitas"	TEXT NOT NULL,
	"tanggal"	TEXT NOT NULL,
	"waktu_mulai"	TEXT NOT NULL,
	"waktu_selesai"	TEXT NOT NULL,
	"status"	TEXT DEFAULT 'Belum Mulai',
	"is_berulang"	INTEGER DEFAULT 0,
	PRIMARY KEY("id_jadwal" AUTOINCREMENT),
	FOREIGN KEY("id_kategori") REFERENCES "kategori"("id_kategori")
);
CREATE TABLE IF NOT EXISTS "kategori" (
	"id_kategori"	INTEGER,
	"nama_kategori"	TEXT NOT NULL,
	"kode_warna"	TEXT NOT NULL,
	PRIMARY KEY("id_kategori" AUTOINCREMENT)
);
COMMIT;
