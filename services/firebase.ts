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
const isConfigured = firebaseConfig.projectId && !firebaseConfig.projectId.includes("您的專案ID");

let appInstance = null;
let dbInstance = null;

if (isConfigured) {
    try {
        // 確保不重複初始化
        if (!firebase.apps.length) {
            appInstance = firebase.initializeApp(firebaseConfig);
            console.log("Firebase initialized successfully");
        } else {
            appInstance = firebase.app();
        }
        
        // 取得 Firestore 實例
        dbInstance = appInstance.firestore();
    } catch (e) {
        console.error("Firebase initialization error:", e);
    }
} else {
    console.warn("Firebase 尚未設定！系統將以「單機模式」運作。");
}

export const app = appInstance;
export const db = dbInstance;
export const isFirebaseReady = isConfigured && !!db;