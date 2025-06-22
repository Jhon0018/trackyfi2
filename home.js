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

        // Si el precio actual es null, muestra mensaje de error en la tabla
        const priceActual = (asset.current_price === null || asset.current_price === undefined)
            ? '<span class="text-danger">No existe</span>'
            : formatCurrency(asset.current_price);

        const profitValue = (asset.current_price === null || asset.current_price === undefined)
            ? '<span class="text-danger">No existe</span>'
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
        current_price: null, // Se actualizará abajo
        currency: formData.currency || 'USD',
        purchase_date: formData.purchase_date || '',
        notes: formData.notes || '',
        commission: parseFloat(formData.commission) || 0,
        broker: formData.broker || '',
        value: 0,
        profit: 0,
        created: new Date()
    };

    // Obtener precio actual automáticamente
    newAsset.current_price = await getCurrentPriceYahoo(newAsset.ticker);
    if (newAsset.current_price === null || newAsset.current_price === undefined) {
        newAsset.current_price = newAsset.purchase_price;
    }
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
        current_price: null, // Se actualizará abajo
        currency: formData.crypto_currency || 'USD',
        purchase_date: formData.crypto_purchase_date || '',
        notes: formData.crypto_notes || '',
        commission: parseFloat(formData.crypto_commission) || 0,
        broker: formData.crypto_broker || '',
        value: 0,
        profit: 0,
        created: new Date()
    };

    // Obtener precio actual automáticamente
    newCrypto.current_price = await getCurrentPriceCrypto(cryptoId.toLowerCase(), (newCrypto.currency || 'usd').toLowerCase());
    if (newCrypto.current_price === null || newCrypto.current_price === undefined) {
        newCrypto.current_price = newCrypto.purchase_price;
    }
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

// Para acciones (stocks)
async function getCurrentPriceYahoo(symbol) {
    const url = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?symbols=${symbol}&region=US`;
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com',
            'x-rapidapi-key': '86e6592280mshb63eb4f106fe42cp14510djsn915f913aba12'
        }
    };
    try {
        const res = await fetch(url, options);
        const data = await res.json();
        if (data?.quoteResponse?.result?.length > 0) {
            return data.quoteResponse.result[0].regularMarketPrice;
        }
        return null;
    } catch (e) {
        return null;
    }
}

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
        price = await getCurrentPriceYahoo(asset.ticker);
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