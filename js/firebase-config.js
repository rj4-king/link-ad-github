import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyCUuqZ6KMgov1NEoK1qDCnP0kmbUwWyVTQ",
  authDomain: "link-short-fffd2.firebaseapp.com",
  databaseURL: "https://link-short-fffd2-default-rtdb.firebaseio.com",
  projectId: "link-short-fffd2",
  storageBucket: "link-short-fffd2.firebasestorage.app",
  messagingSenderId: "282237697202",
  appId: "1:282237697202:web:b921f352cb28f05abf9dab",
  measurementId: "G-KCW1L5NKQK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
