import { GlobalData } from './excelParser.js';
import { parseMoney, formatEuro } from './utils.js';

// Indici Fissi Foglio "Progetto"
const COL_ID = 0;     // A
const COL_DESC = 1;   // B
const COL_AMOUNT = 2; // C
const COL_CLIENT = 4; // E
const COL_STATUS = 9; // J

export const filters = { BU: 'ALL', Year: 'ALL', Type: 'ALL' };

export function updateDashboard() {
    const qClient = document.getElementById('searchClient').value.toLowerCase().trim();
    const qID = document.getElementById('searchID').value.toLowerCase().trim();

    const filtered = GlobalData.dbProgetto.filter(r => {
        const id = String(r[COL_ID]).toUpperCase();
        const bu = String(r[GlobalData.idxBU] || "");
        const year = (id.length >= 4) ? "20" + id.substring(2, 4) : "";
        const client = String(r[COL_CLIENT] || "").toLowerCase();

        const mBU = filters.BU === 'ALL' || bu === filters.BU;
        const mYear = filters.Year === 'ALL' || year === filters.Year;
        const mType = filters.Type === 'ALL' || id.startsWith(filters.Type);
        const mClient = qClient === "" || client.includes(qClient);
        const mID = qID === "" || id.toLowerCase().includes(qID);

        return mBU && mYear && mType && mClient && mID;
    });

    let total = 0;
    filtered.forEach(r => total += parseMoney(r[COL_AMOUNT]));
    document.getElementById('kpi-count').innerText = filtered.length;
    document.getElementById('kpi-total').innerText = formatEuro(total);

    document.getElementById('commesseList').innerHTML = filtered.map(r => `<option value="${r[COL_ID]}">`).join('');

    const resultsBody = document.getElementById('results-body');
    resultsBody.innerHTML = filtered.map(r => `
        <tr data-id="${r[COL_ID]}">
            <td style="color:var(--primary); font-weight:600;">${r[COL_ID]}</td>
            <td>${r[COL_CLIENT] || "-"}</td>
        </tr>
    `).join('');

    // Attach click event to rows
    Array.from(resultsBody.querySelectorAll('tr')).forEach(tr => {
        tr.addEventListener('click', () => loadDetail(tr.getAttribute('data-id')));
    });

    if ((qID !== "" || qClient !== "") && filtered.length === 1) {
        loadDetail(filtered[0][COL_ID]);
    }
}

export function resetSearch() {
    document.getElementById('searchClient').value = "";
    document.getElementById('searchID').value = "";
    updateDashboard();
    document.getElementById('detail-view').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');
}

export function setBtnFilter(key, val, btn) {
    filters[key] = val;
    btn.parentElement.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    resetSearch();
}

export function resetAll() {
    filters.BU = 'ALL';
    filters.Year = 'ALL';
    filters.Type = 'ALL';
    resetSearch();
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    document.querySelector('#bu-group button:nth-child(1)').classList.add('active');
    document.querySelector('#year-group button:nth-child(1)').classList.add('active');
    document.querySelector('#type-group button:nth-child(1)').classList.add('active');
    updateDashboard();
}

export function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');
}

export function loadDetail(id) {
    if (!id) return;
    const rec = GlobalData.dbProgetto.find(r => String(r[COL_ID]).trim().toUpperCase() === id);
    if (!rec) return;

    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('detail-view').classList.remove('hidden');

    document.getElementById('det-id').innerText = rec[COL_ID];
    document.getElementById('det-desc').innerText = rec[COL_DESC] || "Nessuna descrizione";
    document.getElementById('det-client').innerText = rec[COL_CLIENT] || "Cliente non specificato";
    document.getElementById('det-status').innerText = rec[COL_STATUS] || "Stato sconosciuto";

    renderPreventivo(id);
    renderConsuntivo(id);
}

