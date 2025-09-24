using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConsultorioMedico.API.Models
{
    public class HistoriaClinicaModel
    {
        [Key]
        public int HistoriaClinicaId { get; set; }

        [Required]
        public int PacienteId { get; set; }

        public PacienteModel? Paciente { get; set; }

        [StringLength(2000)]
        public string? AntecedentesPersonales { get; set; }

        [StringLength(2000)]
        public string? AntecedentesFamiliares { get; set; }

        [StringLength(1000)]
        public string? Vacunas { get; set; }

        [StringLength(1000)]
        public string? Alergias { get; set; }

        public DateTime FechaCreacion { get; set; } = DateTime.Now;

        public DateTime UltimaActualizacion { get; set; } = DateTime.Now;

        public ICollection<ConsultaMedicaModel> Consultas { get; set; } = new List<ConsultaMedicaModel>();
    }
}
