import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

let currentUserId = null;
let portfolioData = JSON.parse(localStorage.getItem('portfolioData') || '[]');
let profitPieChart = null;
let profitBarChart = null;
let capitalLineChartInstance = null;

// Utilidades
function savePortfolio() {
    localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
}
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.getElementById('alertsContainer').appendChild(alertDiv);
    setTimeout(() => {
        if (alertDiv.parentNode) alertDiv.remove();
    }, 5000);
}

// Estadísticas
function updateStats() {
    const totalValue = portfolioData.reduce((sum, item) =>
        (item.value !== null && !isNaN(item.value)) ? sum + item.value : sum, 0);
    const totalInvestment = portfolioData.reduce((sum, item) =>
        (item.quantity && item.purchase_price) ? sum + (item.quantity * item.purchase_price) : sum, 0);
    const totalProfit = portfolioData.reduce((sum, item) =>
        (item.profit !== null && !isNaN(item.profit)) ? sum + item.profit : sum, 0);

    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    document.getElementById('totalInvestment').textContent = formatCurrency(totalInvestment);

    const profitElement = document.getElementById('totalProfit');
    profitElement.textContent = formatCurrency(totalProfit);
    profitElement.className = `stat-value ${totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}`;
}

// Gráficas
function renderCharts() {
    if (!window.Chart) return;
    const labels = portfolioData.map(item => item.name + (item.ticker ? ` (${item.ticker})` : ''));
    const profits = portfolioData.map(item => item.profit);
    const colors = profits.map(p => p >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)');

    // Pie Chart
    const pieCtx = document.getElementById('profitPieChart').getContext('2d');
    if (profitPieChart) profitPieChart.destroy();
    profitPieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data: profits,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                title: { display: true, text: 'Distribución de Ganancias/Pérdidas' },
                legend: { display: true, position: 'bottom' }
            }
        }
    });

    // Bar Chart
    const barCtx = document.getElementById('profitBarChart').getContext('2d');
    if (profitBarChart) profitBarChart.destroy();
    profitBarChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Ganancia/Pérdida',
                data: profits,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                title: { display: true, text: 'Ganancia/Pérdida por Activo' },
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return value.toLocaleString('es-CO', { style: 'currency', currency: 'USD' });
                        }
                    }
                }
            }
        }
    });
}

