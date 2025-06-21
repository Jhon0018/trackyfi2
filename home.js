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
// Suponiendo que tienes un array portfolioData en localStorage:
let portfolioData = JSON.parse(localStorage.getItem('portfolioData') || '[]');
let profitPieChart, profitBarChart;

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
    const totalValue = portfolioData.reduce((sum, item) => sum + item.value, 0);
    const totalInvestment = portfolioData.reduce((sum, item) => sum + (item.quantity * item.purchase_price), 0);
    const totalProfit = totalValue - totalInvestment;

    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    document.getElementById('totalInvestment').textContent = formatCurrency(totalInvestment);

    const profitElement = document.getElementById('totalProfit');
    profitElement.textContent = formatCurrency(totalProfit);
    profitElement.className = `stat-value ${totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}`;
}

// Gráficas
function getProfitChartData() {
    const labels = [];
    const profits = [];
    const colors = [];

    portfolioData.forEach(asset => {
        labels.push(asset.name + (asset.ticker ? ` (${asset.ticker})` : ''));
        // Ganancia/pérdida = valor actual - (cantidad * precio compra) - comisión
        const profit = (asset.value || (asset.quantity * asset.current_price)) - (asset.quantity * asset.purchase_price) - (asset.commission || 0);
        profits.push(profit);
        colors.push(profit >= 0 ? '#22c55e' : '#ef4444');
    });

    return { labels, profits, colors };
}

// Renderiza la gráfica de pastel y barras
function renderProfitCharts() {
    const { labels, profits, colors } = getProfitChartData();

    // Pie Chart
    const pieCtx = document.getElementById('profitPieChart').getContext('2d');
    if (window.profitPieChart) window.profitPieChart.destroy();
    window.profitPieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: profits,
                backgroundColor: colors,
            }]
        },
        options: {
            plugins: {
                legend: { display: true }
            }
        }
    });

    // Bar Chart
    const barCtx = document.getElementById('profitBarChart').getContext('2d');
    if (window.profitBarChart) window.profitBarChart.destroy();
    window.profitBarChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ganancia/Pérdida',
                data: profits,
                backgroundColor: colors,
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

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
        tableHTML += `
            <tr>
                <td>
                    <i class="${icon} me-2"></i>
                    ${asset.name}
                </td>
                <td>${asset.ticker}</td>
                <td>${asset.quantity}</td>
                <td>${formatCurrency(asset.purchase_price)}</td>
                <td>${formatCurrency(asset.current_price)}</td>
                <td>${formatCurrency(asset.value)}</td>
                <td class="${profitClass}">${formatCurrency(asset.profit)}</td>
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
                    <button class="btn btn-danger btn-sm" onclick="window.deleteAsset(${idx})">
                        <i class="fas fa-trash"></i>
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
}

// CRUD
async function addAsset(formData) {
    const newAsset = {
        userId: currentUserId,
        name: formData.name,
        ticker: formData.ticker || 'N/A',
        type: 'stock',
        quantity: parseFloat(formData.quantity),
        purchase_price: parseFloat(formData.purchase_price),
        current_price: parseFloat(formData.purchase_price),
        currency: formData.currency || 'USD',
        purchase_date: formData.purchase_date || '',
        notes: formData.notes || '',
        commission: parseFloat(formData.commission) || 0,
        broker: formData.broker || '',
        value: 0,
        profit: 0,
        created: new Date()
    };
    newAsset.value = newAsset.quantity * newAsset.current_price;
    newAsset.profit = newAsset.value - (newAsset.quantity * newAsset.purchase_price) - newAsset.commission;
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
        current_price: parseFloat(formData.crypto_purchase_price),
        currency: formData.crypto_currency || 'USD',
        purchase_date: formData.crypto_purchase_date || '',
        notes: formData.crypto_notes || '',
        commission: parseFloat(formData.crypto_commission) || 0,
        broker: formData.crypto_broker || '',
        value: 0,
        profit: 0,
        created: new Date()
    };
    newCrypto.value = newCrypto.quantity * newCrypto.current_price;
    newCrypto.profit = newCrypto.value - (newCrypto.quantity * newCrypto.purchase_price) - newCrypto.commission;
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


document.addEventListener('DOMContentLoaded', function() {
    const toggleThemeBtn = document.getElementById('toggleThemeBtn');
    function setThemeIcon() {
        if (document.body.classList.contains('dark-mode')) {
            toggleThemeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            toggleThemeBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }
    // Aplica el modo guardado
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
    setThemeIcon();

    toggleThemeBtn.addEventListener('click', function() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        setThemeIcon();
        if (typeof showAlert === "function") {
            showAlert(isDarkMode ? 'Modo oscuro activado' : 'Modo claro activado', 'info');
        }
    });
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
renderProfitCharts();

