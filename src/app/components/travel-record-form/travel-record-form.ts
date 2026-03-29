import {Component, inject, signal, OnInit} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, ActivatedRoute} from '@angular/router';
import {TravelRecordService} from '../../services/travel-record.service';
import {PhotoUpload} from '../../models/travel-record';
import {MatIconModule} from '@angular/material/icon';
import {auth} from '../../../firebase';
import {onAuthStateChanged} from 'firebase/auth';

@Component({
  selector: 'app-travel-record-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <div class="max-w-3xl mx-auto p-8 bg-[#FCFBF9] rounded-2xl shadow-sm border border-[#E8E6DF] mt-8">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-serif font-bold tracking-tight text-[#3E3E32] flex items-center gap-3">
          <mat-icon class="text-[#7A8B76] !w-8 !h-8 !text-[32px]">edit_note</mat-icon>
          {{ isEditMode() ? '編輯旅遊紀錄' : '新增旅遊紀錄' }}
        </h1>
        <button type="button" (click)="goBack()" class="text-[#8C8C73] hover:text-[#3E3E32] transition-colors">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      @if (errorMessage()) {
        <div class="mb-6 p-4 bg-[#C26D5C]/10 border border-[#C26D5C]/20 rounded-xl flex items-start gap-3 text-[#C26D5C]">
          <mat-icon class="!w-5 !h-5 !text-[20px] shrink-0">error_outline</mat-icon>
          <p class="text-sm font-medium">{{ errorMessage() }}</p>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Title -->
        <div>
          <label for="title" class="block text-sm font-medium text-[#5A5A4A] mb-1 flex items-center gap-1">
            <mat-icon class="!w-4 !h-4 !text-[16px]">title</mat-icon>標題
          </label>
          <input type="text" id="title" formControlName="title"
                 class="w-full px-4 py-2 border border-[#E8E6DF] bg-white rounded-xl focus:ring-2 focus:ring-[#7A8B76] focus:border-[#7A8B76] outline-none transition-all"
                 placeholder="例如：京都週末小旅行">
          @if (form.get('title')?.invalid && form.get('title')?.touched) {
            <p class="text-[#C26D5C] text-xs mt-1">請輸入標題。</p>
          }
        </div>

        <!-- Date -->
        <div>
          <label for="date" class="block text-sm font-medium text-[#5A5A4A] mb-1 flex items-center gap-1">
            <mat-icon class="!w-4 !h-4 !text-[16px]">event</mat-icon>日期
          </label>
          <input type="date" id="date" formControlName="date"
                 class="w-full px-4 py-2 border border-[#E8E6DF] bg-white rounded-xl focus:ring-2 focus:ring-[#7A8B76] focus:border-[#7A8B76] outline-none transition-all">
          @if (form.get('date')?.invalid && form.get('date')?.touched) {
            <p class="text-[#C26D5C] text-xs mt-1">請選擇日期。</p>
          }
        </div>

        <!-- Rating -->
        <div>
          <span class="block text-sm font-medium text-[#5A5A4A] mb-1 flex items-center gap-1">
            <mat-icon class="!w-4 !h-4 !text-[16px]">hotel_class</mat-icon>評分
          </span>
          <div class="flex gap-1">
            @for (star of [1, 2, 3, 4, 5]; track star) {
              <button type="button" (click)="setRating(star)"
                      class="focus:outline-none transition-transform hover:scale-110"
                      [class.text-[#D4A373]]="star <= (form.get('rating')?.value || 0)"
                      [class.text-[#E8E6DF]]="star > (form.get('rating')?.value || 0)">
                <mat-icon class="!w-8 !h-8 !text-[32px]">star</mat-icon>
              </button>
            }
          </div>
          @if (form.get('rating')?.invalid && form.get('rating')?.touched) {
            <p class="text-[#C26D5C] text-xs mt-1">請選擇評分。</p>
          }
        </div>

        <!-- Content -->
        <div>
          <label for="content" class="block text-sm font-medium text-[#5A5A4A] mb-1 flex items-center gap-1">
            <mat-icon class="!w-4 !h-4 !text-[16px]">menu_book</mat-icon>內容
          </label>
          <textarea id="content" formControlName="content" rows="6"
                    class="w-full px-4 py-3 border border-[#E8E6DF] bg-white rounded-xl focus:ring-2 focus:ring-[#7A8B76] focus:border-[#7A8B76] outline-none transition-all resize-none font-serif leading-loose"
                    placeholder="分享您的旅遊心得..."></textarea>
          @if (form.get('content')?.invalid && form.get('content')?.touched) {
            <p class="text-[#C26D5C] text-xs mt-1">請輸入內容。</p>
          }
        </div>

        <!-- Photos -->
        <div>
          <span class="block text-sm font-medium text-[#5A5A4A] mb-1 flex items-center gap-1">
            <mat-icon class="!w-4 !h-4 !text-[16px]">photo_camera</mat-icon>照片 (最多 3 張)
          </span>
          
          <div class="flex items-center justify-center w-full">
            <label for="dropzone-file" class="flex flex-col items-center justify-center w-full h-32 border-2 border-[#D4C5B9] border-dashed rounded-xl cursor-pointer bg-[#F7F5F0] hover:bg-[#E8E6DF] transition-colors"
                   [class.opacity-50]="photos().length >= 3" [class.cursor-not-allowed]="photos().length >= 3">
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <mat-icon class="text-[#8C8C73] mb-2">cloud_upload</mat-icon>
                <p class="mb-2 text-sm text-[#5A5A4A]"><span class="font-semibold">點擊上傳</span> 或拖曳檔案至此</p>
                <p class="text-xs text-[#8C8C73]">支援 PNG, JPG 或 GIF (最多 3 個檔案)</p>
              </div>
              <input id="dropzone-file" type="file" class="hidden" accept="image/*" multiple (change)="onFileSelected($event)" [disabled]="photos().length >= 3" />
            </label>
          </div>

          <!-- Photo Previews -->
          @if (photos().length > 0) {
            <div class="grid grid-cols-3 gap-4 mt-4">
              @for (photo of photos(); track photo.name; let i = $index) {
                <div class="relative group aspect-square rounded-xl overflow-hidden border border-[#E8E6DF]">
                  <img [src]="photo.data" [alt]="photo.name" class="w-full h-full object-cover">
                  <button type="button" (click)="removePhoto(i)"
                          class="absolute top-2 right-2 bg-black/40 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60">
                    <mat-icon class="!w-4 !h-4 !text-[16px]">close</mat-icon>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Submit Button -->
        <div class="pt-4">
          <button type="submit" [disabled]="form.invalid || isSubmitting()"
                  class="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#7A8B76] hover:bg-[#63735F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7A8B76] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            @if (isSubmitting()) {
              <mat-icon class="animate-spin">refresh</mat-icon>
              儲存中...
            } @else {
              <mat-icon>save</mat-icon>
              {{ isEditMode() ? '更新紀錄' : '儲存紀錄' }}
            }
          </button>
        </div>
      </form>
    </div>
  `
})
export class TravelRecordFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private travelService = inject(TravelRecordService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form = this.fb.group({
    title: ['', Validators.required],
    content: ['', Validators.required],
    rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    date: ['', Validators.required],
  });

  photos = signal<PhotoUpload[]>([]);
  isSubmitting = signal(false);
  isEditMode = signal(false);
  recordId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        this.router.navigate(['/']);
        return;
      }
      
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.recordId.set(id);
        this.travelService.getRecord(id).subscribe({
          next: (record) => {
            if (record.authorUid !== user.uid) {
              this.router.navigate(['/']);
              return;
            }
            this.form.patchValue({
              title: record.title,
              content: record.content,
              rating: record.rating,
              date: record.date
            });
            const existingPhotos = record.photos.map(url => ({
              name: url.split('/').pop() || 'photo.jpg',
              data: url
            }));
            this.photos.set(existingPhotos);
          },
          error: (err) => {
            console.error('Error loading record for edit', err);
            this.errorMessage.set('無法載入紀錄資料。');
            setTimeout(() => this.router.navigate(['/']), 2000);
          }
        });
      }
    });
  }

  setRating(rating: number) {
    this.form.patchValue({ rating });
    this.form.get('rating')?.markAsTouched();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    const remainingSlots = 3 - this.photos().length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        this.photos.update(current => [...current, { name: file.name, data }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    input.value = '';
  }

  removePhoto(index: number) {
    this.photos.update(current => current.filter((_, i) => i !== index));
  }

  goBack() {
    this.router.navigate(['/']);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.form.value;
    
    const recordData = {
      title: formValue.title!,
      content: formValue.content!,
      rating: formValue.rating!,
      date: formValue.date!,
      photos: this.photos()
    };

    const request$ = this.isEditMode() && this.recordId()
      ? this.travelService.updateRecord(this.recordId()!, recordData)
      : this.travelService.addRecord(recordData);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Error saving record', err);
        this.isSubmitting.set(false);
        this.errorMessage.set('儲存失敗，請再試一次。');
      }
    });
  }
}
