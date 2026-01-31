// Firebase設定とFirestoreセッション履歴管理
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp,
    doc,
    getDoc,
    setDoc
} from "firebase/firestore";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    User
} from "firebase/auth";
import { AISimulationResponse, SoundParams } from "../types";

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyDMKfV6a4MwppGxdxHOwDxJsBtqL_aYPRA",
    authDomain: "new-world-75725.firebaseapp.com",
    projectId: "new-world-75725",
    storageBucket: "new-world-75725.firebasestorage.app",
    messagingSenderId: "645563510590",
    appId: "1:645563510590:web:4ec7ca3b2878e354bf866f",
    measurementId: "G-1HWL6PLPWW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Analytics（ブラウザ対応時のみ）
let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
    if (supported) {
        analytics = getAnalytics(app);
    }
});

// === Authentication ===
export const loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Login failed:", error);
        throw error;
    }
};

export const logout = async () => {
    await signOut(auth);
};

// === World Management ===
export interface WorldData {
    id?: string;
    creatorId: string;
    creatorName?: string;
    prompt: string;
    createdAt: any;
    simulationParams: AISimulationResponse['simulation'];
    soundParams: AISimulationResponse['sound'];
    description: string;
    imagePrompt: string;
    likes: number;
}

export const saveWorld = async (
    user: User,
    data: AISimulationResponse,
    prompt: string
): Promise<string> => {
    try {
        const worldData: Omit<WorldData, 'id'> = {
            creatorId: user.uid,
            creatorName: user.displayName || 'Anonymous',
            prompt,
            createdAt: serverTimestamp(),
            simulationParams: data.simulation,
            soundParams: data.sound,
            description: data.description,
            imagePrompt: data.imagePrompt,
            likes: 0
        };

        const docRef = await addDoc(collection(db, "worlds"), worldData);
        return docRef.id;
    } catch (e) {
        console.error("Error saving world:", e);
        throw e;
    }
};

export const getWorld = async (worldId: string): Promise<WorldData | null> => {
    try {
        const docRef = doc(db, "worlds", worldId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as WorldData;
        }
        return null;
    } catch (e) {
        console.error("Error loading world:", e);
        throw e;
    }
};

export const getRecentWorlds = async (limitCount = 20): Promise<WorldData[]> => {
    try {
        const q = query(collection(db, "worlds"), orderBy("createdAt", "desc"), limit(limitCount));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as WorldData));
    } catch (e) {
        console.error("Error loading recent worlds:", e);
        return [];
    }
};

// セッション履歴の型
export interface SessionHistory {
    id?: string;
    prompt: string;
    response: AISimulationResponse;
    createdAt: Timestamp | null;
}

// セッション履歴を保存
export const saveSession = async (prompt: string, response: AISimulationResponse): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, "sessions"), {
            prompt,
            response: {
                simulation: response.simulation,
                sound: response.sound,
                description: response.description,
                imagePrompt: response.imagePrompt,
            },
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        console.error("セッション保存エラー:", error);
        throw error;
    }
};

// セッション履歴を取得（最新20件）
export const getSessions = async (limitCount: number = 20): Promise<SessionHistory[]> => {
    try {
        const q = query(
            collection(db, "sessions"),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as SessionHistory[];
    } catch (error) {
        console.error("セッション取得エラー:", error);
        return [];
    }
};

export { app, db, analytics };
