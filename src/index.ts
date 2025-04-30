import app from './app';
import { log } from './config/logger';

const PORT = process.env.PORT || 8888;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  log.info(`⚠️ App running in ${NODE_ENV} mode`);
  log.info(`🚀 Express server ready at: http://localhost:${PORT}`);
  log.info(`💻 API docs ready at: http://localhost:${PORT}/api-docs`);
}).on('error', (error) => {
  log.error(`❌ Error starting server: ${error.message}`);
});