async function renderCapitalLineChart() {
    if (!window.Chart) return;

    const chartCanvas = document.getElementById('capitalLineChart');
    chartCanvas.setAttribute('role', 'img');
    chartCanvas.setAttribute('aria-label', 'Gráfica de evolución del capital total ponderado, inversión y ganancia/pérdida acumulada');

    const ctx = chartCanvas.getContext('2d');
    if (capitalLineChartInstance) capitalLineChartInstance.destroy();

    if (!portfolioData.length) {
        capitalLineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Sin datos'],
                datasets: [{
                    label: 'Capital Total Ponderado',
                    data: [0],
                    fill: true,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.1)',
                    borderWidth: 4,
                    pointRadius: 6,
                    pointBackgroundColor: '#2563eb',
                    tension: 0.4,
                    cubicInterpolationMode: 'monotone'
                }]
            },
            options: {
                plugins: {
                    legend: { display: true, labels: { font: { size: 16 }, color: '#222' } },
                    title: { display: true, text: 'Evolución del Capital Total Ponderado', font: { size: 22 }, color: '#222' },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#fff',
                        borderColor: '#2563eb',
                        borderWidth: 2,
                        titleColor: '#18181b',
                        bodyColor: '#18181b',
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toLocaleString('es-CO', { style: 'currency', currency: 'USD' })}`;
                            }
                        }
                    }
                },
                layout: {
                    padding: { left: 16, right: 16, top: 24, bottom: 16 }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Fecha o Activo', font: { size: 16 }, color: '#222' },
                        ticks: { font: { size: 14 }, color: '#222' },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'USD', font: { size: 16 }, color: '#222' },
                        ticks: {
                            font: { size: 14 },
                            color: '#222',
                            callback: function (value) {
                                return value.toLocaleString('es-CO', { style: 'currency', currency: 'USD' });
                            }
                        },
                        grid: { color: 'rgba(0,0,0,0.07)' }
                    }
                },
                elements: {
                    line: {
                        borderWidth: 4,
                        borderJoinStyle: 'round',
                        shadowOffsetX: 0,
                        shadowOffsetY: 2,
                        shadowBlur: 8,
                        shadowColor: 'rgba(37,99,235,0.15)'
                    },
                    point: {
                        radius: 7,
                        backgroundColor: '#fff',
                        borderWidth: 3,
                        borderColor: '#2563eb',
                        hoverRadius: 10,
                        hoverBorderWidth: 4
                    }
                }
            }
        });
        return;
    }

    // Ordenar por fecha de compra si existe, si no por orden de ingreso
    let sorted = [];
    if (portfolioData.some(a => a.purchase_date)) {
        sorted = [...portfolioData]
            .filter(a => a.purchase_date)
            .sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date));
    } else {
        sorted = [...portfolioData];
    }

    let labels = [];
    let capitalAcumulado = [];
    let inversionAcumulada = [];
    let gananciaAcumulada = [];
    let rendimientoAcumulado = [];
    let sumaCapital = 0;
    let sumaInversion = 0;
    let sumaGanancia = 0;

    sorted.forEach(asset => {
        const value = (asset.value !== null && !isNaN(asset.value)) ? asset.value : 0;
        const inversion = (asset.quantity && asset.purchase_price) ? (asset.quantity * asset.purchase_price) + (asset.commission || 0) : 0;
        const ganancia = (asset.profit !== null && !isNaN(asset.profit)) ? asset.profit : 0;

        sumaCapital += value;
        sumaInversion += inversion;
        sumaGanancia += ganancia;

        labels.push(asset.purchase_date || asset.name);
        capitalAcumulado.push(sumaCapital);
        inversionAcumulada.push(sumaInversion);
        gananciaAcumulada.push(sumaGanancia);

        // Calcular rendimiento acumulado (%)
        let rendimiento = 0;
        if (sumaInversion > 0) {
            rendimiento = (sumaGanancia / sumaInversion) * 100;
        }
        rendimientoAcumulado.push(rendimiento);
    });

    // === COMPARATIVA CON ÍNDICE DE REFERENCIA REAL (S&P 500) ===
    let indiceReferencia = [];
    if (labels.length > 1) {
        // Obtener fechas de tu portafolio
        let fechas = labels.map(l => l.split(' ')[0]);
        let startDate = fechas[0];
        let endDate = fechas[fechas.length - 1];

        try {
            const indiceData = await getIndiceReferenciaYahoo(startDate, endDate);
            // Normalizar el índice para que empiece en el mismo valor base que tu portafolio
            const base = capitalAcumulado[0] || 1000;
            const firstClose = indiceData[0]?.close || 1;
            for (let i = 0; i < labels.length; i++) {
                // Buscar el dato del índice para la fecha más cercana
                const fecha = fechas[i];
                const idx = indiceData.findIndex(d => d.date >= fecha);
                if (idx !== -1) {
                    indiceReferencia.push(base * (indiceData[idx].close / firstClose));
                } else {
                    indiceReferencia.push(null);
                }
            }
        } catch (e) {
            indiceReferencia = Array(labels.length).fill(null);
        }
    } else {
        indiceReferencia = Array(labels.length).fill(null);
    }

    // === AGREGADO: Cálculo de rendimiento anualizado, volatilidad y drawdown ===
    function getRendimientoAnualizado() {
        if (capitalAcumulado.length < 2) return 0;
        const inicial = inversionAcumulada[0] || 1;
        const final = capitalAcumulado[capitalAcumulado.length - 1];
        const years = (labels.length - 1) / 12 || 1; // asumiendo mensualidad
        return ((final / inicial) ** (1 / years) - 1) * 100;
    }
    function getVolatilidad() {
        if (capitalAcumulado.length < 2) return 0;
        let returns = [];
        for (let i = 1; i < capitalAcumulado.length; i++) {
            if (capitalAcumulado[i - 1] > 0) {
                returns.push((capitalAcumulado[i] - capitalAcumulado[i - 1]) / capitalAcumulado[i - 1]);
            }
        }
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        return Math.sqrt(variance) * Math.sqrt(12) * 100; // anualizada
    }
    function getMaxDrawdown() {
        let max = -Infinity, maxDrawdown = 0;
        for (let v of capitalAcumulado) {
            if (v > max) max = v;
            let drawdown = (max - v) / max;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }
        return maxDrawdown * 100;
    }

    const rendimientoAnualizado = getRendimientoAnualizado();
    const volatilidad = getVolatilidad();
    const maxDrawdown = getMaxDrawdown();

    if (labels.length === 0) {
        labels = ['Sin datos'];
        capitalAcumulado = [0];
        inversionAcumulada = [0];
        gananciaAcumulada = [0];
        rendimientoAcumulado = [0];
        indiceReferencia = [0];
    }

    capitalLineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Capital Actual Acumulado',
                    data: capitalAcumulado,
                    fill: true,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.12)',
                    borderWidth: 4,
                    pointRadius: 7,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#2563eb',
                    pointBorderWidth: 3,
                    tension: 0.4,
                    cubicInterpolationMode: 'monotone'
                },
                {
                    label: 'Inversión Acumulada',
                    data: inversionAcumulada,
                    fill: false,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    borderDash: [8, 6],
                    borderWidth: 4,
                    pointRadius: 7,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#10b981',
                    pointBorderWidth: 3,
                    tension: 0.4,
                    cubicInterpolationMode: 'monotone'
                },
                {
                    label: 'Ganancia/Pérdida Acumulada',
                    data: gananciaAcumulada,
                    fill: false,
                    borderColor: '#f59e42',
                    backgroundColor: 'rgba(245,158,66,0.08)',
                    borderDash: [4, 4],
                    borderWidth: 4,
                    pointRadius: 7,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#f59e42',
                    pointBorderWidth: 3,
                    tension: 0.4,
                    cubicInterpolationMode: 'monotone'
                },
                {
                    label: 'Rendimiento (%)',
                    data: rendimientoAcumulado,
                    fill: false,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139,92,246,0.08)',
                    borderDash: [2, 2],
                    borderWidth: 3,
                    pointRadius: 6,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#8b5cf6',
                    pointBorderWidth: 2,
                    tension: 0.4,
                    cubicInterpolationMode: 'monotone',
                    yAxisID: 'y1'
                },
                {
                    label: 'S&P 500 (Índice de referencia)',
                    data: indiceReferencia,
                    fill: false,
                    borderColor: '#111',
                    backgroundColor: 'rgba(0,0,0,0.08)',
                    borderDash: [1, 1],
                    borderWidth: 2,
                    pointRadius: 0,
                    pointBackgroundColor: '#111',
                    pointBorderColor: '#111',
                    pointBorderWidth: 1,
                    tension: 0.4,
                    cubicInterpolationMode: 'monotone',
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, labels: { font: { size: 16 }, color: '#222' } },
                title: {
                    display: true,
                    text: `Evolución del Capital Total Ponderado | Rend. anualizado: ${rendimientoAnualizado.toFixed(2)}% | Volatilidad: ${volatilidad.toFixed(2)}% | Máx. Drawdown: ${maxDrawdown.toFixed(2)}%`,
                    font: { size: 18 },
                    color: '#222'
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: '#fff',
                    borderColor: '#2563eb',
                    borderWidth: 2,
                    titleColor: '#18181b',
                    bodyColor: '#18181b',
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Rendimiento (%)') {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
                            }
                            if (context.dataset.label.includes('Índice')) {
                                return `${context.dataset.label}: ${context.parsed.y ? context.parsed.y.toLocaleString('es-CO', { style: 'currency', currency: 'USD' }) : 'Sin dato'}`;
                            }
                            return `${context.dataset.label}: ${context.parsed.y.toLocaleString('es-CO', { style: 'currency', currency: 'USD' })}`;
                        }
                    }
                }
            },
            layout: {
                padding: { left: 16, right: 16, top: 24, bottom: 16 }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Fecha o Activo', font: { size: 16 }, color: '#222' },
                    ticks: { font: { size: 14 }, color: '#222' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'USD', font: { size: 16 }, color: '#222' },
                    ticks: {
                        font: { size: 14 },
                        color: '#222',
                        callback: function (value) {
                            return value.toLocaleString('es-CO', { style: 'currency', currency: 'USD' });
                        }
                    },
                    grid: { color: 'rgba(0,0,0,0.07)' }
                },
                y1: {
                    position: 'right',
                    title: { display: true, text: 'Rendimiento (%)', font: { size: 16 }, color: '#8b5cf6' },
                    ticks: {
                        font: { size: 14 },
                        color: '#8b5cf6',
                        callback: function (value) {
                            return value.toFixed(2) + '%';
                        }
                    },
                    grid: { drawOnChartArea: false }
                }
            },
            elements: {
                line: {
                    borderWidth: 4,
                    borderJoinStyle: 'round'
                },
                point: {
                    radius: 7,
                    backgroundColor: '#fff',
                    borderWidth: 3,
                    hoverRadius: 10,
                    hoverBorderWidth: 4
                }
            }
        }
    });
}

// Portafolio
function renderPortfolio() {
    const container = document.getElementById('portfolioContent');
    if (portfolioData.length === 0) {
        container.innerHTML = `
            <div class="empty-portfolio">
                <i class="fas fa-chart-pie"></i>
                <h4>Tu portafolio está vacío</h4>
                <p>Comienza agregando tus primeros activos o criptomonedas</p>
            </div>
        `;
        renderCharts();
        return;
    }
    let tableHTML = `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Ticker</th>
                        <th>Cantidad</th>
                        <th>Precio Compra</th>
                        <th>Precio Actual</th>
                        <th>Valor</th>
                        <th>Ganancia/Pérdida</th>
                        <th>Divisa</th>
                        <th>Detalle</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    portfolioData.forEach((asset, idx) => {
        const profitClass = asset.profit >= 0 ? 'profit-positive' : 'profit-negative';
        const icon = asset.type === 'crypto' ? 'fab fa-bitcoin' : 'fas fa-chart-line';

        // Si el precio actual es null, muestra mensaje de error en la tabla
        const priceActual = (asset.current_price === null || asset.current_price === undefined)
            ? `<span class="text-danger">${asset.priceError || 'No se pudo obtener el precio. Consulta detalles.'}</span>`
            : formatCurrency(asset.current_price);

        const profitValue = (asset.current_price === null || asset.current_price === undefined)
            ? `<span class="text-danger">${asset.priceError || 'No se pudo obtener el precio. Consulta detalles.'}</span>`
            : `<span class="${profitClass}">${formatCurrency(asset.profit)}</span>`;

        tableHTML += `
            <tr>
                <td>
                    <i class="${icon} me-2"></i>
                    ${asset.name}
                </td>
                <td>${asset.ticker}</td>
                <td>${asset.quantity}</td>
                <td>${formatCurrency(asset.purchase_price)}</td>
                <td>${priceActual}</td>
                <td>${asset.current_price === null || asset.current_price === undefined ? '<span class="text-danger">No existe</span>' : formatCurrency(asset.value)}</td>
                <td>${profitValue}</td>
                <td>${asset.currency || 'USD'}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="window.viewDetails(${idx})">
                        Ver Detalle
                    </button>
                </td>
                <td>
                    <button class="btn btn-warning btn-sm me-1" onclick="window.editAsset(${idx})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm me-1" onclick="window.deleteAsset(${idx})">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="window.updateAssetPriceByISIN('${asset.isin}')">
                        <i class="fas fa-sync-alt"></i> Actualizar
                    </button>
                </td>
            </tr>
        `;
    });
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = tableHTML;
    renderCharts();
    renderCapitalLineChart();
}

