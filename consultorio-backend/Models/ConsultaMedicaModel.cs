using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConsultorioMedico.API.Models
{
    public class ConsultaMedicaModel
    {
        [Key]
        public int ConsultaMedicaId { get; set; }

        [Required]
        public int HistoriaClinicaId { get; set; }

        public HistoriaClinicaModel? HistoriaClinica { get; set; }

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

        [Column(TypeName = "decimal(5,2)")]
        public decimal? PesoKg { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? EstaturaCm { get; set; }

        [Column(TypeName = "decimal(4,1)")]
        public decimal? TemperaturaC { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? SaturacionPorcentaje { get; set; }

        public int? FrecuenciaCardiaca { get; set; }

        public int? PresionSistolica { get; set; }

        public int? PresionDiastolica { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? PerimetroCefalicoCm { get; set; }

        [StringLength(200)]
        public string? Pancita { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? Imc { get; set; }

        [StringLength(50)]
        public string? ClasificacionImc { get; set; }
    }
}
