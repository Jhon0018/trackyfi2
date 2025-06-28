import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Configuración real de tu proyecto
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

let currentUser = null;

// Inicializa EmailJS (asegúrate de tener el script de EmailJS en tu HTML)
if (window.emailjs) {
    emailjs.init('TU_USER_ID_DE_EMAILJS'); // Reemplaza con tu User ID de EmailJS
}

// Cargar datos del usuario al iniciar sesión
onAuthStateChanged(auth, async user => {
    if (user) {
        currentUser = user;
        // Lee los datos de Firestore
        const docSnap = await getDoc(doc(db, "usuarios", user.uid));
        let emailToSend = user.email;
        let nombreToSend = user.displayName || '';
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('userName').textContent = data.nombre || user.displayName || '';
            document.getElementById('userEmail').textContent = data.email || user.email || '';
            document.getElementById('priceAlerts').checked = !!data.priceAlerts;
            document.getElementById('newsAlerts').checked = !!data.newsAlerts;
            document.getElementById('emailAlerts').checked = !!data.emailAlerts;
            document.getElementById('suggestions').value = data.sugerencia || '';
            // Idioma
            const idioma = data.idioma || 'es';
            localStorage.setItem('idiomaPreferido', idioma);
            traducirPagina(idioma);
            emailToSend = data.email || user.email;
            nombreToSend = data.nombre || user.displayName || '';
        } else {
            document.getElementById('userName').textContent = user.displayName || '';
            document.getElementById('userEmail').textContent = user.email || '';
            traducirPagina('es');
        }

        // Guardar el correo y nombre en localStorage para uso inmediato
        localStorage.setItem('trackyfi_userEmail', emailToSend);
        localStorage.setItem('trackyfi_userName', nombreToSend);

        // Enviar correo automáticamente al iniciar sesión si ya está logeado
        if (window.emailjs) {
            emailjs.send('TU_SERVICE_ID', 'TU_TEMPLATE_ID', {
                to_email: emailToSend,
                user_name: nombreToSend
            }).then(function() {
                showConfigAlert('¡Te hemos enviado un correo de bienvenida!', 'info');
            }, function(error) {
                showConfigAlert('Error al enviar el correo: ' + error.text, 'danger');
            });
        }
    }
});

// Lógica para guardar cambios al hacer clic en el botón Guardar Cambios
document.querySelector('.btn-save').addEventListener('click', async function(e) {
    e.preventDefault();
    if (!currentUser) return;
    const data = {
        nombre: document.getElementById('userName').textContent,
        email: document.getElementById('userEmail').textContent,
        idioma: localStorage.getItem('idiomaPreferido') || 'es',
        priceAlerts: document.getElementById('priceAlerts').checked,
        newsAlerts: document.getElementById('newsAlerts').checked,
        emailAlerts: document.getElementById('emailAlerts').checked,
        sugerencia: document.getElementById('suggestions').value
    };
    await setDoc(doc(db, "usuarios", currentUser.uid), data, {merge:true});
    showConfigAlert('¡Configuración guardada correctamente!', 'success');
});

// Mostrar el selector de avatar al hacer clic en el avatar
document.getElementById('avatarImg').onclick = function() {
    document.getElementById('avatarSelector').classList.remove('d-none');
};

// Cerrar el selector de avatar
document.getElementById('closeAvatarSelector').onclick = function() {
    document.getElementById('avatarSelector').classList.add('d-none');
};

// Cambiar avatar al hacer clic en una opción
document.querySelectorAll('.avatar-option').forEach(img => {
    img.onclick = function() {
        document.getElementById('avatarImg').src = this.src;
        document.getElementById('avatarSelector').classList.add('d-none');
    };
});

// Cambiar correo electrónico (abre modal)
window.showEmailModal = function() {
    const modal = new bootstrap.Modal(document.getElementById('emailModal'));
    modal.show();
};

// Cambiar contraseña (simulación)
document.querySelectorAll('.setting-row button').forEach(btn => {
    if (btn.textContent.includes('Contraseña')) {
        btn.onclick = () => alert('Función de cambio de contraseña próximamente');
    }
});

// --- Lógica para el botón de preferencias y cambio de idioma ---

// Utilidad para mostrar alertas con el idioma seleccionado
function showConfigAlertIdioma(idioma) {
    let nombreIdioma = 'Español';
    if (idioma === 'en') nombreIdioma = 'English';
    else if (idioma === 'fr') nombreIdioma = 'Français';
    else if (idioma === 'de') nombreIdioma = 'Deutsch';

    // Crea una ventanita modal simple
    let modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '30px';
    modal.style.right = '30px';
    modal.style.background = '#18181b';
    modal.style.color = '#fff';
    modal.style.padding = '1.2rem 2rem';
    modal.style.borderRadius = '14px';
    modal.style.boxShadow = '0 4px 24px #18181b33';
    modal.style.zIndex = '9999';
    modal.style.fontSize = '1.1rem';
    modal.style.fontWeight = 'bold';
    modal.textContent = `¡Has actualizado tu idioma a ${nombreIdioma}!`;

    document.body.appendChild(modal);

    setTimeout(() => {
        modal.style.transition = 'opacity 0.5s';
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 500);
    }, 2200);
}

