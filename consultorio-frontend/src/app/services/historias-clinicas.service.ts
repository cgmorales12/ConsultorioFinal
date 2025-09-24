import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ConsultaMedica,
  ConsultaMedicaPayload,
  HistoriaClinica,
  HistoriaClinicaPayload,
  HistoriaClinicaUpdatePayload,
  PlantillaConsulta
} from '../models/historia-clinica.model';

@Injectable({ providedIn: 'root' })
export class HistoriasClinicasService {
  private readonly baseUrl = 'http://localhost:5005/api/historiasclinicas';

  constructor(private readonly http: HttpClient) {}

  obtenerHistorias(pacienteId?: number): Observable<HistoriaClinica[]> {
    let params = new HttpParams();
    if (pacienteId) {
      params = params.set('pacienteId', pacienteId);
    }

    return this.http.get<HistoriaClinica[]>(this.baseUrl, { params });
  }

  obtenerHistoria(id: number): Observable<HistoriaClinica> {
    return this.http.get<HistoriaClinica>(`${this.baseUrl}/${id}`);
  }

  crearHistoria(payload: HistoriaClinicaPayload): Observable<HistoriaClinica> {
    return this.http.post<HistoriaClinica>(this.baseUrl, payload);
  }

  actualizarHistoria(id: number, payload: HistoriaClinicaUpdatePayload): Observable<HistoriaClinica> {
    return this.http.put<HistoriaClinica>(`${this.baseUrl}/${id}`, payload);
  }

  registrarConsulta(id: number, payload: ConsultaMedicaPayload): Observable<ConsultaMedica> {
    return this.http.post<ConsultaMedica>(`${this.baseUrl}/${id}/consultas`, payload);
  }

  actualizarConsulta(id: number, consultaId: number, payload: ConsultaMedicaPayload): Observable<ConsultaMedica> {
    return this.http.put<ConsultaMedica>(`${this.baseUrl}/${id}/consultas/${consultaId}`, payload);
  }

  obtenerPlantillas(): Observable<PlantillaConsulta[]> {
    return this.http.get<PlantillaConsulta[]>(`${this.baseUrl}/plantillas`);
  }
}
