// Import the functions you need from the SDKs you need
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
        import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
        import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js';
        import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

        // Your web app's Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyBj0vG5CgWxEBrvkNBMvMU9TFcKuqLP0cc",
            authDomain: "trackyfi-317e1.firebaseapp.com",
            projectId: "trackyfi-317e1",
            storageBucket: "trackyfi-317e1.appspot.com",
            messagingSenderId: "843779589124",
            appId: "1:843779589124:web:d782b98668b1c16ce0a151",
            measurementId: "G-9DQCFXXND3"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const analytics = getAnalytics(app);
        const db = getFirestore(app);

        // Variables globales
        let isLoginMode = true;

        // Elementos del DOM
        const authButtons = document.getElementById('authButtons');
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        const authSection = document.getElementById('authSection');
        const ctaSection = document.getElementById('ctaSection');
        const authForm = document.getElementById('authForm');
        const authTitle = document.getElementById('authTitle');
        const authSubmitBtn = document.getElementById('authSubmitBtn');
        const toggleAuthBtn = document.getElementById('toggleAuthBtn');
        const alertContainer = document.getElementById('alertContainer');

        // Funciones de utilidad
        function showAlert(message, type = 'danger') {
            alertContainer.innerHTML = `
                <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }

        function toggleAuthMode() {
            isLoginMode = !isLoginMode;
            if (isLoginMode) {
                authTitle.textContent = 'Iniciar Sesión';
                authSubmitBtn.textContent = 'Iniciar Sesión';
                toggleAuthBtn.innerHTML = '¿No tienes cuenta? Regístrate';
                document.getElementById('termsContainer').classList.add('d-none');
                document.getElementById('extraFields').classList.add('d-none');
                document.getElementById('ageField').classList.add('d-none');
            } else {
                authTitle.textContent = 'Crear Cuenta';
                authSubmitBtn.textContent = 'Registrarse';
                toggleAuthBtn.innerHTML = '¿Ya tienes cuenta? Inicia sesión';
                document.getElementById('termsContainer').classList.remove('d-none');
                document.getElementById('extraFields').classList.remove('d-none');
                document.getElementById('ageField').classList.remove('d-none');
            }
            alertContainer.innerHTML = '';
        }

        function showAuthSection() {
            authSection.classList.remove('d-none');
            ctaSection.classList.add('d-none');
            authSection.scrollIntoView({ behavior: 'smooth' });
        }

        function hideAuthSection() {
            authSection.classList.add('d-none');
            ctaSection.classList.remove('d-none');
        }

        // Event listeners
        // Cuando se hace click en "Registrarse"
        document.getElementById('registerBtn').addEventListener('click', () => {
    isLoginMode = false;
    toggleAuthMode();
    showAuthSection();
});

        // Cuando se hace click en "Iniciar Sesión"
        document.getElementById('loginBtn').addEventListener('click', () => {
            isLoginMode = true;
            authTitle.textContent = 'Iniciar Sesión';
            authSubmitBtn.textContent = 'Iniciar Sesión';
            toggleAuthBtn.innerHTML = '¿No tienes cuenta? Regístrate';
            document.getElementById('termsContainer').classList.add('d-none');
            document.getElementById('extraFields').classList.add('d-none');
            document.getElementById('ageField').classList.add('d-none');
            alertContainer.innerHTML = '';
            showAuthSection();
});

        document.getElementById('getStartedBtn').addEventListener('click', () => {
            isLoginMode = false;
            toggleAuthMode();
            showAuthSection();
        });

        document.getElementById('startNowBtn').addEventListener('click', () => {
            isLoginMode = false;
            toggleAuthMode();
            showAuthSection();
        });

        // Mostrar formulario de registro
        document.getElementById('registerBtn').addEventListener('click', () => {
    isLoginMode = false;
    authTitle.textContent = 'Crear Cuenta';
    authSubmitBtn.textContent = 'Registrarse';
    toggleAuthBtn.innerHTML = '¿Ya tienes cuenta? Inicia sesión';
    document.getElementById('termsContainer').classList.remove('d-none');
    document.getElementById('extraFields').classList.remove('d-none');
    document.getElementById('ageField').classList.remove('d-none');
    alertContainer.innerHTML = '';
    showAuthSection();
});

        // Permite alternar entre login y registro desde el enlace inferior
        toggleAuthBtn.addEventListener('click', () => {
            isLoginMode = !isLoginMode;
            if (isLoginMode) {
                authTitle.textContent = 'Iniciar Sesión';
                authSubmitBtn.textContent = 'Iniciar Sesión';
                toggleAuthBtn.innerHTML = '¿No tienes cuenta? Regístrate';
                document.getElementById('termsContainer').classList.add('d-none');
                document.getElementById('extraFields').classList.add('d-none');
                document.getElementById('ageField').classList.add('d-none');
            } else {
                authTitle.textContent = 'Crear Cuenta';
                authSubmitBtn.textContent = 'Registrarse';
                toggleAuthBtn.innerHTML = '¿Ya tienes cuenta? Inicia sesión';
                document.getElementById('termsContainer').classList.remove('d-none');
                document.getElementById('extraFields').classList.remove('d-none');
                document.getElementById('ageField').classList.remove('d-none');
            }
            alertContainer.innerHTML = '';
        });

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            try {
                await signOut(auth);
                showAlert('Sesión cerrada exitosamente', 'success');
            } catch (error) {
                showAlert('Error al cerrar sesión: ' + error.message);
            }
        });

        document.getElementById('dashboardBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

        // Manejo del formulario de autenticación
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const country = document.getElementById('country').value;
            const age = document.getElementById('age').value;
            if (!isLoginMode) {
                const termsAccepted = document.getElementById('termsCheck').checked;
                if (!termsAccepted) {
                    showAlert('Debes aceptar los Términos y Condiciones para registrarte.');
                    return;
                }
                if (!country || !age) {
                    showAlert('Por favor completa todos los campos de registro.');
                    return;
                }
            }
            try {
                if (isLoginMode) {
                    await signInWithEmailAndPassword(auth, email, password);
                    // Después de autenticación exitosa con email/contraseña
                    showAlert('¡Inicio de sesión exitoso!', 'success');
                    authForm.reset();
                    hideAuthSection();
                    window.location.href = "home.html"; // <-- CAMBIA aquí a home.html
                } else {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;
                    // Guarda los datos extra en Firestore
                    await setDoc(doc(db, "users", user.uid), {
                        email: user.email,
                        pais: country,
                        edad: age,
                        creado: new Date()
                    });
                    showAlert('¡Cuenta creada exitosamente!', 'success');
                }
                
                // Limpiar formulario
                authForm.reset();
                hideAuthSection();
                
            } catch (error) {
                let errorMessage = 'Error desconocido';
                
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'Este email ya está registrado';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'La contraseña debe tener al menos 6 caracteres';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Email inválido';
                        break;
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMessage = 'Datos incorrectos. Verifica tu email y contraseña.';
                        break;
                    default:
                        errorMessage = 'Ocurrió un error. Intenta nuevamente.';
                }
                
                showAlert(errorMessage);
            }
        });

        document.getElementById('forgotPasswordBtn').addEventListener('click', () => {
    // Limpia el formulario y alertas del modal
    document.getElementById('resetEmail').value = '';
    document.getElementById('resetPasswordAlert').innerHTML = '';
    // Abre el modal
    const modal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
    modal.show();
});

        document.getElementById('googleAuthBtn').addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Verifica si el usuario ya existe en Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Si no existe, crea el documento del usuario
            await setDoc(userRef, {
                email: user.email,
                nombre: user.displayName || "",
                creado: new Date()
            });
        }

        // Después de autenticación exitosa con Google
        showAlert('¡Autenticación con Google exitosa!', 'success');
        authForm.reset();
        hideAuthSection();
        window.location.href = "home.html"; // Redirige al dashboard real
    } catch (error) {
        showAlert('No se pudo autenticar con Google. Intenta nuevamente.');
    }
});

        // Monitorear estado de autenticación
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Usuario autenticado
                authButtons.classList.add('d-none');
                userInfo.classList.remove('d-none');
                userEmail.textContent = user.email;
                hideAuthSection();
            } else {
                // Usuario no autenticado
                authButtons.classList.remove('d-none');
                userInfo.classList.add('d-none');
                hideAuthSection();
            }
        });

        // Animación suave para los elementos
        window.addEventListener('scroll', () => {
            const elements = document.querySelectorAll('.feature-card');
            elements.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                const elementVisible = 150;
                
                if (elementTop < window.innerHeight - elementVisible) {
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }
            });
        });

        document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;
    const alertDiv = document.getElementById('resetPasswordAlert');
    try {
        await sendPasswordResetEmail(auth, email);
        alertDiv.innerHTML = `<div class="alert alert-success">Se ha enviado un enlace de recuperación a tu correo.</div>`;
    } catch (error) {
        alertDiv.innerHTML = `<div class="alert alert-danger">No se pudo enviar el correo de recuperación: ${error.message}</div>`;
    }
});

// Cambiar entre modo claro y oscuro
document.getElementById('toggleThemeBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});