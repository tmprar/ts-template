import request from 'supertest'

import { DatabaseHealthIndicator } from '#app/platform/health/database.health.js'
import { useTestApp } from '#test/support/app/create-app.js'

describe('稼働状況の確認', () => {
  describe('DBに届いているとき', () => {
    const ctx = useTestApp()

    it('200でdatabaseがupになる', async () => {
      const response = await request(ctx.server())
        .get('/api/health')
        .expect(200)

      // responseTime は毎回変わるので値の照合から外す
      const database = {
        responseTime: expect.any(Number) as number,
        status: 'up',
      }

      expect(response.body).toEqual({
        details: { database },
        error: {},
        info: { database },
        status: 'ok',
      })
    })
  })

  describe('DBに届かないとき', () => {
    // DBの応答を待たずに落ちている状態を再現する
    const ctx = useTestApp({
      configure: builder => builder
        .overrideProvider(DatabaseHealthIndicator)
        .useValue({
          check: (key: string) => ({
            withTimeout: async () => await Promise.resolve({
              [key]: {
                message: 'connection refused',
                status: 'down',
              },
            }),
          }),
        }),
    })

    it('503でdatabaseがdownになる', async () => {
      const response = await request(ctx.server())
        .get('/api/health')
        .expect(503)

      expect(response.body).toEqual({
        details: {
          database: {
            message: 'connection refused',
            status: 'down',
          },
        },
        error: {
          database: {
            message: 'connection refused',
            status: 'down',
          },
        },
        info: {},
        status: 'error',
      })
    })
  })
})
