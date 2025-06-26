/**
 * Consulta los estados financieros de una empresa por su símbolo.
 * @param {string} symbol - El símbolo de la empresa (ej: AAPL, MSFT).
 * @returns {Promise<Object>} - Objeto con incomeStatementHistory, balanceSheetHistory y cashflowStatementHistory.
 */
async function fetchFinancialStatements(symbol) {
    // Puedes obtener una API key gratuita en financialmodelingprep.com
    const apikey = 'uJcXBH1CAZv548ID2NK2XL9rHSMblkeo'; // reemplaza 'demo' por tu API key real
    const url = `https://financialmodelingprep.com/api/v3/income-statement/${symbol}?limit=4&apikey=${apikey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo obtener información financiera.");
    return await res.json();
}

// Función para mostrar los datos en tablas
function buildTable(fields, periods) {
    let html = `<table class="table table-sm table-bordered table-financial"><thead><tr><th>Cuenta</th>`;
    periods.forEach(p => html += `<th>${p}</th>`);
    html += `</tr></thead><tbody>`;
    fields.forEach(f => {
        html += `<tr><td>${f.label}</td>`;
        periods.forEach((p, i) => {
            html += `<td>${f.values[i] !== undefined ? Number(f.values[i]).toLocaleString() : 'N/D'}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    return html;
}

// Función principal para cargar y mostrar los estados financieros
async function loadFinancials() {
    const symbol = document.getElementById('symbolInput').value.trim() || 'AAPL';
    document.getElementById('symbolTitle').textContent = symbol.toUpperCase();
    document.getElementById('ratios').innerHTML = '<div class="text-center my-4"><div class="spinner-border"></div></div>';
    document.getElementById('incomeTable').innerHTML = '';

    try {
        const data = await fetchFinancialStatements(symbol);
        if (!Array.isArray(data) || data.length === 0) throw new Error("No hay datos para este símbolo.");
        const periods = data.map(e => e.calendarYear);
        const incomeFields = [
            { label: "Ingresos Totales", values: data.map(e => e.revenue) },
            { label: "Coste de Ventas", values: data.map(e => e.costOfRevenue) },
            { label: "Beneficio Bruto", values: data.map(e => e.grossProfit) },
            { label: "Gastos Operativos", values: data.map(e => e.operatingExpenses) },
            { label: "Resultado Operativo", values: data.map(e => e.operatingIncome) },
            { label: "EBITDA", values: data.map(e => e.ebitda) },
            { label: "Resultado Neto", values: data.map(e => e.netIncome) },
            { label: "BPA Básico", values: data.map(e => e.eps) }
        ];
        document.getElementById('ratios').innerHTML = '';
        document.getElementById('incomeTable').innerHTML = buildTable(incomeFields, periods);
    } catch (e) {
        document.getElementById('ratios').innerHTML = `<div class="alert alert-danger text-center">${e.message}</div>`;
    }
}

// Haz la función global para el botón Buscar
window.loadFinancials = loadFinancials;

// Carga los datos por defecto al abrir la página
window.onload = loadFinancials;