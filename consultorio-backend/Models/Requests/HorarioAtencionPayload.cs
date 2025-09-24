using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ConsultorioMedico.API.Models.Requests
{
    public class HorarioAtencionPayload
    {
        [Required]
        public DateTime Fecha { get; set; }

        [Required]
        public string HoraInicio { get; set; } = string.Empty;

        [Required]
        public string HoraFin { get; set; } = string.Empty;
    }

    public class ActualizarHorariosAtencionRequest
    {
        [Required]
        public IEnumerable<HorarioAtencionPayload> Horarios { get; set; } = new List<HorarioAtencionPayload>();
    }
}
