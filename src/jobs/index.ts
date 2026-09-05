import cron from 'node-cron';
import { cleanupExpiredData } from './cleanup.job.js';

// Registra las tareas programadas que deben ejecutarse mientras la API está activa.
export async function initJobs(): Promise<void> {
  console.log('Inicializando cronjobs...');

  cron.schedule('0 0 * * *', async () => {
    console.log('Ejecutando limpieza programada...');

    try {
      const result = await cleanupExpiredData();
      console.log('Limpieza programada completada:', result);
    } catch (error) {
      console.error('Error en limpieza programada:', error);
    }
  });

  console.log('Cronjobs inicializados correctamente');
}
