export type EstadoCita = 'Programada' | 'Confirmada' | 'EnCurso' | 'Completada';

export interface Cita {
  citaId: number;
  pacienteId: number;
  pacienteNombre: string;
  fecha: string; // ISO date (yyyy-MM-dd)
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
  estado: EstadoCita;
  motivo?: string;
  notas?: string;
}

export interface AgendaSemanalDia {
  fecha: string;
  dia: string;
  citas: Cita[];
}

export interface DailyStats {
  fecha: string;
  programadas: number;
  confirmadas: number;
  enCurso: number;
  completadas: number;
  total: number;
  horasOcupadas: number;
  horasDisponibles: number;
}

export interface CitaPayload {
  pacienteId: number;
  fecha: string; // yyyy-MM-dd
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
  motivo?: string;
  notas?: string;
}
