/**
 * Consulta los estados financieros de una empresa por su símbolo.
 * @param {string} symbol - El símbolo de la empresa (ej: AAPL, MSFT).
 * @returns {Promise<Object>} - Objeto con incomeStatementHistory, balanceSheetHistory y cashflowStatementHistory.
 */
async function fetchFinancialStatements(symbol) {
    // Usa tu nueva API key
    const apikey = 'ztETFyB0BTuJFrDu1iTDl2Yv2JywtySr';
    const url = `https://financialmodelingprep.com/api/v3/income-statement/${symbol}?limit=4&apikey=${apikey}`;
    const res = await fetch(url);
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error("No se pudo obtener información financiera. " + errorText);
    }
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

// NUEVA FUNCIÓN: Calcula y muestra el crecimiento/decrecimiento debajo de cada fila
function buildTableWithGrowth(fields, periods) {
    let html = `<table class="table table-sm table-bordered table-financial"><thead><tr><th>Cuenta</th>`;
    periods.forEach(p => html += `<th>${p}</th>`);
    html += `</tr></thead><tbody>`;
    fields.forEach((f, idx) => {
        // Fila de valores
        html += `<tr><td>${f.label}</td>`;
        periods.forEach((p, i) => {
            html += `<td>${f.values[i] !== undefined ? Number(f.values[i]).toLocaleString() : 'N/D'}</td>`;
        });
        html += `</tr>`;
        // Fila de crecimiento/decrecimiento
        html += `<tr class="growth-row"><td><strong>Evolución (%)</strong></td>`;
        periods.forEach((p, i) => {
            if (i === periods.length - 1) {
                html += `<td></td>`;
            } else {
                const actual = f.values[i];
                const siguiente = f.values[i + 1];
                if (siguiente === 0 || siguiente === undefined || actual === undefined) {
                    html += `<td></td>`;
                } else {
                    const growth = ((actual / siguiente) - 1) * 100;
                    const fixed = growth.toFixed(1);
                    if (growth > 0) {
                        html += `<td style="color:green;">▲ +${fixed}%</td>`;
                    } else if (growth < 0) {
                        html += `<td style="color:red;">▼ ${fixed}%</td>`;
                    } else {
                        html += `<td style="color:#888;">0%</td>`;
                    }
                }
            }
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    return html;
}

// Datos de ejemplo, reemplaza por tus datos en tiempo real
const balanceData = [
  { cuenta: "Activo Total", "2024": 350000, "2023": 320000, "2022": 300000 },
  { cuenta: "Efectivo y Equivalentes", "2024": 50000, "2023": 45000, "2022": 40000 },
  { cuenta: "Inventarios", "2024": 30000, "2023": 28000, "2022": 25000 },
  { cuenta: "Pasivo Total", "2024": 120000, "2023": 110000, "2022": 100000 },
  { cuenta: "Deuda a Corto Plazo", "2024": 20000, "2023": 18000, "2022": 15000 },
  { cuenta: "Patrimonio", "2024": 230000, "2023": 210000, "2022": 200000 }
];

const cashflowData = [
  { concepto: "Flujo de Caja Operativo", "2024": 40000, "2023": 38000, "2022": 35000 },
  { concepto: "Flujo de Caja de Inversión", "2024": -10000, "2023": -8000, "2022": -7000 },
  { concepto: "Flujo de Caja de Financiamiento", "2024": 5000, "2023": 4000, "2022": 3000 },
  { concepto: "Flujo de Caja Neto", "2024": 35000, "2023": 34000, "2022": 31000 }
];

// Datos de ejemplo para trimestral (puedes adaptar a tu API)
const quarterlyData = [
  { cuenta: "Activo Total", "2025Q1": 355000, "2025Q2": 357000, "2025Q3": 359000, "2025Q4": 360000 },
  { cuenta: "Efectivo y Equivalentes", "2025Q1": 51000, "2025Q2": 52000, "2025Q3": 53000, "2025Q4": 54000 },
  { cuenta: "Inventarios", "2025Q1": 31000, "2025Q2": 32000, "2025Q3": 33000, "2025Q4": 34000 },
  { cuenta: "Pasivo Total", "2025Q1": 121000, "2025Q2": 122000, "2025Q3": 123000, "2025Q4": 124000 },
  { cuenta: "Deuda a Corto Plazo", "2025Q1": 21000, "2025Q2": 22000, "2025Q3": 23000, "2025Q4": 24000 },
  { cuenta: "Patrimonio", "2025Q1": 234000, "2025Q2": 235000, "2025Q3": 236000, "2025Q4": 237000 }
];

// Función para renderizar tabla de Balance General con Evolución (%) en cada fila
function renderBalanceTable(data) {
  let html = `<table class="table table-bordered table-striped align-middle">
    <thead class="table-dark">
      <tr>
        <th>Cuenta</th>
        <th>2024</th>
        <th>2023</th>
        <th>2022</th>
      </tr>
    </thead>
    <tbody>`;
  data.forEach(row => {
    // Fila de valores
    html += `<tr>
      <td><strong>${row.cuenta}</strong></td>
      <td>$${row["2024"].toLocaleString()}</td>
      <td>$${row["2023"].toLocaleString()}</td>
      <td>$${row["2022"].toLocaleString()}</td>
    </tr>`;
    // Fila de Evolución (%)
    html += `<tr class="growth-row">
      <td><strong>Evolución (%)</strong></td>`;
    // 2024 vs 2023
    if (row["2023"] && row["2024"]) {
      const evo1 = ((row["2024"] / row["2023"] - 1) * 100).toFixed(1);
      html += `<td style="color:${evo1 >= 0 ? 'green' : 'red'};">${evo1 > 0 ? '▲' : (evo1 < 0 ? '▼' : '')} ${evo1}%</td>`;
    } else {
      html += `<td></td>`;
    }
    // 2023 vs 2022
    if (row["2022"] && row["2023"]) {
      const evo2 = ((row["2023"] / row["2022"] - 1) * 100).toFixed(1);
      html += `<td style="color:${evo2 >= 0 ? 'green' : 'red'};">${evo2 > 0 ? '▲' : (evo2 < 0 ? '▼' : '')} ${evo2}%</td>`;
    } else {
      html += `<td></td>`;
    }
    // Última columna vacía
    html += `<td></td></tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById('balanceTable').innerHTML = html;
}

// Función para renderizar tabla de Flujo de Caja con Evolución (%) en cada fila
function renderCashflowTable(data) {
  let html = `<table class="table table-bordered table-striped align-middle">
    <thead class="table-dark">
      <tr>
        <th>Concepto</th>
        <th>2024</th>
        <th>2023</th>
        <th>2022</th>
      </tr>
    </thead>
    <tbody>`;
  data.forEach(row => {
    // Fila de valores
    html += `<tr>
      <td><strong>${row.concepto}</strong></td>
      <td>$${row["2024"].toLocaleString()}</td>
      <td>$${row["2023"].toLocaleString()}</td>
      <td>$${row["2022"].toLocaleString()}</td>
    </tr>`;
    // Fila de Evolución (%)
    html += `<tr class="growth-row">
      <td><strong>Evolución (%)</strong></td>`;
    // 2024 vs 2023
    if (row["2023"] && row["2024"]) {
      const evo1 = ((row["2024"] / row["2023"] - 1) * 100).toFixed(1);
      html += `<td style="color:${evo1 >= 0 ? 'green' : 'red'};">${evo1 > 0 ? '▲' : (evo1 < 0 ? '▼' : '')} ${evo1}%</td>`;
    } else {
      html += `<td></td>`;
    }
    // 2023 vs 2022
    if (row["2022"] && row["2023"]) {
      const evo2 = ((row["2023"] / row["2022"] - 1) * 100).toFixed(1);
      html += `<td style="color:${evo2 >= 0 ? 'green' : 'red'};">${evo2 > 0 ? '▲' : (evo2 < 0 ? '▼' : '')} ${evo2}%</td>`;
    } else {
      html += `<td></td>`;
    }
    // Última columna vacía
    html += `<td></td></tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById('cashflowTable').innerHTML = html;
}

// Cambia la visión anual/trimestral
document.getElementById('viewMode').addEventListener('change', function () {
  if (this.value === "trimestral") {
    renderBalanceTableQuarterly(quarterlyData);
    // Haz lo mismo para incomeTable y cashflowTable si tienes datos trimestrales
  } else {
    renderBalanceTable(balanceData);
    // Haz lo mismo para incomeTable y cashflowTable si tienes datos anuales
  }
});

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

        // Estado de Resultados
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
        document.getElementById('incomeTable').innerHTML = buildTableWithGrowth(incomeFields, periods);
        renderMarginsTable(incomeFields, periods);

        // Balance General y Flujo de Caja en tiempo real (si los datos están en el mismo objeto)
        // Si tu API devuelve también balance y cashflow, usa esos datos aquí.
        // Si no, puedes dejar los datos de ejemplo o adaptarlo a tu API.

        // Ejemplo: si tu API devuelve balance y cashflow junto con income
        // const balanceFields = [
        //     { cuenta: "Activo Total", values: data.map(e => e.totalAssets) },
        //     ...
        // ];
        // renderBalanceTable(balanceFields);

        // const cashflowFields = [
        //     { concepto: "Flujo de Caja Operativo", values: data.map(e => e.operatingCashFlow) },
        //     ...
        // ];
        // renderCashflowTable(cashflowFields);

        // Si solo tienes datos de ejemplo, déjalos así:
        renderBalanceTable(balanceData);
        renderCashflowTable(cashflowData);

    } catch (e) {
        document.getElementById('ratios').innerHTML = `<div class="alert alert-danger text-center">${e.message}</div>`;
    }
}

// Haz la función global para el botón Buscar
window.loadFinancials = loadFinancials;

// Carga los datos por defecto al abrir la página
window.onload = loadFinancials;

// Llama a las funciones al cargar la página o cuando recibas datos nuevos
renderBalanceTable(balanceData);
renderCashflowTable(cashflowData);

// Si tienes datos en tiempo real, reemplaza balanceData y cashflowData por los datos recibidos de tu API

// Función para renderizar tabla de Balance General con Evolución (%) en cada fila y datos en tiempo real
function renderBalanceTableFromAPI(data, periods) {
  let html = `<table class="table table-bordered table-striped align-middle">
    <thead class="table-dark">
      <tr>
        <th>Cuenta</th>`;
  periods.forEach(p => html += `<th>${p}</th>`);
  html += `</tr>
    </thead>
    <tbody>`;
  data.forEach(row => {
    // Fila de valores
    html += `<tr>
      <td><strong>${row.cuenta}</strong></td>`;
    periods.forEach((p, i) => {
      html += `<td>${row.values[i] !== undefined ? Number(row.values[i]).toLocaleString() : 'N/D'}</td>`;
    });
    html += `</tr>`;
    // Fila de Evolución (%)
    html += `<tr class="growth-row">
      <td><strong>Evolución (%)</strong></td>`;
    periods.forEach((p, i) => {
      if (i === periods.length - 1) {
        html += `<td></td>`;
      } else {
        const actual = row.values[i];
        const siguiente = row.values[i + 1];
        if (siguiente === 0 || siguiente === undefined || actual === undefined) {
          html += `<td></td>`;
        } else {
          const evo = ((actual / siguiente) - 1) * 100;
          const fixed = evo.toFixed(1);
          if (evo > 0) {
            html += `<td style="color:green;">▲ +${fixed}%</td>`;
          } else if (evo < 0) {
            html += `<td style="color:red;">▼ ${fixed}%</td>`;
          } else {
            html += `<td style="color:#888;">0%</td>`;
          }
        }
      }
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById('balanceTable').innerHTML = html;
}

// Función para renderizar tabla de Flujo de Caja con Evolución (%) en cada fila y datos en tiempo real
function renderCashflowTableFromAPI(data, periods) {
  let html = `<table class="table table-bordered table-striped align-middle">
    <thead class="table-dark">
      <tr>
        <th>Concepto</th>`;
  periods.forEach(p => html += `<th>${p}</th>`);
  html += `</tr>
    </thead>
    <tbody>`;
  data.forEach(row => {
    // Fila de valores
    html += `<tr>
      <td><strong>${row.concepto}</strong></td>`;
    periods.forEach((p, i) => {
      html += `<td>${row.values[i] !== undefined ? Number(row.values[i]).toLocaleString() : 'N/D'}</td>`;
    });
    html += `</tr>`;
    // Fila de Evolución (%)
    html += `<tr class="growth-row">
      <td><strong>Evolución (%)</strong></td>`;
    periods.forEach((p, i) => {
      if (i === periods.length - 1) {
        html += `<td></td>`;
      } else {
        const actual = row.values[i];
        const siguiente = row.values[i + 1];
        if (siguiente === 0 || siguiente === undefined || actual === undefined) {
          html += `<td></td>`;
        } else {
          const evo = ((actual / siguiente) - 1) * 100;
          const fixed = evo.toFixed(1);
          if (evo > 0) {
            html += `<td style="color:green;">▲ +${fixed}%</td>`;
          } else if (evo < 0) {
            html += `<td style="color:red;">▼ ${fixed}%</td>`;
          } else {
            html += `<td style="color:#888;">0%</td>`;
          }
        }
      }
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById('cashflowTable').innerHTML = html;
}

// Función para renderizar la tabla de márgenes (% sobre Ingresos Totales) automáticamente
function renderMarginsTable(fields, periods) {
    // Busca los campos necesarios
    const ingresos = fields.find(f => f.label === "Ingresos Totales");
    const bruto = fields.find(f => f.label === "Beneficio Bruto");
    const operativo = fields.find(f => f.label === "Resultado Operativo");
    const ebitda = fields.find(f => f.label === "EBITDA");
    const neto = fields.find(f => f.label === "Resultado Neto");

    let html = `<h5 class="mt-4 neon-glow">Márgenes (% sobre Ingresos Totales)</h5>
    <table class="table table-sm table-bordered table-margins mt-2">
        <thead class="table-dark">
            <tr>
                <th>Margen</th>`;
    periods.forEach(p => html += `<th>${p}</th>`);
    html += `</tr></thead><tbody>`;

    // Helper para calcular y mostrar el margen
    function margen(val, ingresos) {
        if (val === undefined || ingresos === undefined || ingresos === 0) return 'N/D';
        return (100 * val / ingresos).toFixed(2);
    }

    // Array de márgenes a mostrar
    const margenes = [
        {
            nombre: "Margen Bruto",
            valores: bruto?.values
        },
        {
            nombre: "Margen Operativo",
            valores: operativo?.values
        },
        {
            nombre: "Margen EBITDA",
            valores: ebitda?.values
        },
        {
            nombre: "Margen Neto",
            valores: neto?.values
        }
    ];

    margenes.forEach(mg => {
        // Fila de valores
        html += `<tr>
            <td>${mg.nombre}</td>`;
        periods.forEach((_, i) => {
            const val = margen(mg.valores?.[i], ingresos?.values[i]);
            html += `<td>${val !== 'N/D' ? val + '%' : 'N/D'}</td>`;
        });
        html += `</tr>`;
        // Fila de evolución
        html += `<tr class="growth-row">
            <td><strong>Evolución (%)</strong></td>`;
        periods.forEach((_, i) => {
            if (i === periods.length - 1) {
                html += `<td></td>`;
            } else {
                const actual = margen(mg.valores?.[i], ingresos?.values[i]);
                const siguiente = margen(mg.valores?.[i + 1], ingresos?.values[i + 1]);
                if (
                    actual === 'N/D' ||
                    siguiente === 'N/D' ||
                    isNaN(Number(actual)) ||
                    isNaN(Number(siguiente)) ||
                    Number(siguiente) === 0
                ) {
                    html += `<td></td>`;
                } else {
                    const evo = ((Number(actual) / Number(siguiente)) - 1) * 100;
                    const fixed = evo.toFixed(1);
                    if (evo > 0) {
                        html += `<td style="color:green;">▲ +${fixed}%</td>`;
                    } else if (evo < 0) {
                        html += `<td style="color:red;">▼ ${fixed}%</td>`;
                    } else {
                        html += `<td style="color:#888;">0%</td>`;
                    }
                }
            }
        });
        html += `</tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('marginsTable').innerHTML = html;
}

// Llama a esta función después de mostrar la tabla de resultados:
renderMarginsTable(incomeFields, periods);
