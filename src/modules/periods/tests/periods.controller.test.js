// src/modules/periods/__tests__/periods.controller.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPeriod } from '../periods.controller.js';
import { insertPeriod } from '../../../services/periodService.js';
import { normalizeAndValidatePeriod, normalizePeriodFromDB } from '../../../validators/periodValidator.js';
import { pool } from '../../../config/db.js';

// ✅ Mock de la base de datos
vi.mock('../../../config/db.js', () => ({
  pool: {
    connect: vi.fn(),
    query: vi.fn()
  }
}));

// ✅ Mock del servicio insertPeriod
vi.mock('../../../services/periodService.js', () => ({
  insertPeriod: vi.fn()
}));

// ✅ Mock del validador (opcional, pero útil para aislar)
vi.mock('../../../validators/periodValidator.js', () => ({
  normalizeAndValidatePeriod: vi.fn(),
  normalizePeriodFromDB: vi.fn()
}));

describe('createPeriod - POST /api/periods', () => {
  let req, res, mockClient;

  // ✅ Preparar datos antes de cada prueba
  beforeEach(() => {
    // Mock de req (request)
    req = {
      body: {
        name: 'Periodo 2024',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        color: '#FF0000'
      },
      user: { id: 1 }
    };

    // Mock de res (response)
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    // Mock de client de BD
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };

    // Limpiar todos los mocks antes de cada prueba
    vi.clearAllMocks();
  });

  // ✅ Limpiar después de cada prueba
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // 1. PRUEBAS DE AUTENTICACIÓN
  // ============================================

  describe('Autenticación', () => {
    it('debe retornar 401 si el usuario no está autenticado', async () => {
      // Arrange
      req.user = undefined;

      // Act
      await createPeriod(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no autenticado'
      });
      expect(pool.connect).not.toHaveBeenCalled();
    });

    it('debe retornar 401 si req.user no tiene id', async () => {
      // Arrange
      req.user = {};

      // Act
      await createPeriod(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no autenticado'
      });
    });
  });

  // ============================================
  // 2. PRUEBAS DE VALIDACIÓN
  // ============================================

  describe('Validación', () => {
    it('debe retornar 400 si los datos son inválidos', async () => {
      // Arrange
      const validationError = new Error('El nombre del periodo es obligatorio.');
      validationError.name = 'ValidationError';

      pool.connect.mockResolvedValue(mockClient);
      normalizeAndValidatePeriod.mockImplementation(() => {
        throw validationError;
      });

      // Act
      await createPeriod(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'El nombre del periodo es obligatorio.'
      });
      expect(insertPeriod).not.toHaveBeenCalled();
    });

    it('debe retornar 400 si falta el nombre', async () => {
      // Arrange
      req.body = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        color: '#FF0000'
      };

      const validationError = new Error('El nombre del periodo es obligatorio.');
      validationError.name = 'ValidationError';

      pool.connect.mockResolvedValue(mockClient);
      normalizeAndValidatePeriod.mockImplementation(() => {
        throw validationError;
      });

      // Act
      await createPeriod(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'El nombre del periodo es obligatorio.'
      });
    });
  });

  // ============================================
  // 3. PRUEBAS DE CREACIÓN EXITOSA
  // ============================================

  describe('Creación exitosa', () => {
    it('debe crear un periodo exitosamente y retornar 201', async () => {
      // Arrange
      const normalizedPeriod = {
        name: 'Periodo 2024',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        color: '#FF0000'
      };

      const dbResult = {
        id: 1,
        name: 'Periodo 2024',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        color: '#FF0000',
        user_id: 1,
        created_at: '2024-01-01T10:00:00.000Z'
      };

      const frontendResult = {
        id: 1,
        name: 'Periodo 2024',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        color: '#FF0000',
        userId: 1,
        createdAt: '2024-01-01T10:00:00.000Z'
      };

      pool.connect.mockResolvedValue(mockClient);
      normalizeAndValidatePeriod.mockReturnValue(normalizedPeriod);
      insertPeriod.mockResolvedValue(dbResult);
      normalizePeriodFromDB.mockReturnValue(frontendResult);

      // Act
      await createPeriod(req, res);

      // Assert
      expect(pool.connect).toHaveBeenCalled();
      expect(normalizeAndValidatePeriod).toHaveBeenCalledWith(req.body);
      expect(insertPeriod).toHaveBeenCalledWith(normalizedPeriod, 1, mockClient);
      expect(normalizePeriodFromDB).toHaveBeenCalledWith(dbResult);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Periodo creado correctamente.',
        data: frontendResult
      });
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  // ============================================
  // 4. PRUEBAS DE ERRORES
  // ============================================

  describe('Manejo de errores', () => {
    it('debe retornar 409 si el nombre ya existe (código 23505)', async () => {
      // Arrange
      const normalizedPeriod = {
        name: 'Periodo 2024',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        color: '#FF0000'
      };

      const dbError = new Error('Duplicate key');
      dbError.code = '23505';

      pool.connect.mockResolvedValue(mockClient);
      normalizeAndValidatePeriod.mockReturnValue(normalizedPeriod);
      insertPeriod.mockRejectedValue(dbError);

      // Act
      await createPeriod(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Ya existe un periodo con ese nombre.'
      });
    });

    it('debe retornar 500 si ocurre un error inesperado', async () => {
      // Arrange
      const normalizedPeriod = {
        name: 'Periodo 2024',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        color: '#FF0000'
      };

      const unexpectedError = new Error('Error de conexión');

      pool.connect.mockResolvedValue(mockClient);
      normalizeAndValidatePeriod.mockReturnValue(normalizedPeriod);
      insertPeriod.mockRejectedValue(unexpectedError);

      // Act
      await createPeriod(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error interno del servidor.'
      });
    });

    it('debe retornar 400 si el error es ValidationError sin código', async () => {
      // Arrange
      const validationError = new Error('Formato de fecha inválido.');
      validationError.name = 'ValidationError';

      pool.connect.mockResolvedValue(mockClient);
      normalizeAndValidatePeriod.mockImplementation(() => {
        throw validationError;
      });

      // Act
      await createPeriod(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Formato de fecha inválido.'
      });
    });
  });

  // ============================================
  // 5. PRUEBAS DE LIBERACIÓN DE CONEXIÓN
  // ============================================

  describe('Liberación de conexión', () => {
    it('debe liberar la conexión incluso si hay error', async () => {
      // Arrange
      const validationError = new Error('Error de validación');
      validationError.name = 'ValidationError';

      pool.connect.mockResolvedValue(mockClient);
      normalizeAndValidatePeriod.mockImplementation(() => {
        throw validationError;
      });

      // Act
      await createPeriod(req, res);

      // Assert
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('debe liberar la conexión en caso de éxito', async () => {
      // Arrange
      const normalizedPeriod = {
        name: 'Periodo 2024',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        color: '#FF0000'
      };

      const dbResult = {
        id: 1,
        name: 'Periodo 2024',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        color: '#FF0000',
        user_id: 1,
        created_at: '2024-01-01T10:00:00.000Z'
      };

      const frontendResult = {
        id: 1,
        name: 'Periodo 2024',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        color: '#FF0000',
        userId: 1,
        createdAt: '2024-01-01T10:00:00.000Z'
      };

      pool.connect.mockResolvedValue(mockClient);
      normalizeAndValidatePeriod.mockReturnValue(normalizedPeriod);
      insertPeriod.mockResolvedValue(dbResult);
      normalizePeriodFromDB.mockReturnValue(frontendResult);

      // Act
      await createPeriod(req, res);

      // Assert
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});