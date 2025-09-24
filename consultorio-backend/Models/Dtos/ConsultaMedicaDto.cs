namespace ConsultorioMedico.API.Models.Dtos
{
    public class ConsultaMedicaDto
    {
        public int ConsultaMedicaId { get; set; }

        public int HistoriaClinicaId { get; set; }

        public DateTime FechaConsulta { get; set; }

        public string MotivoConsulta { get; set; } = string.Empty;

        public string Sintomas { get; set; } = string.Empty;

        public string Diagnostico { get; set; } = string.Empty;

        public string Tratamiento { get; set; } = string.Empty;

        public string? Observaciones { get; set; }

        public decimal? PesoKg { get; set; }

        public decimal? EstaturaCm { get; set; }

        public decimal? TemperaturaC { get; set; }

        public decimal? SaturacionPorcentaje { get; set; }

        public int? FrecuenciaCardiaca { get; set; }

        public int? PresionSistolica { get; set; }

        public int? PresionDiastolica { get; set; }

        public decimal? PerimetroCefalicoCm { get; set; }

        public string? Pancita { get; set; }

        public decimal? Imc { get; set; }

        public string ClasificacionImc { get; set; } = string.Empty;

        public List<string> Alertas { get; set; } = new();
    }
}
