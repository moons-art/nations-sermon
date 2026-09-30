import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDP3M5o7eNBJ1dsxq_54BBW03ZgUijHh5A",
  authDomain: "sermon-ym.firebaseapp.com",
  projectId: "sermon-ym",
  storageBucket: "sermon-ym.firebasestorage.app",
  messagingSenderId: "833556498310",
  appId: "1:833556498310:web:a38ea2f5baf012851ace07"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('[firebaseConfig] Auth persistence set error:', err);
});
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
