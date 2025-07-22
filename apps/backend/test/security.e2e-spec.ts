import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('🛡️ Security E2E Tests', () => {
  let app: INestApplication;
  let superadminToken: string;
  let owner1Token: string;
  let owner2Token: string;
  let company1Id: string;
  let company2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Создаем тестовые токены и компании
    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupTestData() {
    // TODO: Создать тестовые данные
    // Пока моки для демонстрации
    superadminToken = 'mock-superadmin-token';
    owner1Token = 'mock-owner1-token';
    owner2Token = 'mock-owner2-token';
    company1Id = 'company-1-uuid';
    company2Id = 'company-2-uuid';
  }

  describe('🏢 Companies Security', () => {
    it('should allow superadmin to see all companies', async () => {
      const response = await request(app.getHttpServer())
        .get('/companies')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.items).toBeDefined();
      // Суперадмин должен видеть компании всех
    });

    it('should allow owner to see only their company', async () => {
      const response = await request(app.getHttpServer())
        .get('/companies')
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(200);

      expect(response.body.items).toBeDefined();
      // Owner должен видеть только свою компанию
      expect(response.body.items.every(company => company.id === company1Id)).toBe(true);
    });

    it('should deny owner access to another company data', async () => {
      await request(app.getHttpServer())
        .get(`/companies/${company2Id}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(403); // Forbidden
    });

    it('should deny owner from editing another company', async () => {
      await request(app.getHttpServer())
        .patch(`/companies/${company2Id}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({ name: 'Hacked Company' })
        .expect(403); // Forbidden
    });
  });

  describe('📋 Subscriptions Security', () => {
    it('should deny access to another company subscriptions', async () => {
      await request(app.getHttpServer())
        .get(`/subscriptions/company/${company2Id}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(403); // Forbidden
    });

    it('should allow access to own company subscriptions', async () => {
      const response = await request(app.getHttpServer())
        .get(`/subscriptions/company/${company1Id}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(200);

      expect(response.body.items).toBeDefined();
    });

    it('should deny owner from canceling another company subscription', async () => {
      const mockSubscriptionId = 'subscription-of-company2';
      
      await request(app.getHttpServer())
        .patch(`/subscriptions/${mockSubscriptionId}/cancel`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(403); // Forbidden
    });
  });

  describe('💰 Tariffs Security', () => {
    it('should allow public access to view tariffs', async () => {
      const response = await request(app.getHttpServer())
        .get('/tariffs')
        .expect(200);

      expect(response.body.items).toBeDefined();
    });

    it('should deny non-admin from creating tariffs', async () => {
      await request(app.getHttpServer())
        .post('/tariffs')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          name: 'Hacker Tariff',
          priceMonthly: 1,
          priceYearly: 10
        })
        .expect(403); // Forbidden
    });

    it('should allow superadmin to create tariffs', async () => {
      const response = await request(app.getHttpServer())
        .post('/tariffs')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Test Tariff',
          priceMonthly: 100000,
          priceYearly: 1000000
        })
        .expect(201);

      expect(response.body.name).toBe('Test Tariff');
    });
  });

  describe('🚫 Cross-Company Data Isolation', () => {
    it('should completely isolate company data', async () => {
      // Комплексный тест изоляции данных
      const endpoints = [
        `/companies/${company2Id}`,
        `/subscriptions/company/${company2Id}`,
      ];

      for (const endpoint of endpoints) {
        await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${owner1Token}`)
          .expect(403);
      }
    });
  });

  describe('🔑 Authentication & Authorization', () => {
    it('should reject requests without token', async () => {
      await request(app.getHttpServer())
        .get('/companies')
        .expect(401); // Unauthorized
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/companies')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401); // Unauthorized
    });

    it('should validate role-based access', async () => {
      // Owner не может создавать компании
      await request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          name: 'Unauthorized Company',
          email: 'hack@example.com'
        })
        .expect(403); // Forbidden
    });
  });
});
