import {Component, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {TravelRecordService} from '../../services/travel-record.service';
import {TravelRecord} from '../../models/travel-record';
import {MatIconModule} from '@angular/material/icon';
import {DatePipe} from '@angular/common';
import {auth} from '../../../firebase';
import {onAuthStateChanged, User} from 'firebase/auth';

@Component({
  selector: 'app-travel-record-detail',
  standalone: true,
  imports: [RouterLink, MatIconModule, DatePipe],
  template: `
    <div class="max-w-4xl mx-auto p-6 mt-8">
      @if (isLoading()) {
        <div class="flex justify-center py-20">
          <mat-icon class="animate-spin text-[#7A8B76] !w-10 !h-10 !text-[40px]">refresh</mat-icon>
        </div>
      } @else if (record()) {
        <div class="mb-6 flex justify-between items-center">
          <a routerLink="/" class="inline-flex items-center text-[#8C8C73] hover:text-[#3E3E32] transition-colors font-medium">
            <mat-icon class="mr-1">arrow_back</mat-icon>
            返回列表
          </a>
          <div class="flex gap-2">
            @if (isOwner()) {
              <button (click)="showDeleteModal.set(true)" class="inline-flex items-center gap-1 px-4 py-2 bg-[#F0EFE9] text-[#C26D5C] rounded-lg hover:bg-[#E8E6DF] transition-colors font-medium text-sm">
                <mat-icon class="!w-4 !h-4 !text-[16px]">delete</mat-icon>
                刪除
              </button>
              <a [routerLink]="['/edit', record()!.id]" class="inline-flex items-center gap-1 px-4 py-2 bg-[#F0EFE9] text-[#5A5A4A] rounded-lg hover:bg-[#E8E6DF] transition-colors font-medium text-sm">
                <mat-icon class="!w-4 !h-4 !text-[16px]">edit</mat-icon>
                編輯
              </a>
            }
          </div>
        </div>

        <div class="bg-[#FCFBF9] rounded-3xl overflow-hidden border border-[#E8E6DF] shadow-sm">
          <!-- Carousel -->
          @if (record()!.photos && record()!.photos.length > 0) {
            <div class="relative h-64 sm:h-96 md:h-[500px] bg-[#2A2A26] group flex items-center justify-center">
              <img [src]="record()!.photos[currentPhotoIndex()]" alt="Travel photo" class="max-w-full max-h-full object-contain" referrerpolicy="no-referrer">
              
              @if (record()!.photos.length > 1) {
                <!-- Prev Button -->
                <button (click)="prevPhoto()" class="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 rounded-full p-2 shadow-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                  <mat-icon>chevron_left</mat-icon>
                </button>
                <!-- Next Button -->
                <button (click)="nextPhoto()" class="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 rounded-full p-2 shadow-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                  <mat-icon>chevron_right</mat-icon>
                </button>
                <!-- Indicators -->
                <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  @for (photo of record()!.photos; track photo; let i = $index) {
                    <button (click)="goToPhoto(i)" class="w-2.5 h-2.5 rounded-full transition-all shadow-sm" [class.bg-white]="i === currentPhotoIndex()" [class.bg-white/50]="i !== currentPhotoIndex()" [attr.aria-label]="'Go to photo ' + (i + 1)"></button>
                  }
                </div>
              }
            </div>
          }

          <div class="p-8 md:p-12">
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <h1 class="text-3xl md:text-4xl font-serif font-bold text-[#3E3E32] leading-tight">{{ record()!.title }}</h1>
              <div class="flex items-center gap-4 shrink-0 mt-1">
                <div class="flex items-center text-[#D4A373]">
                  @for (star of [1,2,3,4,5]; track star) {
                    <mat-icon [class.text-[#E8E6DF]]="star > record()!.rating">star</mat-icon>
                  }
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 text-[#8C8C73] mb-10 font-medium border-b border-[#E8E6DF] pb-6">
              <mat-icon class="!w-5 !h-5 !text-[20px]">calendar_today</mat-icon>
              <span>{{ record()!.date | date:'longDate' }}</span>
            </div>

            <div class="prose prose-slate max-w-none">
              <p class="whitespace-pre-wrap text-[#5A5A4A] leading-loose text-lg font-serif">{{ record()!.content }}</p>
            </div>
          </div>
        </div>

        <!-- Delete Confirmation Modal -->
        @if (showDeleteModal()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div class="bg-[#FCFBF9] p-8 rounded-2xl shadow-lg max-w-sm w-full mx-4 border border-[#E8E6DF]">
              <h3 class="text-xl font-serif font-bold text-[#3E3E32] mb-4 flex items-center gap-2">
                <mat-icon class="text-[#C26D5C]">warning</mat-icon>
                確認刪除
              </h3>
              <p class="text-[#5A5A4A] mb-8">您確定要刪除這筆旅遊紀錄嗎？此動作無法復原。</p>
              <div class="flex justify-end gap-3">
                <button type="button" (click)="showDeleteModal.set(false)" [disabled]="isDeleting()"
                        class="px-4 py-2 text-[#5A5A4A] bg-[#F0EFE9] hover:bg-[#E8E6DF] rounded-xl transition-colors font-medium disabled:opacity-50">
                  取消
                </button>
                <button type="button" (click)="confirmDelete()" [disabled]="isDeleting()"
                        class="px-4 py-2 text-white bg-[#C26D5C] hover:bg-[#A85B4C] rounded-xl transition-colors font-medium flex items-center gap-2 disabled:opacity-50">
                  @if (isDeleting()) {
                    <mat-icon class="animate-spin !w-4 !h-4 !text-[16px]">refresh</mat-icon>
                    刪除中...
                  } @else {
                    確認刪除
                  }
                </button>
              </div>
            </div>
          </div>
        }
      } @else {
        <div class="text-center py-20">
          <h3 class="text-xl font-serif font-bold text-[#3E3E32] mb-2">找不到紀錄</h3>
          <p class="text-[#8C8C73] mb-6">這筆旅遊紀錄可能已被刪除或不存在。</p>
          <a routerLink="/" class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7A8B76] text-white rounded-xl hover:bg-[#63735F] transition-colors font-medium shadow-sm">
            返回列表
          </a>
        </div>
      }
    </div>
  `
})
export class TravelRecordDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private travelService = inject(TravelRecordService);
  
  record = signal<TravelRecord | null>(null);
  isLoading = signal(true);
  currentPhotoIndex = signal(0);
  showDeleteModal = signal(false);
  isDeleting = signal(false);
  user = signal<User | null>(null);

  ngOnInit() {
    onAuthStateChanged(auth, (user) => {
      this.user.set(user);
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.travelService.getRecord(id).subscribe({
        next: (data) => {
          this.record.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading record', err);
          this.isLoading.set(false);
        }
      });
    } else {
      this.isLoading.set(false);
    }
  }

  prevPhoto() {
    const photos = this.record()?.photos;
    if (!photos) return;
    this.currentPhotoIndex.update(i => i === 0 ? photos.length - 1 : i - 1);
  }

  isOwner(): boolean {
    return !!this.user() && !!this.record() && this.user()?.uid === this.record()?.authorUid;
  }

  nextPhoto() {
    const photos = this.record()?.photos;
    if (!photos) return;
    this.currentPhotoIndex.update(i => i === photos.length - 1 ? 0 : i + 1);
  }

  goToPhoto(index: number) {
    this.currentPhotoIndex.set(index);
  }

  confirmDelete() {
    const id = this.record()?.id;
    if (!id) return;

    this.isDeleting.set(true);
    this.travelService.deleteRecord(id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Error deleting record', err);
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        // In a real app, we might show a toast notification here
      }
    });
  }
}
