import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBLaUMttM8eiD7-3wIjDP--xPPfbk9iKnE",
  authDomain: "sekreai.firebaseapp.com",
  projectId: "sekreai",
  storageBucket: "sekreai.appspot.com",
  messagingSenderId: "655898539430",
  appId: "1:655898539430:web:4444fb762077aa66ba0b67",
  measurementId: "G-3JWGCGKXQ4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
