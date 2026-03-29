import {Routes} from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/travel-record-list/travel-record-list').then(m => m.TravelRecordListComponent)
  },
  {
    path: 'add',
    loadComponent: () => import('./components/travel-record-form/travel-record-form').then(m => m.TravelRecordFormComponent)
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./components/travel-record-form/travel-record-form').then(m => m.TravelRecordFormComponent)
  },
  {
    path: 'record/:id',
    loadComponent: () => import('./components/travel-record-detail/travel-record-detail').then(m => m.TravelRecordDetailComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
