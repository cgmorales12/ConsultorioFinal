namespace ConsultorioMedico.API.Models.Dtos
{
    public class HistoriaClinicaDto
    {
        public int HistoriaClinicaId { get; set; }

        public int PacienteId { get; set; }

        public string PacienteNombre { get; set; } = string.Empty;

        public string? AntecedentesPersonales { get; set; }

        public string? AntecedentesFamiliares { get; set; }

        public string? Vacunas { get; set; }

        public string? Alergias { get; set; }

        public DateTime FechaCreacion { get; set; }

        public DateTime UltimaActualizacion { get; set; }

        public List<ConsultaMedicaDto> Consultas { get; set; } = new();
    }
}
