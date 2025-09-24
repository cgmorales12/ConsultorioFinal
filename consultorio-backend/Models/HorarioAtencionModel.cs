using System;
using System.ComponentModel.DataAnnotations;

namespace ConsultorioMedico.API.Models
{
    public class HorarioAtencionModel
    {
        [Key]
        public int HorarioAtencionId { get; set; }

        [Required(ErrorMessage = "La fecha del horario es obligatoria.")]
        public DateTime Fecha { get; set; }

        [Required]
        public TimeSpan HoraInicio { get; set; }

        [Required]
        public TimeSpan HoraFin { get; set; }
    }
}
