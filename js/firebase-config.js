// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBkWc3NgZ7L3TJqQv_Z1L-BstPdpikHCUA",
  authDomain: "saj-academy-b0aae.firebaseapp.com",
  projectId: "saj-academy-b0aae",
  storageBucket: "saj-academy-b0aae.firebasestorage.app",
  messagingSenderId: "1044730835134",
  appId: "1:1044730835134:web:69f2bd63ebc346fad82eef",
  measurementId: "G-953JVHJSSB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);