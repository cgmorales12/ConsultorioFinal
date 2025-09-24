using ConsultorioMedico.API.Data;
using ConsultorioMedico.API.Models;
using ConsultorioMedico.API.Models.Dtos;
using ConsultorioMedico.API.Models.Requests;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ConsultorioMedico.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HistoriasClinicasController : ControllerBase
    {
        private readonly ConsultorioDbContext _context;

        public HistoriasClinicasController(ConsultorioDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<HistoriaClinicaDto>>> GetHistoriasClinicas([FromQuery] int? pacienteId)
        {
            var query = _context.HistoriasClinicas
                .Include(h => h.Paciente)
                .Include(h => h.Consultas)
                .AsQueryable();

            if (pacienteId.HasValue)
            {
                query = query.Where(h => h.PacienteId == pacienteId.Value);
            }

            var historias = await query
                .OrderByDescending(h => h.UltimaActualizacion)
                .ToListAsync();

            return Ok(historias.Select(MapHistoriaClinica));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<HistoriaClinicaDto>> GetHistoriaClinica(int id)
        {
            var historia = await _context.HistoriasClinicas
                .Include(h => h.Paciente)
                .Include(h => h.Consultas)
                .FirstOrDefaultAsync(h => h.HistoriaClinicaId == id);

            if (historia == null)
            {
                return NotFound();
            }

            return Ok(MapHistoriaClinica(historia));
        }

        [HttpPost]
        public async Task<ActionResult<HistoriaClinicaDto>> CrearHistoriaClinica([FromBody] HistoriaClinicaPayload payload)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var paciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.PacienteId == payload.PacienteId && p.Estado);
            if (paciente == null)
            {
                return BadRequest(new { message = "El paciente no existe o está inactivo." });
            }

            var existeHistoria = await _context.HistoriasClinicas.AnyAsync(h => h.PacienteId == payload.PacienteId);
            if (existeHistoria)
            {
                return Conflict(new { message = "El paciente ya cuenta con una historia clínica registrada." });
            }

            var historia = new HistoriaClinicaModel
            {
                PacienteId = payload.PacienteId,
                AntecedentesPersonales = payload.AntecedentesPersonales,
                AntecedentesFamiliares = payload.AntecedentesFamiliares,
                Vacunas = payload.Vacunas,
                Alergias = payload.Alergias,
                FechaCreacion = DateTime.Now,
                UltimaActualizacion = DateTime.Now
            };

            _context.HistoriasClinicas.Add(historia);
            await _context.SaveChangesAsync();

            await _context.Entry(historia).Reference(h => h.Paciente).LoadAsync();

            return CreatedAtAction(nameof(GetHistoriaClinica), new { id = historia.HistoriaClinicaId }, MapHistoriaClinica(historia));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<HistoriaClinicaDto>> ActualizarHistoriaClinica(int id, [FromBody] HistoriaClinicaUpdatePayload payload)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var historia = await _context.HistoriasClinicas
                .Include(h => h.Paciente)
                .Include(h => h.Consultas)
                .FirstOrDefaultAsync(h => h.HistoriaClinicaId == id);

            if (historia == null)
            {
                return NotFound();
            }

            historia.AntecedentesPersonales = payload.AntecedentesPersonales;
            historia.AntecedentesFamiliares = payload.AntecedentesFamiliares;
            historia.Vacunas = payload.Vacunas;
            historia.Alergias = payload.Alergias;
            historia.UltimaActualizacion = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok(MapHistoriaClinica(historia));
        }

        [HttpPost("{id:int}/consultas")]
        public async Task<ActionResult<ConsultaMedicaDto>> RegistrarConsulta(int id, [FromBody] ConsultaMedicaPayload payload)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var historia = await _context.HistoriasClinicas
                .Include(h => h.Consultas)
                .FirstOrDefaultAsync(h => h.HistoriaClinicaId == id);

            if (historia == null)
            {
                return NotFound();
            }

            var consulta = new ConsultaMedicaModel
            {
                HistoriaClinicaId = id,
                FechaConsulta = payload.FechaConsulta,
                MotivoConsulta = payload.MotivoConsulta,
                Sintomas = payload.Sintomas,
                Diagnostico = payload.Diagnostico,
                Tratamiento = payload.Tratamiento,
                Observaciones = payload.Observaciones,
                PesoKg = payload.PesoKg,
                EstaturaCm = payload.EstaturaCm,
                TemperaturaC = payload.TemperaturaC,
                SaturacionPorcentaje = payload.SaturacionPorcentaje,
                FrecuenciaCardiaca = payload.FrecuenciaCardiaca,
                PresionSistolica = payload.PresionSistolica,
                PresionDiastolica = payload.PresionDiastolica,
                PerimetroCefalicoCm = payload.PerimetroCefalicoCm,
                Pancita = string.IsNullOrWhiteSpace(payload.Pancita) ? null : payload.Pancita.Trim()
            };

            ActualizarParametrosClinicos(consulta);

            if (historia.Consultas == null)
            {
                historia.Consultas = new List<ConsultaMedicaModel>();
            }

            historia.Consultas.Add(consulta);
            _context.ConsultasMedicas.Add(consulta);
            historia.UltimaActualizacion = DateTime.Now;

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(ObtenerConsulta), new { id, consultaId = consulta.ConsultaMedicaId }, MapConsultaMedica(consulta));
        }

        [HttpGet("{id:int}/consultas/{consultaId:int}")]
        public async Task<ActionResult<ConsultaMedicaDto>> ObtenerConsulta(int id, int consultaId)
        {
            var consulta = await _context.ConsultasMedicas
                .FirstOrDefaultAsync(c => c.HistoriaClinicaId == id && c.ConsultaMedicaId == consultaId);

            if (consulta == null)
            {
                return NotFound();
            }

            return Ok(MapConsultaMedica(consulta));
        }

        [HttpPut("{id:int}/consultas/{consultaId:int}")]
        public async Task<ActionResult<ConsultaMedicaDto>> ActualizarConsulta(int id, int consultaId, [FromBody] ConsultaMedicaPayload payload)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var consulta = await _context.ConsultasMedicas
                .FirstOrDefaultAsync(c => c.HistoriaClinicaId == id && c.ConsultaMedicaId == consultaId);

            if (consulta == null)
            {
                return NotFound();
            }

            consulta.FechaConsulta = payload.FechaConsulta;
            consulta.MotivoConsulta = payload.MotivoConsulta;
            consulta.Sintomas = payload.Sintomas;
            consulta.Diagnostico = payload.Diagnostico;
            consulta.Tratamiento = payload.Tratamiento;
            consulta.Observaciones = payload.Observaciones;
            consulta.PesoKg = payload.PesoKg;
            consulta.EstaturaCm = payload.EstaturaCm;
            consulta.TemperaturaC = payload.TemperaturaC;
            consulta.SaturacionPorcentaje = payload.SaturacionPorcentaje;
            consulta.FrecuenciaCardiaca = payload.FrecuenciaCardiaca;
            consulta.PresionSistolica = payload.PresionSistolica;
            consulta.PresionDiastolica = payload.PresionDiastolica;
            consulta.PerimetroCefalicoCm = payload.PerimetroCefalicoCm;
            consulta.Pancita = string.IsNullOrWhiteSpace(payload.Pancita) ? null : payload.Pancita.Trim();

            ActualizarParametrosClinicos(consulta);

            var historia = await _context.HistoriasClinicas.FindAsync(id);
            if (historia != null)
            {
                historia.UltimaActualizacion = DateTime.Now;
            }

            await _context.SaveChangesAsync();

            return Ok(MapConsultaMedica(consulta));
        }

        [HttpGet("plantillas")]
        public async Task<ActionResult<IEnumerable<PlantillaConsultaDto>>> ObtenerPlantillas()
        {
            var plantillas = await _context.PlantillasConsulta
                .OrderBy(p => p.Nombre)
                .ToListAsync();

            return Ok(plantillas.Select(p => new PlantillaConsultaDto
            {
                PlantillaConsultaId = p.PlantillaConsultaId,
                Nombre = p.Nombre,
                MotivoConsulta = p.MotivoConsulta,
                Sintomas = p.Sintomas,
                Diagnostico = p.Diagnostico,
                Tratamiento = p.Tratamiento,
                Observaciones = p.Observaciones
            }));
        }

        private static HistoriaClinicaDto MapHistoriaClinica(HistoriaClinicaModel historia)
        {
            var consultas = historia.Consultas ?? Enumerable.Empty<ConsultaMedicaModel>();

            return new HistoriaClinicaDto
            {
                HistoriaClinicaId = historia.HistoriaClinicaId,
                PacienteId = historia.PacienteId,
                PacienteNombre = historia.Paciente != null ? $"{historia.Paciente.Nombres} {historia.Paciente.Apellidos}" : string.Empty,
                AntecedentesPersonales = historia.AntecedentesPersonales,
                AntecedentesFamiliares = historia.AntecedentesFamiliares,
                Vacunas = historia.Vacunas,
                Alergias = historia.Alergias,
                FechaCreacion = historia.FechaCreacion,
                UltimaActualizacion = historia.UltimaActualizacion,
                Consultas = consultas
                    .OrderByDescending(c => c.FechaConsulta)
                    .ThenByDescending(c => c.ConsultaMedicaId)
                    .Select(MapConsultaMedica)
                    .ToList()
            };
        }

        private static ConsultaMedicaDto MapConsultaMedica(ConsultaMedicaModel consulta)
        {
            return new ConsultaMedicaDto
            {
                ConsultaMedicaId = consulta.ConsultaMedicaId,
                HistoriaClinicaId = consulta.HistoriaClinicaId,
                FechaConsulta = consulta.FechaConsulta,
                MotivoConsulta = consulta.MotivoConsulta,
                Sintomas = consulta.Sintomas,
                Diagnostico = consulta.Diagnostico,
                Tratamiento = consulta.Tratamiento,
                Observaciones = consulta.Observaciones,
                PesoKg = consulta.PesoKg,
                EstaturaCm = consulta.EstaturaCm,
                TemperaturaC = consulta.TemperaturaC,
                SaturacionPorcentaje = consulta.SaturacionPorcentaje,
                FrecuenciaCardiaca = consulta.FrecuenciaCardiaca,
                PresionSistolica = consulta.PresionSistolica,
                PresionDiastolica = consulta.PresionDiastolica,
                PerimetroCefalicoCm = consulta.PerimetroCefalicoCm,
                Pancita = consulta.Pancita,
                Imc = consulta.Imc,
                ClasificacionImc = consulta.ClasificacionImc ?? string.Empty,
                Alertas = GenerarAlertasClinicas(consulta)
            };
        }

        private static void ActualizarParametrosClinicos(ConsultaMedicaModel consulta)
        {
            consulta.Imc = CalcularImc(consulta.PesoKg, consulta.EstaturaCm);
            consulta.ClasificacionImc = ClasificarImc(consulta.Imc);
        }

        private static decimal? CalcularImc(decimal? pesoKg, decimal? estaturaCm)
        {
            if (!pesoKg.HasValue || !estaturaCm.HasValue)
            {
                return null;
            }

            if (pesoKg.Value <= 0 || estaturaCm.Value <= 0)
            {
                return null;
            }

            var estaturaMetros = estaturaCm.Value / 100m;
            if (estaturaMetros <= 0)
            {
                return null;
            }

            var imc = pesoKg.Value / (estaturaMetros * estaturaMetros);
            return Math.Round(imc, 2);
        }

        private static string ClasificarImc(decimal? imc)
        {
            if (!imc.HasValue)
            {
                return string.Empty;
            }

            if (imc.Value < 18.5m)
            {
                return "Bajo peso";
            }

            if (imc.Value < 25m)
            {
                return "Normal";
            }

            if (imc.Value < 30m)
            {
                return "Sobrepeso";
            }

            return "Obesidad";
        }

        private static List<string> GenerarAlertasClinicas(ConsultaMedicaModel consulta)
        {
            var alertas = new List<string>();

            var imc = consulta.Imc ?? CalcularImc(consulta.PesoKg, consulta.EstaturaCm);
            var clasificacion = ClasificarImc(imc);

            if (!string.IsNullOrWhiteSpace(clasificacion))
            {
                if (clasificacion == "Bajo peso")
                {
                    alertas.Add("IMC bajo, evaluar estado nutricional.");
                }
                else if (clasificacion == "Sobrepeso" || clasificacion == "Obesidad")
                {
                    alertas.Add($"IMC {clasificacion.ToLower()}, considerar plan de control de peso.");
                }
            }

            if (consulta.TemperaturaC.HasValue && consulta.TemperaturaC.Value >= 38m)
            {
                alertas.Add($"Fiebre detectada ({consulta.TemperaturaC.Value} °C).");
            }

            if (consulta.SaturacionPorcentaje.HasValue && consulta.SaturacionPorcentaje.Value < 92m)
            {
                alertas.Add($"Saturación de oxígeno baja ({consulta.SaturacionPorcentaje.Value}%).");
            }

            if (consulta.FrecuenciaCardiaca.HasValue && (consulta.FrecuenciaCardiaca.Value < 60 || consulta.FrecuenciaCardiaca.Value > 100))
            {
                alertas.Add("Frecuencia cardiaca fuera de rango normal.");
            }

            if (consulta.PresionSistolica.HasValue && consulta.PresionDiastolica.HasValue)
            {
                if (consulta.PresionSistolica.Value >= 140 || consulta.PresionDiastolica.Value >= 90)
                {
                    alertas.Add("Presión arterial elevada.");
                }
                else if (consulta.PresionSistolica.Value <= 90 || consulta.PresionDiastolica.Value <= 60)
                {
                    alertas.Add("Presión arterial baja, monitorear paciente.");
                }
            }

            return alertas;
        }
    }
}