// CRUD
async function addAsset(formData) {
    // Verifica si ya existe un activo con el mismo ISIN
    if (formData.isin && portfolioData.some(asset => asset.isin === formData.isin)) {
        showAlert('Ya tienes un activo con este ISIN en tu portafolio.', 'warning');
        return;
    }

    const newAsset = {
        userId: currentUserId,
        name: formData.name,
        ticker: formData.ticker || 'N/A',
        isin: formData.isin || '',
        type: 'stock',
        quantity: parseFloat(formData.quantity),
        purchase_price: parseFloat(formData.purchase_price),
        current_price: null,
        currency: formData.currency || 'USD',
        purchase_date: formData.purchase_date || '',
        notes: formData.notes || '',
        commission: parseFloat(formData.commission) || 0,
        broker: formData.broker || '',
        value: null,
        profit: null,
        created: new Date()
    };

    if (currentUserId) {
        try {
            await addDoc(collection(db, "activo"), newAsset);
            // Solo después de guardar en Firestore, actualiza el historial local
            portfolioData.push(newAsset);
            savePortfolio();
            updateStats();
            renderPortfolio();
            showAlert('Activo agregado exitosamente', 'success');
        } catch (e) {
            showAlert('No se pudo guardar en la nube: ' + e.message, 'danger');
        }
    } else {
        portfolioData.push(newAsset);
        savePortfolio();
        updateStats();
        renderPortfolio();
        showAlert('Activo agregado exitosamente', 'success');
    }
}

