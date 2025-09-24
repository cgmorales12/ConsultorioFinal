using System.ComponentModel.DataAnnotations;

namespace ConsultorioMedico.API.Models
{
    public class PlantillaConsultaModel
    {
        [Key]
        public int PlantillaConsultaId { get; set; }

        [Required]
        [StringLength(150)]
        public string Nombre { get; set; } = string.Empty;

        [StringLength(200)]
        public string? MotivoConsulta { get; set; }

        [StringLength(2000)]
        public string? Sintomas { get; set; }

        [StringLength(2000)]
        public string? Diagnostico { get; set; }

        [StringLength(2000)]
        public string? Tratamiento { get; set; }

        [StringLength(2000)]
        public string? Observaciones { get; set; }
    }
}
