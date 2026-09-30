import { Injectable } from '@angular/core';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';

import { firebaseApp } from '../firebase.config';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  private db = getFirestore(firebaseApp);


  // =========================
  // SAVE SCAN
  // =========================

  async saveScan(
    testingNumber: string,
    woodenNumber: string,
    matchResult: boolean
  ) {

    const scansCollection = collection(
      this.db,
      'scans'
    );

    return await addDoc(
      scansCollection,
      {
        testingNumber,
        woodenNumber,
        matchResult,
        createdAt: new Date()
      }
    );
  }


  // =========================
  // GET HISTORY
  // =========================

async getScans() {
  const scansCollection = collection(
    this.db,
    'scans'
  );

  const scansQuery = query(
    scansCollection,
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(
    scansQuery
  );

  return snapshot.docs.map(doc => {
    const data = doc.data();

    return {
      id: doc.id,
      testingNumber: data['testingNumber'] as string,
      woodenNumber: data['woodenNumber'] as string,
      matchResult: data['matchResult'] as boolean,
      createdAt: data['createdAt']
    };
  });
}

}