async function addCrypto(formData) {
    const [cryptoId, ticker] = formData.crypto_name.split(',');
    const newCrypto = {
        userId: currentUserId,
        name: cryptoId.charAt(0).toUpperCase() + cryptoId.slice(1),
        ticker: ticker?.trim() || cryptoId.toUpperCase(),
        type: 'crypto',
        quantity: parseFloat(formData.crypto_quantity),
        purchase_price: parseFloat(formData.crypto_purchase_price),
        current_price: null,
        currency: formData.crypto_currency || 'USD',
        purchase_date: formData.crypto_purchase_date || '',
        notes: formData.crypto_notes || '',
        commission: parseFloat(formData.crypto_commission) || 0,
        broker: formData.crypto_broker || '',
        value: null,
        profit: null,
        created: new Date()
    };

    portfolioData.push(newCrypto);
    savePortfolio();
    updateStats();
    renderPortfolio();
    showAlert('Criptomoneda agregada exitosamente', 'success');
    // Guardar en Firestore
    if (currentUserId) {
        try {
            await addDoc(collection(db, "cripto"), newCrypto);
        } catch (e) {
            showAlert('No se pudo guardar en la nube: ' + e.message, 'danger');
        }
    }
}

window.editAsset = function (idx) {
    const asset = portfolioData[idx];
    if (!asset) return;
    document.getElementById('editAssetId').value = idx;
    document.getElementById('editName').value = asset.name;
    document.getElementById('editQuantity').value = asset.quantity;
    document.getElementById('editPurchasePrice').value = asset.purchase_price;
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
};

