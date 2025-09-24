import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Observable, Subject, interval } from 'rxjs';
import { finalize, switchMap, takeUntil, tap } from 'rxjs/operators';
import { AgendaSemanalDia, Cita, CitaPayload, DailyStats, EstadoCita } from '../../models/cita.model';
import { HorarioAtencion, HorarioAtencionPayload } from '../../models/horario-atencion.model';
import { CitasService } from '../../services/citas.service';
import { PacientesService } from '../../services/pacientes.service';
import { Paciente } from '../../models/paciente.model';
import { HorariosService } from '../../services/horarios.service';

type VistaCitas = 'agenda' | 'semana' | 'lista';

type QuickAction = {
  label: string;
  estado: EstadoCita;
  icon: string;
  theme: 'primary' | 'success' | 'warning';
};

type ModoPaciente = 'existente' | 'nuevo';

type CalendarioDia = {
  date: Date;
  iso: string;
  inMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
};

type CalendarioCitaDia = {
  date: Date;
  iso: string;
  inMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  isAvailable: boolean;
};

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './citas.component.html',
  styleUrls: ['./citas.component.css']
})
export class CitasComponent implements OnInit, OnDestroy {
  view: VistaCitas = 'agenda';
  viewOptions = [
    { id: 'agenda' as VistaCitas, label: 'Agenda diaria', icon: 'fa-calendar-day' },
    { id: 'semana' as VistaCitas, label: 'Calendario semanal', icon: 'fa-calendar-week' },
    { id: 'lista' as VistaCitas, label: 'Lista completa', icon: 'fa-list' }
  ];

  selectedDate = new Date();
  selectedDateInput = this.toDateString(this.selectedDate);

  dailyAppointments: Cita[] = [];
  weeklyAgenda: AgendaSemanalDia[] = [];
  allAppointments: Cita[] = [];
  stats: DailyStats | null = null;
  availableSlots: { start: string; end: string }[] = [];
  horarios: HorarioAtencion[] = [];
  horariosPorFecha = new Map<string, HorarioAtencion>();
  horariosPersistidosPorFecha = new Map<string, HorarioAtencion>();
  fechasDisponibles: string[] = [];
  private ultimaFechaValidaCita: string | null = null;
  private readonly diasEliminando = new Set<number>();

  horariosForm: FormGroup;
  guardandoHorarios = false;
  mensajeHorarioExito?: string;
  mensajeHorarioError?: string;
  calendarioActual = new Date();
  semanasCalendario: CalendarioDia[][] = [];
  diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  calendarioFechaCitaActual = new Date();
  semanasCalendarioCita: CalendarioCitaDia[][] = [];
  mostrarCalendarioFechaCita = false;
  private mesesDisponiblesFechaCita: string[] = [];
  private fechasDisponiblesSet = new Set<string>();

  loadingDaily = false;
  loadingWeekly = false;
  loadingList = false;
  loadingStats = false;
  updating = new Set<number>();
  cargandoPacientes = false;
  guardandoCita = false;
  mensajeCitaExito?: string;
  mensajeCitaError?: string;
  citaForm: FormGroup;
  pacientes: Paciente[] = [];
  private readonly instruccionesCamposCita: Record<string, string> = {
    pacienteId: 'Paciente existente: selecciona un paciente de la lista desplegable.',
    'nuevoPaciente.cedula': 'Cédula del nuevo paciente: ingresa 10 dígitos numéricos sin espacios.',
    'nuevoPaciente.nombres': 'Nombres del nuevo paciente: escribe los nombres completos.',
    'nuevoPaciente.apellidos': 'Apellidos del nuevo paciente: escribe los apellidos completos.',
    'nuevoPaciente.fechaNacimiento': 'Fecha de nacimiento: selecciona una fecha válida en formato AAAA-MM-DD.',
    'nuevoPaciente.genero': 'Género del nuevo paciente: elige una opción disponible.',
    'nuevoPaciente.telefono': 'Teléfono del nuevo paciente: registra un número de contacto de 10 dígitos.',
    fecha: 'Fecha de la cita: selecciona el día en formato AAAA-MM-DD.',
    horaInicio: 'Hora de inicio: elige la hora de inicio en formato 24 horas HH:MM.',
    horaFin: 'Hora de fin: especifica una hora de finalización posterior a la hora de inicio en formato HH:MM.'
  };

  private readonly destroy$ = new Subject<void>();
  @ViewChild('fechaCitaSelector', { static: false })
  private fechaCitaSelector?: ElementRef<HTMLDivElement>;
  constructor(
    private readonly citasService: CitasService,
    private readonly fb: FormBuilder,
    private readonly pacientesService: PacientesService,
    private readonly horariosService: HorariosService
  ) {
    this.citaForm = this.crearFormularioCita();
    this.horariosForm = this.fb.group({
      dias: this.fb.array<FormGroup>([])
    });

    this.calendarioActual = this.obtenerPrimerDiaMes();

    this.citaForm
      .get('fecha')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(value => this.onFechaCitaControlChange((value ?? '').toString()));

    this.diasFormArray.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.sincronizarHorariosLocales(false);
        this.updateAvailableSlots();
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.mostrarCalendarioFechaCita) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    if (this.fechaCitaSelector?.nativeElement.contains(target)) {
      return;
    }

