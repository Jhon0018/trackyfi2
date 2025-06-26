import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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
let profitPieChart, profitBarChart, weightedPerformanceChartInstance = null;
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
                        callback: function(value) {
                            return value.toLocaleString('es-CO', { style: 'currency', currency: 'USD' });
                        }
                    }
                }
            }
        }
    });
}

function renderWeightedPerformanceChart(type = 'performance') {
    const ctx = document.getElementById('weightedPerformanceChart').getContext('2d');
    const labels = portfolioData.map(asset => asset.name || asset.ticker || 'Activo');
    let data = [];
    let chartLabel = '';
    let borderColor = '';
    let backgroundColor = '';

    if (type === 'performance') {
        // Rendimiento ponderado en %
        data = portfolioData.map(asset => {
            const inversion = (asset.quantity * asset.purchase_price) + (asset.commission || 0);
            if (!inversion || inversion === 0) return 0;
            return ((asset.profit || 0) / inversion) * 100;
        });
        chartLabel = 'Rendimiento Ponderado (%)';
        borderColor = '#2563eb'; // azul
        backgroundColor = 'rgba(37,99,235,0.1)';
        document.getElementById('performanceChartTitle').textContent = 'Rendimiento Ponderado (%)';
    } else {
        // Valor total de la inversión
        data = portfolioData.map(asset => asset.value ?? 0);
        chartLabel = 'Valor Total';
        borderColor = '#10b981'; // verde
        backgroundColor = 'rgba(16,185,129,0.1)';
        document.getElementById('performanceChartTitle').textContent = 'Valor Total';
    }

    // Destruir el gráfico anterior si existe
    if (weightedPerformanceChartInstance) {
        weightedPerformanceChartInstance.destroy();
    }

    weightedPerformanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: chartLabel,
                data: data,
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                tooltip: { enabled: true }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: document.body.classList.contains('dark-mode') ? '#fff' : '#18181b',
                        callback: function(value) {
                            return type === 'performance' ? value + '%' : value;
                        }
                    }
                },
                x: {
                    ticks: {
                        color: document.body.classList.contains('dark-mode') ? '#fff' : '#18181b'
                    }
                }
            }
        }
    });
}

