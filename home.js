import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Configuración Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBj0vG5CgWxEBrvkNBMvMU9TFcKuqLP0cc",
    authDomain: "trackyfi-317e1.firebaseapp.com",
    projectId: "trackyfi-317e1",
    storageBucket: "trackyfi-317e1.appspot.com",
    messagingSenderId: "843779589124",
    appId: "1:843779589124:web:d782b98668b1c16ce0a151",
    measurementId: "G-9DQCFXXND3"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =======================
// VARIABLES Y CONSTANTES
// =======================
const EOD_API_KEY = "685dbffc6fc317.12238654";
const OPENFIGI_API_KEY = "f4ae7665-74e9-41e9-bc73-3764b37f2d2d"; // <-- PON TU API KEY AQUÍ

let portfolioData = JSON.parse(localStorage.getItem('portfolioData') || '[]');
let profitPieChart = null;
let profitBarChart = null;
let ponderedDistributionChartInstance = null;

// =======================
// UTILIDADES
// =======================
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.getElementById('alertsContainer').appendChild(alertDiv);
    setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
}

// =======================
// API OPENFIGI, EODHD Y COINGECKO
// =======================
async function getTickerByISIN_OpenFIGI(isin) {
    const url = "https://api.openfigi.com/v3/mapping";
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-OPENFIGI-APIKEY": OPENFIGI_API_KEY
            },
            body: JSON.stringify([{ idType: "ID_ISIN", idValue: isin }])
        });
        const data = await res.json();
        if (data && data[0] && data[0].data && data[0].data.length > 0) {
            return data[0].data[0].ticker || data[0].data[0].compositeFIGI || null;
        } else {
            return null;
        }
    } catch (e) {
        return null;
    }
}
async function getPriceByTicker_EOD(ticker) {
    const url = `https://eodhd.com/api/real-time/${ticker}?api_token=${EOD_API_KEY}&fmt=json`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.close || null;
    } catch (e) {
        return null;
    }
}
async function getPriceByISIN_OpenFIGI_EOD(isin, fallbackTicker = null) {
    let ticker = await getTickerByISIN_OpenFIGI(isin);
    if (!ticker && fallbackTicker) ticker = fallbackTicker;
    if (!ticker) return null;
    return await getPriceByTicker_EOD(ticker);
}
async function getCurrentPriceCrypto(cryptoId, currency = 'usd') {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${currency}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data[cryptoId] ? data[cryptoId][currency] : null;
    } catch (e) {
        return null;
    }
}

