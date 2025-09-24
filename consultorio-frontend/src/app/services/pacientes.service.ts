// src/app/services/pacientes.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Paciente } from '../models/paciente.model';
import { environment } from '../config/environment';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  total?: number;
}

interface PacienteApi {
  pacienteId: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  genero: string;
  direccion?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  estadoCivil?: string;
  ocupacion?: string;
  contactoEmergencia?: string;
  telefonoEmergencia?: string;
  tipoSangre?: string;
  alergias?: string;
  estado: boolean;
  fechaRegistro?: string;
}

type PacientePayload = Omit<PacienteApi, 'pacienteId' | 'fechaRegistro'> & {
  pacienteId?: number;
  fechaRegistro?: string;
};

@Injectable({
  providedIn: 'root'
})
export class PacientesService {
  private readonly baseUrl = `${environment.apiUrl.replace(/\/$/, '')}/api/Pacientes`;

  constructor(private readonly http: HttpClient) {}

  obtenerTodos(): Observable<Paciente[]> {
    return this.http.get<ApiResponse<PacienteApi[]>>(this.baseUrl).pipe(
      map(response => (response.data ?? []).map(api => this.mapFromApi(api)))
    );
  }

  obtenerPorId(id: number): Observable<Paciente | undefined> {
    return this.http.get<ApiResponse<PacienteApi>>(`${this.baseUrl}/${id}`).pipe(
      map(response => (response.data ? this.mapFromApi(response.data) : undefined))
    );
  }

  buscarPacientes(termino: string): Observable<Paciente[]> {
    const normalizado = termino.trim().toLowerCase();
    if (!normalizado) {
      return this.obtenerTodos();
    }

    return this.obtenerTodos().pipe(
      map(pacientes =>
        pacientes.filter(paciente =>
          paciente.nombres.toLowerCase().includes(normalizado) ||
          paciente.apellidos.toLowerCase().includes(normalizado) ||
          paciente.cedula.includes(termino)
        )
      )
    );
  }

  agregarPaciente(paciente: Paciente): Observable<Paciente> {
    const payload = this.mapToPayload(paciente);
    return this.http.post<ApiResponse<PacienteApi>>(this.baseUrl, payload).pipe(
      map(response => {
        if (!response.data) {
          throw new Error(response.message || 'No se pudo crear el paciente');
        }
        return this.mapFromApi(response.data);
      })
    );
  }

  actualizarPaciente(paciente: Paciente): Observable<void> {
    if (!paciente.id) {
      throw new Error('El ID del paciente es requerido para actualizar');
    }

    const payload = this.mapToPayload(paciente, true);
    return this.http.put<ApiResponse<unknown>>(`${this.baseUrl}/${paciente.id}`, payload).pipe(map(() => void 0));
  }