function renderPreventivo(id) {
    // --- 1. ELABORAZIONE MATERIALI (Foglio: Attività di progetto) ---
    const matGroups = {};
    let matTotal = 0;

    GlobalData.dbAttivita.forEach(r => {
        if (String(r[0]).trim().toUpperCase() === id) {
            let colB = String(r[1] || "").trim();
            let colC = String(r[2] || "").trim();

            // Ignora "L15" e i gruppi che iniziano con "N"
            if (!colB.includes("L15") && !colB.startsWith("N")) {
                let cleanDesc = colB.replace('-Z', '') + " " + colC;
                let val = parseMoney(r[8]); // Colonna I

                matGroups[cleanDesc] = (matGroups[cleanDesc] || 0) + val;
                matTotal += val;
            }
        }
    });

    let matHtml = Object.keys(matGroups).map(k => `<tr><td>${k}</td><td style="text-align:right;">${formatEuro(matGroups[k])}</td></tr>`).join('');
    if (matHtml === "") matHtml = "<tr><td colspan='2' style='text-align:center; color:#999;'>Nessun materiale a preventivo</td></tr>";
    matHtml += `<tr class="total-row"><td>TOTALE MATERIALI</td><td style="text-align:right;">${formatEuro(matTotal)}</td></tr>`;
    document.getElementById('mat-body').innerHTML = matHtml;

    // --- 2. ELABORAZIONE ORE (Foglio: Riga di pianificazione progetto) ---
    const oreCategories = ['UTM', 'UTE', 'MM', 'ME', 'PC', 'PLC'];
    const oreGroups = {};
    const oreColTotals = { UTM: 0, UTE: 0, MM: 0, ME: 0, PC: 0, PLC: 0, TOTALE: 0 };

    GlobalData.dbOre.forEach(r => {
        if (String(r[0]).trim().toUpperCase() === id) {
            let colB = String(r[1] || "").trim();
            let cleanDesc = colB.replace('L15-', '').trim();

            let cat = String(r[3] || "").trim().toUpperCase();
            let ore = parseMoney(r[4]); // Legge il valore dalla Colonna E

            if (!oreGroups[cleanDesc]) {
                oreGroups[cleanDesc] = { UTM: 0, UTE: 0, MM: 0, ME: 0, PC: 0, PLC: 0, rowTotal: 0 };
            }

            if (oreCategories.includes(cat)) {
                oreGroups[cleanDesc][cat] += ore;
                oreColTotals[cat] += ore;
            }
        }
    });

    // Calcolo totali di riga e costruzione HTML dinamico della tabella
    let thead = `<tr><th>Macrogruppo</th>`;
    oreCategories.forEach(c => { thead += `<th style="text-align:right;">${c}</th>`; });
    thead += `<th style="text-align:right;">Totale Gruppo</th></tr>`;
    document.getElementById('ore-head').innerHTML = thead;

    let tbody = '';
    let keys = Object.keys(oreGroups).sort();

    if (keys.length === 0) {
        tbody = `<tr><td colspan="${oreCategories.length + 2}" style="text-align:center; color:#999;">Nessuna ora a preventivo</td></tr>`;
    } else {
        keys.forEach(k => {
            let rTot = 0;
            oreCategories.forEach(c => rTot += oreGroups[k][c]);
            oreGroups[k].rowTotal = rTot;
            oreColTotals.TOTALE += rTot;

            let row = `<tr><td>${k}</td>`;
            oreCategories.forEach(c => {
                let v = oreGroups[k][c];
                row += `<td style="text-align:right;">${v !== 0 ? Math.round(v) : ''}</td>`;
            });
            row += `<td style="text-align:right; font-weight:bold;">${Math.round(rTot)}</td></tr>`;
            tbody += row;
        });

        // Riga totali colonna
        let tfoot = `<tr class="total-row"><td>TOTALE COLONNA</td>`;
        oreCategories.forEach(c => {
            tfoot += `<td style="text-align:right;">${Math.round(oreColTotals[c])}</td>`;
        });
        tfoot += `<td style="text-align:right;">${Math.round(oreColTotals.TOTALE)}</td></tr>`;
        tbody += tfoot;
    }
    document.getElementById('ore-body').innerHTML = tbody;
}