    this.mostrarCalendarioFechaCita = false;
  }

  ngOnInit(): void {
    this.cargarPacientes();
    this.generarCalendario();
    this.cargarHorarios();
    this.refreshAll();
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadDailyAppointments(false);
        this.loadDailyStats(false);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedDateLabel(): string {
    const label = this.selectedDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  get weekRangeLabel(): string {
    const start = this.getWeekStart(this.selectedDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startLabel = start.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    });
    const endLabel = end.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    });

    return `${startLabel} - ${endLabel}`;
  }

  get modoPaciente(): ModoPaciente {
    return this.citaForm.get('modoPaciente')?.value as ModoPaciente;
  }

  get nuevoPacienteForm(): FormGroup {
    return this.citaForm.get('nuevoPaciente') as FormGroup;
  }

  get diasFormArray(): FormArray<FormGroup> {
    return this.horariosForm.get('dias') as FormArray<FormGroup>;
  }

  get diasSeleccionadosControls(): FormGroup[] {
    return this.diasFormArray.controls as FormGroup[];
  }

  get etiquetaMesActual(): string {
    const etiqueta = this.calendarioActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1);
  }

  get etiquetaMesCalendarioFechaCita(): string {
    const etiqueta = this.calendarioFechaCitaActual.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    });
    return etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1);
  }

  get fechaCitaSeleccionadaLabel(): string {
    const value = (this.citaForm.get('fecha')?.value ?? '').toString();
    if (!value) {
      return 'Selecciona una fecha';
    }
    return this.formatSelectedDate(value);
  }

  setView(view: VistaCitas): void {
    if (this.view === view) {
      return;
    }

    this.view = view;

    if (view === 'agenda') {
      this.loadDailyAppointments(true);
      this.loadDailyStats(true);
    } else if (view === 'semana') {
      this.loadWeeklyAppointments(true);
    } else {
      this.loadAllAppointments(true);
    }
  }

  changeDay(offset: number): void {
    if (offset === 0) {
      return;
    }

    if (this.fechasDisponibles.length) {
      const actual = this.esFechaDisponible(this.selectedDateInput)
        ? this.selectedDateInput
        : this.obtenerFechaDisponibleMasCercana(this.selectedDateInput) ?? '';

      if (!actual) {
        return;
      }

      let destino: string | null = null;

      if (offset > 0) {
        destino = this.obtenerFechaDisponiblePosterior(actual);
      } else {
        destino = this.obtenerFechaDisponibleAnterior(actual);
      }

      if (destino) {
        this.actualizarFechaSeleccionada(destino);
      }

      return;
    }

    const nextDate = new Date(this.selectedDate);
    nextDate.setDate(this.selectedDate.getDate() + offset);
    this.selectedDate = nextDate;
    this.selectedDateInput = this.toDateString(this.selectedDate);
    this.citaForm.get('fecha')?.setValue(this.selectedDateInput);
    this.citaForm.get('horaInicio')?.setValue('', { emitEvent: false });
    this.citaForm.get('horaFin')?.setValue('', { emitEvent: false });
    this.availableSlots = [];
    this.loadDailyAppointments(true);
    this.loadDailyStats(true);
    this.loadWeeklyAppointments(false);
    this.actualizarCalendarioFechaCita();
  }

  onDateInputChange(value: string): void {
    if (!value) {
      return;
    }

    if (!this.esFechaDisponible(value)) {
      this.citaForm
        .get('fecha')
        ?.setValue(this.ultimaFechaValidaCita ?? '', { emitEvent: false });
      this.citaForm.get('fecha')?.markAsTouched();
      this.citaForm.get('fecha')?.updateValueAndValidity({ emitEvent: false });
      return;
    }

    this.actualizarFechaSeleccionada(value);
  }

  loadDailyAppointments(showLoader = true): void {
    if (showLoader) {
      this.loadingDaily = true;
    }

    const date = this.toDateString(this.selectedDate);
    this.citasService.getDaily(date).subscribe({
      next: citas => {
        this.dailyAppointments = citas;
        this.loadingDaily = false;
        this.updateAvailableSlots(citas);
      },
      error: error => {
        console.error('No se pudieron cargar las citas del día', error);
        this.loadingDaily = false;
        this.availableSlots = [];
      }
    });
  }

  loadWeeklyAppointments(showLoader = true): void {
    if (showLoader) {
      this.loadingWeekly = true;
    }

    const start = this.toDateString(this.getWeekStart(this.selectedDate));
    this.citasService.getWeekly(start).subscribe({
      next: agenda => {
        this.weeklyAgenda = agenda;
        this.loadingWeekly = false;
      },
      error: error => {
        console.error('No se pudo cargar la agenda semanal', error);
        this.loadingWeekly = false;
      }
    });
  }

  loadAllAppointments(showLoader = true): void {
    if (showLoader) {
      this.loadingList = true;
    }

    this.citasService.getAll().subscribe({
      next: citas => {
        this.allAppointments = citas;
        this.loadingList = false;
      },
      error: error => {
        console.error('No se pudo cargar la lista completa de citas', error);
        this.loadingList = false;
      }
    });
  }

  loadDailyStats(showLoader = true): void {
    if (showLoader) {
      this.loadingStats = true;
    }

    const date = this.toDateString(this.selectedDate);
    this.citasService.getDailyStats(date).subscribe({
      next: stats => {
        this.stats = stats;
        this.loadingStats = false;
      },
      error: error => {
        console.error('No se pudieron cargar las estadísticas del día', error);
        this.loadingStats = false;
        this.stats = null;
      }
    });
  }

  cargarHorarios(): void {
    this.mensajeHorarioError = undefined;
    this.horariosService.obtenerHorarios().subscribe({
      next: horarios => {
        this.establecerHorarios(horarios);
      },
      error: error => {
        console.error('No se pudieron cargar los horarios de atención', error);
        this.establecerHorarios([]);
        this.mensajeHorarioError = 'No se pudieron cargar los horarios de atención.';
      }
    });
  }

  private establecerHorarios(horarios: HorarioAtencion[]): void {
    const ordenados = [...horarios]
      .map(horario => ({
        ...horario,
        fecha: this.normalizarFechaValor(horario.fecha),
        horaInicio: this.normalizarHora(horario.horaInicio),
        horaFin: this.normalizarHora(horario.horaFin)
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    this.horarios = ordenados;
    this.sincronizarHorariosPersistidos();
    this.diasFormArray.clear();

    ordenados.forEach(horario => {
      this.diasFormArray.push(
        this.crearHorarioDiaGroup(horario.fecha, horario.horaInicio, horario.horaFin, horario.horarioAtencionId)
      );
    });

    this.horariosForm.markAsPristine();
    this.horariosForm.markAsUntouched();
    this.sincronizarHorariosLocales();
    this.generarCalendario();
    this.updateAvailableSlots();
  }

  cargarPacientes(seleccionarId?: number): void {
    this.cargandoPacientes = true;
    const pacienteActual = this.citaForm?.get('pacienteId')?.value as number | null;

    this.pacientesService.obtenerTodos()
      .pipe(finalize(() => (this.cargandoPacientes = false)))
      .subscribe({
        next: pacientes => {
          this.pacientes = pacientes;
          const control = this.citaForm.get('pacienteId');
          if (seleccionarId) {
            control?.setValue(seleccionarId, { emitEvent: false });
            control?.updateValueAndValidity({ emitEvent: false });
          } else if (pacienteActual) {
            const existe = this.pacientes.some(p => (p.id ?? null) === pacienteActual);
            control?.setValue(existe ? pacienteActual : null, { emitEvent: false });
            control?.updateValueAndValidity({ emitEvent: false });
          }
        },
        error: error => {
          console.error('No se pudieron cargar los pacientes', error);
          this.pacientes = [];
        }
      });
  }

  // cita con validaciones específicas según el modo de captura de paciente
  programarCita(): void {
    this.mensajeCitaExito = undefined;
    this.mensajeCitaError = undefined;

    if (this.citaForm.invalid) {
      this.citaForm.markAllAsTouched();
      if (this.modoPaciente === 'nuevo') {
        this.nuevoPacienteForm.markAllAsTouched();
      }
      const instrucciones = this.obtenerInstruccionesCamposCita();
      alert(`Revisa la información requerida antes de registrar la cita:\n- ${instrucciones.join('\n- ')}`);
      return;
    }

    const valores = this.citaForm.getRawValue();
    if (!this.availableSlots.length) {
      this.mensajeCitaError = 'No hay horarios disponibles para la fecha seleccionada.';
      return;
    }

    if (!valores.horaInicio || !valores.horaFin) {
      this.mensajeCitaError = 'Selecciona un horario disponible para agendar la cita.';
      return;
    }

    const slotSeleccionado = this.availableSlots.find(
      slot => slot.start === valores.horaInicio && slot.end === valores.horaFin
    );

    if (!slotSeleccionado) {
      this.mensajeCitaError = 'El horario seleccionado ya no está disponible. Actualiza la lista de horarios.';
      this.updateAvailableSlots();
      return;
    }

    this.citaForm.get('horaFin')?.setValue(slotSeleccionado.end, { emitEvent: false });
    let nuevoPacienteId: number | null = null;

    this.guardandoCita = true;

    let solicitud$: Observable<Cita>;

    if (valores.modoPaciente === 'existente') {
      if (!valores.pacienteId) {
        this.guardandoCita = false;
        const instrucciones = this.obtenerInstruccionesCamposCita();
        this.mensajeCitaError = 'Selecciona un paciente válido para registrar la cita.';
        alert(`Antes de continuar debes corregir los campos obligatorios:\n- ${instrucciones.join('\n- ')}`);
        return;
      }
      solicitud$ = this.citasService.create(this.crearPayloadCita(valores.pacienteId, valores));
    } else {
      const nuevoPaciente = this.nuevoPacienteForm.getRawValue();
      const pacienteParaCrear: Paciente = {
        cedula: nuevoPaciente.cedula,
        nombres: nuevoPaciente.nombres,
        apellidos: nuevoPaciente.apellidos,
        fechaNacimiento: new Date(nuevoPaciente.fechaNacimiento),
        edad: '',
        genero: (nuevoPaciente.genero ?? 'Otro') as Paciente['genero'],
        telefono: nuevoPaciente.telefono ? nuevoPaciente.telefono : undefined,
        email: nuevoPaciente.email ? nuevoPaciente.email : undefined,
        activo: true
      };

      solicitud$ = this.pacientesService.agregarPaciente(pacienteParaCrear).pipe(
        switchMap(pacienteCreado => {
          if (!pacienteCreado.id) {
            throw new Error('No se pudo crear el paciente');
          }
          nuevoPacienteId = pacienteCreado.id;
          return this.citasService.create(this.crearPayloadCita(pacienteCreado.id, valores)).pipe(
            tap(() => this.cargarPacientes(pacienteCreado.id))
          );
        })
      );
    }

    const pacienteSeleccionActual = this.citaForm.get('pacienteId')?.value as number | null;

    solicitud$
      .pipe(finalize(() => (this.guardandoCita = false)))
      .subscribe({
        next: () => {
          const referencia = nuevoPacienteId ?? pacienteSeleccionActual ?? undefined;
          this.mensajeCitaExito = 'Cita registrada correctamente.';
          this.resetFormularioCita(referencia);
          this.refreshAll();
        },
        error: error => {
          console.error('No se pudo registrar la cita', error);
          this.mensajeCitaError = 'No se pudo registrar la cita. Intenta nuevamente.';
        }
      });
  }

  onHoraInicioSelected(value: string): void {
    if (!value) {
      this.citaForm.get('horaFin')?.setValue('', { emitEvent: false });
      return;
    }

    const slot = this.availableSlots.find(s => s.start === value);
    if (slot) {
      this.citaForm.get('horaFin')?.setValue(slot.end, { emitEvent: false });
      return;
    }

    const finCalculado = this.sumarMinutos(value, 30);
    this.citaForm.get('horaFin')?.setValue(finCalculado ?? '', { emitEvent: false });
  }

  guardarHorarios(): void {
    this.mensajeHorarioExito = undefined;
    this.mensajeHorarioError = undefined;

    if (!this.diasSeleccionadosControls.length) {
      this.mensajeHorarioError = 'Selecciona al menos un día de atención antes de guardar.';
      return;
    }

    if (this.horariosForm.invalid) {
      this.horariosForm.markAllAsTouched();
      this.mensajeHorarioError = 'Revisa los días seleccionados y corrige los horarios.';
      return;
    }

    const horarioPayload: HorarioAtencionPayload[] = this.diasSeleccionadosControls.map(ctrl => ({
      fecha: (ctrl.get('fecha')?.value ?? '').toString(),
      horaInicio: (ctrl.get('horaInicio')?.value ?? '').toString(),
      horaFin: (ctrl.get('horaFin')?.value ?? '').toString()
    }));

    this.guardandoHorarios = true;

    this.horariosService
      .guardarHorarios(horarioPayload)
      .pipe(finalize(() => (this.guardandoHorarios = false)))
      .subscribe({
        next: horarios => {
          this.mensajeHorarioExito = 'Horarios actualizados correctamente.';
          this.establecerHorarios(horarios);
        },
        error: error => {
          console.error('No se pudieron guardar los horarios de atención', error);
          this.mensajeHorarioError = 'No se pudieron guardar los horarios de atención. Intenta nuevamente.';
        }
      });
  }

  cambiarMes(offset: number): void {
    const nuevoMes = new Date(
      this.calendarioActual.getFullYear(),
      this.calendarioActual.getMonth() + offset,
      1
    );
    this.calendarioActual = nuevoMes;
    this.generarCalendario();
  }

  toggleDia(fechaIso: string): void {
    const indexExistente = this.diasSeleccionadosControls.findIndex(
      control => (control.get('fecha')?.value ?? '') === fechaIso
    );

    if (indexExistente >= 0) {
      const control = this.diasFormArray.at(indexExistente) as FormGroup | null;
      const horarioId = Number(control?.get('horarioAtencionId')?.value ?? 0);
      if (horarioId && this.diasEliminando.has(horarioId)) {
        return;
      }

      this.eliminarDia(indexExistente, { origen: 'calendario' });
      return;
    }

    const horarioPrevio = this.horariosPorFecha.get(fechaIso);
    const horaInicio = this.normalizarHora(horarioPrevio?.horaInicio ?? '08:00');
    const horaFin = this.normalizarHora(horarioPrevio?.horaFin ?? '17:00');
    const grupo = this.crearHorarioDiaGroup(fechaIso, horaInicio, horaFin, horarioPrevio?.horarioAtencionId);
    const indiceInsercion = this.encontrarIndiceInsercion(fechaIso);
    this.diasFormArray.insert(indiceInsercion, grupo);

    this.sincronizarHorariosLocales();
    this.updateAvailableSlots();
  }

  eliminarDia(index: number, opciones?: { origen?: 'calendario' | 'boton' }): void {
    const control = (this.diasFormArray.at(index) as FormGroup | null) ?? undefined;
    if (!control) {
      return;
    }

    const horarioId = Number(control.get('horarioAtencionId')?.value ?? 0);
    const fecha = (control.get('fecha')?.value ?? '').toString();
    const estabaDirty = this.horariosForm.dirty;

    const quitarControl = () => {
      this.diasFormArray.removeAt(index);
      if (horarioId) {
        this.horarios = this.horarios.filter(h => h.horarioAtencionId !== horarioId);
        this.sincronizarHorariosPersistidos();
      }
      if (fecha) {
        this.horariosPorFecha.delete(fecha);
      }
      this.sincronizarHorariosLocales();
      this.updateAvailableSlots();

      if (!estabaDirty) {
        this.horariosForm.markAsPristine();
        this.horariosForm.markAsUntouched();
      }
    };

    if (!horarioId) {
      quitarControl();
      return;
    }

    this.mensajeHorarioError = undefined;
    this.mensajeHorarioExito = undefined;
    this.diasEliminando.add(horarioId);

    this.horariosService
      .eliminarHorario(horarioId)
      .pipe(finalize(() => this.diasEliminando.delete(horarioId)))
      .subscribe({
        next: () => {
          quitarControl();
          this.mensajeHorarioExito = 'Día de atención eliminado correctamente.';
        },
        error: error => {
          console.error('No se pudo eliminar el horario de atención', error);
          this.mensajeHorarioError = 'No se pudo eliminar el día seleccionado. Intenta nuevamente.';
          if (opciones?.origen === 'calendario') {
            this.generarCalendario();
          }
        }
      });
  }

  estaEliminandoDia(control: FormGroup): boolean {
    const horarioId = Number(control.get('horarioAtencionId')?.value ?? 0);
    return !!horarioId && this.diasEliminando.has(horarioId);
  }

  formatSelectedDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const valorString = (value ?? '').toString().trim();
    const fechaNormalizada = this.normalizarFechaValor(valorString);
    if (!fechaNormalizada) {
      return valorString;
    }

    let date: Date | null = null;

    if (valorString.includes('T')) {
      const candidata = new Date(valorString);
      date = Number.isNaN(candidata.getTime()) ? null : candidata;
    }

    if (!date) {
      const candidata = new Date(`${fechaNormalizada}T00:00:00`);
      date = Number.isNaN(candidata.getTime()) ? null : candidata;
    }

    if (!date) {
      return fechaNormalizada;
    }

    const texto = date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  private crearHorarioDiaGroup(
    fecha: string,
    horaInicio: string,
    horaFin: string,
    horarioAtencionId?: number | null
  ): FormGroup {
    const fechaNormalizada = this.normalizarFechaValor(fecha);
    const horaInicioNormalizada = this.normalizarHora(horaInicio);
    const horaFinNormalizada = this.normalizarHora(horaFin);
    return this.fb.group(
      {
        horarioAtencionId: [horarioAtencionId ?? null],
        fecha: [fechaNormalizada, Validators.required],
        horaInicio: [horaInicioNormalizada, [Validators.required, this.validarIntervaloTreinta]],
        horaFin: [horaFinNormalizada, [Validators.required, this.validarIntervaloTreinta]]
      },
      { validators: this.validarRangoHoras }
    );
  }

  private encontrarIndiceInsercion(fecha: string): number {
    const controles = this.diasSeleccionadosControls;
    for (let i = 0; i < controles.length; i++) {
      const existente = (controles[i].get('fecha')?.value ?? '').toString();
      if (existente.localeCompare(fecha) > 0) {
        return i;
      }
    }
    return controles.length;
  }

  private sincronizarHorariosPersistidos(): void {
    this.horariosPersistidosPorFecha.clear();
    this.horarios.forEach(horario => {
      const fechaNormalizada = this.normalizarFechaValor(horario.fecha);
      if (!fechaNormalizada) {
        return;
      }

      this.horariosPersistidosPorFecha.set(fechaNormalizada, {
        ...horario,
        fecha: fechaNormalizada
      });
    });
  }

  private sincronizarHorariosLocales(regenerarCalendario = true): void {
    this.horariosPorFecha.clear();
    this.diasSeleccionadosControls.forEach(control => {
      const fecha = this.normalizarFechaValor(control.get('fecha')?.value ?? '');
      if (!fecha) {
        return;
      }

      this.horariosPorFecha.set(fecha, {
        horarioAtencionId: Number(control.get('horarioAtencionId')?.value ?? 0),
        fecha,
        horaInicio: this.normalizarHora((control.get('horaInicio')?.value ?? '').toString()),
        horaFin: this.normalizarHora((control.get('horaFin')?.value ?? '').toString())
      });
    });

    this.fechasDisponibles = [...this.horariosPersistidosPorFecha.keys()].sort();
    this.fechasDisponiblesSet = new Set(this.fechasDisponibles);
    this.mesesDisponiblesFechaCita = Array.from(new Set(this.fechasDisponibles.map(fecha => fecha.slice(0, 7)))).sort();

    const fechaControl = this.citaForm.get('fecha');
    const valorActual = (fechaControl?.value ?? '').toString();
    fechaControl?.updateValueAndValidity({ emitEvent: false });

    if (!this.fechasDisponibles.length) {
      this.limpiarSeleccionFecha();
    } else if (!valorActual || !this.esFechaDisponible(valorActual)) {
      if (regenerarCalendario) {
        const referencia = valorActual || this.selectedDateInput;
        const sugerida = this.obtenerFechaDisponibleMasCercana(referencia) ?? this.fechasDisponibles[0];
        if (sugerida) {
          this.actualizarFechaSeleccionada(sugerida);
        }
      } else {
        this.availableSlots = [];
        this.citaForm.get('horaInicio')?.setValue('', { emitEvent: false });
        this.citaForm.get('horaFin')?.setValue('', { emitEvent: false });
      }
    } else {
      this.ultimaFechaValidaCita = valorActual;
      if (regenerarCalendario) {
        this.updateAvailableSlots();
      }
    }

    if (regenerarCalendario) {
      this.generarCalendario();
    }

    this.actualizarCalendarioFechaCita();
  }

  private generarCalendario(): void {
    const referencia = this.obtenerPrimerDiaMes(this.calendarioActual);
    this.calendarioActual = referencia;
    const primerDiaSemana = (referencia.getDay() + 6) % 7; // Ajuste para iniciar en lunes
    const inicio = new Date(referencia);
    inicio.setDate(referencia.getDate() - primerDiaSemana);

    const semanas: CalendarioDia[][] = [];
    for (let semana = 0; semana < 6; semana++) {
      const dias: CalendarioDia[] = [];
      for (let dia = 0; dia < 7; dia++) {
        const fecha = new Date(inicio);
        const iso = this.toDateString(fecha);
        dias.push({
          date: new Date(fecha),
          iso,
          inMonth: fecha.getMonth() === this.calendarioActual.getMonth(),
          isSelected: this.horariosPorFecha.has(iso),
          isToday: this.esHoy(fecha)
        });
        inicio.setDate(inicio.getDate() + 1);
      }
      semanas.push(dias);
    }

    this.semanasCalendario = semanas;
  }

  private actualizarCalendarioFechaCita(): void {
    if (!this.fechasDisponibles.length) {
      this.mostrarCalendarioFechaCita = false;
      this.semanasCalendarioCita = [];
      return;
    }

    const seleccion = (this.citaForm.get('fecha')?.value ?? '').toString();
    let referenciaIso: string | null = null;

    if (seleccion && this.esFechaDisponible(seleccion)) {
      referenciaIso = seleccion;
    } else {
      referenciaIso = this.obtenerFechaDisponibleMasCercana(seleccion || this.selectedDateInput);
      if (!referenciaIso) {
        referenciaIso = this.fechasDisponibles[0] ?? null;
      }
    }

    if (referenciaIso) {
      const referenciaDate = new Date(`${referenciaIso}T00:00:00`);
      this.calendarioFechaCitaActual = new Date(
        referenciaDate.getFullYear(),
        referenciaDate.getMonth(),
        1
      );
    }

    this.generarCalendarioFechaCita();
  }

  private generarCalendarioFechaCita(): void {
    if (!this.fechasDisponibles.length) {
      this.semanasCalendarioCita = [];
      return;
    }

    const referencia = this.obtenerPrimerDiaMes(this.calendarioFechaCitaActual);
    this.calendarioFechaCitaActual = referencia;
    const primerDiaSemana = (referencia.getDay() + 6) % 7;
    const inicio = new Date(referencia);
    inicio.setDate(referencia.getDate() - primerDiaSemana);

    const seleccionActual = (this.citaForm.get('fecha')?.value ?? '').toString();
    const semanas: CalendarioCitaDia[][] = [];

    for (let semana = 0; semana < 6; semana++) {
      const dias: CalendarioCitaDia[] = [];
      for (let dia = 0; dia < 7; dia++) {
        const fecha = new Date(inicio);
        const iso = this.toDateString(fecha);
        dias.push({
          date: new Date(fecha),
          iso,
          inMonth: fecha.getMonth() === this.calendarioFechaCitaActual.getMonth(),
          isSelected: iso === seleccionActual,
          isToday: this.esHoy(fecha),
          isAvailable: this.fechasDisponiblesSet.has(iso)
        });
        inicio.setDate(inicio.getDate() + 1);
      }
      semanas.push(dias);
    }

    this.semanasCalendarioCita = semanas;
  }

  private obtenerPrimerDiaMes(fechaReferencia: Date = new Date()): Date {
    return new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth(), 1);
  }

  private esHoy(date: Date): boolean {
    const hoy = new Date();
    return (
      date.getFullYear() === hoy.getFullYear() &&
      date.getMonth() === hoy.getMonth() &&
      date.getDate() === hoy.getDate()
    );
  }

  private validarIntervaloTreinta = (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').toString();
    if (!value) {
      return null;
    }

    const minutos = this.toMinutes(value);
    if (minutos % 30 !== 0) {
      return { intervaloInvalido: true };
    }

    return null;
  };

  private validarRangoHoras = (control: AbstractControl): ValidationErrors | null => {
    const horaInicio = (control.get('horaInicio')?.value ?? '').toString();
    const horaFin = (control.get('horaFin')?.value ?? '').toString();

    if (!horaInicio || !horaFin) {
      return null;
    }

    const inicio = this.toMinutes(horaInicio);
    const fin = this.toMinutes(horaFin);

    if (fin <= inicio || fin - inicio < 30 || fin % 30 !== 0 || inicio % 30 !== 0) {
      return { rangoInvalido: true };
    }

    return null;
  };

  executeAction(cita: Cita, action: QuickAction): void {
    this.updating.add(cita.citaId);
    this.citasService.updateEstado(cita.citaId, action.estado).subscribe({
      next: () => {
        this.updating.delete(cita.citaId);
        this.loadDailyAppointments(false);
        this.loadWeeklyAppointments(false);
        this.loadAllAppointments(false);
        this.loadDailyStats(false);
      },
      error: error => {
        console.error('No se pudo actualizar el estado de la cita', error);
        this.updating.delete(cita.citaId);
      }
    });
  }

  eliminarCita(cita: Cita): void {
    const pacienteLabel = cita.pacienteNombre || `Paciente #${cita.pacienteId}`;
    const confirmado = confirm(
      `¿Deseas eliminar la cita programada para las ${cita.horaInicio} del paciente ${pacienteLabel}?`
    );

    if (!confirmado) {
      return;
    }

    this.updating.add(cita.citaId);
    this.citasService.delete(cita.citaId).subscribe({
      next: () => {
        this.updating.delete(cita.citaId);
        this.mensajeCitaExito = 'Cita eliminada correctamente.';
        this.refreshAll();
      },
      error: error => {
        console.error('No se pudo eliminar la cita', error);
        this.mensajeCitaError = 'No se pudo eliminar la cita. Intenta nuevamente.';
        this.updating.delete(cita.citaId);
      }
    });
  }

  getActions(cita: Cita): QuickAction[] {
    switch (cita.estado) {
      case 'Programada':
        return [
          { label: 'Confirmar', estado: 'Confirmada', icon: 'fa-circle-check', theme: 'primary' }
        ];
      case 'Confirmada':
        return [
          { label: 'Iniciar', estado: 'EnCurso', icon: 'fa-play', theme: 'warning' }
        ];
      case 'EnCurso':
        return [
          { label: 'Completar', estado: 'Completada', icon: 'fa-flag-checkered', theme: 'success' }
        ];
      default:
        return [];
    }
  }

  getEstadoClase(estado: EstadoCita): string {
    switch (estado) {
      case 'Programada':
        return 'badge--programada';
      case 'Confirmada':
        return 'badge--confirmada';
      case 'EnCurso':
        return 'badge--encurso';
      case 'Completada':
        return 'badge--completada';
      default:
        return '';
    }
  }

  isUpdating(citaId: number): boolean {
    return this.updating.has(citaId);
  }

  trackByCita(_index: number, cita: Cita): number {
    return cita.citaId;
  }

  getDisponibilidadTexto(): string {
    if (!this.stats) {
      return 'Sin datos de disponibilidad';
    }

    const porcentaje = this.stats.total === 0 ? 0 : Math.round((this.stats.completadas / this.stats.total) * 100);
    return `${this.stats.horasDisponibles.toFixed(1)}h disponibles • ${porcentaje}% completadas`;
  }

  private crearFormularioCita(): FormGroup {
    const form = this.fb.group({
      modoPaciente: ['existente' as ModoPaciente, Validators.required],
      pacienteId: [null],
      fecha: [
        this.selectedDateInput,
        [Validators.required, this.validarFechaDisponible]
      ],
      horaInicio: ['', Validators.required],
      horaFin: ['', Validators.required],
      motivo: ['', [Validators.maxLength(200)]],
      notas: ['', [Validators.maxLength(500)]],
      nuevoPaciente: this.fb.group({
        cedula: [''],
        nombres: [''],
        apellidos: [''],
        fechaNacimiento: [''],
        genero: [''],
        telefono: [''],
        email: ['', Validators.email]
      })
    });

    this.configurarValidadoresPaciente(form, 'existente');

    form.get('horaFin')?.disable({ emitEvent: false });

    form.get('modoPaciente')?.valueChanges.subscribe(modo => {
      const valor = (modo ?? 'existente') as ModoPaciente;
      this.configurarValidadoresPaciente(form, valor);
    });

    return form;
  }

  private validarFechaDisponible = (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').toString();

    if (!value) {
      return null;
    }

    return this.esFechaDisponible(value) ? null : { fechaNoDisponible: true };
  };

  private configurarValidadoresPaciente(form: FormGroup, modo: ModoPaciente): void {
    const pacienteIdControl = form.get('pacienteId');
    const nuevoPacienteGroup = form.get('nuevoPaciente') as FormGroup;

    if (modo === 'existente') {
      pacienteIdControl?.setValidators([Validators.required]);
      pacienteIdControl?.updateValueAndValidity({ emitEvent: false });

      nuevoPacienteGroup.reset({
        cedula: '',
        nombres: '',
        apellidos: '',
        fechaNacimiento: '',
        genero: '',
        telefono: '',
        email: ''
      }, { emitEvent: false });

      ['cedula', 'nombres', 'apellidos', 'fechaNacimiento', 'genero', 'telefono'].forEach(campo => {
        const control = nuevoPacienteGroup.get(campo);
        control?.clearValidators();
        control?.updateValueAndValidity({ emitEvent: false });
      });

      const emailControl = nuevoPacienteGroup.get('email');
      emailControl?.setValidators([Validators.email]);
      emailControl?.updateValueAndValidity({ emitEvent: false });

      nuevoPacienteGroup.markAsPristine();
      nuevoPacienteGroup.markAsUntouched();
    } else {
      pacienteIdControl?.clearValidators();
      pacienteIdControl?.setValue(null, { emitEvent: false });
      pacienteIdControl?.updateValueAndValidity({ emitEvent: false });

      nuevoPacienteGroup.get('cedula')?.setValidators([Validators.required, Validators.minLength(10), Validators.maxLength(10)]);
      nuevoPacienteGroup.get('nombres')?.setValidators([Validators.required]);
      nuevoPacienteGroup.get('apellidos')?.setValidators([Validators.required]);
      nuevoPacienteGroup.get('fechaNacimiento')?.setValidators([Validators.required]);
      nuevoPacienteGroup.get('genero')?.setValidators([Validators.required]);
      nuevoPacienteGroup.get('telefono')?.setValidators([Validators.required, Validators.minLength(10), Validators.maxLength(10)]);
      const emailControl = nuevoPacienteGroup.get('email');
      emailControl?.setValidators([Validators.email]);
      Object.values(nuevoPacienteGroup.controls).forEach(control => control.updateValueAndValidity({ emitEvent: false }));
    }

    pacienteIdControl?.updateValueAndValidity({ emitEvent: false });
  }

  private resetFormularioCita(pacienteId?: number): void {
    this.citaForm.reset({
      modoPaciente: 'existente',
      pacienteId: pacienteId ?? null,
      fecha: this.selectedDateInput,
      horaInicio: '',
      horaFin: '',
      motivo: '',
      notas: '',
      nuevoPaciente: {
        cedula: '',
        nombres: '',
        apellidos: '',
        fechaNacimiento: '',
        genero: '',
        telefono: '',
        email: ''
      }
    });

    this.configurarValidadoresPaciente(this.citaForm, 'existente');
    this.citaForm.get('horaFin')?.disable({ emitEvent: false });
    this.citaForm.markAsPristine();
    this.citaForm.markAsUntouched();

    if (this.esFechaDisponible(this.selectedDateInput)) {
      this.ultimaFechaValidaCita = this.selectedDateInput;
    }
  }

  private crearPayloadCita(pacienteId: number, valores: any): CitaPayload {
    const motivo = (valores.motivo ?? '').toString().trim();
    const notas = (valores.notas ?? '').toString().trim();
    return {
      pacienteId: Number(pacienteId),
      fecha: valores.fecha,
      horaInicio: this.normalizarHora((valores.horaInicio ?? '').toString().trim()),
      horaFin: this.normalizarHora((valores.horaFin ?? '').toString().trim()),
      motivo: motivo || undefined,
      notas: notas || undefined
    };
  }

  private refreshAll(): void {
    this.loadDailyAppointments(true);
    this.loadWeeklyAppointments(true);
    this.loadAllAppointments(true);
    this.loadDailyStats(true);
  }

  private getWeekStart(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    return new Date(start.getFullYear(), start.getMonth(), start.getDate());
  }

  private toDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private calculateAvailableSlots(citas: Cita[]): { start: string; end: string }[] {
    const rango = this.obtenerRangoParaDia(this.selectedDate);
    if (!rango) {
      return [];
    }

    const ocupados = new Set<number>();
    citas.forEach(cita => {
      const inicio = this.toMinutes(cita.horaInicio);
      const fin = this.toMinutes(cita.horaFin);
      for (let cursor = inicio; cursor < fin; cursor += 30) {
        ocupados.add(cursor);
      }
    });

    const slots: { start: string; end: string }[] = [];
    const inicio = this.toMinutes(rango.horaInicio);
    const fin = this.toMinutes(rango.horaFin);

    for (let cursor = inicio; cursor <= fin - 30; cursor += 30) {
      if (ocupados.has(cursor)) {
        continue;
      }

      const finSlot = cursor + 30;
      slots.push({ start: this.toTime(cursor), end: this.toTime(finSlot) });
    }

    return slots;
  }

  private updateAvailableSlots(citas: Cita[] = this.dailyAppointments): void {
    const slots = this.calculateAvailableSlots(citas);
    this.availableSlots = slots;

    const horaInicioControl = this.citaForm.get('horaInicio');
    const horaFinControl = this.citaForm.get('horaFin');
    const seleccionado = (horaInicioControl?.value as string) ?? '';

    if (seleccionado) {
      const slot = slots.find(item => item.start === seleccionado);
      if (slot) {
        horaFinControl?.setValue(slot.end, { emitEvent: false });
      } else {
        horaInicioControl?.setValue('', { emitEvent: false });
        horaFinControl?.setValue('', { emitEvent: false });
      }
    }
  }

  private obtenerRangoParaDia(date: Date): { horaInicio: string; horaFin: string } | null {
    const fecha = this.toDateString(date);
    const horario = this.horariosPersistidosPorFecha.get(fecha);

    if (!horario) {
      return null;
    }

    const horaInicio = this.normalizarHora(horario.horaInicio);
    const horaFin = this.normalizarHora(horario.horaFin);

    if (!horaInicio || !horaFin) {
      return null;
    }

    if (this.toMinutes(horaFin) <= this.toMinutes(horaInicio)) {
      return null;
    }

    return { horaInicio, horaFin };
  }

  private normalizarHora(time: string): string {
    if (!time) {
      return '';
    }

    const parts = time.split(':');
    const hours = (parts[0] ?? '00').padStart(2, '0');
    const minutes = (parts[1] ?? '00').padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private normalizarFechaValor(value: unknown): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? '' : this.toDateString(value);
    }

    const texto = value.toString().trim();
    if (!texto) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return texto;
    }

    const fechaPartes = texto.split('T')[0] ?? '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaPartes)) {
      return fechaPartes;
    }

    const parsed = new Date(texto);
    if (!Number.isNaN(parsed.getTime())) {
      return this.toDateString(parsed);
    }

    return texto;
  }

  private toMinutes(time: string): number {
    if (!time) {
      return 0;
    }

    const parts = time.split(':');
    const hours = Number(parts[0] ?? 0);
    const minutes = Number(parts[1] ?? 0);
    return hours * 60 + minutes;
  }

  private toTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // lista de instrucciones con los campos requeridos que están inválidos
  private obtenerInstruccionesCamposCita(): string[] {
    const mensajes: string[] = [];
    const controles: Array<[string, boolean]> = [
      ['fecha', true],
      ['horaInicio', true],
      ['horaFin', true],
      ['pacienteId', this.modoPaciente === 'existente']
    ];

    controles.forEach(([path, evaluar]) => {
      if (!evaluar) {
        return;
      }
      const control = this.citaForm.get(path);
      if (control && control.invalid) {
        mensajes.push(this.instruccionesCamposCita[path] ?? 'Verifica la información ingresada.');
      }
    });

    if (this.modoPaciente === 'nuevo') {
      const camposNuevoPaciente: string[] = ['cedula', 'nombres', 'apellidos', 'fechaNacimiento', 'genero', 'telefono'];
      camposNuevoPaciente.forEach(campo => {
        const control = this.nuevoPacienteForm.get(campo);
        const clave = `nuevoPaciente.${campo}`;
        if (control && control.invalid) {
          mensajes.push(this.instruccionesCamposCita[clave] ?? 'Completa la información del nuevo paciente.');
        }
      });
    }

    return mensajes.length ? mensajes : ['Verifica los campos resaltados en rojo.'];
  }

  private onFechaCitaControlChange(fechaIso: string): void {
    if (!fechaIso) {
      this.availableSlots = [];
      this.citaForm.get('horaInicio')?.setValue('', { emitEvent: false });
      this.citaForm.get('horaFin')?.setValue('', { emitEvent: false });
      return;
    }

    if (!this.esFechaDisponible(fechaIso)) {
      this.availableSlots = [];
      this.citaForm.get('horaInicio')?.setValue('', { emitEvent: false });
      this.citaForm.get('horaFin')?.setValue('', { emitEvent: false });
      return;
    }

    if (fechaIso !== this.selectedDateInput) {
      this.actualizarFechaSeleccionada(fechaIso);
    }
  }

  private actualizarFechaSeleccionada(fechaIso: string, opciones: { recargar?: boolean } = {}): void {
    if (!fechaIso) {
      return;
    }

    const { recargar = true } = opciones;

    const parsedDate = new Date(`${fechaIso}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      return;
    }

    this.selectedDate = parsedDate;
    this.selectedDateInput = fechaIso;
    this.ultimaFechaValidaCita = fechaIso;
    this.calendarioFechaCitaActual = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);

    const fechaControl = this.citaForm.get('fecha');
    fechaControl?.setValue(fechaIso, { emitEvent: false });
    fechaControl?.updateValueAndValidity({ emitEvent: false });

    const horaInicioControl = this.citaForm.get('horaInicio');
    const horaFinControl = this.citaForm.get('horaFin');
    horaInicioControl?.setValue('', { emitEvent: false });
    horaFinControl?.setValue('', { emitEvent: false });

    this.availableSlots = [];

    if (recargar) {
      this.loadDailyAppointments(true);
      this.loadDailyStats(true);
      this.loadWeeklyAppointments(false);
    } else {
      this.updateAvailableSlots();
    }

    this.generarCalendarioFechaCita();
  }

  private limpiarSeleccionFecha(): void {
    const fechaControl = this.citaForm.get('fecha');
    fechaControl?.setValue('', { emitEvent: false });
    fechaControl?.updateValueAndValidity({ emitEvent: false });

    this.availableSlots = [];
    this.citaForm.get('horaInicio')?.setValue('', { emitEvent: false });
    this.citaForm.get('horaFin')?.setValue('', { emitEvent: false });
    this.ultimaFechaValidaCita = null;
    this.generarCalendarioFechaCita();
  }

  private esFechaDisponible(fechaIso: string): boolean {
    return this.horariosPersistidosPorFecha.has(fechaIso);
  }

  private obtenerFechaDisponibleMasCercana(referencia: string): string | null {
    if (!this.fechasDisponibles.length) {
      return null;
    }

    const ordenadas = this.fechasDisponibles;

    if (!referencia) {
      return ordenadas[0] ?? null;
    }

    const encontrada = ordenadas.find(fecha => fecha >= referencia);
    return encontrada ?? ordenadas[ordenadas.length - 1] ?? null;
  }

  private obtenerFechaDisponiblePosterior(actual: string): string | null {
    if (!this.fechasDisponibles.length) {
      return null;
    }

    const ordenadas = this.fechasDisponibles;
    return ordenadas.find(fecha => fecha > actual) ?? null;
  }

  private obtenerFechaDisponibleAnterior(actual: string): string | null {
    if (!this.fechasDisponibles.length) {
      return null;
    }

    for (let i = this.fechasDisponibles.length - 1; i >= 0; i--) {
      const fecha = this.fechasDisponibles[i] ?? '';
      if (fecha < actual) {
        return fecha;
      }
    }

    return null;
  }

  toggleCalendarioFechaCita(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.fechasDisponibles.length) {
      this.mostrarCalendarioFechaCita = false;
      return;
    }

    if (!this.mostrarCalendarioFechaCita) {
      this.actualizarCalendarioFechaCita();
    }

    this.mostrarCalendarioFechaCita = !this.mostrarCalendarioFechaCita;
  }

  cambiarMesCalendarioFechaCita(delta: number, event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!delta) {
      return;
    }

    const indiceActual = this.obtenerIndiceMesCalendarioCita();
    if (indiceActual === -1) {
      return;
    }

    const nuevoIndice = indiceActual + delta;
    if (nuevoIndice < 0 || nuevoIndice >= this.mesesDisponiblesFechaCita.length) {
      return;
    }

    const clave = this.mesesDisponiblesFechaCita[nuevoIndice] ?? '';
    if (!clave) {
      return;
    }

    const [yearStr, monthStr] = clave.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    if (Number.isNaN(year) || Number.isNaN(month)) {
      return;
    }

    this.calendarioFechaCitaActual = new Date(year, month, 1);
    this.generarCalendarioFechaCita();
  }

  puedeCambiarMesCalendarioFechaCita(delta: number): boolean {
    if (!delta || !this.mesesDisponiblesFechaCita.length) {
      return false;
    }

    const indiceActual = this.obtenerIndiceMesCalendarioCita();
    if (indiceActual === -1) {
      return false;
    }

    const destino = indiceActual + delta;
    return destino >= 0 && destino < this.mesesDisponiblesFechaCita.length;
  }

  seleccionarFechaCalendarioCita(dia: CalendarioCitaDia, event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!dia.inMonth || !dia.isAvailable) {
      return;
    }

    this.actualizarFechaSeleccionada(dia.iso, { recargar: true });
    this.citaForm.get('fecha')?.markAsTouched({ onlySelf: true });
    this.citaForm.get('fecha')?.markAsDirty({ onlySelf: true });
    this.mostrarCalendarioFechaCita = false;
  }

  cerrarCalendarioFechaCita(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.mostrarCalendarioFechaCita = false;
  }

  private obtenerIndiceMesCalendarioCita(): number {
    if (!this.mesesDisponiblesFechaCita.length) {
      return -1;
    }

    const claveActual = `${this.calendarioFechaCitaActual.getFullYear()}-${String(
      this.calendarioFechaCitaActual.getMonth() + 1
    ).padStart(2, '0')}`;

    const indice = this.mesesDisponiblesFechaCita.indexOf(claveActual);
    if (indice !== -1) {
      return indice;
    }

    const seleccion = (this.citaForm.get('fecha')?.value ?? '').toString();
    if (seleccion && this.esFechaDisponible(seleccion)) {
      const claveSeleccion = seleccion.slice(0, 7);
      const indiceSeleccion = this.mesesDisponiblesFechaCita.indexOf(claveSeleccion);
      if (indiceSeleccion !== -1) {
        this.calendarioFechaCitaActual = new Date(
          Number(claveSeleccion.slice(0, 4)),
          Number(claveSeleccion.slice(5, 7)) - 1,
          1
        );
        return indiceSeleccion;
      }
    }

    if (this.mesesDisponiblesFechaCita.length) {
      const primera = this.mesesDisponiblesFechaCita[0] ?? '';
      const [yearStr, monthStr] = primera.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr) - 1;
      if (!Number.isNaN(year) && !Number.isNaN(month)) {
        this.calendarioFechaCitaActual = new Date(year, month, 1);
        return 0;
      }
    }

    return -1;
  }

  private sumarMinutos(hora: string, minutosASumar: number): string | null {
    if (!hora) {
      return null;
    }

    const total = this.toMinutes(hora) + minutosASumar;
    if (total < 0) {
      return null;
    }

    const minutosEnDia = 24 * 60;
    if (total >= minutosEnDia) {
      return null;
    }

    return this.toTime(total);
  }
}
