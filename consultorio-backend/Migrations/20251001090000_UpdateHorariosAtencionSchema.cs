using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ConsultorioMedico.Migrations
{
    /// <inheritdoc />
    public partial class UpdateHorariosAtencionSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HorariosAtencion");

            migrationBuilder.CreateTable(
                name: "HorariosAtencion",
                columns: table => new
                {
                    HorarioAtencionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    InicioAtencion = table.Column<DateTime>(type: "datetime", nullable: false),
                    FinAtencion = table.Column<DateTime>(type: "datetime", nullable: false),
                    InicioFeriado = table.Column<DateTime>(type: "datetime", nullable: true),
                    FinFeriado = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HorariosAtencion", x => x.HorarioAtencionId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HorariosAtencion");

            migrationBuilder.CreateTable(
                name: "HorariosAtencion",
                columns: table => new
                {
                    HorarioAtencionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    DiaInicio = table.Column<int>(type: "int", nullable: false),
                    HoraInicio = table.Column<TimeSpan>(type: "time", nullable: false),
                    DiaFin = table.Column<int>(type: "int", nullable: false),
                    HoraFin = table.Column<TimeSpan>(type: "time", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HorariosAtencion", x => x.HorarioAtencionId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_HorariosAtencion_DiaSemana_HoraInicio_HoraFin",
                table: "HorariosAtencion",
                columns: new[] { "DiaSemana", "HoraInicio", "HoraFin" });
        }
    }
}
