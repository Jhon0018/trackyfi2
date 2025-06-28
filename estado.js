async function fetchYahooFinancials(symbol) {
    const url = `https://trackerfolio.com:5000/api/estado/${symbol}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo obtener información financiera.");
    return await res.json();
}

function safe(val) {
    return (val !== undefined && val !== null) ? Number(val).toLocaleString() : '<span style="color:#f87171;font-weight:bold;text-shadow:0 0 6px #f87171;">N/D</span>';
}

function ratio(n, d) {
    if (n === null || n === undefined || d === null || d === undefined || d === 0) return '<span style="color:#f87171;font-weight:bold;text-shadow:0 0 6px #f87171;">N/D</span>';
    return `<span style="color:#38bdf8;font-weight:bold;text-shadow:0 0 6px #38bdf8;">${(n / d).toFixed(4)}</span>`;
}

function buildTable(fields, periods) {
    let html = `<table class="table table-sm table-bordered table-financial"><thead><tr><th>Cuenta</th>`;
    periods.forEach(p => html += `<th>${p}</th>`);
    html += `</tr></thead><tbody>`;
    fields.forEach(f => {
        html += `<tr><td>${f.label}</td>`;
        periods.forEach((p, i) => {
            html += `<td>${safe(f.values[i])}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    return html;
}

async function loadFinancials() {
    const symbol = document.getElementById('symbolInput').value.trim() || 'AAPL';
    document.getElementById('symbolTitle').textContent = symbol.toUpperCase();
    document.getElementById('ratios').innerHTML = '<div class="text-center my-4"><div class="spinner-border"></div></div>';
    document.getElementById('incomeTable').innerHTML = '';
    document.getElementById('balanceTable').innerHTML = '';
    document.getElementById('cashflowTable').innerHTML = '';

    try {
        const data = await fetchYahooFinancials(symbol);

        if (!data.incomeStatementHistory || !data.incomeStatementHistory.incomeStatementHistory || data.incomeStatementHistory.incomeStatementHistory.length === 0) {
            document.getElementById('ratios').innerHTML = `<div class="alert alert-danger fade-in">No se encontró información financiera para el símbolo <b>${symbol.toUpperCase()}</b>. Prueba con otro (ej: AAPL, MSFT, TSLA).</div>`;
            return;
        }

        // Extraer periodos (años)
        const periods = (data?.incomeStatementHistory?.incomeStatementHistory || []).map(e =>
            e.endDate ? new Date(e.endDate.raw * 1000).getFullYear() : 'N/D'
        );

        function extract(field, arr) {
            return arr.map(e => e[field]?.raw ?? null);
        }
        const incomeArr = data?.incomeStatementHistory?.incomeStatementHistory || [];
        const balanceArr = data?.balanceSheetHistory?.balanceSheetStatements || [];
        const cashArr = data?.cashflowStatementHistory?.cashflowStatements || [];

        const incomeFields = [
            { label: "Total Revenue", values: extract("totalRevenue", incomeArr) },
            { label: "Cost Of Revenue", values: extract("costOfRevenue", incomeArr) },
            { label: "Gross Profit", values: extract("grossProfit", incomeArr) },
            { label: "Operating Expense", values: extract("totalOperatingExpenses", incomeArr) },
            { label: "Operating Income", values: extract("operatingIncome", incomeArr) },
            { label: "Net Income", values: extract("netIncome", incomeArr) },
            { label: "EBITDA", values: extract("ebitda", incomeArr) },
            { label: "Basic EPS", values: extract("basicEPS", incomeArr) },
            { label: "Diluted EPS", values: extract("dilutedEPS", incomeArr) }
        ];
        const balanceFields = [
            { label: "Total Assets", values: extract("totalAssets", balanceArr) },
            { label: "Total Liab", values: extract("totalLiab", balanceArr) },
            { label: "Total Stockholder Equity", values: extract("totalStockholderEquity", balanceArr) },
            { label: "Long Term Debt", values: extract("longTermDebt", balanceArr) }
        ];
        const cashFields = [
            { label: "Total Cash From Operating Activities", values: extract("totalCashFromOperatingActivities", cashArr) },
            { label: "Total Cashflows From Investing Activities", values: extract("totalCashflowsFromInvestingActivities", cashArr) },
            { label: "Total Cash From Financing Activities", values: extract("totalCashFromFinancingActivities", cashArr) },
            { label: "Change In Cash", values: extract("changeInCash", cashArr) }
        ];

        document.getElementById('incomeTable').innerHTML = buildTable(incomeFields, periods);
        document.getElementById('balanceTable').innerHTML = buildTable(balanceFields, periods);
        document.getElementById('cashflowTable').innerHTML = buildTable(cashFields, periods);

        // Ratios
        let ratiosHTML = '';
        for (let i = 0; i < periods.length; i++) {
            const revenue = incomeFields[0].values[i];
            const net_income = incomeFields[5].values[i];
            const ebitda = incomeFields[6].values[i];
            const gross_profit = incomeFields[2].values[i];
            const total_assets = balanceFields[0].values[i];
            const total_liab = balanceFields[1].values[i];
            const equity = balanceFields[2].values[i];
            const cash_op = cashFields[0].values[i];

            ratiosHTML += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card shadow-sm ratio-card fade-in">
                    <div class="card-body">
                        <h6 class="card-title mb-2"><i class="fas fa-calendar-alt"></i> ${periods[i]}</h6>
                        <ul class="list-unstyled mb-0">
                            <li>📈 Margen Neto: ${ratio(net_income, revenue)}</li>
                            <li>📊 ROE: ${ratio(net_income, equity)}</li>
                            <li>💸 Deuda/Activos: ${ratio(total_liab, total_assets)}</li>
                            <li>🏦 Deuda/Patrimonio: ${ratio(total_liab, equity)}</li>
                            <li>🧪 Margen Bruto: ${ratio(gross_profit, revenue)}</li>
                            <li>📉 EBITDA/Ingresos: ${ratio(ebitda, revenue)}</li>
                            <li>💵 CashFlow Op/Ingresos: ${ratio(cash_op, revenue)}</li>
                        </ul>
                    </div>
                </div>
            </div>`;
        }
        document.getElementById('ratios').innerHTML = ratiosHTML || '<div class="alert alert-warning fade-in">No hay ratios disponibles.</div>';
    } catch (e) {
        document.getElementById('ratios').innerHTML = `<div class="alert alert-danger fade-in">No se pudo obtener información financiera para este símbolo.<br>${e.message}</div>`;
        document.getElementById('incomeTable').innerHTML = '';
    }
}
window.onload = loadFinancials;
