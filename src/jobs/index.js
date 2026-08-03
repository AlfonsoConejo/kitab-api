import cron from 'node-cron';
import { cleanupExpiredData } from './cleanup.job.js';

export const initJobs = async () => {
  console.log('Inicializando cronjobs...');

  // Schedule the cleanup job to run every day at 3 AM
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
};