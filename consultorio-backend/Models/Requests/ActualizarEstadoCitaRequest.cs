using System.ComponentModel.DataAnnotations;

namespace ConsultorioMedico.API.Models.Requests
{
    public class ActualizarEstadoCitaRequest
    {
        [Required]
        public string Estado { get; set; } = string.Empty;
    }
}
