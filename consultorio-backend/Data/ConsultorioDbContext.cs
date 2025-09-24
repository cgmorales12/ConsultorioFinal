using ConsultorioMedico.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ConsultorioMedico.API.Data
{
    public class ConsultorioDbContext : DbContext
    {
        public ConsultorioDbContext(DbContextOptions<ConsultorioDbContext> options) : base(options)
        {
        }

        public DbSet<PacienteModel> Pacientes { get; set; }

        public DbSet<HistoriaClinicaModel> HistoriasClinicas { get; set; }

        public DbSet<ConsultaMedicaModel> ConsultasMedicas { get; set; }

        public DbSet<PlantillaConsultaModel> PlantillasConsulta { get; set; }

        public DbSet<CitaModel> Citas { get; set; }

        public DbSet<HorarioAtencionModel> HorariosAtencion { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuración para Paciente
            modelBuilder.Entity<PacienteModel>(entity =>
            {
                entity.HasIndex(e => e.Cedula).IsUnique();
                entity.Property(e => e.Cedula).IsRequired().HasMaxLength(10);

                entity.HasIndex(e => e.Email);
                entity.Property(e => e.Email).HasMaxLength(100);
            });

            // Configuración para Historias clínicas
            modelBuilder.Entity<HistoriaClinicaModel>(entity =>
            {
                entity.HasIndex(e => e.PacienteId).IsUnique();
                entity.Property(e => e.AntecedentesPersonales).HasMaxLength(2000);
                entity.Property(e => e.AntecedentesFamiliares).HasMaxLength(2000);
                entity.Property(e => e.Vacunas).HasMaxLength(1000);
                entity.Property(e => e.Alergias).HasMaxLength(1000);

                entity.HasOne(e => e.Paciente)
                      .WithMany(p => p.HistoriasClinicas)
                      .HasForeignKey(e => e.PacienteId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configuración para Consultas médicas
            modelBuilder.Entity<ConsultaMedicaModel>(entity =>
            {
                entity.Property(e => e.MotivoConsulta).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Sintomas).IsRequired().HasMaxLength(2000);
                entity.Property(e => e.Diagnostico).IsRequired().HasMaxLength(2000);
                entity.Property(e => e.Tratamiento).IsRequired().HasMaxLength(2000);
                entity.Property(e => e.Observaciones).HasMaxLength(2000);
                entity.Property(e => e.PesoKg).HasColumnType("decimal(5,2)").IsRequired(false);
                entity.Property(e => e.EstaturaCm).HasColumnType("decimal(5,2)").IsRequired(false);
                entity.Property(e => e.TemperaturaC).HasColumnType("decimal(4,1)");
                entity.Property(e => e.SaturacionPorcentaje).HasColumnType("decimal(5,2)");
                entity.Property(e => e.Imc).HasColumnType("decimal(5,2)");
                entity.Property(e => e.ClasificacionImc).HasMaxLength(50);
                entity.Property(e => e.PerimetroCefalicoCm).HasColumnType("decimal(5,2)");
                entity.Property(e => e.Pancita).HasMaxLength(200);

                entity.HasOne(e => e.HistoriaClinica)
                      .WithMany(h => h.Consultas)
                      .HasForeignKey(e => e.HistoriaClinicaId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configuración para Plantillas de consulta
            modelBuilder.Entity<PlantillaConsultaModel>(entity =>
            {
                entity.Property(e => e.Nombre).IsRequired().HasMaxLength(150);
                entity.Property(e => e.MotivoConsulta).HasMaxLength(200);
                entity.Property(e => e.Sintomas).HasMaxLength(2000);
                entity.Property(e => e.Diagnostico).HasMaxLength(2000);
                entity.Property(e => e.Tratamiento).HasMaxLength(2000);
                entity.Property(e => e.Observaciones).HasMaxLength(2000);
            });

            // Configuración para Citas médicas
            modelBuilder.Entity<CitaModel>(entity =>
            {
                entity.Property(e => e.Motivo).HasMaxLength(500);
                entity.Property(e => e.Notas).HasMaxLength(1000);
                entity.Property(e => e.HoraInicio).HasColumnType("time");
                entity.Property(e => e.HoraFin).HasColumnType("time");
                entity.Property(e => e.Estado)
                      .HasConversion<string>()
                      .HasMaxLength(20);

                entity.HasOne(e => e.Paciente)
                      .WithMany(p => p.Citas)
                      .HasForeignKey(e => e.PacienteId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configuración para Horarios de atención
            modelBuilder.Entity<HorarioAtencionModel>(entity =>
            {
                entity.Property(e => e.Fecha)
                      .HasColumnType("date");

                entity.Property(e => e.HoraInicio)
                      .HasColumnType("time");

                entity.Property(e => e.HoraFin)
                      .HasColumnType("time");

                entity.HasIndex(e => e.Fecha)
                      .IsUnique();
            });

            // No se definen datos semilla para permitir que la aplicación utilice únicamente los
            // registros reales almacenados en la base de datos configurada.
        }
    }
}