function renderConsuntivo(id) {
    const consEmptyState = document.getElementById('cons-empty-state');
    const consContent = document.getElementById('cons-content');

    // Se non ci sono dati a consuntivo
    if (GlobalData.dbMovimentiContabili.length === 0 && GlobalData.dbMovimentiRisorse.length === 0) {
        consEmptyState.classList.remove('hidden');
        consContent.classList.add('hidden');
        return;
    }

    consEmptyState.classList.add('hidden');
    consContent.classList.remove('hidden');

    // --- 1. ELABORAZIONE MATERIALI CONSUNTIVO (Foglio: Movimenti contabili) ---
    const matGroups = {};
    let matTotal = 0;

    GlobalData.dbMovimentiContabili.forEach(r => {
        if (String(r[0]).trim().toUpperCase() === id) {
            let colB = String(r[1] || "").trim();
            let colC = String(r[2] || "").trim();

            // Ignora "L15" e i gruppi che iniziano con "N"
            if (!colB.includes("L15") && !colB.startsWith("N")) {
                let cleanDesc = colB.replace('-Z', '') + " " + colC;
                let val = parseMoney(r[8]); // Colonna I

                matGroups[cleanDesc] = (matGroups[cleanDesc] || 0) + val;
                matTotal += val;
            }
        }
    });

    let matHtml = Object.keys(matGroups).map(k => `<tr><td>${k}</td><td style="text-align:right;">${formatEuro(matGroups[k])}</td></tr>`).join('');
    if (matHtml === "") matHtml = "<tr><td colspan='2' style='text-align:center; color:#999;'>Nessun materiale a consuntivo</td></tr>";
    matHtml += `<tr class="total-row"><td>TOTALE MATERIALI</td><td style="text-align:right;">${formatEuro(matTotal)}</td></tr>`;
    document.getElementById('cons-mat-body').innerHTML = matHtml;

    // --- 2. ELABORAZIONE ORE CONSUNTIVO (Foglio: Movimenti risorse) ---
    const oreCategories = ['UTM', 'UTE', 'MM', 'ME', 'PC', 'PLC'];
    const oreGroups = {};
    const oreColTotals = { UTM: 0, UTE: 0, MM: 0, ME: 0, PC: 0, PLC: 0, TOTALE: 0 };

    GlobalData.dbMovimentiRisorse.forEach(r => {
        if (String(r[0]).trim().toUpperCase() === id) {
            let colB = String(r[1] || "").trim();
            let cleanDesc = colB.replace('L15-', '').trim();

            let cat = String(r[3] || "").trim().toUpperCase();
            let ore = parseMoney(r[4]); // Legge il valore dalla Colonna E

            if (!oreGroups[cleanDesc]) {
                oreGroups[cleanDesc] = { UTM: 0, UTE: 0, MM: 0, ME: 0, PC: 0, PLC: 0, rowTotal: 0 };
            }

            if (oreCategories.includes(cat)) {
                oreGroups[cleanDesc][cat] += ore;
                oreColTotals[cat] += ore;
            }
        }
    });

    let thead = `<tr><th>Macrogruppo</th>`;
    oreCategories.forEach(c => { thead += `<th style="text-align:right;">${c}</th>`; });
    thead += `<th style="text-align:right;">Totale Gruppo</th></tr>`;
    document.getElementById('cons-ore-head').innerHTML = thead;

    let tbody = '';
    let keys = Object.keys(oreGroups).sort();

    if (keys.length === 0) {
        tbody = `<tr><td colspan="${oreCategories.length + 2}" style="text-align:center; color:#999;">Nessuna ora a consuntivo</td></tr>`;
    } else {
        keys.forEach(k => {
            let rTot = 0;
            oreCategories.forEach(c => rTot += oreGroups[k][c]);
            oreGroups[k].rowTotal = rTot;
            oreColTotals.TOTALE += rTot;

            let row = `<tr><td>${k}</td>`;
            oreCategories.forEach(c => {
                let v = oreGroups[k][c];
                row += `<td style="text-align:right;">${v !== 0 ? Math.round(v) : ''}</td>`;
            });
            row += `<td style="text-align:right; font-weight:bold;">${Math.round(rTot)}</td></tr>`;
            tbody += row;
        });

        let tfoot = `<tr class="total-row"><td>TOTALE COLONNA</td>`;
        oreCategories.forEach(c => {
            tfoot += `<td style="text-align:right;">${Math.round(oreColTotals[c])}</td>`;
        });
        tfoot += `<td style="text-align:right;">${Math.round(oreColTotals.TOTALE)}</td></tr>`;
        tbody += tfoot;
    }
    document.getElementById('cons-ore-body').innerHTML = tbody;
}