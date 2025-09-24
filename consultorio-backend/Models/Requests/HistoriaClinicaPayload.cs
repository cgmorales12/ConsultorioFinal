using System.ComponentModel.DataAnnotations;

namespace ConsultorioMedico.API.Models.Requests
{
    public class HistoriaClinicaPayload
    {
        [Required]
        public int PacienteId { get; set; }

        [StringLength(2000)]
        public string? AntecedentesPersonales { get; set; }

        [StringLength(2000)]
        public string? AntecedentesFamiliares { get; set; }

        [StringLength(1000)]
        public string? Vacunas { get; set; }

        [StringLength(1000)]
        public string? Alergias { get; set; }
    }
}
