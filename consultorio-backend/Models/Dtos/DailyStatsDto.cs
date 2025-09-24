namespace ConsultorioMedico.API.Models.Dtos
{
    public class DailyStatsDto
    {
        public DateTime Fecha { get; set; }

        public int Programadas { get; set; }

        public int Confirmadas { get; set; }

        public int EnCurso { get; set; }

        public int Completadas { get; set; }

        public int Total { get; set; }

        public double HorasOcupadas { get; set; }

        public double HorasDisponibles { get; set; }
    }
}
