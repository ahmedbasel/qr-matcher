import { initializeApp } from 'firebase/app';

export const firebaseConfig = {
  apiKey: 'AIzaSyAGgDRWaUhx9qf6x-9j8-exL6hpciNpHPc',
  authDomain: 'qr-matcher-10454.firebaseapp.com',
  projectId: 'qr-matcher-10454',
  storageBucket: 'qr-matcher-10454.firebasestorage.app',
  messagingSenderId: '891565260277',
  appId: '1:891565260277:web:ab18b80a5026df7dbab4bc'
};

export const firebaseApp =
  initializeApp(firebaseConfig);