(function () {
    'use strict';

    const state = {
        mode: 'login',
        authReady: false,
        currentUser: null,
        profile: null,
        selectedPhotoFile: null,
        aiUnsubscribe: null,
        livechatUnsubscribe: null,
        aiSeededFromDom: false,
        authSubmitting: false,
    };

    // El modulo Firebase de index.html es deferido; estas referencias se resuelven
    // al iniciar Auth para evitar capturar null durante la carga inicial.
    let db = null;
    let auth = null;
    let storage = null;

    function el(id) {
        return document.getElementById(id);
    }

    function escapeText(value) {
        return String(value || '').trim();
    }

    function safeEmailName(email) {
        const local = String(email || '').split('@')[0].replace(/[^a-z0-9_-]/gi, '');
        return local || 'osito';
    }

    function getDefaultAvatarDataUrl(seed = 'OS') {
        const label = String(seed || 'OS').slice(0, 2).toUpperCase();
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
                <defs>
                    <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
                        <stop offset="0%" stop-color="#00f2fe"/>
                        <stop offset="100%" stop-color="#9d00ff"/>
                    </linearGradient>
                </defs>
                <rect width="160" height="160" rx="40" fill="#0b1020"/>
                <circle cx="80" cy="80" r="62" fill="url(#g)" opacity="0.18"/>
                <circle cx="80" cy="80" r="46" fill="url(#g)" opacity="0.65"/>
                <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
                      font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#ffffff">${label}</text>
            </svg>
        `;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    function getAuthElements() {
        return {
            panel: el('auth-panel'),
            form: el('auth-form'),
            submit: el('auth-submit'),
            logout: el('auth-logout'),
            guest: el('auth-guest'),
            mainLogout: el('main-logout'),
            profilePhotoButton: el('profile-photo-change-button'),
            profilePhotoInput: el('profile-photo-change-input'),
            previewPhotoButton: el('auth-preview-photo-button'),
            previewPhotoInput: el('auth-preview-photo-input'),
            status: el('auth-status'),
            email: el('auth-email'),
            password: el('auth-password'),
            registerOnly: el('auth-register-only'),
            gender: el('auth-gender'),
            photoButton: el('auth-photo-button'),
            photoInput: el('auth-photo-input'),
            photoThumb: el('auth-photo-thumb'),
            previewName: el('auth-preview-name'),
            previewEmail: el('auth-preview-email'),
            avatarPreview: el('auth-avatar-preview'),
            modeButtons: document.querySelectorAll('.auth-mode-btn'),
            readyButton: el('btn-ready')
        };
    }

    function setStatus(message, tone = 'neutral') {
        const { status } = getAuthElements();
        if (!status) return;
        status.textContent = message;
        status.dataset.tone = tone;
    }

    function setGuestMode(isGuest) {
        window.ositoGuestMode = Boolean(isGuest);
        document.body.classList.toggle('guest-mode', Boolean(isGuest));
        const mainLogout = el('main-logout');
        if (mainLogout) mainLogout.style.display = isGuest ? 'inline-flex' : 'none';
    }

    function setPreview(profile, user) {
        const {
            previewName,
            previewEmail,
            avatarPreview,
            photoThumb
        } = getAuthElements();

        const isGuest = !user;
        const displayName = isGuest ? 'Invitado' : (profile?.displayName || safeEmailName(user?.email));
        const email = isGuest ? 'Inicia sesion para continuar' : (user?.email || 'Inicia sesion para continuar');
        const avatarUrl = isGuest ? getDefaultAvatarDataUrl('OS') : (profile?.photoURL || getDefaultAvatarDataUrl(profile?.gender || 'OS'));

        if (previewName) previewName.textContent = displayName;
        if (previewEmail) previewEmail.textContent = email;
        if (avatarPreview) avatarPreview.src = avatarUrl;
        if (photoThumb) photoThumb.src = avatarUrl;

        window.aiNombreActual = displayName;
        const accountName = String(user?.email || '').split('@')[0].toLowerCase();
        const profileName = String(profile?.displayName || '').toLowerCase();
        const isCreator = Boolean(user && (accountName === 'ositoyt360' || profileName === 'ositoyt360'));
        window.ositoEsCreador = isCreator;
        document.body.classList.toggle('creator-mode', isCreator);
        if (!isCreator && window.localStorage) {
            localStorage.removeItem('osito_chat_admin_key');
        }
        window.ositoCurrentUserProfile = {
            uid: user?.uid || '',
            email,
            displayName,
            gender: profile?.gender || '',
            photoURL: profile?.photoURL || ''
        };

        if (!isGuest && !localStorage.getItem('osito_ai_nombre')) {
            localStorage.setItem('osito_ai_nombre', displayName);
        }
        if (!isGuest && profile?.gender && !localStorage.getItem('osito_ai_genero')) {
            localStorage.setItem('osito_ai_genero', profile.gender);
        }

        const liveUser = document.getElementById('livechat-current-user');
        if (liveUser) liveUser.textContent = displayName;
    }

    function setMode(mode) {
        state.mode = mode === 'register' ? 'register' : 'login';
        const { submit, registerOnly, modeButtons } = getAuthElements();
        if (registerOnly) registerOnly.style.display = state.mode === 'register' ? 'grid' : 'none';
        if (submit) submit.textContent = state.mode === 'register' ? 'Crear cuenta' : 'Entrar';
        modeButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.mode === state.mode);
        });
    }

    function showUnauthenticatedView() {
        const { form, logout, guest, mainLogout, profilePhotoButton, previewPhotoButton, readyButton } = getAuthElements();
        setGuestMode(false);
        if (form) form.style.display = 'grid';
        if (logout) logout.style.display = 'none';
        if (guest) guest.style.display = 'inline-flex';
        if (mainLogout) mainLogout.style.display = 'none';
        if (profilePhotoButton) profilePhotoButton.style.display = 'none';
        if (previewPhotoButton) previewPhotoButton.style.display = 'none';
        if (readyButton) readyButton.style.display = 'none';
        setStatus('Listo para entrar.', 'neutral');
        setMode(state.mode);
        setPreview(null, null);
        window.aiNombreActual = 'Invitado';
        window.ositoCurrentUserProfile = null;
        window.ositoTutorialPendiente = false;
        state.aiSeededFromDom = false;
        state.selectedPhotoFile = null;
    }

    function showAuthenticatedView(profile, user) {
        const { form, logout, guest, mainLogout, profilePhotoButton, previewPhotoButton, readyButton } = getAuthElements();
        setGuestMode(false);
        if (form) form.style.display = 'none';
        if (logout) logout.style.display = 'inline-flex';
        if (guest) guest.style.display = 'none';
        if (mainLogout) mainLogout.style.display = 'inline-flex';
        if (profilePhotoButton) profilePhotoButton.style.display = 'inline-flex';
        if (previewPhotoButton) previewPhotoButton.style.display = 'inline-flex';
        if (readyButton) readyButton.style.display = 'inline-flex';
        setPreview(profile, user);
        setStatus(`Sesion activa: ${user?.email || 'usuario autenticado'}.`, 'success');
        if (typeof window.mostrarNotificacion === 'function') {
            window.mostrarNotificacion('Conectado: Tu cuenta se sincroniza en la nube.');
        }
    }

    function enterAsGuest() {
        state.currentUser = null;
        state.profile = null;
        state.authReady = true;
        setGuestMode(true);
        const { form, logout, guest, readyButton } = getAuthElements();
        if (form) form.style.display = 'none';
        if (logout) logout.style.display = 'inline-flex';
        if (guest) guest.style.display = 'none';
        if (readyButton) readyButton.style.display = 'inline-flex';
        setPreview(null, null);
        setStatus('Entraste como invitado. Algunas funciones estan bloqueadas.', 'neutral');
    }

    async function loadOrCreateProfile(user, fromRegister = false, registerGender = '', registerPhotoURL = '') {
        if (!db || !window.docFirebase || !window.getDocFirebase || !window.setDocFirebase) {
            return {
                displayName: safeEmailName(user.email),
                gender: registerGender || 'male',
                photoURL: registerPhotoURL || user.photoURL || '',
                tutorialSeen: fromRegister ? false : true
            };
        }

        const ref = window.docFirebase(db, 'users', user.uid);
        const snap = await window.getDocFirebase(ref);

        if (snap.exists()) {
            const data = snap.data() || {};
            return {
                uid: user.uid,
                displayName: data.displayName || safeEmailName(user.email),
                gender: data.gender || registerGender || 'male',
                photoURL: data.photoURL || user.photoURL || registerPhotoURL || '',
                tutorialSeen: Boolean(data.tutorialSeen),
                createdAt: data.createdAt || null
            };
        }

        const profile = {
            uid: user.uid,
            email: user.email || '',
            displayName: safeEmailName(user.email),
            gender: registerGender || 'male',
            photoURL: registerPhotoURL || user.photoURL || '',
            tutorialSeen: fromRegister ? false : true,
            createdAt: Date.now()
        };

        await window.setDocFirebase(ref, profile, { merge: true });
        return profile;
    }

    async function optimizeImage(file) {
        if (!file || !file.type?.startsWith('image/')) return file;
        if (file.size <= 1024 * 1024) return file;

        try {
            const bitmap = await createImageBitmap(file);
            const maxSide = 720;
            const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(bitmap.width * scale));
            canvas.height = Math.max(1, Math.round(bitmap.height * scale));
            canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);

            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
            bitmap.close();
            return blob ? new File([blob], 'profile.jpg', { type: 'image/jpeg' }) : file;
        } catch (error) {
            console.warn('[FirebaseProfilePhoto] No se pudo comprimir la imagen.', error);
            return file;
        }
    }

    async function uploadPhotoIfNeeded(user, file) {
        if (!file || !storage || !window.storageRefFirebase || !window.uploadBytesFirebase || !window.getDownloadURLFirebase) {
            return '';
        }

        const optimizedFile = await optimizeImage(file);
        const ref = window.storageRefFirebase(storage, `users/${user.uid}/profile.jpg`);
        await window.uploadBytesFirebase(ref, optimizedFile, {
            contentType: optimizedFile.type || 'image/jpeg'
        });
        return window.getDownloadURLFirebase(ref);
    }

    function renderAiMessages(messages) {
        const container = document.getElementById('ai-messages');
        if (!container) return;

        container.innerHTML = '';
        if (!messages.length) {
            return;
        }

        messages.forEach((item) => {
            const row = document.createElement('div');
            row.className = `msg ${item.role === 'user' ? 'user' : 'bot'}`;
            row.textContent = item.text || '';
            container.appendChild(row);
        });

        container.scrollTop = container.scrollHeight;
    }

    async function seedAiHistoryFromDom(uid) {
        if (state.aiSeededFromDom) return;
        if (!db || !window.collectionFirebase || !window.addDocFirebase) return;

        const container = document.getElementById('ai-messages');
        if (!container) return;

        const nodes = Array.from(container.querySelectorAll('.msg'));
        if (!nodes.length) return;

        state.aiSeededFromDom = true;
        const collectionRef = window.collectionFirebase(db, 'aiChats', uid, 'messages');

        for (const node of nodes) {
            const role = node.classList.contains('user') ? 'user' : 'bot';
            const text = escapeText(node.textContent);
            if (!text) continue;
            await window.addDocFirebase(collectionRef, {
                role,
                text,
                timestamp: Date.now()
            });
        }
    }

    async function startAiListener(uid) {
        if (!db || !window.collectionFirebase || !window.queryFirebase || !window.orderByFirebase || !window.limitFirebase || !window.onSnapshotFirebase) {
            return;
        }

        if (typeof state.aiUnsubscribe === 'function') {
            state.aiUnsubscribe();
            state.aiUnsubscribe = null;
        }

        const collectionRef = window.collectionFirebase(db, 'aiChats', uid, 'messages');
        const queryRef = window.queryFirebase(
            collectionRef,
            window.orderByFirebase('timestamp'),
            window.limitFirebase(80)
        );

        state.aiUnsubscribe = window.onSnapshotFirebase(queryRef, async (snapshot) => {
            const messages = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data() || {};
                messages.push({
                    id: docSnap.id,
                    role: data.role === 'user' ? 'user' : 'bot',
                    text: data.text || '',
                    timestamp: Number(data.timestamp) || Date.now()
                });
            });

            if (!messages.length) {
                await seedAiHistoryFromDom(uid);
                return;
            }

            renderAiMessages(messages);
        });
    }

    function startLiveChatListener() {
        if (!db || !window.collectionFirebase || !window.onSnapshotFirebase) return;

        if (typeof state.livechatUnsubscribe === 'function') {
            state.livechatUnsubscribe();
            state.livechatUnsubscribe = null;
        }

        state.livechatUnsubscribe = window.onSnapshotFirebase(
            window.collectionFirebase(db, 'livechat'),
            (snapshot) => {
                const messages = [];
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data() || {};
                    const timestamp = data.timestamp?.toMillis
                        ? data.timestamp.toMillis()
                        : (Number(data.timestamp) || Date.now());
                    messages.push({
                        id: docSnap.id,
                        user: data.user || 'Invitado',
                        text: data.text || '',
                        timestamp,
                        uid: data.uid || '',
                        email: data.email || '',
                        photoURL: data.photoURL || (data.uid === state.currentUser?.uid ? state.profile?.photoURL || '' : ''),
                        isCreator: Boolean(data.isCreator),
                        isSystem: Boolean(data.isSystem),
                        isAdmin: Boolean(data.isAdmin)
                    });
                });

                messages.sort((a, b) => a.timestamp - b.timestamp);
                window.ositoLastLivechatSnapshot = messages.slice(-100);
                if ((window.ositoLivechatTransport || '').toLowerCase() !== 'firestore') {
                    return;
                }
                window.dispatchEvent(new CustomEvent('osito:livechat-snapshot', {
                    detail: messages.slice(-100)
                }));
            },
            (error) => {
                console.error('[FirebaseLiveChat]', error);
                window.dispatchEvent(new CustomEvent('osito:livechat-error', {
                    detail: error
                }));
            }
        );
    }

    async function registerUser(user, gender, photoFile) {
        const photoURL = await uploadPhotoIfNeeded(user, photoFile);
        const displayName = safeEmailName(user.email);

        if (window.updateProfileFirebase) {
            await window.updateProfileFirebase(user, {
                displayName,
                photoURL: photoURL || null
            });
        }

        if (db && window.docFirebase && window.setDocFirebase) {
            await window.setDocFirebase(window.docFirebase(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email || '',
                displayName,
                gender,
                photoURL,
                tutorialSeen: false,
                createdAt: Date.now()
            }, { merge: true });
        }

        return { displayName, gender, photoURL, tutorialSeen: false };
    }

    async function handleAuthSubmit(event) {
        event.preventDefault();

        if (!auth || state.authSubmitting) return;
        const { email, password, gender, photoInput, submit, modeButtons, guest } = getAuthElements();
        const cleanEmail = escapeText(email?.value).toLowerCase();
        const cleanPassword = escapeText(password?.value);
        const selectedGender = gender?.value === 'female' ? 'female' : 'male';
        const photoFile = state.selectedPhotoFile || photoInput?.files?.[0] || null;

        if (!cleanEmail || !cleanPassword) {
            setStatus('Escribe tu correo y tu contrasena.', 'error');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
            setStatus('Usa un correo completo, por ejemplo: Usuario@Elsotanodeosito.com', 'error');
            return;
        }

        state.authSubmitting = true;
        if (submit) {
            submit.disabled = true;
            submit.textContent = state.mode === 'register' ? 'Creando cuenta...' : 'Entrando...';
        }
        modeButtons.forEach((button) => { button.disabled = true; });
        if (guest) guest.disabled = true;

        try {
            setStatus(state.mode === 'register' ? 'Creando cuenta...' : 'Iniciando sesion...', 'neutral');

            if (!window.setPersistenceFirebase || !window.authPersistenceLocalFirebase) {
                throw new Error('Persistence unavailable');
            }

            await window.setPersistenceFirebase(auth, window.authPersistenceLocalFirebase);

            if (state.mode === 'register') {
                const credential = await window.createUserWithEmailAndPasswordFirebase(auth, cleanEmail, cleanPassword);
                const registeredProfile = await registerUser(credential.user, selectedGender, photoFile);
                // El callback de Auth puede ejecutarse antes de terminar la subida.
                // Actualizamos el estado local con el perfil que ya contiene la foto.
                state.profile = registeredProfile;
                setPreview(registeredProfile, credential.user);
                state.selectedPhotoFile = null;
                setStatus('Cuenta creada. Ya puedes entrar a la pagina principal.', 'success');
            } else {
                await window.signInWithEmailAndPasswordFirebase(auth, cleanEmail, cleanPassword);
                setStatus('Sesion iniciada. Ya puedes continuar.', 'success');
            }
        } catch (error) {
            console.error('[FirebaseAuth]', error);
            const code = error?.code || '';
            let message = 'No se pudo completar el acceso.';
            if (code.includes('auth/invalid-email')) message = 'El correo no es valido.';
            if (code.includes('auth/missing-password')) message = 'Escribe tu contrasena.';
            if (code.includes('auth/weak-password')) message = 'La contrasena debe tener al menos 6 caracteres.';
            if (code.includes('auth/email-already-in-use')) message = 'Ese correo ya esta registrado.';
            if (code.includes('auth/user-not-found')) message = 'No encontre esa cuenta.';
            if (code.includes('auth/wrong-password')) message = 'La contrasena es incorrecta.';
            if (code.includes('auth/invalid-credential') || code.includes('auth/invalid-login-credentials')) message = 'El correo o la contrasena no coinciden.';
            if (code.includes('auth/too-many-requests')) message = 'Demasiados intentos. Espera un momento y vuelve a probar.';
            setStatus(message, 'error');
        } finally {
            state.authSubmitting = false;
            if (submit) {
                submit.disabled = false;
                submit.textContent = state.mode === 'register' ? 'Crear cuenta' : 'Entrar';
            }
            modeButtons.forEach((button) => { button.disabled = false; });
            if (guest) guest.disabled = false;
        }
    }

    async function handleSignOut() {
        if (window.ositoGuestMode) {
            window.location.reload();
            return;
        }
        if (!auth || !window.signOutFirebase) return;
        try {
            await window.signOutFirebase(auth);
            state.selectedPhotoFile = null;
            window.location.reload();
        } catch (error) {
            console.error('[FirebaseAuth]', error);
            setStatus('No se pudo cerrar la sesion.', 'error');
        }
    }

    async function updateProfilePhoto(file) {
        if (!file || !state.currentUser) return;
        if (!storage || !window.storageRefFirebase || !window.uploadBytesFirebase || !window.getDownloadURLFirebase) {
            setStatus('Storage no esta disponible para guardar la foto.', 'error');
            return;
        }

        try {
            setStatus('Guardando tu foto de perfil...', 'neutral');
            const photoURL = await uploadPhotoIfNeeded(state.currentUser, file);

            if (window.updateProfileFirebase) {
                await window.updateProfileFirebase(state.currentUser, { photoURL });
            }
            if (db && window.docFirebase && window.setDocFirebase) {
                await window.setDocFirebase(window.docFirebase(db, 'users', state.currentUser.uid), {
                    photoURL,
                    updatedAt: Date.now()
                }, { merge: true });
            }

            state.profile = { ...(state.profile || {}), photoURL };
            window.ositoCurrentUserProfile = { ...(window.ositoCurrentUserProfile || {}), photoURL };
            setPreview(state.profile, state.currentUser);
            setStatus('Foto guardada correctamente.', 'success');
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('Tu foto de perfil se guardo en la nube.');
            }
        } catch (error) {
            console.error('[FirebaseProfilePhoto]', error);
            setStatus('No se pudo guardar la foto. Revisa Storage y sus reglas.', 'error');
        }
    }

    async function loadProfileAndAttach(user) {
        const profile = await loadOrCreateProfile(user, state.mode === 'register');
        state.profile = profile;
        state.currentUser = user;
        window.ositoCurrentUser = user;
        window.ositoCurrentUserProfile = profile;
        window.ositoTutorialPendiente = false;
        state.aiSeededFromDom = false;

        setPreview(profile, user);
        showAuthenticatedView(profile, user);

        if (window.localStorage) {
            localStorage.setItem('osito_ai_nombre', profile.displayName || safeEmailName(user.email));
            localStorage.setItem('osito_ai_genero', profile.gender || 'male');
        }

        await startAiListener(user.uid);
    }

    async function waitForFirebaseServices(timeoutMs = 6000) {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
            if (window.firebaseAuth && window.setPersistenceFirebase && window.onAuthStateChangedFirebase) {
                return true;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return false;
    }

    async function initAuth() {
        const firebaseReady = await waitForFirebaseServices();
        db = window.dbFirebase || null;
        auth = window.firebaseAuth || null;
        storage = window.firebaseStorage || null;
        window.livechatDbFirebase = db;

        if (!firebaseReady || !auth || !window.setPersistenceFirebase || !window.authPersistenceLocalFirebase || !window.onAuthStateChangedFirebase) {
            showUnauthenticatedView();
            setStatus('Firebase no esta disponible en este navegador.', 'error');
            return;
        }

        await window.setPersistenceFirebase(auth, window.authPersistenceLocalFirebase);

        window.ositoTutorialPendiente = false;

        window.onAuthStateChangedFirebase(auth, async (user) => {
            state.authReady = true;
            state.currentUser = user || null;
            if (!user) {
                state.profile = null;
                if (typeof state.aiUnsubscribe === 'function') {
                    state.aiUnsubscribe();
                    state.aiUnsubscribe = null;
                }
                if (typeof state.livechatUnsubscribe === 'function') {
                    state.livechatUnsubscribe();
                    state.livechatUnsubscribe = null;
                }
                showUnauthenticatedView();
                return;
            }

            try {
                await loadProfileAndAttach(user);
            } catch (error) {
                console.error('[FirebaseAuth]', error);
                setStatus('No pudimos cargar tu perfil.', 'error');
                showAuthenticatedView({
                    displayName: safeEmailName(user.email),
                    gender: 'male',
                    photoURL: ''
                }, user);
            }

            // El chat puede conectarse aunque el perfil tarde en terminar de cargar.
            startLiveChatListener();
            window.dispatchEvent(new CustomEvent('osito:firebase-auth-ready'));
        });
    }

    function bindUi() {
        const {
            form,
            logout,
            guest,
            mainLogout,
            profilePhotoButton,
            profilePhotoInput,
            previewPhotoButton,
            previewPhotoInput,
            photoButton,
            photoInput,
            modeButtons
        } = getAuthElements();

        if (modeButtons) {
            modeButtons.forEach((btn) => {
                btn.addEventListener('click', () => setMode(btn.dataset.mode));
            });
        }

        if (form) {
            form.addEventListener('submit', handleAuthSubmit);
        }

        if (logout) {
            logout.addEventListener('click', handleSignOut);
        }

        if (guest) {
            guest.addEventListener('click', enterAsGuest);
        }

        if (mainLogout) {
            mainLogout.addEventListener('click', handleSignOut);
        }

        if (profilePhotoButton && profilePhotoInput) {
            profilePhotoButton.addEventListener('click', () => profilePhotoInput.click());
            profilePhotoInput.addEventListener('change', () => {
                const file = profilePhotoInput.files?.[0] || null;
                if (file && (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024)) {
                    setStatus('La foto debe ser una imagen de menos de 8 MB.', 'error');
                    profilePhotoInput.value = '';
                    return;
                }
                updateProfilePhoto(file);
                profilePhotoInput.value = '';
            });
        }

        if (previewPhotoButton && previewPhotoInput) {
            previewPhotoButton.addEventListener('click', () => previewPhotoInput.click());
            previewPhotoInput.addEventListener('change', () => {
                const file = previewPhotoInput.files?.[0] || null;
                if (file && (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024)) {
                    setStatus('La foto debe ser una imagen de menos de 8 MB.', 'error');
                    previewPhotoInput.value = '';
                    return;
                }
                updateProfilePhoto(file);
                previewPhotoInput.value = '';
            });
        }

        if (photoButton && photoInput) {
            photoButton.addEventListener('click', () => photoInput.click());
            photoInput.addEventListener('change', () => {
                const file = photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;
                if (file && (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024)) {
                    setStatus('La foto debe ser una imagen de menos de 8 MB.', 'error');
                    photoInput.value = '';
                    state.selectedPhotoFile = null;
                    return;
                }
                state.selectedPhotoFile = file;
                if (file) {
                    const previewUrl = URL.createObjectURL(file);
                    const { avatarPreview, photoThumb } = getAuthElements();
                    if (avatarPreview) avatarPreview.src = previewUrl;
                    if (photoThumb) photoThumb.src = previewUrl;
                }
            });
        }

    }

    window.registrarMensajeIAEnFirebase = async function registrarMensajeIAEnFirebase(payload) {
        if (!state.currentUser || !db || !window.collectionFirebase || !window.addDocFirebase) {
            return null;
        }

        const role = payload?.role === 'user' ? 'user' : 'bot';
        const text = escapeText(payload?.text);
        if (!text) return null;

        return window.addDocFirebase(
            window.collectionFirebase(db, 'aiChats', state.currentUser.uid, 'messages'),
            {
                role,
                text,
                timestamp: Date.now(),
                uid: state.currentUser.uid,
                email: state.currentUser.email || ''
            }
        );
    };

    window.salirDeSesion = handleSignOut;
    window.entrarComoInvitado = enterAsGuest;

    window.publicarMensajeLiveChat = async function publicarMensajeLiveChat(texto, usuario = 'IA Osito', opciones = {}) {
        if (!state.currentUser || !db || !window.collectionFirebase || !window.addDocFirebase) {
            throw new Error('Firebase no esta listo.');
        }

        const cleanText = escapeText(texto);
        if (!cleanText) {
            throw new Error('El mensaje no puede estar vacio.');
        }

        const messageData = {
            user: escapeText(usuario).slice(0, 24) || 'Invitado',
            text: cleanText,
            timestamp: Date.now(),
            isSystem: Boolean(opciones?.isSystem),
            isAdmin: Boolean(opciones?.isAdmin),
            uid: state.currentUser.uid,
            email: state.currentUser.email || '',
            photoURL: state.profile?.photoURL || '',
            isCreator: Boolean(window.ositoEsCreador)
        };

        const messageRef = await window.addDocFirebase(
            window.collectionFirebase(db, 'livechat'),
            messageData
        );

        // Render inmediato; onSnapshot sincroniza despues y evita duplicados por id.
        window.dispatchEvent(new CustomEvent('osito:livechat-message', {
            detail: { ...messageData, id: messageRef.id, uid: state.currentUser.uid }
        }));
        return messageRef;
    };

    window.addEventListener('DOMContentLoaded', () => {
        bindUi();
        setMode('login');
        initAuth().catch((error) => {
            console.error('[FirebaseAuth]', error);
            setStatus('No se pudo iniciar Firebase.', 'error');
            showUnauthenticatedView();
        });
    });
}());
