import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('App', () => {
  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.environment).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });
  });

  describe('API Routes', () => {
    it('should return API info on root', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('WB API v1');
      expect(response.body.endpoints).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
      expect(response.body.code).toBe('ROUTE_NOT_FOUND');
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      const response = await request(app)
        .post('/api/v1')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
