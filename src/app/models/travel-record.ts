export interface TravelRecord {
  id: string;
  title: string;
  content: string;
  rating: number;
  date: string;
  photos: string[];
  createdAt: string;
}

export interface PhotoUpload {
  name: string;
  data: string; // base64
}
