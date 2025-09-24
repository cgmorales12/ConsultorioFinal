namespace ConsultorioMedico.API.Models.Dtos
{
    public class PlantillaConsultaDto
    {
        public int PlantillaConsultaId { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string? MotivoConsulta { get; set; }

        public string? Sintomas { get; set; }

        public string? Diagnostico { get; set; }

        public string? Tratamiento { get; set; }

        public string? Observaciones { get; set; }
    }
}
