using System.ComponentModel.DataAnnotations;

namespace ConsultorioMedico.API.Models.Requests
{
    public class ConsultaMedicaPayload
    {
        [Required]
        public DateTime FechaConsulta { get; set; }

        [Required]
        [StringLength(200)]
        public string MotivoConsulta { get; set; } = string.Empty;

        [Required]
        [StringLength(2000)]
        public string Sintomas { get; set; } = string.Empty;

        [Required]
        [StringLength(2000)]
        public string Diagnostico { get; set; } = string.Empty;

        [Required]
        [StringLength(2000)]
        public string Tratamiento { get; set; } = string.Empty;

        [StringLength(2000)]
        public string? Observaciones { get; set; }

        [Range(typeof(decimal), "1", "500")]
        public decimal? PesoKg { get; set; }

        [Range(typeof(decimal), "40", "250")]
        public decimal? EstaturaCm { get; set; }

        public decimal? TemperaturaC { get; set; }

        [Range(0, 100)]
        public decimal? SaturacionPorcentaje { get; set; }

        public int? FrecuenciaCardiaca { get; set; }

        public int? PresionSistolica { get; set; }

        public int? PresionDiastolica { get; set; }

        public decimal? PerimetroCefalicoCm { get; set; }

        [StringLength(200)]
        public string? Pancita { get; set; }
    }
}
