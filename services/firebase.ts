
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
        
        /**
         * 修正初始化錯誤：
         * 僅保留必要設定，避免與 SDK 內部預設值衝突。
         * 在 esm.sh 環境下，Firestore 實例建立後應立即進行 settings 配置。
         */
        dbInstance.settings({ 
          experimentalForceLongPolling: true
        });

        // 嘗試啟用離線持久化 (Offline Persistence)
        dbInstance.enablePersistence({ synchronizeTabs: true }).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn("Firestore Persistence failed: Multiple tabs open.");
            } else if (err.code === 'unimplemented') {
                console.warn("Firestore Persistence failed: Browser not supported.");
            }
        });
        
        console.log("Firebase/Firestore 服務已啟動。");
    } catch (e) {
        console.error("Firebase 初始化失敗:", e);
    }
} else {
    console.warn("Firebase 尚未配置 Project ID。");
}

export const app = appInstance;
export const db = dbInstance;
export const isFirebaseReady = isConfigured && !!db;
