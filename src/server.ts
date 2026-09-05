import app from './app.js';
import { initJobs } from './jobs/index.js';

const port = Number(process.env.PORT) || 3000;

// Inicializa tareas programadas y comienza a escuchar solicitudes HTTP.
async function startServer() {
  try {
    await initJobs();
  } catch (error) {
    console.error('Error iniciando cronjobs:', error);
  }

  app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
  });
}

void startServer();