// Función para cambiar idioma y guardar preferencia
async function cambiarIdioma(idioma) {
    localStorage.setItem('idiomaPreferido', idioma);
    if (typeof currentUser !== 'undefined' && currentUser) {
        await setDoc(doc(db, "usuarios", currentUser.uid), { idioma }, { merge: true });
    }
    traducirPagina(idioma);
    showConfigAlertIdioma(idioma);
}

// Evento para cada opción de idioma en el dropdown
document.querySelectorAll('.idioma-opcion').forEach(btn => {
    btn.onclick = function () {
        const idioma = this.getAttribute('data-idioma');
        cambiarIdioma(idioma);
    };
});

// Al cargar la página, selecciona el idioma guardado o español por defecto
window.addEventListener('DOMContentLoaded', () => {
    const idioma = localStorage.getItem('idiomaPreferido') || 'es';
    traducirPagina(idioma);
});

// Notificaciones: switches y botones funcionales en tiempo real
const notificationSwitches = [
    { id: 'priceAlerts', key: 'trackyfi_priceAlerts', label: 'Alertas de precios' },
    { id: 'newsAlerts', key: 'trackyfi_newsAlerts', label: 'Novedades y sugerencias' },
    { id: 'emailAlerts', key: 'trackyfi_emailAlerts', label: 'Notificaciones por email' }
];

notificationSwitches.forEach(cfg => {
    const el = document.getElementById(cfg.id);
    if (el) {
        // Restaurar estado desde localStorage
        const saved = localStorage.getItem(cfg.key);
        if (saved !== null) {
            el.checked = saved === 'true';
        }
        // Guardar cambios en localStorage y mostrar feedback
        el.addEventListener('change', function() {
            localStorage.setItem(cfg.key, el.checked);
            showConfigAlert(
                `${cfg.label}: ${el.checked ? 'activado' : 'desactivado'}`,
                'success'
            );
        });
    }
});

// Botones funcionales de prueba en tiempo real
const btnTestPrice = document.getElementById('testPriceAlert');
if (btnTestPrice) btnTestPrice.onclick = function() {
    showConfigAlert('¡Alerta de precios de ejemplo!', 'info');
};
const btnTestNews = document.getElementById('testNewsAlert');
if (btnTestNews) btnTestNews.onclick = function() {
    showConfigAlert('¡Novedad o sugerencia de ejemplo!', 'info');
};
const btnTestEmail = document.getElementById('testEmailAlert');
if (btnTestEmail) btnTestEmail.onclick = function() {
    showConfigAlert('¡Notificación por email de ejemplo!', 'info');
};

// Enviar sugerencia
const btnEnviarSugerencia = document.querySelector('.suggestion-block button[data-i18n="enviar"]');
if (btnEnviarSugerencia) {
    btnEnviarSugerencia.onclick = async function() {
        if (!currentUser) return showConfigAlert('Debes iniciar sesión para enviar sugerencias.', 'danger');
        const sugerencia = document.getElementById('suggestions').value.trim();
        if (!sugerencia) {
            showConfigAlert('Por favor, escribe tu sugerencia antes de enviar.', 'warning');
            return;
        }
        // Guarda la sugerencia en Firestore
        await setDoc(doc(db, "usuarios", currentUser.uid), { sugerencia }, { merge: true });
        showConfigAlert('¡Gracias por tu sugerencia!', 'success');
    };
}

// Suscribirse a Premium
const btnSubscribe = document.getElementById('subscribeBtn');
if (btnSubscribe) {
    btnSubscribe.onclick = function() {
        showConfigAlert('¡Gracias por elegir Premium! Pronto recibirás un correo de confirmación.', 'info');
    };
}

// Cambiar email desde modal
window.saveEmail = function() {
    const newEmail = document.getElementById('newEmail').value;
    if(newEmail) {
        document.getElementById('userEmail').textContent = newEmail;
        showConfigAlert('¡Correo electrónico actualizado!', 'success');
        const emailModal = bootstrap.Modal.getInstance(document.getElementById('emailModal'));
        emailModal.hide();
    } else {
        showConfigAlert('Por favor, ingresa un correo electrónico válido.', 'danger');
    }
};

// Utilidad para mostrar alertas
function showConfigAlert(msg, type = 'success') {
    const alertDiv = document.getElementById('configAlert');
    if (!alertDiv) {
        // Si no existe el div, crea uno flotante
        let modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '30px';
        modal.style.right = '30px';
        modal.style.background = type === 'success' ? '#18181b' : (type === 'danger' ? '#dc3545' : '#ffc107');
        modal.style.color = '#fff';
        modal.style.padding = '1.2rem 2rem';
        modal.style.borderRadius = '14px';
        modal.style.boxShadow = '0 4px 24px #18181b33';
        modal.style.zIndex = '9999';
        modal.style.fontSize = '1.1rem';
        modal.style.fontWeight = 'bold';
        modal.textContent = msg;
        document.body.appendChild(modal);
        setTimeout(() => {
            modal.style.transition = 'opacity 0.5s';
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 500);
        }, 2200);
        return;
    }
    alertDiv.className = `alert alert-${type} mt-3 fade show`;
    alertDiv.textContent = msg;
    setTimeout(() => { alertDiv.className = 'alert mt-3 d-none'; }, 2500);
}

