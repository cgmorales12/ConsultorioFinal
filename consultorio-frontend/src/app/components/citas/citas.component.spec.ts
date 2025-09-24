import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CitasComponent } from './citas.component';
import { CitasService } from '../../services/citas.service';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

class CitasServiceStub {
  getAll() {
    return of([]);
  }

  getDaily() {
    return of([]);
  }

  getWeekly() {
    return of([]);
  }

  getDailyStats() {
    return of({
      fecha: '2025-01-01',
      programadas: 0,
      confirmadas: 0,
      enCurso: 0,
      completadas: 0,
      total: 0,
      horasOcupadas: 0,
      horasDisponibles: 7
    });
  }

  updateEstado() {
    return of();
  }
}

describe('CitasComponent', () => {
  let component: CitasComponent;
  let fixture: ComponentFixture<CitasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, CitasComponent],
      providers: [{ provide: CitasService, useClass: CitasServiceStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(CitasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
