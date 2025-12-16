import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

// TODO: 請將此處替換為您在 Firebase Console 取得的設定資訊
// 步驟:
// 1. 登入 console.firebase.google.com
// 2. 建立專案 -> 新增 Web 應用程式 (</> 圖示)
// 3. 複製 firebaseConfig 內容貼上覆蓋下方變數
const firebaseConfig = {
  apiKey: "AIzaSyCJHPpZGmrmt3TsrvKWUyIcIaDKzfZyKhs",
  authDomain: "jci-c1.firebaseapp.com",
  projectId: "jci-c1",
  storageBucket: "jci-c1.firebasestorage.app",
  messagingSenderId: "648449717518",
  appId: "1:648449717518:web:a2a2ddf928a5003722d35f",
  measurementId: "G-R2LX85KDZ7"
};

// Initialize Firebase
// 我們加入一個簡單的檢查，避免在沒有設定時報錯，方便您先看到介面
const isConfigured = firebaseConfig.projectId !== "您的專案ID";

if (isConfigured && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const app = isConfigured && firebase.apps.length ? firebase.app() : null;
export const db = isConfigured && app ? firebase.firestore() : null;

export const isFirebaseReady = isConfigured;