// Traducciones (corregido y simplificado)
const traducciones = {
    es: {
        'preferencias': 'Preferencias',
        'correo': 'Correo electrónico',
        'cambiar': 'Cambiar',
        'contraseña': 'Contraseña',
        'notificaciones': 'Notificaciones',
        'alertas_precios': 'Alertas de precios',
        'novedades': 'Novedades y sugerencias',
        'notificaciones_email': 'Notificaciones por email',
        'guardar': 'Guardar Cambios',
        'cerrar': 'Cerrar',
        'sugerencias': 'Sugerencias para mejorar',
        'enviar': 'Enviar',
        'premium_desc': 'Accede a análisis avanzados, alertas ilimitadas y soporte prioritario.',
        'suscribirse': 'Suscribirse',
        'datos_personales': 'Datos personales'
    },
    en: {
        'preferencias': 'Preferences',
        'correo': 'Email',
        'cambiar': 'Change',
        'contraseña': 'Password',
        'notificaciones': 'Notifications',
        'alertas_precios': 'Price alerts',
        'novedades': 'News and suggestions',
        'notificaciones_email': 'Email notifications',
        'guardar': 'Save Changes',
        'cerrar': 'Close',
        'sugerencias': 'Suggestions to improve',
        'enviar': 'Send',
        'premium_desc': 'Access advanced analytics, unlimited alerts and priority support.',
        'suscribirse': 'Subscribe',
        'datos_personales': 'Personal data'
    },
    fr: {
        'preferencias': 'Préférences',
        'correo': 'E-mail',
        'cambiar': 'Changer',
        'contraseña': 'Mot de passe',
        'notificaciones': 'Notifications',
        'alertas_precios': 'Alertes de prix',
        'novedades': 'Nouveautés et suggestions',
        'notificaciones_email': 'Notifications par e-mail',
        'guardar': 'Enregistrer les modifications',
        'cerrar': 'Fermer',
        'sugerencias': 'Suggestions pour améliorer',
        'enviar': 'Envoyer',
        'premium_desc': 'Accédez à des analyses avancées, des alertes illimitées et un support prioritaire.',
        'suscribirse': "S'abonner",
        'datos_personales': 'Données personnelles'
    },
    de: {
        'preferencias': 'Einstellungen',
        'correo': 'E-Mail',
        'cambiar': 'Ändern',
        'contraseña': 'Passwort',
        'notificaciones': 'Benachrichtigungen',
        'alertas_precios': 'Preisalarme',
        'novedades': 'Neuigkeiten und Vorschläge',
        'notificaciones_email': 'E-Mail-Benachrichtigungen',
        'guardar': 'Änderungen speichern',
        'cerrar': 'Schließen',
        'sugerencias': 'Verbesserungsvorschläge',
        'enviar': 'Senden',
        'premium_desc': 'Erhalten Sie erweiterte Analysen, unbegrenzte Alarme und bevorzugten Support.',
        'suscribirse': 'Abonnieren',
        'datos_personales': 'Persönliche Daten'
    }
};

function traducirPagina(idioma) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const clave = el.getAttribute('data-i18n');
        if (traducciones[idioma] && traducciones[idioma][clave]) {
            let textoTraducido = traducciones[idioma][clave];
            if (el.children.length > 0) {
                let textoCambiado = false;
                for (let node of el.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        node.textContent = ' ' + textoTraducido;
                        textoCambiado = true;
                        break;
                    }
                }
                if (!textoCambiado) {
                    el.appendChild(document.createTextNode(' ' + textoTraducido));
                }
            } else {
                el.textContent = textoTraducido;
            }
        }
    });
}

// Botón de modo oscuro/claro
const btnModo = document.getElementById('btnModo');
const iconModo = document.getElementById('iconModo');
const textoModo = document.getElementById('textoModo');

function setModoOscuro(activo) {
    if (activo) {
        document.body.classList.add('dark-mode');
        iconModo.classList.remove('fa-moon');
        iconModo.classList.add('fa-sun');
        textoModo.textContent = 'Modo claro';
        localStorage.setItem('modoOscuro', '1');
    } else {
        document.body.classList.remove('dark-mode');
        iconModo.classList.remove('fa-sun');
        iconModo.classList.add('fa-moon');
        textoModo.textContent = 'Modo oscuro';
        localStorage.setItem('modoOscuro', '0');
    }
}

// Inicialización según preferencia guardada
if (localStorage.getItem('modoOscuro') === '1') {
    setModoOscuro(true);
} else {
    setModoOscuro(false);
}

btnModo.onclick = function() {
    const esOscuro = !document.body.classList.contains('dark-mode');
    setModoOscuro(esOscuro);
};

document.getElementById('btnAtras').onclick = function() {
    window.location.href = 'home.html';
};