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
// 如果 projectId 包含 "您的專案ID" 字樣，代表使用者還沒設定，程式會自動切換成單機模式
const isConfigured = firebaseConfig.projectId && !firebaseConfig.projectId.includes("您的專案ID");

if (isConfigured && !firebase.apps.length) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized with project:", firebaseConfig.projectId);
    } catch (e) {
        console.error("Firebase initialization failed:", e);
    }
} else {
    if (!isConfigured) {
        console.warn("Firebase 尚未設定！系統將以「單機模式」運作，資料不會跨裝置同步。");
        console.warn("請前往 services/firebase.ts 填入正確的 firebaseConfig。");
    }
}

export const app = isConfigured && firebase.apps.length ? firebase.app() : null;
export const db = isConfigured && app ? firebase.firestore() : null;

export const isFirebaseReady = isConfigured;
