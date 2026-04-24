import * as XLSX from 'xlsx';

export const GlobalData = {
    dbProgetto: [],
    dbAttivita: [],
    dbOre: [],
    dbMovimentiContabili: [],
    dbMovimentiRisorse: [],
    idxBU: -1
};

export function parseExcelFile(file, onSuccess, onError) {
    const reader = new FileReader();

    reader.onload = e => {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, {type: 'array'});

            // 1. Carica "Progetto" (Obbligatorio)
            if (!wb.Sheets["Progetto"]) throw new Error("Foglio 'Progetto' mancante.");
            const rowsProg = XLSX.utils.sheet_to_json(wb.Sheets["Progetto"], {header: 1, defval: ""});

            let hIdx = -1;
            for(let i = 0; i < 50; i++) {
                if(rowsProg[i] && String(rowsProg[i].join('')).toLowerCase().includes("dimens")) {
                    hIdx = i;
                    GlobalData.idxBU = rowsProg[i].findIndex(h => String(h).toLowerCase().includes("dimens"));
                    break;
                }
            }

            GlobalData.dbProgetto = rowsProg.slice(hIdx + 1).filter(r => {
                const id = String(r[0] || "").trim().toUpperCase();
                return id !== "" && (id.startsWith('TI') || id.startsWith('CI'));
            });

            // 2. Carica "Attività di progetto"
            if (wb.Sheets["Attività di progetto"]) {
                const rowsAtt = XLSX.utils.sheet_to_json(wb.Sheets["Attività di progetto"], {header: 1, defval: ""});
                GlobalData.dbAttivita = rowsAtt.slice(1);
            }

            // 3. Carica "Riga di pianificazione progetto"
            if (wb.Sheets["Riga di pianificazione progetto"]) {
                const rowsPian = XLSX.utils.sheet_to_json(wb.Sheets["Riga di pianificazione progetto"], {header: 1, defval: ""});
                GlobalData.dbOre = rowsPian.slice(1);
            }

            // 4. Carica "Movimenti contabili" (Nuovo)
            if (wb.Sheets["Movimenti contabili"]) {
                const rowsMovCont = XLSX.utils.sheet_to_json(wb.Sheets["Movimenti contabili"], {header: 1, defval: ""});
                GlobalData.dbMovimentiContabili = rowsMovCont.slice(1);
            } else {
                GlobalData.dbMovimentiContabili = [];
            }

            // 5. Carica "Movimenti risorse" (Nuovo)
            if (wb.Sheets["Movimenti risorse"]) {
                const rowsMovRis = XLSX.utils.sheet_to_json(wb.Sheets["Movimenti risorse"], {header: 1, defval: ""});
                GlobalData.dbMovimentiRisorse = rowsMovRis.slice(1);
            } else {
                GlobalData.dbMovimentiRisorse = [];
            }

            if (onSuccess) onSuccess();

        } catch(err) {
            if (onError) onError(err);
        }
    };

    reader.onerror = () => {
        if (onError) onError(new Error("Errore durante la lettura del file."));
    };

    reader.readAsArrayBuffer(file);
}