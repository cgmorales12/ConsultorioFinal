namespace ConsultorioMedico.API.Models.Dtos
{
    public class CitaDto
    {
        public int CitaId { get; set; }

        public int PacienteId { get; set; }

        public string PacienteNombre { get; set; } = string.Empty;

        public DateTime Fecha { get; set; }

        public string HoraInicio { get; set; } = string.Empty;

        public string HoraFin { get; set; } = string.Empty;

        public string Estado { get; set; } = string.Empty;

        public string? Motivo { get; set; }

        public string? Notas { get; set; }
    }
}
