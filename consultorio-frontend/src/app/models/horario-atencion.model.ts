export interface HorarioAtencion {
  horarioAtencionId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

export interface HorarioAtencionPayload {
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

export interface ActualizarHorariosRequest {
  horarios: HorarioAtencionPayload[];
}
