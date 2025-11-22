// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA6tM8ZjF89s11PJBhUN7InIAYJ5aW_0No",
  authDomain: "interim-prototype.firebaseapp.com",
  projectId: "interim-prototype",
  storageBucket: "interim-prototype.firebasestorage.app",
  messagingSenderId: "114344363488",
  appId: "1:114344363488:web:f1584bf7e5aa6baac29785",
  measurementId: "G-R6FZB4270V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth=getAuth();
export default app;