// =======================
// RENDERIZADO DE PORTAFOLIO
// =======================
function renderPortfolio() {
    const container = document.getElementById("portfolioContent");
    if (!portfolioData.length) {
        container.innerHTML = `<div class="empty-portfolio">
            <i class="fas fa-chart-pie"></i>
            <h4>Tu portafolio está vacío</h4>
            <p>Comienza agregando tus primeros activos o criptomonedas</p>
        </div>`;
        updateStats();
        updateCharts();
        updateCapitalLineChart();
        updatePonderedDistributionChart && updatePonderedDistributionChart();
        return;
    }
    window.editAsset = function(idx) {
    const asset = portfolioData[idx];
    // Formulario dinámico según tipo
    let html = `
        <input type="hidden" name="idx" value="${idx}">
        <div class="mb-3">
            <label class="form-label">Nombre</label>
            <input type="text" class="form-control" name="name" value="${asset.name || asset.crypto_name || ''}" required>
        </div>
        <div class="mb-3">
            <label class="form-label">Ticker</label>
            <input type="text" class="form-control" name="ticker" value="${asset.ticker || ''}">
        </div>
        <div class="mb-3">
            <label class="form-label">Cantidad</label>
            <input type="number" step="0.00000001" class="form-control" name="quantity" value="${asset.quantity || asset.amount || ''}">
        </div>
        <div class="mb-3">
            <label class="form-label">Precio Compra</label>
            <input type="number" step="0.01" class="form-control" name="purchase_price" value="${asset.purchase_price || ''}">
        </div>
        <div class="mb-3">
            <label class="form-label">Divisa</label>
            <input type="text" class="form-control" name="currency" value="${asset.currency || ''}">
        </div>
        <div class="mb-3">
            <label class="form-label">Notas</label>
            <textarea class="form-control" name="notes">${asset.notes || ''}</textarea>
        </div>
        <div class="mb-3">
            <label class="form-label">Broker</label>
            <input type="text" class="form-control" name="broker" value="${asset.broker || ''}">
        </div>
        <div class="mb-3">
            <label class="form-label">Fecha de compra</label>
            <input type="date" class="form-control" name="purchase_date" value="${asset.purchase_date || ''}">
        </div>
    `;
    document.getElementById('editAssetModalBody').innerHTML = html;
    new bootstrap.Modal(document.getElementById('editAssetModal')).show();
};

// Guardar cambios al editar
document.getElementById('editAssetForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const form = e.target;
    const idx = parseInt(form.idx.value);
    const asset = portfolioData[idx];
    asset.name = form.name.value;
    asset.crypto_name = form.name.value; // para criptos
    asset.ticker = form.ticker.value;
    asset.quantity = parseFloat(form.quantity.value) || asset.quantity || asset.amount;
    asset.amount = asset.quantity; // para criptos/efectivo
    asset.purchase_price = parseFloat(form.purchase_price.value) || asset.purchase_price;
    asset.currency = form.currency.value;
    asset.notes = form.notes.value;
    asset.broker = form.broker.value;
    asset.purchase_date = form.purchase_date.value;
    localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
    renderPortfolio();
    bootstrap.Modal.getInstance(document.getElementById('editAssetModal')).hide();
    showAlert("Activo modificado correctamente", "success");
});
    window.deleteAsset = function(idx) {
    // Selecciona la fila correspondiente
    const row = document.querySelectorAll("#portfolioContent tbody tr")[idx];
    // Añade animación de salida (puedes usar animate.css o solo opacidad)
    row.style.transition = "opacity 0.5s";
    row.style.opacity = 0;
    setTimeout(() => {
        // Elimina el activo del array
        portfolioData.splice(idx, 1);
        localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
        renderPortfolio();
        showAlert("Activo eliminado correctamente", "success");
    }, 500);
};



