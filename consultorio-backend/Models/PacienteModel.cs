using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConsultorioMedico.API.Models
{
    public class PacienteModel
    {
        [Key]
        public int PacienteId { get; set; }

        [Required]
        [StringLength(10)]
        public string Cedula { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Nombres { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Apellidos { get; set; } = string.Empty;

        [Required]
        public DateTime FechaNacimiento { get; set; }

        [Required]
        [StringLength(10)]
        public string Genero { get; set; } = string.Empty; // M, F, Otro

        [StringLength(200)]
        public string? Direccion { get; set; }

        [StringLength(15)]
        public string? Telefono { get; set; }

        [StringLength(15)]
        public string? Celular { get; set; }

        [StringLength(100)]
        public string? Email { get; set; }

        [StringLength(50)]
        public string? EstadoCivil { get; set; }

        [StringLength(100)]
        public string? Ocupacion { get; set; }

        [StringLength(200)]
        public string? ContactoEmergencia { get; set; }

        [StringLength(15)]
        public string? TelefonoEmergencia { get; set; }

        [StringLength(50)]
        public string? TipoSangre { get; set; }

        [StringLength(500)]
        public string? Alergias { get; set; }

        public bool Estado { get; set; } = true;

        public DateTime FechaRegistro { get; set; } = DateTime.Now;

        // Relaciones
        public ICollection<HistoriaClinicaModel> HistoriasClinicas { get; set; } = new List<HistoriaClinicaModel>();

        public ICollection<CitaModel> Citas { get; set; } = new List<CitaModel>();

        // Propiedades calculadas
        [NotMapped]
        public int Edad
        {
            get
            {
                var today = DateTime.Today;
                var age = today.Year - FechaNacimiento.Year;
                if (FechaNacimiento.Date > today.AddYears(-age)) age--;
                return age;
            }
        }

        [NotMapped]
        public string NombreCompleto => $"{Nombres} {Apellidos}";
    }
}
