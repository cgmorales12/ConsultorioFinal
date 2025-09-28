
export interface Paciente {
  id?: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: Date;
  edad: string;
  genero: 'M' | 'F' | 'Otro';
  telefono?: string;
  celular?: string;
  email?: string;
  direccion?: string;
  estadoCivil?: string;
  ocupacion?: string;
  contactoEmergencia?: {
    nombre?: string;
    telefono?: string;
    relacion?: string;
  };
  tipoSangre?: string;
  alergias?: string[];
  medicamentosActuales?: string[];
  enfermedadesCronicas?: string[];
  fechaRegistro?: Date;
  activo: boolean;
  nombreCompleto?: string;
  fotoUrl?: string;
}