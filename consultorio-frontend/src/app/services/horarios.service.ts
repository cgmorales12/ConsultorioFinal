import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ActualizarHorariosRequest, HorarioAtencion, HorarioAtencionPayload } from '../models/horario-atencion.model';

@Injectable({ providedIn: 'root' })
export class HorariosService {
  private readonly baseUrl = 'http://localhost:5005/api/horariosatencion';

  constructor(private readonly http: HttpClient) {}

  obtenerHorarios(): Observable<HorarioAtencion[]> {
    return this.http.get<HorarioAtencion[]>(this.baseUrl);
  }

  guardarHorarios(horarios: HorarioAtencionPayload[]): Observable<HorarioAtencion[]> {
    const payload: ActualizarHorariosRequest = { horarios };
    return this.http.put<HorarioAtencion[]>(this.baseUrl, payload);
  }

  eliminarHorario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