  eliminarPaciente(id: number): Observable<boolean> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`).pipe(
      map(response => response.success)
    );
  }

  validarCedulaEcuatoriana(cedula: string): boolean {
    if (cedula.length !== 10) return false;

    const digitos = cedula.split('').map(Number);
    const provincia = parseInt(cedula.substring(0, 2), 10);

    if (provincia < 1 || provincia > 24) return false;

    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let digito = digitos[i];
      if (i % 2 === 0) {
        digito *= 2;
        if (digito > 9) digito -= 9;
      }
      suma += digito;
    }

    const digitoVerificador = 10 - (suma % 10);
    return digitoVerificador === digitos[9] || (digitoVerificador === 10 && digitos[9] === 0);
  }

  private mapFromApi(api: PacienteApi): Paciente {
    const fechaNacimiento = new Date(api.fechaNacimiento);
    const fechaRegistro = api.fechaRegistro ? new Date(api.fechaRegistro) : undefined;
    const contactoEmergencia = this.parseContactoEmergencia(api.contactoEmergencia, api.telefonoEmergencia);

    return {
      id: api.pacienteId,
      cedula: api.cedula,
      nombres: api.nombres,
      apellidos: api.apellidos,
      nombreCompleto: `${api.nombres} ${api.apellidos}`.trim(),
      fechaNacimiento,
      edad: this.calcularEdadDetallada(fechaNacimiento),
      genero: this.normalizarGenero(api.genero),
      telefono: api.telefono ?? undefined,
      celular: api.celular ?? undefined,
      email: api.email ?? undefined,
      direccion: api.direccion ?? undefined,
      estadoCivil: api.estadoCivil ?? undefined,
      ocupacion: api.ocupacion ?? undefined,
      contactoEmergencia,
      tipoSangre: api.tipoSangre ?? undefined,
      alergias: this.parseLista(api.alergias),
      medicamentosActuales: [],
      enfermedadesCronicas: [],
      fechaRegistro,
      activo: api.estado
    };
  }

  private mapToPayload(paciente: Paciente, includeId = false): PacientePayload {
    const fechaNacimiento = paciente.fechaNacimiento instanceof Date
      ? paciente.fechaNacimiento.toISOString()
      : new Date(paciente.fechaNacimiento).toISOString();

    const contacto = paciente.contactoEmergencia?.nombre ?? '';
    const relacion = paciente.contactoEmergencia?.relacion?.trim();
    const contactoEmergencia = relacion ? `${contacto} (${relacion})` : contacto;

    return {
      ...(includeId && paciente.id ? { pacienteId: paciente.id } : {}),
      cedula: paciente.cedula,
      nombres: paciente.nombres,
      apellidos: paciente.apellidos,
      fechaNacimiento,
      genero: paciente.genero,
      direccion: paciente.direccion,
      telefono: paciente.telefono,
      celular: paciente.celular,
      email: paciente.email,
      estadoCivil: paciente.estadoCivil,
      ocupacion: paciente.ocupacion,
      contactoEmergencia: contactoEmergencia || undefined,
      telefonoEmergencia: paciente.contactoEmergencia?.telefono,
      tipoSangre: paciente.tipoSangre,
      alergias: this.stringifyLista(paciente.alergias),
      estado: paciente.activo,
      fechaRegistro: paciente.fechaRegistro?.toISOString()
    };
  }

  private parseContactoEmergencia(nombre?: string, telefono?: string): Paciente['contactoEmergencia'] | undefined {
    if (!nombre && !telefono) {
      return undefined;
    }

    let contactoNombre = nombre?.trim() ?? '';
    let relacion: string | undefined;

    if (contactoNombre.includes('(') && contactoNombre.includes(')')) {
      const regex = /^(.*)\((.*)\)$/;
      const match = contactoNombre.match(regex);
      if (match) {
        contactoNombre = match[1].trim();
        relacion = match[2].trim();
      }
    }

    return {
      ...(contactoNombre ? { nombre: contactoNombre } : {}),
      ...(telefono ? { telefono } : {}),
      ...(relacion ? { relacion } : {})
    };
  }

  private parseLista(valor?: string): string[] {
    if (!valor) {
      return [];
    }

    return valor
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  private stringifyLista(valores?: string[]): string | undefined {
    if (!valores || valores.length === 0) {
      return undefined;
    }

    return valores.map(valor => valor.trim()).filter(valor => valor.length > 0).join(', ');
  }

  private normalizarGenero(genero?: string): Paciente['genero'] {
    if (!genero) {
      return 'Otro';
    }

    const valor = genero.trim().toUpperCase();
    if (valor.startsWith('M')) {
      return 'M';
    }

    if (valor.startsWith('F')) {
      return 'F';
    }

    return 'Otro';
  }

  private calcularEdadDetallada(fechaNacimiento: Date): string {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);

    let anios = hoy.getFullYear() - nacimiento.getFullYear();
    let meses = hoy.getMonth() - nacimiento.getMonth();
    let dias = hoy.getDate() - nacimiento.getDate();

    if (dias < 0) {
      meses--;
      const diasMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
      dias += diasMesAnterior;
    }

    if (meses < 0) {
      anios--;
      meses += 12;
    }

    const partes = [
      `${anios} ${anios === 1 ? 'año' : 'años'}`,
      `${meses} ${meses === 1 ? 'mes' : 'meses'}`,
      `${dias} ${dias === 1 ? 'día' : 'días'}`
    ];

    return `${partes[0]}, ${partes[1]} y ${partes[2]}`;
  }
}
