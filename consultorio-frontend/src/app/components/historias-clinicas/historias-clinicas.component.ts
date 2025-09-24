import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, distinctUntilChanged } from 'rxjs/operators';
import { HistoriasClinicasService } from '../../services/historias-clinicas.service';
import { ConsultaMedica, ConsultaMedicaPayload, HistoriaClinica, PlantillaConsulta } from '../../models/historia-clinica.model';
import { PacientesService } from '../../services/pacientes.service';
import { Paciente } from '../../models/paciente.model';

@Component({
  selector: 'app-historias-clinicas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './historias-clinicas.component.html',
  styleUrls: ['./historias-clinicas.component.css']
})
export class HistoriasClinicasComponent implements OnInit {
  historias: HistoriaClinica[] = [];
  plantillas: PlantillaConsulta[] = [];
  historiaSeleccionada: HistoriaClinica | null = null;
  antecedentesForm: FormGroup;
  consultaForm: FormGroup;
  alertasConsulta: string[] = [];
  bmiActual: number | null = null;
  bmiClasificacion = '';
  cargandoHistorias = false;
  cargandoPlantillas = false;
  cargandoPacientes = false;
  guardandoAntecedentes = false;
  guardandoConsulta = false;
  creandoHistoria = false;
  mensajeError?: string;
  mensajePlantillas?: string;
  mensajeAntecedentesExito?: string;
  private avisoAntecedentesTimeout?: ReturnType<typeof setTimeout>;
  pacientes: Paciente[] = [];
  pacienteControl = new FormControl<number | null>(null);
  pacienteFiltradoId: number | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly historiasService: HistoriasClinicasService,
    private readonly pacientesService: PacientesService
  ) {
    // Configura el formulario de antecedentes sin campos obligatorios pero listo para persistir datos.
    this.antecedentesForm = this.fb.group({
      antecedentesPersonales: [''],
      antecedentesFamiliares: [''],
      vacunas: [''],
      alergias: ['']
    });

    // Configura el formulario de consulta estableciendo validaciones para campos clínicos obligatorios.
    this.consultaForm = this.fb.group({
      fechaConsulta: [this.hoy, Validators.required],
      plantillaId: [null],
      motivoConsulta: ['', [Validators.required, Validators.maxLength(200)]],
      sintomas: ['', [Validators.required, Validators.maxLength(2000)]],
      diagnostico: ['', [Validators.required, Validators.maxLength(2000)]],
      tratamiento: ['', [Validators.required, Validators.maxLength(2000)]],
      observaciones: [''],
      pesoKg: [null, [Validators.min(1)]],
      estaturaCm: [null, [Validators.min(40)]],
      temperaturaC: [null],
      saturacionPorcentaje: [null, [Validators.min(0), Validators.max(100)]],
      frecuenciaCardiaca: [null],
      presionSistolica: [null],
      presionDiastolica: [null],
      perimetroCefalicoCm: [null],
      pancita: ['']
    });
  }

  // Obtiene la fecha actual en formato ISO corto para precargar la fecha de la consulta.
  private get hoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Inicializa la carga de datos y las suscripciones necesarias cuando el componente se monta.
  ngOnInit(): void {
    this.cargarPlantillas();
    this.cargarPacientes();
    this.cargarHistorias();

    this.pacienteControl.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe((pacienteId) => {
        this.cargarHistorias(pacienteId ?? undefined);
      });

    this.consultaForm.get('pesoKg')?.valueChanges.subscribe(() => this.actualizarImc());
    this.consultaForm.get('estaturaCm')?.valueChanges.subscribe(() => this.actualizarImc());
    this.consultaForm.get('plantillaId')?.valueChanges.subscribe((id) => this.aplicarPlantilla(id));
  }

  // Carga las historias clínicas disponibles, permitiendo filtrar por paciente si se selecciona alguno.
  cargarHistorias(pacienteId?: number): void {
    this.pacienteFiltradoId = pacienteId ?? null;
    this.cargandoHistorias = true;
    this.mensajeError = undefined;

    this.historiasService.obtenerHistorias(pacienteId)
      .pipe(finalize(() => (this.cargandoHistorias = false)))
      .subscribe({
        next: (historias) => {
          this.historias = historias;

          if (historias.length === 0) {
            this.historiaSeleccionada = null;
            this.alertasConsulta = [];
            this.bmiActual = null;
            this.bmiClasificacion = '';
            return;
          }

          if (this.historiaSeleccionada) {
            const actualizada = historias.find(h => h.historiaClinicaId === this.historiaSeleccionada!.historiaClinicaId);
            if (actualizada) {
              this.seleccionarHistoria(actualizada);
              return;
            }
          }

          this.seleccionarHistoria(historias[0]);
        },
        error: (error) => {
          console.error('No se pudieron cargar las historias clínicas', error);
          this.mensajeError = 'No se pudieron cargar las historias clínicas. Intenta nuevamente.';
        }
      });
  }

  // Obtiene las plantillas de consulta rápidas para facilitar el llenado del formulario clínico.
  cargarPlantillas(): void {
    this.cargandoPlantillas = true;
    this.mensajePlantillas = undefined;
    this.historiasService.obtenerPlantillas()
      .pipe(finalize(() => (this.cargandoPlantillas = false)))
      .subscribe({
        next: (plantillas) => {
          this.plantillas = Array.isArray(plantillas) ? plantillas : [];

          if (this.plantillas.length === 0) {
            this.mensajePlantillas = 'No hay plantillas rápidas disponibles. Completa los campos manualmente.';
          } else {
            this.mensajePlantillas = undefined;
          }
        },
        error: (error) => {
          console.error('No se pudieron cargar las plantillas de consulta', error);
          this.plantillas = [];
          this.mensajePlantillas = 'No se pudieron cargar las plantillas rápidas. Intenta nuevamente más tarde.';
        }
      });
  }

  // Recupera el catálogo de pacientes y administra el estado del selector en la vista.
  cargarPacientes(): void {
    this.cargandoPacientes = true;
    this.actualizarEstadoPacienteControl(true);
    this.pacientesService.obtenerTodos()
      .pipe(
        finalize(() => {
          this.cargandoPacientes = false;
          this.actualizarEstadoPacienteControl(false);
        })
      )
      .subscribe({
        next: (pacientes) => {
          this.pacientes = pacientes;
        },
        error: (error) => {
          console.error('No se pudieron cargar los pacientes', error);
          this.pacientes = [];
        }
      });
  }

  // Permite crear una historia clínica nueva para el paciente seleccionado.
  crearHistoriaParaPaciente(): void {
    const pacienteId = this.pacienteControl.value;
    if (!pacienteId) {
      return;
    }

    const existente = this.historias.find(h => h.pacienteId === pacienteId);
    if (existente) {
      this.seleccionarHistoria(existente);
      return;
    }

    this.creandoHistoria = true;
    this.mensajeError = undefined;

    this.historiasService.crearHistoria({ pacienteId })
      .pipe(finalize(() => (this.creandoHistoria = false)))
      .subscribe({
        next: (historia) => {
          this.actualizarListado(historia);
          this.seleccionarHistoria(historia);
        },
        error: (error) => {
          console.error('No se pudo crear la historia clínica', error);
          this.mensajeError = 'No se pudo crear la historia clínica para el paciente seleccionado.';
        }
      });
  }

  // Define la historia seleccionada y reinicia formularios auxiliares ligados a la consulta.
  seleccionarHistoria(historia: HistoriaClinica): void {
    this.historiaSeleccionada = historia;
    this.alertasConsulta = [];
    this.bmiActual = null;
    this.bmiClasificacion = '';
    this.mensajeAntecedentesExito = undefined;
    if (this.avisoAntecedentesTimeout) {
      clearTimeout(this.avisoAntecedentesTimeout);
      this.avisoAntecedentesTimeout = undefined;
    }

    this.antecedentesForm.patchValue({
      antecedentesPersonales: historia.antecedentesPersonales ?? '',
      antecedentesFamiliares: historia.antecedentesFamiliares ?? '',
      vacunas: historia.vacunas ?? '',
      alergias: historia.alergias ?? ''
    });

    this.consultaForm.reset({
      fechaConsulta: this.hoy,
      plantillaId: null,
      motivoConsulta: '',
      sintomas: '',
      diagnostico: '',
      tratamiento: '',
      observaciones: '',
      pesoKg: null,
      estaturaCm: null,
      temperaturaC: null,
      saturacionPorcentaje: null,
      frecuenciaCardiaca: null,
      presionSistolica: null,
      presionDiastolica: null,
      perimetroCefalicoCm: null,
      pancita: ''
    });
  }

  // Envía los antecedentes médicos del paciente al backend para su persistencia.
  guardarAntecedentes(): void {
    if (!this.historiaSeleccionada) {
      return;
    }

    this.guardandoAntecedentes = true;
    this.mensajeAntecedentesExito = undefined;
    if (this.avisoAntecedentesTimeout) {
      clearTimeout(this.avisoAntecedentesTimeout);
      this.avisoAntecedentesTimeout = undefined;
    }
    const payload = this.antecedentesForm.value;

    this.historiasService.actualizarHistoria(this.historiaSeleccionada.historiaClinicaId, payload)
      .pipe(finalize(() => (this.guardandoAntecedentes = false)))
      .subscribe({
        next: (historiaActualizada) => {
          this.actualizarListado(historiaActualizada);
          this.historiaSeleccionada = historiaActualizada;
          this.mensajeAntecedentesExito = 'Antecedentes guardados correctamente.';
          this.avisoAntecedentesTimeout = setTimeout(() => {
            this.mensajeAntecedentesExito = undefined;
            this.avisoAntecedentesTimeout = undefined;
          }, 4000);
        },
        error: (error) => {
          console.error('No se pudieron guardar los antecedentes', error);
          this.mensajeError = 'Ocurrió un error al guardar los antecedentes.';
        }
      });
  }

  // Valida y envía una nueva consulta médica, mostrando alertas cuando falte información clave.
  registrarConsulta(): void {
    if (!this.historiaSeleccionada) {
      return;
    }

    if (this.consultaForm.invalid) {
      this.consultaForm.markAllAsTouched();
      this.mostrarAlertasDeValidacion();
      return;
    }

    const valores = this.consultaForm.value;
    const pesoValor = valores.pesoKg;
    const estaturaValor = valores.estaturaCm;
    const pesoKg = pesoValor !== null && pesoValor !== undefined && pesoValor !== '' ? Number(pesoValor) : undefined;
    const estaturaCm = estaturaValor !== null && estaturaValor !== undefined && estaturaValor !== '' ? Number(estaturaValor) : undefined;

    const payload: ConsultaMedicaPayload = {
      fechaConsulta: valores.fechaConsulta,
      motivoConsulta: valores.motivoConsulta,
      sintomas: valores.sintomas,
      diagnostico: valores.diagnostico,
      tratamiento: valores.tratamiento,
      observaciones: valores.observaciones || undefined,
      temperaturaC: valores.temperaturaC !== null && valores.temperaturaC !== undefined ? Number(valores.temperaturaC) : undefined,
      saturacionPorcentaje: valores.saturacionPorcentaje !== null && valores.saturacionPorcentaje !== undefined
        ? Number(valores.saturacionPorcentaje)
        : undefined,
      frecuenciaCardiaca: valores.frecuenciaCardiaca !== null && valores.frecuenciaCardiaca !== undefined ? Number(valores.frecuenciaCardiaca) : undefined,
      presionSistolica: valores.presionSistolica !== null && valores.presionSistolica !== undefined ? Number(valores.presionSistolica) : undefined,
      presionDiastolica: valores.presionDiastolica !== null && valores.presionDiastolica !== undefined ? Number(valores.presionDiastolica) : undefined,
      perimetroCefalicoCm: valores.perimetroCefalicoCm !== null && valores.perimetroCefalicoCm !== undefined ? Number(valores.perimetroCefalicoCm) : undefined,
      pancita: valores.pancita && valores.pancita.trim().length > 0 ? valores.pancita.trim() : undefined
    };

    if (pesoKg !== undefined && !Number.isNaN(pesoKg)) {
      payload.pesoKg = pesoKg;
    }

    if (estaturaCm !== undefined && !Number.isNaN(estaturaCm)) {
      payload.estaturaCm = estaturaCm;
    }

    this.guardandoConsulta = true;
    this.alertasConsulta = [];

    this.historiasService.registrarConsulta(this.historiaSeleccionada.historiaClinicaId, payload)
      .pipe(finalize(() => (this.guardandoConsulta = false)))
      .subscribe({
        next: (consulta) => {
          this.alertasConsulta = consulta.alertas ?? [];
          this.bmiActual = consulta.imc;
          this.bmiClasificacion = consulta.clasificacionImc;
          this.recargarHistoria(this.historiaSeleccionada!.historiaClinicaId);
          this.consultaForm.reset({
            fechaConsulta: this.hoy,
            plantillaId: null,
            motivoConsulta: '',
            sintomas: '',
            diagnostico: '',
            tratamiento: '',
            observaciones: '',
            pesoKg: null,
            estaturaCm: null,
            temperaturaC: null,
            saturacionPorcentaje: null,
            frecuenciaCardiaca: null,
            presionSistolica: null,
            presionDiastolica: null,
            perimetroCefalicoCm: null,
            pancita: ''
          });
        },
        error: (error) => {
          console.error('No se pudo registrar la consulta médica', error);
          if (error.error?.errores?.length) {
            this.alertasConsulta = error.error.errores;
          } else {
            this.mensajeError = 'Ocurrió un error al registrar la consulta médica.';
          }
        }
      });
  }

  // Convierte fechas ISO en un formato legible para la interfaz.
  formatearFecha(fecha: string): string {
    if (!fecha) {
      return '—';
    }

    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // Selecciona el ícono adecuado según el contenido de la alerta clínica.
  obtenerIconoAlerta(alerta: string): string {
    if (alerta.toLowerCase().includes('fiebre')) {
      return 'fa-thermometer-half';
    }
    if (alerta.toLowerCase().includes('presión')) {
      return 'fa-heartbeat';
    }
    if (alerta.toLowerCase().includes('frecuencia')) {
      return 'fa-heart';
    }
    if (alerta.toLowerCase().includes('imc')) {
      return 'fa-weight';
    }
    return 'fa-exclamation-circle';
  }

  // Copia los datos de la plantilla elegida al formulario para agilizar el llenado.
  private aplicarPlantilla(plantillaId: number | null): void {
    if (!plantillaId) {
      return;
    }

    const plantilla = this.plantillas.find(p => p.plantillaConsultaId === plantillaId);
    if (!plantilla) {
      return;
    }

    this.consultaForm.patchValue({
      motivoConsulta: plantilla.motivoConsulta ?? this.consultaForm.value.motivoConsulta,
      sintomas: plantilla.sintomas ?? this.consultaForm.value.sintomas,
      diagnostico: plantilla.diagnostico ?? this.consultaForm.value.diagnostico,
      tratamiento: plantilla.tratamiento ?? this.consultaForm.value.tratamiento,
      observaciones: plantilla.observaciones ?? this.consultaForm.value.observaciones
    });
  }

  // Construye mensajes explicativos para los campos obligatorios y muestra una alerta consolidada.
  private mostrarAlertasDeValidacion(): void {
    const mensajes: string[] = [];
    const fechaConsulta = this.consultaForm.get('fechaConsulta');
    const motivoConsulta = this.consultaForm.get('motivoConsulta');
    const sintomas = this.consultaForm.get('sintomas');
    const diagnostico = this.consultaForm.get('diagnostico');
    const tratamiento = this.consultaForm.get('tratamiento');
    const pesoKg = this.consultaForm.get('pesoKg');
    const estaturaCm = this.consultaForm.get('estaturaCm');
    const saturacionPorcentaje = this.consultaForm.get('saturacionPorcentaje');

    if (fechaConsulta?.hasError('required')) {
      mensajes.push('La fecha de la consulta es obligatoria. Selecciona una fecha válida.');
    }

    if (motivoConsulta?.hasError('required')) {
      mensajes.push('El motivo de la consulta es obligatorio. Describe brevemente la razón de la visita.');
    }

    if (sintomas?.hasError('required')) {
      mensajes.push('Los síntomas son obligatorios. Detalla los signos o molestias reportados por el paciente.');
    }

    if (diagnostico?.hasError('required')) {
      mensajes.push('El diagnóstico es obligatorio. Ingresa la valoración médica del caso.');
    }

    if (tratamiento?.hasError('required')) {
      mensajes.push('El tratamiento es obligatorio. Registra las indicaciones terapéuticas entregadas.');
    }

    if (
      pesoKg?.hasError('min') &&
      pesoKg.value !== null &&
      pesoKg.value !== undefined &&
      pesoKg.value !== ''
    ) {
      mensajes.push('Si registras el peso del paciente, debe ser mayor a 1 kg para calcular el IMC correctamente.');
    }

    if (
      estaturaCm?.hasError('min') &&
      estaturaCm.value !== null &&
      estaturaCm.value !== undefined &&
      estaturaCm.value !== ''
    ) {
      mensajes.push('Si registras la estatura del paciente, debe ser mayor a 40 cm para calcular el IMC correctamente.');
    }

    if (
      (saturacionPorcentaje?.hasError('min') || saturacionPorcentaje?.hasError('max')) &&
      saturacionPorcentaje?.value !== null &&
      saturacionPorcentaje?.value !== undefined
    ) {
      mensajes.push('La saturación de oxígeno debe estar en un rango de 0 a 100%.');
    }

    if (mensajes.length > 0) {
      alert(mensajes.join('\n'));
    }
  }

  // Calcula el IMC provisional con los valores del formulario y actualiza la vista previa.
  private actualizarImc(): void {
    const pesoValor = this.consultaForm.get('pesoKg')?.value;
    const estaturaValor = this.consultaForm.get('estaturaCm')?.value;
    const peso = pesoValor !== null && pesoValor !== undefined && pesoValor !== '' ? Number(pesoValor) : NaN;
    const estatura = estaturaValor !== null && estaturaValor !== undefined && estaturaValor !== '' ? Number(estaturaValor) : NaN;

    if (!Number.isNaN(peso) && peso > 0 && !Number.isNaN(estatura) && estatura > 0) {
      const estaturaMetros = estatura / 100;
      const imc = peso / (estaturaMetros * estaturaMetros);
      this.bmiActual = parseFloat(imc.toFixed(2));
      this.bmiClasificacion = this.clasificarImc(this.bmiActual);
    } else {
      this.bmiActual = null;
      this.bmiClasificacion = '';
    }
  }

  // Determina la categoría del IMC a partir del valor calculado.
  private clasificarImc(imc: number | null): string {
    if (imc === null) {
      return '';
    }
    if (imc < 18.5) {
      return 'Bajo peso';
    }
    if (imc < 25) {
      return 'Normal';
    }
    if (imc < 30) {
      return 'Sobrepeso';
    }
    return 'Obesidad';
  }

  // Solicita la historia clínica actualizada tras registrar una consulta para refrescar la lista y los detalles.
  private recargarHistoria(id: number): void {
    this.historiasService.obtenerHistoria(id).subscribe({
      next: (historia) => {
        this.actualizarListado(historia);
        this.historiaSeleccionada = historia;
      },
      error: (error) => console.error('No se pudo actualizar la historia clínica seleccionada', error)
    });
  }

  // Sustituye o agrega la historia clínica recibida para mantener sincronizado el listado local.
  private actualizarListado(historiaActualizada: HistoriaClinica): void {
    const indice = this.historias.findIndex(h => h.historiaClinicaId === historiaActualizada.historiaClinicaId);
    if (indice >= 0) {
      const copia = [...this.historias];
      copia[indice] = historiaActualizada;
      this.historias = copia;
    } else {
      this.historias = [...this.historias, historiaActualizada];
    }
  }

  // Controla el estado habilitado del selector de pacientes durante la carga de información.
  private actualizarEstadoPacienteControl(deshabilitar: boolean): void {
    if (deshabilitar) {
      if (!this.pacienteControl.disabled) {
        this.pacienteControl.disable({ emitEvent: false });
      }
      return;
    }

    if (this.pacienteControl.disabled) {
      this.pacienteControl.enable({ emitEvent: false });
    }
  }

  // Expone las consultas ordenadas descendentemente por fecha para su representación en pantalla.
  get historialConsultas(): ConsultaMedica[] {
    const consultas = this.historiaSeleccionada?.consultas ?? [];

    return [...consultas].sort((a, b) => {
      const fechaB = Date.parse(b.fechaConsulta ?? '') || 0;
      const fechaA = Date.parse(a.fechaConsulta ?? '') || 0;

      if (fechaB !== fechaA) {
        return fechaB - fechaA;
      }

      return (b.consultaMedicaId ?? 0) - (a.consultaMedicaId ?? 0);
    });
  }

  // Obtiene el IMC más reciente registrado en las consultas disponibles.
  get imcUltimoControl(): number | null {
    for (const consulta of this.historialConsultas) {
      if (consulta.imc !== null && consulta.imc !== undefined) {
        return consulta.imc;
      }
    }

    return null;
  }
}
