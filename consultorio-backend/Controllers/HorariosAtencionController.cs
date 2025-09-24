using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
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
    public class HorariosAtencionController : ControllerBase
    {
        private readonly ConsultorioDbContext _context;
        private readonly ILogger<HorariosAtencionController> _logger;

        public HorariosAtencionController(ConsultorioDbContext context, ILogger<HorariosAtencionController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<HorarioAtencionDto>>> Obtener()
        {
            var horarios = await _context.HorariosAtencion
                .AsNoTracking()
                .OrderBy(h => h.Fecha)
                .ToListAsync();

            return Ok(horarios.Select(MapHorario));
        }

        [HttpPut]
        public async Task<ActionResult<IEnumerable<HorarioAtencionDto>>> Actualizar([FromBody] ActualizarHorariosAtencionRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var payloads = request.Horarios?.ToList() ?? new List<HorarioAtencionPayload>();

            if (!TryMapPayloads(payloads, out var modelos, out var errores))
            {
                foreach (var error in errores)
                {
                    ModelState.AddModelError(nameof(HorarioAtencionPayload), error);
                }

                return BadRequest(ModelState);
            }

            try
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                var existentes = await _context.HorariosAtencion.ToListAsync();
                if (existentes.Count > 0)
                {
                    _context.HorariosAtencion.RemoveRange(existentes);
                    await _context.SaveChangesAsync();
                }

                await _context.HorariosAtencion.AddRangeAsync(modelos);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var horarios = await _context.HorariosAtencion
                    .AsNoTracking()
                    .OrderBy(h => h.Fecha)
                    .ToListAsync();

                return Ok(horarios.Select(MapHorario));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al actualizar los horarios de atención.");
                return StatusCode(500, new { message = "No se pudieron actualizar los horarios de atención." });
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Eliminar(int id)
        {
            var horario = await _context.HorariosAtencion.FindAsync(id);
            if (horario is null)
            {
                return NotFound();
            }

            _context.HorariosAtencion.Remove(horario);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private static HorarioAtencionDto MapHorario(HorarioAtencionModel horario)
        {
            return new HorarioAtencionDto
            {
                HorarioAtencionId = horario.HorarioAtencionId,
                Fecha = horario.Fecha,
                HoraInicio = horario.HoraInicio,
                HoraFin = horario.HoraFin
            };
        }

        private static bool TryMapPayloads(
            IEnumerable<HorarioAtencionPayload> payloads,
            out List<HorarioAtencionModel> modelos,
            out List<string> errores)
        {
            modelos = new List<HorarioAtencionModel>();
            errores = new List<string>();
            var fechas = new HashSet<DateTime>();

            var formatos = new[]
            {
                "hh\\:mm",
                "h\\:mm",
                "HH\\:mm",
                "hh\\:mm\\:ss",
                "h\\:mm\\:ss",
                "HH\\:mm\\:ss"
            };
            var index = 0;

            foreach (var payload in payloads)
            {
                index++;
                var fecha = DateTime.SpecifyKind(payload.Fecha.Date, DateTimeKind.Unspecified);

                if (!TimeSpan.TryParseExact(payload.HoraInicio, formatos, CultureInfo.InvariantCulture, TimeSpanStyles.None, out var horaInicio))
                {
                    errores.Add($"El horario #{index} tiene una hora de inicio inválida.");
                    continue;
                }

                if (!TimeSpan.TryParseExact(payload.HoraFin, formatos, CultureInfo.InvariantCulture, TimeSpanStyles.None, out var horaFin))
                {
                    errores.Add($"El horario #{index} tiene una hora de fin inválida.");
                    continue;
                }

                if (horaFin <= horaInicio)
                {
                    errores.Add($"El horario #{index} debe tener una hora de fin posterior a la de inicio.");
                    continue;
                }

                if (!EsMultiploDeTreinta(horaInicio) || !EsMultiploDeTreinta(horaFin))
                {
                    errores.Add($"El horario #{index} debe configurarse en intervalos de 30 minutos.");
                    continue;
                }

                if (!fechas.Add(fecha))
                {
                    errores.Add($"Ya existe un horario configurado para el día {fecha:yyyy-MM-dd}.");
                    continue;
                }

                modelos.Add(new HorarioAtencionModel
                {
                    Fecha = fecha,
                    HoraInicio = horaInicio,
                    HoraFin = horaFin
                });
            }

            return errores.Count == 0;
        }

        private static bool EsMultiploDeTreinta(TimeSpan time)
        {
            return time.TotalMinutes % 30 == 0;
        }
    }
}
