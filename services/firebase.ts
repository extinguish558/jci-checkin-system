
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

// Config from user screenshot (Project: jci-c1)
const firebaseConfig = {
  apiKey: "AIzaSyCJHPpZGmrmt3TsrvKWUyIcIaDKzfZyKhs",
  authDomain: "jci-c1.firebaseapp.com",
  projectId: "jci-c1",
  storageBucket: "jci-c1.firebasestorage.app",
  messagingSenderId: "648449717518",
  appId: "1:648449717518:web:a2a2ddf928a5003722d35f",
  measurementId: "G-R2LX85KDZ7"
};

// 檢查使用者是否已經設定了真實的 Project ID
const isConfigured = firebaseConfig.projectId && firebaseConfig.projectId !== "" && !firebaseConfig.projectId.includes("您的專案ID");

let appInstance: firebase.app.App | null = null;
let dbInstance: firebase.firestore.Firestore | null = null;

if (isConfigured) {
    try {
        if (!firebase.apps.length) {
            appInstance = firebase.initializeApp(firebaseConfig);
        } else {
            appInstance = firebase.app();
        }
        
        dbInstance = appInstance.firestore();
        
        // 啟用離線持久化（選用，但在此系統中我們傾向於即時同步）
        // dbInstance.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
        
        console.log("Firebase/Firestore initialized with project:", firebaseConfig.projectId);
    } catch (e) {
        console.error("Firebase initialization error:", e);
    }
} else {
    console.warn("Firebase 尚未設定或 Project ID 無效！系統將以單機模式運作。");
}

export const app = appInstance;
export const db = dbInstance;
export const isFirebaseReady = isConfigured && !!db;
