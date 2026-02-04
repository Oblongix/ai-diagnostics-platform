// Firebase Configuration
// IMPORTANT: Replace these with your actual Firebase project credentials
// Get these from: Firebase Console > Project Settings > General > Your apps

// The file can be overridden at deploy time by injecting a `window.__FIREBASE_CONFIG__`
// object (for example, during an automated deploy step). Otherwise edit the
// `firebaseConfig` below with your project's values.
const firebaseConfig = window.__FIREBASE_CONFIG__ || {
    apiKey: "AIzaSyCmxLoEPu50jTHNInFaixiwkxWdqyKnsig",
    authDomain: "ceoaitransform.firebaseapp.com",
    projectId: "ceoaitransform",
    storageBucket: "ceoaitransform.firebasestorage.app",
    messagingSenderId: "560880173161",
    appId: "1:560880173161:web:7d4b811b90c5883e1aa2f8"
};

// Determine if the provided config is still a placeholder
const isPlaceholderConfig = typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.startsWith('YOUR');

// Only allow the in-memory mock on localhost or private LAN addresses to avoid
// accidentally running a mock in production hosting.
const hostname = (typeof location !== 'undefined' && location.hostname) ? location.hostname : '';
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local') || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');

if (!isPlaceholderConfig && window.firebase && typeof firebase.initializeApp === 'function') {
    firebase.initializeApp(firebaseConfig);

    // Initialize services
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Export for use in other files
    window.firebaseServices = {
        auth,
        db,
        firebase
    };
} else if (isLocalhost) {
    // Simple in-memory mock for auth and firestore to allow local testing without Firebase
    (function(){
        const makeId = () => Math.random().toString(36).slice(2, 10);

        const store = {
            users: {
                // Pre-seeded mock user for local testing
                "vincentp": {
                    uid: "vincentp",
                    email: "vincentapowell@msn.com",
                    password: "LocalP@ssw0rd!",
                    name: "Vincent Powell",
                    projects: []
                }
            },
            projects: {}
        };

        const listeners = [];
        let currentUser = null;

        const auth = {
            onAuthStateChanged(cb) {
                listeners.push(cb);
                // call immediately
                setTimeout(() => cb(currentUser), 0);
            },
            async signInWithEmailAndPassword(email, password) {
                const user = Object.values(store.users).find(u => u.email === email && u.password === password);
                if (!user) throw new Error('Invalid email or password (mock)');
                currentUser = { uid: user.uid, email: user.email, displayName: user.name };
                listeners.forEach(cb => cb(currentUser));
                return { user: currentUser };
            },
            async createUserWithEmailAndPassword(email, password) {
                if (Object.values(store.users).some(u => u.email === email)) throw new Error('Email already exists (mock)');
                const uid = makeId();
                const userRecord = { uid, email, password, name: email.split('@')[0], projects: [] };
                store.users[uid] = userRecord;
                currentUser = { uid, email, displayName: userRecord.name };
                listeners.forEach(cb => cb(currentUser));
                return { user: Object.assign({ updateProfile: async ({ displayName }) => { userRecord.name = displayName; currentUser.displayName = displayName; } }, currentUser) };
            },
            async signOut() {
                currentUser = null;
                listeners.forEach(cb => cb(null));
            }
        };

        const normalizeValue = (v) => {
            if (v && v.__ts) return v.__ts;
            if (v && v.__arrayUnion) return { __arrayUnion: v.__arrayUnion };
            return v;
        };

        const FieldValue = {
            serverTimestamp: () => ({ __ts: new Date() }),
            arrayUnion: (...items) => ({ __arrayUnion: items })
        };

        const collection = (name) => ({
            doc(id) {
                return {
                    async set(obj) {
                        const data = Object.assign({}, obj);
                        Object.keys(data).forEach(k => { data[k] = normalizeValue(data[k]); });
                        store[name][id] = Object.assign({}, store[name][id] || {}, data);
                    },
                    async update(obj) {
                        const existing = store[name][id] || {};
                        Object.keys(obj).forEach(k => {
                            const v = obj[k];
                            if (v && v.__arrayUnion) {
                                existing[k] = Array.from(new Set([...(existing[k] || []), ...v.__arrayUnion]));
                            } else {
                                existing[k] = normalizeValue(v);
                            }
                        });
                        store[name][id] = existing;
                    },
                    async get() {
                        const data = store[name][id];
                        return { exists: !!data, id, data: () => data };
                    }
                };
            },
            async add(obj) {
                const id = makeId();
                const data = Object.assign({}, obj);
                Object.keys(data).forEach(k => { data[k] = normalizeValue(data[k]); });
                data.createdAt = data.createdAt && data.createdAt.__ts ? data.createdAt.__ts : (data.createdAt || new Date());
                data.updatedAt = data.updatedAt && data.updatedAt.__ts ? data.updatedAt.__ts : (data.updatedAt || new Date());
                store[name][id] = data;
                return { id };
            },
            where(field, op, value) {
                return {
                    async get() {
                        const all = Object.entries(store[name]).map(([id, data]) => ({ id, data }));
                        let filtered = all;
                        if (op === 'array-contains') {
                            filtered = all.filter(([id, data]) => (data[field] || []).includes(value));
                        }
                        return { docs: filtered.map(item => ({ id: item.id, data: () => item.data })) };
                    },
                    orderBy() { return this; }
                };
            },
            async get() {
                const all = Object.entries(store[name]).map(([id, data]) => ({ id, data }));
                return { docs: all.map(item => ({ id: item.id, data: () => item.data })) };
            }
        });

        const db = { collection, _store: store };

        // expose a minimal firebase object for code that references firebase.firestore.FieldValue
        const firebaseMock = { firestore: { FieldValue } };

        window.firebaseServices = { auth, db, firebase: firebaseMock };
    })();
} else {
    // In non-local environments with placeholder config, fail fast and log guidance
    console.error('Firebase is not configured. Please update public/config.js with your firebaseConfig or provide window.__FIREBASE_CONFIG__. See DEPLOYMENT_GUIDE.md for details.');
}