function renderCapitalLineChart() {
    if (!window.Chart) return;

    const ctx = document.getElementById('capitalLineChart').getContext('2d');
    if (capitalLineChartInstance) capitalLineChartInstance.destroy();

    if (!portfolioData.length) {
        capitalLineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Sin datos'],
                datasets: [{
                    label: 'Evolución Capital Total',
                    data: [0],
                    fill: true,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.1)',
                    tension: 0.4,
                    pointRadius: 2,
                    pointBackgroundColor: '#2563eb'
                }]
            }
        });
        return;
    }

    // Si hay fechas, ordena por fecha; si no, usa el orden de ingreso
    let sorted = [];
    if (portfolioData.some(a => a.purchase_date)) {
        sorted = [...portfolioData]
            .filter(a => a.purchase_date)
            .sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date));
    } else {
        sorted = [...portfolioData];
    }

    let labels = [];
    let data = [];
    let acumulado = 0;

    sorted.forEach(asset => {
        const profit = (asset.profit !== null && !isNaN(asset.profit)) ? asset.profit : 0;
        acumulado += profit;
        labels.push(asset.purchase_date || asset.name);
        data.push(acumulado);
    });

    // Si sigue sin datos, muestra un punto plano
    if (data.length === 0) {
        labels = ['Sin datos'];
        data = [0];
    }

    capitalLineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Evolución Ganancia/Pérdida Acumulada',
                data: data,
                fill: true,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37,99,235,0.1)',
                tension: 0.4,
                pointRadius: 2,
                pointBackgroundColor: '#2563eb'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Fecha o Activo' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Ganancia/Pérdida Acumulada' },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('es-CO', { style: 'currency', currency: 'USD' });
                        }
                    }
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
            ? `<span class="text-danger">${asset.priceError || 'No existe'}</span>`
            : formatCurrency(asset.current_price);

        const profitValue = (asset.current_price === null || asset.current_price === undefined)
            ? `<span class="text-danger">${asset.priceError || 'No existe'}</span>`
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
                    <button class="btn btn-primary btn-sm" onclick="window.handleUpdatePriceByISIN('${asset.isin}')">
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
    renderWeightedPerformanceChart('performance');
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
        isin: formData.isin || '', // Asegúrate de guardar el ISIN aquí
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

    portfolioData.push(newAsset);
    savePortfolio();
    updateStats();
    renderPortfolio();
    showAlert('Activo agregado exitosamente', 'success');
    // Guardar en Firestore
    if (currentUserId) {
        try {
            await addDoc(collection(db, "activo"), newAsset);
        } catch (e) {
            showAlert('No se pudo guardar en la nube: ' + e.message, 'danger');
        }
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

window.editAsset = function(idx) {
    const asset = portfolioData[idx];
    if (!asset) return;
    document.getElementById('editAssetId').value = idx;
    document.getElementById('editName').value = asset.name;
    document.getElementById('editQuantity').value = asset.quantity;
    document.getElementById('editPurchasePrice').value = asset.purchase_price;
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
};

window.saveEdit = function() {
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

window.deleteAsset = function(idx) {
    if (confirm('¿Estás seguro de que deseas eliminar este activo?')) {
        portfolioData.splice(idx, 1);
        savePortfolio();
        updateStats();
        renderPortfolio();
        showAlert('Activo eliminado exitosamente', 'warning');
    }
};

window.viewDetails = function(idx) {
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
            <strong>Precio Actual:</strong> ${formatCurrency(asset.current_price)}
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
    `;
    const modal = new bootstrap.Modal(document.getElementById('viewDetailsModal'));
    document.getElementById('viewDetailsContent').innerHTML = detailsHTML;
    modal.show();
};

// Event Listeners
document.getElementById('addAssetForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    addAsset(data);
    this.reset();
});
document.getElementById('addCryptoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    addCrypto(data);
    this.reset();
});
document.getElementById('saveEditBtn').addEventListener('click', window.saveEdit);
document.getElementById('refreshBtn').addEventListener('click', function() {
    showAlert('No hay conexión a precios en tiempo real en modo local.', 'info');
});
document.getElementById('toggleDetailsAsset').addEventListener('click', function() {
    const details = document.getElementById('assetDetails');
    details.style.display = details.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('toggleDetailsCrypto').addEventListener('click', function() {
    const details = document.getElementById('cryptoDetails');
    details.style.display = details.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('toggleAssetForm').addEventListener('click', function() {
    const form = document.getElementById('assetFormContainer');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('toggleCryptoForm').addEventListener('click', function() {
    const form = document.getElementById('cryptoFormContainer');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
});

// Modo oscuro
// Botón de modo oscuro funcional en el sidebar
const toggleThemeBtn = document.getElementById('toggleThemeBtn');
const themeIcon = toggleThemeBtn.querySelector('i');

// Cargar preferencia guardada
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
    // Cambia el icono y texto
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
        // portfolioData = [];
        // renderPortfolio();
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
window.updateAssetPrice = async function(idx) {
    const asset = portfolioData[idx];
    if (!asset) return;

    let price = null;
    if (asset.type === "crypto") {
        price = await getCurrentPriceCrypto(asset.name.toLowerCase(), (asset.currency || 'usd').toLowerCase());
        if (price === null || price === undefined) {
            asset.current_price = null;
            asset.value = null;
            asset.profit = null;
            savePortfolio();
            updateStats();
            renderPortfolio();
            showAlert(`La criptomoneda "${asset.name}" no existe o el id es incorrecto.`, 'danger');
            return;
        }
    } else {
        price = await getCurrentPriceByISIN(asset.isin);
        if (price === null || price === undefined) {
            asset.current_price = null;
            asset.value = null;
            asset.profit = null;
            savePortfolio();
            updateStats();
            renderPortfolio();
            showAlert(`El activo "${asset.ticker}" no existe o el ticker es incorrecto.`, 'danger');
            return;
        }
    }

    asset.current_price = price;
    asset.value = asset.quantity * asset.current_price;
    asset.profit = asset.value - (asset.quantity * asset.purchase_price) - (asset.commission || 0);
    savePortfolio();
    updateStats();
    renderPortfolio();
    showAlert(`Precio actualizado para ${asset.name}: ${formatCurrency(price)}`, 'success');
};

window.updateAssetPriceByISIN = async function(isin) {
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
            savePortfolio();
            updateStats();
            renderPortfolio();
            showAlert(`La criptomoneda "${asset.name}" no existe o el id es incorrecto.`, 'danger');
            return;
        }
    } else {
        price = await getCurrentPriceByISIN(asset.isin);
        if (price === null || price === undefined) {
            asset.current_price = null;
            asset.value = null;
            asset.profit = null;
            savePortfolio();
            updateStats();
            renderPortfolio();
            showAlert(`El activo con ISIN "${asset.isin}" no existe o el ticker es incorrecto.`, 'danger');
            return;
        }
    }
    asset.current_price = price;
    asset.value = asset.quantity * asset.current_price;
    asset.profit = asset.value - (asset.quantity * asset.purchase_price) - (asset.commission || 0);
    savePortfolio();
    updateStats();
    renderPortfolio();
    showAlert(`Precio actualizado para ${asset.name}: ${formatCurrency(price)}`, 'success');
};

async function getCurrentPriceByISIN(isin) {
    const url = "https://api.openfigi.com/v3/mapping";
    const headers = {
        "Content-Type": "application/json",
        "X-OPENFIGI-APIKEY": "65268840c9ff36.28158167"
    };
    const body = JSON.stringify([{ idType: "ID_ISIN", idValue: isin }]);
    try {
        const res = await fetch(url, {
            method: "POST",
            headers,
            body
        });
        if (!res.ok) {
            showAlert('Error al consultar OpenFIGI: ' + res.statusText, 'danger');
            return null;
        }
        const data = await res.json();
        if (!data || !data[0] || !data[0].data || data[0].data.length === 0) {
            showAlert('OpenFIGI no devolvió datos para el ISIN ingresado.', 'warning');
            return null;
        }
        const ticker = data[0].data[0].ticker;
        const exchCode = data[0].data[0].exchCode || "US";
        if (!ticker) {
            showAlert('OpenFIGI no devolvió un ticker para el ISIN ingresado.', 'warning');
            return null;
        }

        // 1. Intenta Alpha Vantage
        let price = await getPriceByAlphaVantage(ticker, exchCode);
        if (price !== null && price !== undefined && !isNaN(price)) {
            showAlert('Precio obtenido correctamente desde Alpha Vantage.', 'success');
            return price;
        } else {
            showAlert('Alpha Vantage no devolvió precio para el ticker: ' + ticker, 'warning');
        }

        // 2. Si falla, intenta Yahoo Finance
        price = await getPriceByYahooFinance(ticker, exchCode);
        if (price !== null && price !== undefined && !isNaN(price)) {
            showAlert('Precio obtenido correctamente desde Yahoo Finance.', 'success');
            return price;
        } else {
            showAlert('Yahoo Finance no devolvió precio para el ticker: ' + ticker, 'warning');
        }

        // 3. Aquí puedes agregar más proveedores si tienes API key
        showAlert('No se pudo obtener el precio actual del activo con el ISIN proporcionado.', 'danger');
        return null;
    } catch (e) {
        showAlert('Error en la consulta de precio por ISIN: ' + (e.message || e), 'danger');
        return null;
    }
}

// Alpha Vantage
async function getPriceByAlphaVantage(ticker, exchCode = "US") {
    const apiKey = "ZRDVOJKXEOSCNTM9";
    const symbol = exchCode && exchCode !== "US" ? `${ticker}.${exchCode}` : ticker;
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data && data["Global Quote"] && data["Global Quote"]["05. price"]) {
            return parseFloat(data["Global Quote"]["05. price"]);
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Yahoo Finance (sin API key, solo para precios de referencia, puede estar limitado)
async function getPriceByYahooFinance(ticker, exchCode = "US") {
    // Yahoo Finance espera el símbolo con sufijo de exchange, por ejemplo: VWRL.L, VWRL.AS, etc.
    let symbol = ticker;
    if (exchCode && exchCode !== "US") {
        // Algunos sufijos comunes: XLON -> L, XAMS -> AS, XETR -> DE, etc.
        const map = { XLON: "L", XAMS: "AS", XETR: "DE", XNAS: "", XNYS: "" };
        const suffix = map[exchCode] !== undefined ? map[exchCode] : exchCode;
        symbol = `${ticker}.${suffix}`;
    }
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    try {
        const res = await fetch(url);
        const data = await res
        if (
            data &&
            data.quoteResponse &&
            data.quoteResponse.result &&
            data.quoteResponse.result.length > 0 &&
            data.quoteResponse.result[0].regularMarketPrice
        ) {
            return data.quoteResponse.result[0].regularMarketPrice;
        }
        return null;
    } catch (e) {
        return null;
    }
}