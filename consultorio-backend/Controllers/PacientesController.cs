using System;
using System.IO;
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

                if (!string.IsNullOrWhiteSpace(paciente.FotoUrl))
                {
                    if (!EsDataUrl(paciente.FotoUrl))
                    {
                        return BadRequest(new
                        {
                            success = false,
                            message = "El formato de la imagen no es válido."
                        });
                    }

                    try
                    {
                        paciente.FotoUrl = await GuardarFotoAsync(paciente.FotoUrl);
                    }
                    catch (InvalidOperationException ex)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            message = ex.Message
                        });
                    }
                }

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

                if (string.IsNullOrWhiteSpace(paciente.FotoUrl))
                {
                    EliminarFotoExistente(pacienteExistente.FotoUrl);
                    pacienteExistente.FotoUrl = null;
                }
                else if (EsDataUrl(paciente.FotoUrl))
                {
                    try
                    {
                        var nuevaFoto = await GuardarFotoAsync(paciente.FotoUrl);
                        EliminarFotoExistente(pacienteExistente.FotoUrl);
                        pacienteExistente.FotoUrl = nuevaFoto;
                    }
                    catch (InvalidOperationException ex)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            message = ex.Message
                        });
                    }
                }
                else
                {
                    pacienteExistente.FotoUrl = paciente.FotoUrl;
                }

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

        private static bool EsDataUrl(string valor)
        {
            return !string.IsNullOrWhiteSpace(valor) && valor.TrimStart().StartsWith("data:", StringComparison.OrdinalIgnoreCase);
        }

        private static string ObtenerExtension(string mimeType)
        {
            return mimeType switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/gif" => ".gif",
                "image/webp" => ".webp",
                "image/bmp" => ".bmp",
                _ => ".jpg"
            };
        }

        private async Task<string> GuardarFotoAsync(string dataUrl)
        {
            var comaIndex = dataUrl.IndexOf(',');
            if (comaIndex < 0)
            {
                throw new InvalidOperationException("El formato de la imagen no es válido.");
            }

            var metadata = dataUrl[..comaIndex];
            if (!metadata.Contains(";base64", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("El formato de la imagen no es válido.");
            }

            var base64 = dataUrl[(comaIndex + 1)..];

            byte[] bytes;
            try
            {
                bytes = Convert.FromBase64String(base64);
            }
            catch (FormatException)
            {
                throw new InvalidOperationException("La imagen cargada está dañada. Selecciona otra foto.");
            }

            const int maxBytes = 3 * 1024 * 1024; // 3 MB
            if (bytes.Length > maxBytes)
            {
                throw new InvalidOperationException("La imagen es demasiado pesada. Selecciona una foto menor a 3 MB.");
            }

            var mimeType = metadata.Replace("data:", string.Empty, StringComparison.OrdinalIgnoreCase)
                                   .Replace(";base64", string.Empty, StringComparison.OrdinalIgnoreCase)
                                   .Trim();

            if (string.IsNullOrWhiteSpace(mimeType) || !mimeType.StartsWith("image", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Solo se permiten archivos de imagen.");
            }

            var extension = ObtenerExtension(mimeType);
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "pacientes");
            Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            await System.IO.File.WriteAllBytesAsync(filePath, bytes);

            return $"/uploads/pacientes/{fileName}";
        }

        private void EliminarFotoExistente(string? rutaRelativa)
        {
            if (string.IsNullOrWhiteSpace(rutaRelativa))
            {
                return;
            }

            var trimmed = rutaRelativa.Trim();
            var relativePath = trimmed.StartsWith('/') ? trimmed[1..] : trimmed;
            var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", relativePath.Replace('/', Path.DirectorySeparatorChar));

            if (System.IO.File.Exists(fullPath))
            {
                try
                {
                    System.IO.File.Delete(fullPath);
                }
                catch
                {
                    // Si no se puede eliminar, se ignora para no interrumpir la operación principal.
                }
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
