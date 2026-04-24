// Funzione universale per la decodifica dei valori monetari
export function parseMoney(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;

    let s = String(val).replace(/\s/g, '');

    if (s.includes(',') && s.includes('.')) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else {
        s = s.replace(',', '.');
    }

    return parseFloat(s) || 0;
}

// Funzione di utilità per formattare gli importi in Euro
export function formatEuro(v) {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(v || 0);
}