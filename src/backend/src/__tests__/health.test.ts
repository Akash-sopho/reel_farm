import request from 'supertest';
import app from '../server';

describe('Health Endpoint', () => {
  it('should return 200 with ok status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version', '0.1.0');
  });

  it('should return ISO timestamp', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    // Verify it's a valid ISO string
    const timestamp = new Date(response.body.timestamp);
    expect(timestamp.getTime()).toBeLessThanOrEqual(new Date().getTime());
    expect(timestamp.getTime()).toBeGreaterThan(new Date().getTime() - 1000);
  });
});
