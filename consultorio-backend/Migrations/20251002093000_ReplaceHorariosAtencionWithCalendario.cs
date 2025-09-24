using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ConsultorioMedico.Migrations
{
    public partial class ReplaceHorariosAtencionWithCalendario : Migration
    {
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
                    Fecha = table.Column<DateTime>(type: "date", nullable: false),
                    HoraInicio = table.Column<TimeSpan>(type: "time", nullable: false),
                    HoraFin = table.Column<TimeSpan>(type: "time", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HorariosAtencion", x => x.HorarioAtencionId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HorariosAtencion_Fecha",
                table: "HorariosAtencion",
                column: "Fecha",
                unique: true);
        }

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
                    FinAtencion = table.Column<DateTime>(type: "datetime", nullable: false),
                    FinFeriado = table.Column<DateTime>(type: "datetime", nullable: true),
                    InicioAtencion = table.Column<DateTime>(type: "datetime", nullable: false),
                    InicioFeriado = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HorariosAtencion", x => x.HorarioAtencionId);
                });
        }
    }
}
