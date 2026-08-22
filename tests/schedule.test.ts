import { describe, it, expect } from 'vitest';
import { validateInitialSchedule, generateBalancedInitialSchedule, calculateMatchTime } from '../src/core/schedule';
import { INITIAL_PLAYERS } from '../src/data/initialData';

describe('Calendario y Reglas de la Fase Inicial', () => {
  it('El calendario generado cumple todas las condiciones de integridad', () => {
    const matches = generateBalancedInitialSchedule(INITIAL_PLAYERS, '11:00', 10);
    const result = validateInitialSchedule(matches, INITIAL_PLAYERS);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.totalMatches).toBe(10);
    expect(result.totalPlayers).toBe(10);

    // Cada uno de los 10 jugadores disputa exactamente 2 partidos
    INITIAL_PLAYERS.forEach(p => {
      expect(result.matchesPerPlayer[p.id]).toBe(2);
    });
  });

  it('Calcula correctamente los horarios a partir de las 11:00 cada 10 minutos', () => {
    expect(calculateMatchTime('11:00', 0, 10)).toBe('11:00');
    expect(calculateMatchTime('11:00', 1, 10)).toBe('11:10');
    expect(calculateMatchTime('11:00', 2, 10)).toBe('11:20');
    expect(calculateMatchTime('11:00', 3, 10)).toBe('11:30');
    expect(calculateMatchTime('11:00', 4, 10)).toBe('11:40');
    expect(calculateMatchTime('11:00', 5, 10)).toBe('11:50');
    expect(calculateMatchTime('11:00', 6, 10)).toBe('12:00');
  });

  it('Detecta errores si un jugador juega contra sí mismo o hay partidos duplicados', () => {
    const invalidMatches = generateBalancedInitialSchedule(INITIAL_PLAYERS, '11:00', 10);
    // Introducir error: jugador contra sí mismo
    invalidMatches[0].player2Id = invalidMatches[0].player1Id;

    const result = validateInitialSchedule(invalidMatches, INITIAL_PLAYERS);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