window.saveEdit = function () {
    const idx = parseInt(document.getElementById('editAssetId').value);
    const asset = portfolioData[idx];
    if (!asset) return;
    asset.name = document.getElementById('editName').value;
    asset.quantity = parseFloat(document.getElementById('editQuantity').value);
    asset.purchase_price = parseFloat(document.getElementById('editPurchasePrice').value);
    asset.value = asset.quantity * asset.current_price;
    asset.profit = asset.value - (asset.quantity * asset.purchase_price);
    savePortfolio();
    updateStats();
    renderPortfolio();
    const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
    modal.hide();
    showAlert('Activo actualizado exitosamente', 'success');
};

window.deleteAsset = function (idx) {
    if (confirm('¿Estás seguro de que deseas eliminar este activo?')) {
        portfolioData.splice(idx, 1);
        savePortfolio();
        updateStats();
        renderPortfolio();
        showAlert('Activo eliminado exitosamente', 'warning');
    }
};

window.viewDetails = function (idx) {
    const asset = portfolioData[idx];
    if (!asset) return;
    let detailsHTML = `
        <div class="mb-3">
            <strong>Nombre:</strong> ${asset.name}
        </div>
        <div class="mb-3">
            <strong>Ticker:</strong> ${asset.ticker}
        </div>
        <div class="mb-3">
            <strong>ISIN:</strong> ${asset.isin || 'N/A'}
        </div>
        <div class="mb-3">
            <strong>Cantidad:</strong> ${asset.quantity}
        </div>
        <div class="mb-3">
            <strong>Precio de Compra:</strong> ${formatCurrency(asset.purchase_price)}
        </div>
        <div class="mb-3">
            <strong>Precio Actual:</strong> ${
        asset.current_price === null || asset.current_price === undefined
            ? `<span class="text-danger">${asset.priceError || 'No se pudo obtener el precio.'}</span>`
            : formatCurrency(asset.current_price)
    }
        </div>
        <div class="mb-3">
            <strong>Valor:</strong> ${formatCurrency(asset.value)}
        </div>
        <div class="mb-3">
            <strong>Ganancia/Pérdida:</strong> ${formatCurrency(asset.profit)}
        </div>
        <div class="mb-3">
            <strong>Divisa:</strong> ${asset.currency || 'USD'}
        </div>
        <div class="mb-3">
            <strong>Fecha de Compra:</strong> ${asset.purchase_date || 'N/A'}
        </div>
        <div class="mb-3">
            <strong>Notas:</strong> ${asset.notes || 'N/A'}
        </div>
        <div class="mb-3">
            <strong>Comisión:</strong> ${asset.commission ? formatCurrency(asset.commission) : formatCurrency(0)}
        </div>
        <div class="mb-3">
            <strong>Broker:</strong> ${asset.broker || 'N/A'}
        </div>
        ${asset.priceError ? `<div class="alert alert-danger mt-2">${asset.priceError}</div>` : ''}
    `;
    const modal = new bootstrap.Modal(document.getElementById('viewDetailsModal'));
    document.getElementById('viewDetailsContent').innerHTML = detailsHTML;
    modal.show();
};

