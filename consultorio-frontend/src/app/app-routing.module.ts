
import { Routes } from '@angular/router';
import { PacientesComponent } from './components/pacientes/pacientes.component';
import { CitasComponent } from './components/citas/citas.component';
import { HistoriasClinicasComponent } from './components/historias-clinicas/historias-clinicas.component';

export const routes: Routes = [
  { path: '', redirectTo: '/citas', pathMatch: 'full' },
  { path: 'citas', component: CitasComponent },
  { path: 'pacientes', component: PacientesComponent },
  { path: 'historias-clinicas', component: HistoriasClinicasComponent },
  { path: '**', redirectTo: '/citas' }
];