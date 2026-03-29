import {Injectable, inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {TravelRecord, PhotoUpload} from '../models/travel-record';

@Injectable({
  providedIn: 'root'
})
export class TravelRecordService {
  private http = inject(HttpClient);
  private apiUrl = '/api/records';

  getRecords(): Observable<TravelRecord[]> {
    return this.http.get<TravelRecord[]>(this.apiUrl);
  }

  getRecord(id: string): Observable<TravelRecord> {
    return this.http.get<TravelRecord>(`${this.apiUrl}/${id}`);
  }

  addRecord(record: {
    title: string;
    content: string;
    rating: number;
    date: string;
    photos: PhotoUpload[];
  }): Observable<TravelRecord> {
    return this.http.post<TravelRecord>(this.apiUrl, record);
  }

  updateRecord(id: string, record: {
    title: string;
    content: string;
    rating: number;
    date: string;
    photos: PhotoUpload[];
  }): Observable<TravelRecord> {
    return this.http.put<TravelRecord>(`${this.apiUrl}/${id}`, record);
  }

  deleteRecord(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