// Event Listeners
document.getElementById('addAssetForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    addAsset(data);
    this.reset();
});
document.getElementById('addCryptoForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    addCrypto(data);
    this.reset();
});
document.getElementById('saveEditBtn').addEventListener('click', window.saveEdit);
document.getElementById('refreshBtn').addEventListener('click', function () {
    showAlert('No hay conexión a precios en tiempo real en modo local.', 'info');
});
document.getElementById('toggleDetailsAsset').addEventListener('click', function () {
    const details = document.getElementById('assetDetails');
    details.style.display = details.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('toggleDetailsCrypto').addEventListener('click', function () {
    const details = document.getElementById('cryptoDetails');
    details.style.display = details.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('toggleAssetForm').addEventListener('click', function () {
    const form = document.getElementById('assetFormContainer');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('toggleCryptoForm').addEventListener('click', function () {
    const form = document.getElementById('cryptoFormContainer');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
});

// Modo oscuro
const toggleThemeBtn = document.getElementById('toggleThemeBtn');
const themeIcon = toggleThemeBtn.querySelector('i');

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
    toggleThemeBtn.innerHTML = '<i class="fas fa-sun me-2"></i> Modo Claro';
}

toggleThemeBtn.addEventListener('click', function (e) {
    e.preventDefault();
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (themeIcon) {
        if (isDark) {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            toggleThemeBtn.innerHTML = '<i class="fas fa-sun me-2"></i> Modo Claro';
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            toggleThemeBtn.innerHTML = '<i class="fas fa-moon me-2"></i> Modo Oscuro';
        }
    }
});

// Cargar portafolio desde Firestore al iniciar sesión
async function loadPortfolioFromFirestore() {
    if (!currentUserId) return;
    portfolioData = [];
    // Leer activos
    const activosSnap = await getDocs(query(collection(db, "activo"), where("userId", "==", currentUserId)));
    activosSnap.forEach(docSnap => {
        const data = docSnap.data();
        data.id = docSnap.id;
        portfolioData.push(data);
    });
    // Leer criptos
    const criptoSnap = await getDocs(query(collection(db, "cripto"), where("userId", "==", currentUserId)));
    criptoSnap.forEach(docSnap => {
        const data = docSnap.data();
        data.id = docSnap.id;
        portfolioData.push(data);
    });
    savePortfolio();
    updateStats();
    renderPortfolio();
}

// Firebase Auth listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        loadPortfolioFromFirestore();
    } else {
        currentUserId = null;
    }
});

// Inicialización
updateStats();
renderPortfolio();

// Para criptomonedas (CoinGecko)
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

// Actualiza el precio y recalcula ganancia/pérdida
window.updateAssetPrice = async function (idx) {
    const asset = portfolioData[idx];
    if (!asset) return;

    let price = null;
    if (asset.type === "crypto") {
        price = await getCurrentPriceCrypto(asset.name.toLowerCase(), (asset.currency || 'usd').toLowerCase());
        if (price === null || price === undefined) {
            asset.current_price = null;
            asset.value = null;
            asset.profit = null;
            asset.priceError = 'No se encontró la criptomoneda o el id es incorrecto.';
            savePortfolio();
            updateStats();
            renderPortfolio();
            showAlert(asset.priceError, 'danger');
            return;
        }
    } else {
        price = await getPriceByISIN(asset.isin);
        if (price === null || price === undefined) {
            asset.current_price = null;
            asset.value = null;
            asset.profit = null;
            asset.priceError = 'No se encontró el activo con ese ISIN.';
            savePortfolio();
            updateStats();
            renderPortfolio();
            showAlert(asset.priceError, 'danger');
            return;
        }
    }

    asset.current_price = price;
    asset.value = asset.quantity * asset.current_price;
    asset.profit = asset.value - (asset.quantity * asset.purchase_price) - (asset.commission || 0);
    asset.priceError = null;
    savePortfolio();
    updateStats();
    renderPortfolio();
    showAlert(`Precio actualizado para ${asset.name}: ${formatCurrency(price)}`, 'success');
};

window.updateAssetPriceByISIN = async function (isin) {
    const asset = portfolioData.find(a => a.isin === isin);
    if (!asset) {
        showAlert('No se encontró el activo con ese ISIN.', 'danger');
        return;
    }

    let price = null;
    if (asset.type === "crypto") {
        price = await getCurrentPriceCrypto(asset.name.toLowerCase(), (asset.currency || 'usd').toLowerCase());
        if (price === null || price === undefined) {
            asset.current_price = null;
            asset.value = null;
            asset.profit = null;
            asset.priceError = 'No se encontró la criptomoneda o el id es incorrecto.';
            savePortfolio();
            updateStats();
            renderPortfolio();
            showAlert(asset.priceError, 'danger');
            return;
        }
    } else {
        price = await getPriceByISIN(asset.isin);
        if (price === null || price === undefined) {
            asset.current_price = null;
            asset.value = null;
            asset.profit = null;
            savePortfolio();
            updateStats();
            renderPortfolio();
            showAlert(asset.priceError || 'No se pudo obtener el precio.', 'danger');
            return;
        }
    }
    asset.current_price = price;
    asset.value = asset.quantity * asset.current_price;
    asset.profit = asset.value - (asset.quantity * asset.purchase_price) - (asset.commission || 0);
    asset.priceError = null;
    savePortfolio();
    updateStats();
    renderPortfolio();
    showAlert(`Precio actualizado para ${asset.name}: ${formatCurrency(price)}`, 'success');
};

async function getPriceByISIN(isin) {
    const url = `https://f1c2c6ea-fea4-4036-8a48-4d1e9afc1c0b-00-2u276jfqok5ja.kirk.replit.dev/api/precio_isin/${isin}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo obtener el precio para ese ISIN");
    const data = await res.json();
    return data.price;
}

async function getIndiceReferenciaYahoo(startDate, endDate) {
    // Formato de fechas: YYYY-MM-DD
    const symbol = '^GSPC'; // S&P 500
    const start = Math.floor(new Date(startDate).getTime() / 1000);
    const end = Math.floor(new Date(endDate).getTime() / 1000);
    const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${start}&period2=${end}&interval=1d&events=history&includeAdjustedClose=true`;

    const response = await fetch(url);
    const csv = await response.text();
    // Parsear CSV
    const lines = csv.split('\n').slice(1); // quitar encabezado
    const data = [];
    for (let line of lines) {
        const [date, open, high, low, close] = line.split(',');
        if (date && close && !isNaN(close)) {
            data.push({ date, close: parseFloat(close) });
        }
    }
    return data;
}

