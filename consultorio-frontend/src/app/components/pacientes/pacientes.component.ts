
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PacientesService } from '../../services/pacientes.service';
import { Paciente } from '../../models/paciente.model';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './pacientes.component.html',
  styleUrls: ['./pacientes.component.css']
})
export class PacientesComponent implements OnInit {
  // Propiedades del componente
  formularioPaciente!: FormGroup;
  mostrarFormulario = false;
  pacienteSeleccionado: Paciente | null = null;
  terminoBusqueda = '';
  pacientesFiltrados: Paciente[] = [];
  cargando = false;
  maxFechaNacimiento = new Date().toISOString().split('T')[0];
  private readonly instruccionesCampos: Record<string, string> = {
    cedula: 'Cédula: ingresa 10 dígitos numéricos sin espacios ni guiones.',
    nombres: 'Nombres: escribe al menos dos caracteres alfabéticos.',
    apellidos: 'Apellidos: escribe al menos dos caracteres alfabéticos.',
    fechaNacimiento: 'Fecha de nacimiento: selecciona una fecha válida menor o igual a hoy.',
    genero: 'Género: selecciona una opción de la lista desplegable.',
    telefono: 'Teléfono: registra un número de 10 dígitos para poder contactarte.',
    direccion: 'Dirección: detalla la calle y número principal de residencia.',
    estadoCivil: 'Estado civil: elige el estado civil actual del paciente.'
  };

  constructor(
    private fb: FormBuilder,
    private pacientesService: PacientesService
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.cargarPacientes();
  }

  // Inicializar el formulario con validaciones
  private inicializarFormulario(): void {
    this.formularioPaciente = this.fb.group({
      cedula: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      fechaNacimiento: ['', Validators.required],
      genero: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
      email: ['', [Validators.email]],
      direccion: ['', Validators.required],
      estadoCivil: ['', Validators.required],
      ocupacion: [''],
      contactoEmergenciaNombre: [''],
      contactoEmergenciaTelefono: [''],
      contactoEmergenciaRelacion: [''],
      alergias: [''],
      medicamentosActuales: [''],
      enfermedadesCronicas: ['']
    });
  }

  // Cargar lista de pacientes
  cargarPacientes(): void {
    this.cargando = true;
    this.pacientesService.obtenerTodos().subscribe({
      next: (pacientes) => {
        this.pacientesFiltrados = pacientes.filter(p => p.activo);
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar pacientes:', error);
        this.cargando = false;
      }
    });
  }

  // Buscar pacientes
  buscarPacientes(): void {
    if (this.terminoBusqueda.trim()) {
      this.pacientesService.buscarPacientes(this.terminoBusqueda).subscribe({
        next: (pacientes) => {
          this.pacientesFiltrados = pacientes.filter(p => p.activo);
        }
      });
    } else {
      this.cargarPacientes();
    }
  }

  // Abrir formulario para nuevo paciente
  nuevoPaciente(): void {
    this.pacienteSeleccionado = null;
    this.formularioPaciente.reset();
    this.mostrarFormulario = true;
  }

  // Abrir formulario para editar paciente
  editarPaciente(paciente: Paciente): void {
    this.pacienteSeleccionado = paciente;
    this.formularioPaciente.patchValue({
      cedula: paciente.cedula,
      nombres: paciente.nombres,
      apellidos: paciente.apellidos,
      fechaNacimiento: paciente.fechaNacimiento.toISOString().split('T')[0],
      genero: paciente.genero,
      telefono: paciente.telefono,
      email: paciente.email,
      direccion: paciente.direccion,
      estadoCivil: paciente.estadoCivil,
      ocupacion: paciente.ocupacion,
      contactoEmergenciaNombre: paciente.contactoEmergencia?.nombre ?? '',
      contactoEmergenciaTelefono: paciente.contactoEmergencia?.telefono ?? '',
      contactoEmergenciaRelacion: paciente.contactoEmergencia?.relacion ?? '',
      alergias: paciente.alergias?.join(', '),
      medicamentosActuales: paciente.medicamentosActuales?.join(', '),
      enfermedadesCronicas: paciente.enfermedadesCronicas?.join(', ')
    });
    this.mostrarFormulario = true;
  }

