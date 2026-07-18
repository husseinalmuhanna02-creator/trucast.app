import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDT9rmhGW6TEBKk6S0GQ9GZvn4DnQuBuJ4",
  authDomain: "trucast-3d3d2.firebaseapp.com",
  projectId: "trucast-3d3d2",
  storageBucket: "trucast-3d3d2.firebasestorage.app",
  messagingSenderId: "160134519481",
  appId: "1:160134519481:web:3475459a5c3c54d0db1968",
  measurementId: "G-K9ZQRQR46N"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, storage, googleProvider };
