import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDcaN5z8NY8Y54ARw9L9Bc0RYJ7PEDKAYCB2c",
    authDomain: "bloodlink-kpriet.firebaseapp.com",
    projectId: "bloodlink-kpriet",
    storageBucket: "bloodlink-kpriet.firebasestorage.app",
    messagingSenderId: "733029131301",
    appId: "1:733029131301:web:d7304f4a76d57ac4ab8bcc"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);