using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConsultorioMedico.API.Models
{
    public class CitaModel
    {
        [Key]
        public int CitaId { get; set; }

        [Required]
        public int PacienteId { get; set; }

        public PacienteModel? Paciente { get; set; }

        [Required]
        public DateTime Fecha { get; set; }

        [Required]
        public TimeSpan HoraInicio { get; set; }

        [Required]
        public TimeSpan HoraFin { get; set; }

        [Required]
        public EstadoCita Estado { get; set; } = EstadoCita.Programada;

        [StringLength(500)]
        public string? Motivo { get; set; }

        [StringLength(1000)]
        public string? Notas { get; set; }

        public DateTime FechaCreacion { get; set; } = DateTime.Now;
    }

    public enum EstadoCita
    {
        Programada,
        Confirmada,
        EnCurso,
        Completada
    }
}
