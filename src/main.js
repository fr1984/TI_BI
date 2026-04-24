import { GlobalData, parseExcelFile } from './excelParser.js';
import { updateDashboard, setBtnFilter, resetAll, resetSearch, switchTab } from './uiManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- GESTIONE FILE E DRAG&DROP ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('fileInput');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(n => {
        dropZone.addEventListener(n, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    dropZone.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

    function handleFile(file) {
        if (!file) return;
        dropZone.innerHTML = `<h2 style="color:var(--primary);">⏳ Analisi dei Fogli in corso...</h2>`;

        setTimeout(() => {
            parseExcelFile(file, () => {
                document.getElementById('file-indicator').innerText = "DB Connesso: " + file.name;
                document.getElementById('file-indicator').style.background = "var(--success)";
                document.getElementById('drop-zone').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');

                // Popola Datalist Clienti
                const clients = [...new Set(GlobalData.dbProgetto.map(r => String(r[4]).trim()))].filter(c => c && c !== "undefined");
                document.getElementById('clientiList').innerHTML = clients.sort().map(c => `<option value="${c}">`).join('');

                updateDashboard();
            }, (err) => {
                alert("Errore: " + err.message);
                dropZone.innerHTML = `
                    <h2 style="margin: 0 0 10px 0; color: var(--primary);">📥 Trascina qui il file DB.xlsx</h2>
                    <p style="margin: 0; color: #666;">Il sistema leggerà i fogli: Progetto, Attività e Pianificazione</p>
                `;
            });
        }, 100);
    }

    // --- EVENT LISTENERS ---
    document.getElementById('btn-reset').addEventListener('click', resetAll);
    document.getElementById('btn-reset-search').addEventListener('click', resetSearch);

    document.getElementById('searchClient').addEventListener('input', updateDashboard);

    const searchID = document.getElementById('searchID');
    searchID.addEventListener('input', updateDashboard);
    searchID.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tableRows = document.getElementById('results-body').getElementsByTagName('tr');
            if (tableRows.length > 0) tableRows[0].click();
        }
    });

    // Attacca eventi ai pulsanti dei filtri
    document.querySelectorAll('.btn-filter[data-filter-key]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = btn.getAttribute('data-filter-key');
            const val = btn.getAttribute('data-filter-val');
            setBtnFilter(key, val, btn);
        });
    });

    // Attacca eventi ai tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
});