  // Guardar paciente (crear o actualizar)
  guardarPaciente(): void {
    if (this.formularioPaciente.invalid) {
      this.formularioPaciente.markAllAsTouched();
      const instrucciones = this.obtenerInstruccionesCamposRequeridos();
      alert(`Para guardar el paciente completa los campos obligatorios:\n- ${instrucciones.join('\n- ')}`);
      return;
    }

    const formData = this.formularioPaciente.value;

    // Validar cédula ecuatoriana con una instrucción clara en caso de error
    if (!this.pacientesService.validarCedulaEcuatoriana(formData.cedula)) {
      alert('La cédula ingresada no es válida. Ingresa 10 dígitos numéricos sin espacios ni guiones.');
      return;
    }

    const contactoEmergencia = this.obtenerContactoEmergencia(formData);

    const paciente: Paciente = {
      ...(this.pacienteSeleccionado?.id ? { id: this.pacienteSeleccionado.id } : {}),
      cedula: formData.cedula,
      nombres: formData.nombres,
      apellidos: formData.apellidos,
      fechaNacimiento: new Date(formData.fechaNacimiento),
      edad: '', // Se recalcula al recibir la respuesta del servicio
      genero: formData.genero,
      telefono: formData.telefono,
      direccion: formData.direccion,
      estadoCivil: formData.estadoCivil,
      ocupacion: formData.ocupacion,
      ...(contactoEmergencia ? { contactoEmergencia } : {}),
      alergias: formData.alergias ? formData.alergias.split(',').map((a: string) => a.trim()) : [],
      medicamentosActuales: formData.medicamentosActuales ? formData.medicamentosActuales.split(',').map((m: string) => m.trim()) : [],
      enfermedadesCronicas: formData.enfermedadesCronicas ? formData.enfermedadesCronicas.split(',').map((e: string) => e.trim()) : [],
      fechaRegistro: this.pacienteSeleccionado?.fechaRegistro || new Date(),
      activo: this.pacienteSeleccionado?.activo ?? true,
      email: formData.email
    };

    if (this.pacienteSeleccionado) {
      this.pacientesService.actualizarPaciente(paciente).subscribe({
        next: () => {
          this.cerrarFormulario();
          this.cargarPacientes();
          alert('Paciente actualizado correctamente');
        },
        error: (error: unknown) => {
          console.error('Error al guardar paciente:', error);
          alert(this.obtenerMensajeError(error, 'Error al guardar el paciente'));
        }
      });
    } else {
      this.pacientesService.agregarPaciente(paciente).subscribe({
        next: () => {
          this.cerrarFormulario();
          this.cargarPacientes();
          alert('Paciente registrado correctamente');
        },
        error: (error: unknown) => {
          console.error('Error al guardar paciente:', error);
          alert(this.obtenerMensajeError(error, 'Error al guardar el paciente'));
        }
      });
    }
  }

  // Eliminar paciente
  eliminarPaciente(id: number | undefined, nombreCompleto: string): void {
    if (!id) {
      alert('No se encontró el identificador del paciente');
      return;
    }
    if (confirm(`¿Está seguro de eliminar al paciente ${nombreCompleto}?`)) {
      this.pacientesService.eliminarPaciente(id).subscribe({
        next: (eliminado) => {
          if (eliminado) {
            this.cargarPacientes();
            alert('Paciente eliminado correctamente');
          } else {
            alert('Error al eliminar el paciente');
          }
        },
        error: (error) => {
          console.error('Error al eliminar paciente:', error);
          alert('Error al eliminar el paciente');
        }
      });
    }
  }

  private obtenerMensajeError(error: unknown, mensajePorDefecto: string): string {
    if (error instanceof HttpErrorResponse) {
      const mensaje = error.error?.message ?? error.error?.Message ?? error.statusText;
      if (mensaje && mensaje.trim().length > 0) {
        return mensaje;
      }
    }

    if (typeof error === 'string' && error.trim().length > 0) {
      return error;
    }

    return mensajePorDefecto;
  }

  // Cerrar formulario
  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.pacienteSeleccionado = null;
    this.formularioPaciente.reset();
  }

  // Getter para validación del formulario
  get esFormularioValido(): boolean {
    return this.formularioPaciente.valid;
  }

  get instruccionesCamposPendientes(): string[] {
    return this.obtenerInstruccionesCamposRequeridos();
  }

  private obtenerContactoEmergencia(formData: any): Paciente['contactoEmergencia'] | null {
    const nombre = (formData.contactoEmergenciaNombre ?? '').trim();
    const telefono = (formData.contactoEmergenciaTelefono ?? '').trim();
    const relacion = (formData.contactoEmergenciaRelacion ?? '').trim();

    if (!nombre && !telefono && !relacion) {
      return null;
    }

    return {
      ...(nombre ? { nombre } : {}),
      ...(telefono ? { telefono } : {}),
      ...(relacion ? { relacion } : {})
    };
  }

  // Método para obtener errores de un campo
  obtenerError(campo: string): string {
    const control = this.formularioPaciente.get(campo);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return this.instruccionesCampos[campo] ?? 'Este campo es obligatorio.';
      }
      if (control.errors['minlength']) {
        if (campo === 'cedula' || campo === 'telefono') {
          return 'Debe contener al menos 10 dígitos numéricos.';
        }
        return 'Ingresa más caracteres para completar la información.';
      }
      if (control.errors['maxlength']) {
        if (campo === 'cedula') {
          return 'La cédula debe contener exactamente 10 dígitos.';
        }
        if (campo === 'telefono') {
          return 'El teléfono debe contener exactamente 10 dígitos.';
        }
      }
      if (control.errors['email']) return 'Email inválido';
    }
    return '';
  }

  // Construye las instrucciones detalladas para cada campo requerido que esté inválido
  private obtenerInstruccionesCamposRequeridos(): string[] {
    const mensajes: string[] = [];
    Object.entries(this.instruccionesCampos).forEach(([campo, mensaje]) => {
      const control = this.formularioPaciente.get(campo);
      if (control && control.invalid) {
        mensajes.push(mensaje);
      }
    });

    return mensajes.length ? mensajes : ['Verifica los datos resaltados en rojo.'];
  }
}