window.viewDetails = function(idx) {
    const asset = portfolioData[idx];
    let html = `<ul class="list-group list-group-flush">`;
    html += `<li class="list-group-item"><strong>Nombre:</strong> ${asset.name || asset.crypto_name || "Efectivo"}</li>`;
    html += `<li class="list-group-item"><strong>Ticker:</strong> ${asset.ticker || "-"}</li>`;
    html += `<li class="list-group-item"><strong>Cantidad:</strong> ${asset.quantity || asset.amount || "-"}</li>`;
    html += `<li class="list-group-item"><strong>Precio Compra:</strong> ${asset.purchase_price ? formatCurrency(asset.purchase_price) : "-"}</li>`;
    html += `<li class="list-group-item"><strong>Precio Actual:</strong> ${asset.current_price !== undefined && asset.current_price !== null ? formatCurrency(asset.current_price) : (asset.priceError || "-")}</li>`;
    html += `<li class="list-group-item"><strong>Valor:</strong> ${asset.value !== undefined && asset.value !== null ? formatCurrency(asset.value) : "-"}</li>`;
    html += `<li class="list-group-item"><strong>Peso (%):</strong> ${
        (() => {
            const totalValue = portfolioData.reduce((sum, a) => sum + (a.value || 0), 0);
            return totalValue ? (((asset.value || 0) / totalValue) * 100).toFixed(2) : "0.00";
        })()
    }%</li>`;
    html += `<li class="list-group-item"><strong>Ganancia/Pérdida:</strong> <span class="${(asset.profit || 0) < 0 ? "text-danger" : "text-success"}">${asset.profit !== undefined && asset.profit !== null ? formatCurrency(asset.profit) : "-"}</span></li>`;
    html += `<li class="list-group-item"><strong>Divisa:</strong> ${asset.currency || "-"}</li>`;
    if(asset.notes) html += `<li class="list-group-item"><strong>Notas:</strong> ${asset.notes}</li>`;
    if(asset.broker) html += `<li class="list-group-item"><strong>Broker:</strong> ${asset.broker}</li>`;
    if(asset.purchase_date) html += `<li class="list-group-item"><strong>Fecha de compra:</strong> ${asset.purchase_date}</li>`;
    html += `</ul>`;
    document.getElementById('detailsModalBody').innerHTML = html;
    new bootstrap.Modal(document.getElementById('detailsModal')).show();
};
    // Calcular valor total para el peso
    const totalValue = portfolioData.reduce((sum, a) => sum + (a.value || 0), 0);

    let html = `<div class="table-responsive"><table class="table table-striped align-middle">
        <thead>
            <tr>
                <th>Nombre</th>
                <th>Ticker</th>
                <th>ISIN</th>
                <th>Cantidad</th>
                <th>Precio Compra</th>
                <th>Precio Actual</th>
                <th>Valor</th>
                <th>Peso (%)</th>
                <th>Ganancia/Pérdida</th>
                <th>Divisa</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>`;

    portfolioData.forEach((asset, idx) => {
        const peso = totalValue ? ((asset.value || 0) / totalValue * 100).toFixed(2) : "0.00";
        const ganancia = asset.profit || 0;
        let gananciaClass = "";
        if (asset.profit !== undefined && asset.profit !== null) {
            if (ganancia < 0) gananciaClass = 'profit-pure-red';
            else if (ganancia > 0) gananciaClass = 'profit-pure-green';
        }
        html += `<tr>
            <td>${asset.name || asset.crypto_name || "Efectivo"}</td>
            <td>${asset.ticker || "-"}</td>
            <td>${asset.isin || "-"}</td>
            <td>${asset.quantity || asset.amount || "-"}</td>
            <td>${asset.purchase_price ? formatCurrency(asset.purchase_price) : "-"}</td>
            <td>${asset.current_price !== undefined && asset.current_price !== null ? formatCurrency(asset.current_price) : (asset.priceError || "-")}</td>
            <td>${asset.value !== undefined && asset.value !== null ? formatCurrency(asset.value) : "-"}</td>
            <td>${peso}%</td>
            <td class="${gananciaClass}">${asset.profit !== undefined && asset.profit !== null ? formatCurrency(asset.profit) : "-"}</td>
            <td>${asset.currency || "-"}</td>
            <td>
                <button class="btn btn-sm btn-info me-1" onclick="viewDetails(${idx})"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-warning me-1" onclick="editAsset(${idx})"><i class="fas fa-pen"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteAsset(${idx})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });

    html += "</tbody></table></div>";
    container.innerHTML = html;

    updateStats();
    updateCharts();
    updateCapitalLineChart();
    updatePonderedDistributionChart && updatePonderedDistributionChart();
}

// =======================
// ESTADÍSTICAS Y GRÁFICAS
// =======================
function updateStats() {
    let totalValue = 0, totalInvestment = 0, totalProfit = 0;
    portfolioData.forEach(asset => {
        totalValue += asset.value || 0;
        totalInvestment += ((asset.quantity || asset.amount || 0) * (asset.purchase_price || 0));
        totalProfit += asset.profit || 0;
    });
    document.getElementById("totalValue").textContent = formatCurrency(totalValue);
    document.getElementById("totalInvestment").textContent = formatCurrency(totalInvestment);

    // Cambia el color según el valor de la ganancia/pérdida
    const totalProfitElem = document.getElementById("totalProfit");
    totalProfitElem.textContent = formatCurrency(totalProfit);
    if (totalProfit < 0) {
        totalProfitElem.style.color = "#ff0000";
        totalProfitElem.style.fontWeight = "bold";
    } else if (totalProfit > 0) {
        totalProfitElem.style.color = "#00c800";
        totalProfitElem.style.fontWeight = "bold";
    } else {
        totalProfitElem.style.color = "";
        totalProfitElem.style.fontWeight = "";
    }
}
function updateCharts() {
    // Pie Chart
    const ctxPie = document.getElementById("profitPieChart").getContext("2d");
    const ctxBar = document.getElementById("profitBarChart").getContext("2d");
    const labels = portfolioData.map(a => a.name || a.crypto_name || "");
    const profits = portfolioData.map(a => a.profit || 0);
    if (profitPieChart) profitPieChart.destroy();
    if (profitBarChart) profitBarChart.destroy();
    profitPieChart = new Chart(ctxPie, {
        type: "pie",
        data: { labels, datasets: [{ data: profits, backgroundColor: ["#4caf50", "#2196f3", "#ff9800", "#e91e63", "#9c27b0"] }] },
        options: { plugins: { legend: { display: true } } }
    });
    profitBarChart = new Chart(ctxBar, {
        type: "bar",
        data: { labels, datasets: [{ label: "Ganancia", data: profits, backgroundColor: "#4caf50" }] },
        options: { plugins: { legend: { display: false } } }
    });
}
function updatePonderedDistributionChart() {
    const ctx = document.getElementById("ponderedDistributionChart").getContext("2d");

    // Sumar valores por tipo
    let totalActivos = 0, totalCriptos = 0, totalEfectivo = 0;
    portfolioData.forEach(a => {
        if (a.type === "stock") totalActivos += a.value || 0;
        else if (a.type === "crypto") totalCriptos += a.value || 0;
        else if (a.type === "cash") totalEfectivo += a.amount || 0;
    });
    const total = totalActivos + totalCriptos + totalEfectivo;

    // Calcular porcentajes
    const data = [
        totalActivos / total * 100 || 0,
        totalCriptos / total * 100 || 0,
        totalEfectivo / total * 100 || 0
    ];

    if (ponderedDistributionChartInstance) ponderedDistributionChartInstance.destroy();
    ponderedDistributionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Activos', 'Criptomonedas', 'Efectivo'],
            datasets: [{
                label: 'Porcentaje del Portafolio',
                data: data,
                backgroundColor: ['#2196f3', '#ff9800', '#00bcd4']
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.x.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 100,
                    title: { display: true, text: 'Porcentaje (%)' }
                }
            }
        }
    });
}

// =======================
// AGREGAR ACTIVO Y CRIPTO
// =======================
document.getElementById("addAssetForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const form = e.target;
    const asset = {
        name: form.name.value,
        ticker: form.ticker.value,
        isin: form.isin.value,
        quantity: parseFloat(form.quantity.value),
        purchase_price: parseFloat(form.purchase_price.value),
        currency: form.currency.value,
        commission: parseFloat(form.commission.value) || 0,
        notes: form.notes.value,
        broker: form.broker.value,
        purchase_date: form.purchase_date.value,
        type: "stock"
    };
    portfolioData.push(asset);
    localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
    form.reset();
    await actualizarPrecioIndividual(asset); // <-- NUEVO
    renderPortfolio();
    showAlert("Activo agregado correctamente", "success");
});
document.getElementById("addCryptoForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const form = e.target;
    const [crypto_name, ticker] = form.crypto_name.value.split(",");
    const asset = {
        crypto_name: crypto_name.trim(),
        name_id: crypto_name.trim().toLowerCase().replace(" ", "-"),
        ticker: (ticker || crypto_name).trim().toUpperCase(),
        amount: parseFloat(form.crypto_quantity.value),
        purchase_price: parseFloat(form.crypto_purchase_price.value),
        currency: form.crypto_currency.value,
        commission: parseFloat(form.crypto_commission.value) || 0,
        notes: form.crypto_notes.value,
        broker: form.crypto_broker.value,
        purchase_date: form.crypto_purchase_date.value,
        type: "crypto"
    };
    portfolioData.push(asset);
    localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
    form.reset();
    renderPortfolio();
    showAlert("Criptomoneda agregada correctamente", "success");
});

// =======================
// ACTUALIZAR PRECIOS (BOTÓN)
// =======================
document.getElementById("updateAllPricesBtn").addEventListener("click", async function () {
    showAlert("Actualizando precios, por favor espera...", "info");
    for (let i = 0; i < portfolioData.length; i++) {
        const asset = portfolioData[i];
        let price = null;
        if (asset.type === "stock") {
            if (asset.isin && asset.isin.trim() !== "") {
                price = await getPriceByISIN_OpenFIGI_EOD(asset.isin, asset.ticker);
            }
            if ((price === null || price === undefined) && asset.ticker) {
                price = await getPriceByTicker_EOD(asset.ticker);
            }
        } else if (asset.type === "crypto") {
            const cryptoId = asset.name_id || asset.ticker.toLowerCase();
            price = await getCurrentPriceCrypto(cryptoId, (asset.currency || 'usd').toLowerCase());
        }
        if (price !== null && price !== undefined) {
            asset.current_price = price;
            asset.value = (asset.quantity || asset.amount) * price;
            asset.profit = asset.value - ((asset.quantity || asset.amount) * (asset.purchase_price || 0)) - (asset.commission || 0);
            asset.priceError = null;
        } else {
            asset.current_price = null;
            asset.value = null;
            asset.profit = null;
            asset.priceError = 'No se pudo obtener el precio.';
        }
    }
    localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
    renderPortfolio();
    showAlert("Precios actualizados para todos los activos.", "success");
});

// =======================
// MODO OSCURO
// =======================
document.getElementById('toggleThemeBtn').addEventListener('click', function (e) {
    e.preventDefault();
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    // Cambia texto/icono del botón si quieres
    const icon = this.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        this.querySelector('span').textContent = 'Modo Claro';
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        this.querySelector('span').textContent = 'Modo Oscuro';
    }
});

// Al cargar, aplica el tema guardado
window.addEventListener('DOMContentLoaded', () => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('toggleThemeBtn');
        if (btn) {
            const icon = btn.querySelector('i');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            btn.querySelector('span').textContent = 'Modo Claro';
        }
    }
});

// =======================
// INICIALIZACIÓN
// =======================
renderPortfolio();

// Mostrar/ocultar formulario de Agregar Activo
document.getElementById('toggleAssetForm').addEventListener('click', function () {
    const container = document.getElementById('assetFormContainer');
    container.style.display = (container.style.display === 'none' || !container.style.display) ? 'block' : 'none';
});

// Mostrar/ocultar formulario de Agregar Criptomoneda
document.getElementById('toggleCryptoForm').addEventListener('click', function () {
    const container = document.getElementById('cryptoFormContainer');
    container.style.display = (container.style.display === 'none' || !container.style.display) ? 'block' : 'none';
});

// Opcional: inicia ambos formularios ocultos
document.getElementById('assetFormContainer').style.display = 'none';
document.getElementById('cryptoFormContainer').style.display = 'none';
async function actualizarPrecioIndividual(asset) {
    let price = null;
    if (asset.type === "stock") {
        if (asset.isin && asset.isin.trim() !== "") {
            price = await getPriceByISIN_OpenFIGI_EOD(asset.isin, asset.ticker);
        }
        if ((price === null || price === undefined) && asset.ticker) {
            price = await getPriceByTicker_EOD(asset.ticker);
        }
    } else if (asset.type === "crypto") {
        const cryptoId = asset.name_id || asset.ticker.toLowerCase();
        price = await getCurrentPriceCrypto(cryptoId, (asset.currency || 'usd').toLowerCase());
    }
    if (price !== null && price !== undefined) {
        asset.current_price = price;
        asset.value = (asset.quantity || asset.amount) * price;
        asset.profit = asset.value - ((asset.quantity || asset.amount) * (asset.purchase_price || 0)) - (asset.commission || 0);
        asset.priceError = null;
    } else {
        asset.current_price = null;
        asset.value = null;
        asset.profit = null;
        asset.priceError = 'No se pudo obtener el precio.';
    }
    localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
}