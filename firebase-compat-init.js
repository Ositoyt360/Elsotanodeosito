/* Inicializacion de Firebase (compat) para ia.html. Mismo codigo que usa index.html. */
(function () {
    if (!window.firebase || window.firebaseAuth) return;

    const configCompat = {
        apiKey: 'AIzaSyAM4rnHi3YU5pY6EK66ztAPRQdESs789Ew',
        authDomain: 'el-sotano-de-osito.firebaseapp.com',
        projectId: 'el-sotano-de-osito',
        storageBucket: 'el-sotano-de-osito.firebasestorage.app',
        messagingSenderId: '569093514370',
        appId: '1:569093514370:web:121b78008c667bde93409b',
        measurementId: 'G-0YQHGMVSHL'
    };

    try {
        const guest = (window.OsitoGuest && window.OsitoGuest.active) ? window.OsitoGuest.services(configCompat) : null;
        const app = guest ? guest.app : (window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(configCompat));
        const auth = guest ? guest.auth : window.firebase.auth();
        const db = guest ? guest.db : window.firebase.firestore();
        let storage = null;
        try {
            storage = guest ? guest.storage : window.firebase.storage();
        } catch (storageError) {
            console.warn('[FirebaseCompat] Storage no disponible.', storageError);
        }

        window.firebaseApp = app;
        window.firebaseAuth = auth;
        window.dbFirebase = db;
        window.livechatDbFirebase = db;
        window.firebaseStorage = storage;
        window.collectionFirebase = (database, ...path) => database.collection(path.join('/'));
        window.onSnapshotFirebase = (target, next, error) => target.onSnapshot(
            next,
            typeof error === 'function' ? error : (err) => console.warn('[Firestore Snapshot]', err?.code || err?.message || err)
        );
        window.addDocFirebase = (ref, data) => ref.add(data);
        window.docFirebase = (database, ...path) => database.doc(path.join('/'));
        window.getDocFirebase = (ref) => ref.get();
        window.setDocFirebase = (ref, data, options) => ref.set(data, options);
        window.updateDocFirebase = (ref, data) => ref.update(data);
        window.arrayUnionFirebase = (value) => window.firebase.firestore.FieldValue.arrayUnion(value);
        window.queryFirebase = (ref, ...constraints) => constraints.reduce((queryRef, constraint) => {
            if (constraint?.type === 'orderBy') return queryRef.orderBy(constraint.field, constraint.direction || 'asc');
            if (constraint?.type === 'limit') return queryRef.limit(constraint.amount);
            return queryRef;
        }, ref);
        window.orderByFirebase = (field, direction = 'asc') => ({ type: 'orderBy', field, direction });
        window.limitFirebase = (amount) => ({ type: 'limit', amount });
        window.getDocsFirebase = (ref) => ref.get();
        window.serverTimestampFirebase = () => window.firebase.firestore.FieldValue.serverTimestamp();
        window.authPersistenceLocalFirebase = window.firebase.auth.Auth.Persistence.LOCAL;
        window.setPersistenceFirebase = (instance, persistence) => instance.setPersistence(persistence);
        window.createUserWithEmailAndPasswordFirebase = (instance, email, password) => instance.createUserWithEmailAndPassword(email, password);
        window.signInWithEmailAndPasswordFirebase = (instance, email, password) => instance.signInWithEmailAndPassword(email, password);
        window.signOutFirebase = (instance) => instance.signOut();
        window.updatePasswordFirebase = (user, password) => user.updatePassword(password);
        window.authCredentialFirebase = (email, password) => window.firebase.auth.EmailAuthProvider.credential(email, password);
        window.reauthenticateWithCredentialFirebase = (user, credential) => user.reauthenticateWithCredential(credential);
        window.deleteDocFirebase = (ref) => ref.delete();
        window.runTransactionFirebase = (database, updateFn) => database.runTransaction(updateFn);
        window.onAuthStateChangedFirebase = (instance, callback) => instance.onAuthStateChanged(callback);
        window.updateProfileFirebase = (user, data) => user.updateProfile(data);
        window.storageRefFirebase = (bucket, path) => bucket.ref(path);
        window.uploadBytesFirebase = (ref, file, metadata) => ref.put(file, metadata);
        window.getDownloadURLFirebase = (ref) => ref.getDownloadURL();
    } catch (error) {
        console.error('[FirebaseCompat]', error);
    }
}());
