// File: src/renderer/js/statistik.js

let grafikInstance = null; // Dipindahkan dari renderer.js agar terisolasi

export function initStatistik() {
    window.electronAPI.receive('data-statistik', (data) => {
        // 1. Update UI Skor
        document.getElementById('teks-skor-hari-ini').innerText = `${data.skor.hariIni} Poin`;

        const elKomparasi = document.getElementById('teks-komparasi');
        const selisih = data.skor.hariIni - data.skor.kemarin;

        if (selisih > 0) {
            elKomparasi.innerHTML = `🔥 Naik <strong>${selisih} Poin</strong> dari kemarin (${data.skor.kemarin} Poin). Pertahankan!`;
            elKomparasi.style.color = "#a6e3a1"; // Hijau
        } else if (selisih < 0) {
            elKomparasi.innerHTML = `📉 Turun <strong>${Math.abs(selisih)} Poin</strong> dari kemarin (${data.skor.kemarin} Poin). Ayo kejar!`;
            elKomparasi.style.color = "#f38ba8"; // Merah
        } else {
            elKomparasi.innerHTML = `⚖️ Stabil. Sama persis dengan kemarin (${data.skor.kemarin} Poin).`;
            elKomparasi.style.color = "var(--text-secondary)";
        }

        // 2. Update Grafik Bar Chart.js
        const ctx = document.getElementById('grafik-mingguan').getContext('2d');

        // Hancurkan grafik lama jika ada
        if (grafikInstance) grafikInstance.destroy();

        grafikInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.grafik.label,
                datasets: [
                    {
                        label: 'Tugas Selesai',
                        data: data.grafik.selesai,
                        backgroundColor: '#a6e3a1',
                        borderRadius: 4
                    },
                    {
                        label: 'Belum Selesai',
                        data: data.grafik.belum,
                        backgroundColor: '#313244',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
                },
                plugins: {
                    legend: { labels: { color: '#cdd6f4' } } 
                }
            }
        });
    });
}