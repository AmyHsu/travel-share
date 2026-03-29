import {Component, inject, OnInit, signal, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {RouterLink} from '@angular/router';
import {TravelRecordService} from '../../services/travel-record.service';
import {TravelRecord} from '../../models/travel-record';
import {MatIconModule} from '@angular/material/icon';
import {DatePipe} from '@angular/common';
import {auth} from '../../../firebase';
import {signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User} from 'firebase/auth';

@Component({
  selector: 'app-travel-record-list',
  standalone: true,
  imports: [RouterLink, MatIconModule, DatePipe],
  template: `
    <div class="max-w-5xl mx-auto p-6 mt-8">
      <div class="flex items-center justify-between mb-12 border-b border-[#E8E6DF] pb-6">
        <div>
          <h1 class="text-4xl font-serif font-bold tracking-tight text-[#3E3E32] flex items-center gap-3">
            <mat-icon class="text-[#7A8B76] !w-10 !h-10 !text-[40px]">auto_stories</mat-icon>
            我的旅遊紀錄
          </h1>
          <p class="text-[#8C8C73] mt-3 font-medium">記錄您的旅程與美好回憶。</p>
        </div>
        
        <div class="flex items-center gap-4">
          @if (user()) {
            <div class="flex items-center gap-3 mr-4">
              <img [src]="user()?.photoURL || 'https://picsum.photos/seed/user/32/32'" alt="User" class="w-8 h-8 rounded-full" referrerpolicy="no-referrer">
              <span class="text-sm font-medium text-[#5A5A4A] hidden sm:inline">{{ user()?.displayName }}</span>
              <button (click)="logout()" class="text-sm text-[#8C8C73] hover:text-[#C26D5C] transition-colors">登出</button>
            </div>
            <a routerLink="/add" class="inline-flex items-center gap-2 px-6 py-3 bg-[#7A8B76] text-white rounded-full hover:bg-[#63735F] transition-colors font-medium shadow-sm">
              <mat-icon>edit_calendar</mat-icon>
              新增紀錄
            </a>
          } @else {
            <button (click)="login()" class="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#E8E6DF] text-[#5A5A4A] rounded-full hover:bg-[#F0EFE9] transition-colors font-medium shadow-sm">
              <mat-icon>login</mat-icon>
              Google 登入
            </button>
          }
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex justify-center py-20">
          <mat-icon class="animate-spin text-[#7A8B76] !w-10 !h-10 !text-[40px]">refresh</mat-icon>
        </div>
      } @else if (records().length === 0) {
        <div class="text-center py-24 bg-[#FCFBF9] rounded-3xl border border-[#E8E6DF] shadow-sm">
          <div class="bg-[#F0EFE9] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <mat-icon class="text-[#8C8C73] !w-12 !h-12 !text-[48px]">landscape</mat-icon>
          </div>
          <h3 class="text-2xl font-serif font-bold text-[#3E3E32] mb-3">尚無紀錄</h3>
          <p class="text-[#8C8C73] mb-8">新增您的第一筆紀錄，開始記錄旅程吧！</p>
          @if (user()) {
            <a routerLink="/add" class="inline-flex items-center gap-2 px-6 py-3 bg-[#7A8B76] text-white rounded-full hover:bg-[#63735F] transition-colors font-medium shadow-sm">
              <mat-icon>add</mat-icon>
              新增紀錄
            </a>
          } @else {
            <button (click)="login()" class="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#E8E6DF] text-[#5A5A4A] rounded-full hover:bg-[#F0EFE9] transition-colors font-medium shadow-sm">
              <mat-icon>login</mat-icon>
              登入以新增紀錄
            </button>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          @for (record of records(); track record.id) {
            <a [routerLink]="['/record', record.id]" class="block bg-[#FCFBF9] rounded-2xl overflow-hidden border border-[#E8E6DF] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col h-full group">
              <!-- Photo Carousel/Header -->
              <div class="relative h-56 bg-[#F0EFE9]">
                @if (record.photos && record.photos.length > 0) {
                  <div class="flex w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    @for (photo of record.photos; track photo) {
                      <img [src]="photo" alt="Travel photo" class="w-full h-full flex-none object-cover snap-center" referrerpolicy="no-referrer">
                    }
                  </div>
                  @if (record.photos.length > 1) {
                    <div class="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1 pointer-events-none">
                      <mat-icon class="!w-4 !h-4 !text-[16px]">swipe</mat-icon>
                      {{ record.photos.length }} 張照片
                    </div>
                  }
                } @else {
                  <div class="w-full h-full flex items-center justify-center text-[#D4C5B9]">
                    <mat-icon class="!w-12 !h-12 !text-[48px]">landscape</mat-icon>
                  </div>
                }
              </div>

              <!-- Content -->
              <div class="p-6 flex-1 flex flex-col">
                <div class="flex items-start justify-between mb-3">
                  <h2 class="text-xl font-serif font-bold text-[#3E3E32] line-clamp-1 group-hover:text-[#7A8B76] transition-colors" [title]="record.title">{{ record.title }}</h2>
                </div>
                
                <div class="flex items-center gap-4 mb-4 text-sm text-[#8C8C73]">
                  <div class="flex items-center gap-1">
                    <mat-icon class="!w-4 !h-4 !text-[16px]">calendar_today</mat-icon>
                    <span>{{ record.date | date:'mediumDate' }}</span>
                  </div>
                  <div class="flex items-center text-[#D4A373]">
                    @for (star of [1,2,3,4,5]; track star) {
                      <mat-icon class="!w-4 !h-4 !text-[16px]" [class.text-[#E8E6DF]]="star > record.rating">star</mat-icon>
                    }
                  </div>
                </div>

                <p class="text-[#5A5A4A] line-clamp-3 mb-4 flex-1 font-serif leading-relaxed">{{ record.content }}</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `
})
export class TravelRecordListComponent implements OnInit {
  private travelService = inject(TravelRecordService);
  private platformId = inject(PLATFORM_ID);
  
  records = signal<TravelRecord[]>([]);
  isLoading = signal(true);
  user = signal<User | null>(null);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      onAuthStateChanged(auth, (user) => {
        this.user.set(user);
      });
      this.loadRecords();
    } else {
      this.isLoading.set(false);
    }
  }

  async login() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed', error);
    }
  }

  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  }

  loadRecords() {
    this.travelService.getRecords().subscribe({
      next: (data) => {
        this.records.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading records', err);
        this.isLoading.set(false);
      }
    });
  }
}
