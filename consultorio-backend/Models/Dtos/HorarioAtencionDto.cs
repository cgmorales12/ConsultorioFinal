using System;

namespace ConsultorioMedico.API.Models.Dtos
{
    public class HorarioAtencionDto
    {
        public int HorarioAtencionId { get; set; }

        public DateTime Fecha { get; set; }

        public TimeSpan HoraInicio { get; set; }

        public TimeSpan HoraFin { get; set; }
    }
}
