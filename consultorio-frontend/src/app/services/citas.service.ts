import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AgendaSemanalDia, Cita, CitaPayload, DailyStats, EstadoCita } from '../models/cita.model';

@Injectable({ providedIn: 'root' })
export class CitasService {
  private readonly baseUrl = 'http://localhost:5005/api/citas';

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Cita[]> {
    return this.http.get<Cita[]>(this.baseUrl);
  }

  getDaily(date: string): Observable<Cita[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<Cita[]>(`${this.baseUrl}/daily`, { params });
  }

  getWeekly(startDate: string): Observable<AgendaSemanalDia[]> {
    const params = new HttpParams().set('startDate', startDate);
    return this.http.get<AgendaSemanalDia[]>(`${this.baseUrl}/weekly`, { params });
  }

  getDailyStats(date: string): Observable<DailyStats> {
    const params = new HttpParams().set('date', date);
    return this.http.get<DailyStats>(`${this.baseUrl}/stats`, { params });
  }

  create(payload: CitaPayload): Observable<Cita> {
    return this.http.post<Cita>(this.baseUrl, this.mapPayload(payload));
  }

  update(citaId: number, payload: CitaPayload): Observable<Cita> {
    return this.http.put<Cita>(`${this.baseUrl}/${citaId}`, this.mapPayload(payload));
  }

  updateEstado(citaId: number, estado: EstadoCita): Observable<Cita> {
    return this.http.put<Cita>(`${this.baseUrl}/${citaId}/estado`, { estado });
  }

  delete(citaId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${citaId}`);
  }

  private mapPayload(payload: CitaPayload) {
    return {
      pacienteId: payload.pacienteId,
      fecha: payload.fecha,
      horaInicio: this.normalizeTime(payload.horaInicio),
      horaFin: this.normalizeTime(payload.horaFin),
      motivo: payload.motivo,
      notas: payload.notas
    };
  }

  private normalizeTime(time: string): string {
    const parts = time.split(':').map(segment => segment.trim());

    if (parts.length === 1) {
      const hours = parts[0] || '00';
      return `${hours.padStart(2, '0')}:00:00`;
    }

    if (parts.length === 2) {
      const [hours, minutes] = parts;
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
    }

    const [hours, minutes, seconds] = parts as [string, string, string];
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
  }
}
