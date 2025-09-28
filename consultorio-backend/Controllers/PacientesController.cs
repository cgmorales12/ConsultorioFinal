using ConsultorioMedico.API.Data;
using ConsultorioMedico.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ConsultorioMedico.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PacientesController : ControllerBase
    {
        private readonly ConsultorioDbContext _context;

        public PacientesController(ConsultorioDbContext context)
        {
            _context = context;
        }

        // GET: api/Pacientes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PacienteModel>>> GetPacientes()
        {
            try
            {
                var pacientes = await _context.Pacientes
                    .Where(p => p.Estado == true)
                    .OrderBy(p => p.Apellidos)
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = pacientes,
                    total = pacientes.Count,
                    message = "Pacientes obtenidos correctamente"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error al obtener pacientes",
                    error = ex.Message
                });
            }
        }

        // GET: api/Pacientes/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PacienteModel>> GetPaciente(int id)
        {
            try
            {
                var paciente = await _context.Pacientes
                    .FirstOrDefaultAsync(p => p.PacienteId == id && p.Estado == true);

                if (paciente == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Paciente con ID {id} no encontrado"
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = paciente,
                    message = "Paciente encontrado"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error al obtener el paciente",
                    error = ex.Message
                });
            }
        }

        // POST: api/Pacientes
        [HttpPost]
        public async Task<ActionResult<PacienteModel>> PostPaciente(PacienteModel paciente)
        {
            try
            {
                // Validar que no exista la cédula
                if (await _context.Pacientes.AnyAsync(p => p.Cedula == paciente.Cedula))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "El usuario ya se encuentra registrado."
                    });
                }

                paciente.FechaRegistro = DateTime.Now;
                paciente.Estado = true;

                _context.Pacientes.Add(paciente);
                await _context.SaveChangesAsync();

                return CreatedAtAction("GetPaciente", new { id = paciente.PacienteId }, new
                {
                    success = true,
                    data = paciente,
                    message = "Paciente creado correctamente"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error al crear el paciente",
                    error = ex.Message
                });
            }
        }

        // PUT: api/Pacientes/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutPaciente(int id, PacienteModel paciente)
        {
            try
            {
                if (id != paciente.PacienteId)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "El ID no coincide"
                    });
                }

                var pacienteExistente = await _context.Pacientes.FindAsync(id);
                if (pacienteExistente == null || !pacienteExistente.Estado)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Paciente no encontrado"
                    });
                }

                // Actualizar propiedades
                pacienteExistente.Nombres = paciente.Nombres;
                pacienteExistente.Apellidos = paciente.Apellidos;
                pacienteExistente.FechaNacimiento = paciente.FechaNacimiento;
                pacienteExistente.Genero = paciente.Genero;
                pacienteExistente.Direccion = paciente.Direccion;
                pacienteExistente.Telefono = paciente.Telefono;
                pacienteExistente.Celular = paciente.Celular;
                pacienteExistente.Email = paciente.Email;
                pacienteExistente.EstadoCivil = paciente.EstadoCivil;
                pacienteExistente.Ocupacion = paciente.Ocupacion;
                pacienteExistente.ContactoEmergencia = paciente.ContactoEmergencia;
                pacienteExistente.TelefonoEmergencia = paciente.TelefonoEmergencia;
                pacienteExistente.TipoSangre = paciente.TipoSangre;
                pacienteExistente.Alergias = paciente.Alergias;
                pacienteExistente.FotoUrl = paciente.FotoUrl;

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Paciente actualizado correctamente"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error al actualizar el paciente",
                    error = ex.Message
                });
            }
        }

        // DELETE: api/Pacientes/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePaciente(int id)
        {
            try
            {
                var paciente = await _context.Pacientes.FindAsync(id);
                if (paciente == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Paciente no encontrado"
                    });
                }

                // Eliminación lógica
                paciente.Estado = false;
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Paciente eliminado correctamente"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error al eliminar el paciente",
                    error = ex.Message
                });
            }
        }

        // GET: api/Pacientes/test
        [HttpGet("test")]
        public IActionResult Test()
        {
            return Ok(new
            {
                success = true,
                message = "API del Consultorio Luz y Vida funcionando correctamente",
                timestamp = DateTime.Now,
                version = "1.0.0"
            });
        }
    }
}
