using System.ComponentModel.DataAnnotations;

namespace ConsultorioMedico.API.Models.Requests
{
    public class CitaPayload
    {
        [Required]
        public int PacienteId { get; set; }

        [Required]
        public DateTime Fecha { get; set; }

        [Required]
        [RegularExpression(@"^\d{1,2}:\d{2}(:\d{2})?$", ErrorMessage = "La hora debe tener formato HH:mm o HH:mm:ss")]
        public string HoraInicio { get; set; } = string.Empty;

        [Required]
        [RegularExpression(@"^\d{1,2}:\d{2}(:\d{2})?$", ErrorMessage = "La hora debe tener formato HH:mm o HH:mm:ss")]
        public string HoraFin { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Motivo { get; set; }

        [StringLength(1000)]
        public string? Notas { get; set; }
    }
}
