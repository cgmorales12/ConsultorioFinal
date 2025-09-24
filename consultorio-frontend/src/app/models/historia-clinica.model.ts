export interface ConsultaMedica {
  consultaMedicaId: number;
  historiaClinicaId: number;
  fechaConsulta: string;
  motivoConsulta: string;
  sintomas: string;
  diagnostico: string;
  tratamiento: string;
  observaciones?: string;
  pesoKg: number | null;
  estaturaCm: number | null;
  temperaturaC?: number;
  saturacionPorcentaje?: number;
  frecuenciaCardiaca?: number;
  presionSistolica?: number;
  presionDiastolica?: number;
  perimetroCefalicoCm?: number;
  pancita?: string;
  imc: number | null;
  clasificacionImc: string;
  alertas: string[];
}

export interface HistoriaClinica {
  historiaClinicaId: number;
  pacienteId: number;
  pacienteNombre: string;
  antecedentesPersonales?: string;
  antecedentesFamiliares?: string;
  vacunas?: string;
  alergias?: string;
  fechaCreacion: string;
  ultimaActualizacion: string;
  consultas: ConsultaMedica[];
}

export interface PlantillaConsulta {
  plantillaConsultaId: number;
  nombre: string;
  motivoConsulta?: string;
  sintomas?: string;
  diagnostico?: string;
  tratamiento?: string;
  observaciones?: string;
}

export interface HistoriaClinicaPayload {
  pacienteId: number;
  antecedentesPersonales?: string;
  antecedentesFamiliares?: string;
  vacunas?: string;
  alergias?: string;
}

export interface HistoriaClinicaUpdatePayload {
  antecedentesPersonales?: string;
  antecedentesFamiliares?: string;
  vacunas?: string;
  alergias?: string;
}

export interface ConsultaMedicaPayload {
  fechaConsulta: string;
  motivoConsulta: string;
  sintomas: string;
  diagnostico: string;
  tratamiento: string;
  observaciones?: string;
  pesoKg?: number | null;
  estaturaCm?: number | null;
  temperaturaC?: number;
  saturacionPorcentaje?: number;
  frecuenciaCardiaca?: number;
  presionSistolica?: number;
  presionDiastolica?: number;
  perimetroCefalicoCm?: number;
  pancita?: string;
}
