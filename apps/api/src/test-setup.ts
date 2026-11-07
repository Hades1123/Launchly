process.env.NODE_ENV = 'test';
process.env.PORT = '4000';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly_test';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';
process.env.STORAGE_DRIVER = 'local';
process.env.MAIL_DRIVER = 'smtp';
process.env.APP_URL = 'http://localhost:3000';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025';
process.env.SMTP_FROM = 'noreply@launchly.local';

