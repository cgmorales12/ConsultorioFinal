namespace ConsultorioMedico.API.Models.Dtos
{
    public class AgendaSemanalDiaDto
    {
        public DateTime Fecha { get; set; }

        public string Dia { get; set; } = string.Empty;

        public List<CitaDto> Citas { get; set; } = new();
    }
}
