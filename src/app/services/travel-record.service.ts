import {Injectable} from '@angular/core';
import {Observable, from, Subscriber} from 'rxjs';
import {TravelRecord, PhotoUpload} from '../models/travel-record';
import {db, auth, storage} from '../../firebase';
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import {ref, uploadString, getDownloadURL} from 'firebase/storage';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

@Injectable({
  providedIn: 'root'
})
export class TravelRecordService {
  private collectionName = 'travelRecords';

  getRecords(): Observable<TravelRecord[]> {
    return new Observable((subscriber: Subscriber<TravelRecord[]>) => {
      const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const records: TravelRecord[] = [];
        snapshot.forEach((doc) => {
          records.push({ id: doc.id, ...doc.data() } as TravelRecord);
        });
        subscriber.next(records);
      }, (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, this.collectionName);
        } catch (e) {
          subscriber.error(e);
        }
      });
      return () => unsubscribe();
    });
  }

  getRecord(id: string): Observable<TravelRecord> {
    return from(this._getRecord(id));
  }

  private async _getRecord(id: string): Promise<TravelRecord> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as TravelRecord;
      } else {
        throw new Error('Record not found');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${this.collectionName}/${id}`);
      throw error;
    }
  }

  addRecord(record: {
    title: string;
    content: string;
    rating: number;
    date: string;
    photos: PhotoUpload[];
  }): Observable<TravelRecord> {
    return from(this._addRecord(record));
  }

  private async _addRecord(record: {
    title: string;
    content: string;
    rating: number;
    date: string;
    photos: PhotoUpload[];
  }): Promise<TravelRecord> {
    try {
      if (!auth.currentUser) throw new Error('User not authenticated');
      
      const photoUrls = await this.uploadPhotos(record.photos);
      
      const newRecord = {
        title: record.title,
        content: record.content,
        rating: record.rating,
        date: record.date,
        photos: photoUrls,
        createdAt: new Date().toISOString(),
        authorUid: auth.currentUser.uid
      };

      const docRef = await addDoc(collection(db, this.collectionName), newRecord);
      return { id: docRef.id, ...newRecord };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, this.collectionName);
      throw error;
    }
  }

  updateRecord(id: string, record: {
    title: string;
    content: string;
    rating: number;
    date: string;
    photos: PhotoUpload[];
  }): Observable<TravelRecord> {
    return from(this._updateRecord(id, record));
  }

  private async _updateRecord(id: string, record: {
    title: string;
    content: string;
    rating: number;
    date: string;
    photos: PhotoUpload[];
  }): Promise<TravelRecord> {
    try {
      if (!auth.currentUser) throw new Error('User not authenticated');
      
      const photoUrls = await this.uploadPhotos(record.photos);
      
      const updateData = {
        title: record.title,
        content: record.content,
        rating: record.rating,
        date: record.date,
        photos: photoUrls
      };

      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, updateData);
      
      return this._getRecord(id);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${this.collectionName}/${id}`);
      throw error;
    }
  }

  deleteRecord(id: string): Observable<void> {
    return from(this._deleteRecord(id));
  }

  private async _deleteRecord(id: string): Promise<void> {
    try {
      if (!auth.currentUser) throw new Error('User not authenticated');
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${this.collectionName}/${id}`);
      throw error;
    }
  }

  private async uploadPhotos(photos: PhotoUpload[]): Promise<string[]> {
    const urls: string[] = [];
    for (const photo of photos) {
      if (photo.data.startsWith('http')) {
        // Already a URL
        urls.push(photo.data);
      } else {
        // Base64 data, upload to Storage
        const fileName = `${Date.now()}_${photo.name}`;
        const storageRef = ref(storage, `photos/${fileName}`);
        await uploadString(storageRef, photo.data, 'data_url');
        const url = await getDownloadURL(storageRef);
        urls.push(url);
      }
    }
    return urls;
  }
}
