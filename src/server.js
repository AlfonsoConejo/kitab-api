import app from './app.js';
import { initJobs } from './jobs/index.js';

const port = Number(process.env.PORT) || 3000;

const startServer = async () => {
  try {
    await initJobs();
  } catch (error) {
    console.error('Error iniciando cronjobs:', error);
  }

  app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
  });
};

startServer();
