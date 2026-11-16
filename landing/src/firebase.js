import { getAnalytics, isSupported } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyDAvAGBVKk2wsigmaOOPLkLSnsxkMn0A_E',
  authDomain: 'paraware-b090f.firebaseapp.com',
  projectId: 'paraware-b090f',
  storageBucket: 'paraware-b090f.firebasestorage.app',
  messagingSenderId: '802926139161',
  appId: '1:802926139161:web:e471cd7c985e6507a09788',
  measurementId: 'G-92LS9EYHZ0',
};

export const firebaseApp = initializeApp(firebaseConfig);

// Analytics is optional in unsupported browsers and privacy-restricted contexts.
export const analyticsPromise = isSupported()
  .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
  .catch(() => null);
