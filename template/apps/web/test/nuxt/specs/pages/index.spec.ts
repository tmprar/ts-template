import type { VueWrapper } from '@vue/test-utils'

import { mountSuspended } from '@nuxt/test-utils/runtime'
import { findShownToasts } from '~~/test/nuxt/helpers/toasts'
import {
  disconnectRequest,
  holdRequest,
  rejectRequest,
} from '~~/test/nuxt/mocks/handlers/errors'
import {
  server,
  setupMockApi,
} from '~~/test/nuxt/mocks/node'
import {
  http,
  HttpResponse,
} from 'msw'

import type {
  TodoControllerCompleteResponse,
  TodoControllerCreateResponse,
  TodoControllerFindManyResponse,
} from '~/generated/api/types.gen'

// @vitest-environment nuxt
import IndexPage from '~/pages/index.vue'

setupMockApi()

type Todo = TodoControllerFindManyResponse['todos'][number]

/**
 * `title`の未完了のtodoを返す
 */
const openTodo = (id: string, title: string): Todo => ({
  completedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  id,
  status: 'incomplete',
  title,
})

/**
 * 一覧の取得に`todos`を返す状態にし、返す一覧を書き換える関数を返す。更新のあとに取得し直したときの一覧を、テストが決められるようにする
 */
const serveTodos = (todos: Todo[]) => {
  let current = todos

  server.use(http.get('*/api/todos', () => HttpResponse.json<TodoControllerFindManyResponse>({ todos: current })))

  return (next: Todo[]) => {
    current = next
  }
}

/**
 * 画面に並んでいるtodoの件名を、上から順に返す
 */
const shownTitles = (page: VueWrapper) =>
  page.findAll('li').map(item => item.find('span').text())

describe('利用者がtodoの画面を開く', () => {
  describe('todoがあるとき', () => {
    it('todoを一覧にし、未完了と完了の件数を表示する', async () => {
      serveTodos([
        openTodo('00000000-0000-4000-8000-000000000001', '牛乳を買う'),
        {
          ...openTodo('00000000-0000-4000-8000-000000000002', '洗濯する'),
          completedAt: '2026-01-02T00:00:00.000Z',
          status: 'completed',
        },
      ])

      const page = await mountSuspended(IndexPage, { route: '/' })

      await vi.waitFor(() => {
        expect(shownTitles(page)).toEqual(['牛乳を買う', '洗濯する'])
      })
      expect(page.text()).toContain('未完了 1 件 / 完了 1 件')
    })
  })

  describe('todoが無いとき', () => {
    it('追加を促す案内を表示する', async () => {
      const page = await mountSuspended(IndexPage, { route: '/' })

      await vi.waitFor(() => {
        expect(page.text()).toContain('まだtodoがありません。')
      })
    })
  })

  describe('一覧を取得できなかったとき', () => {
    it('読み込めなかったことを伝える', async () => {
      rejectRequest('get', '/api/todos', 500, 'INTERNAL')

      const page = await mountSuspended(IndexPage, { route: '/' })

      await vi.waitFor(() => {
        expect(page.text()).toContain('todoを読み込めませんでした')
      })
    })
  })
})

describe('利用者がtodoを追加する', () => {
  describe('件名を入力して追加したとき', () => {
    it('件名を送り、取得し直した一覧を表示して、入力欄を空にする', async () => {
      const setTodos = serveTodos([])
      const added = openTodo('00000000-0000-4000-8000-000000000001', '牛乳を買う')
      const sentBodies: unknown[] = []

      server.use(http.post('*/api/todos', async ({ request }) => {
        sentBodies.push(await request.json())
        setTodos([added])

        return HttpResponse.json<TodoControllerCreateResponse>({ todo: added }, { status: 201 })
      }))
      const page = await mountSuspended(IndexPage, { route: '/' })

      await page.find('input').setValue('  牛乳を買う  ')
      await page.find('form').trigger('submit')

      await vi.waitFor(() => {
        expect(shownTitles(page)).toEqual(['牛乳を買う'])
      })
      expect(sentBodies).toEqual([{ title: '牛乳を買う' }])
      expect((page.find('input').element as HTMLInputElement).value).toBe('')
    })
  })

  describe('APIに接続できなかったとき', () => {
    it('通信に失敗したことをトーストで伝え、入力を残す', async () => {
      disconnectRequest('post', '/api/todos')
      const page = await mountSuspended(IndexPage, { route: '/' })

      await page.find('input').setValue('牛乳を買う')
      await page.find('form').trigger('submit')

      await vi.waitFor(() => {
        expect(findShownToasts()).toEqual([{
          duration: 0,
          title: '通信に失敗したため、todoを追加できませんでした。通信状況をご確認のうえ、もう一度お試しください。',
        }])
      })
      expect((page.find('input').element as HTMLInputElement).value).toBe('牛乳を買う')
    })

    it('一覧を取得し直すのを待たずに、追加のボタンを押せる状態に戻す', async () => {
      serveTodos([])
      const page = await mountSuspended(IndexPage, { route: '/' })

      await vi.waitFor(() => {
        expect(page.text()).toContain('未完了 0 件 / 完了 0 件')
      })
      disconnectRequest('post', '/api/todos')
      // 失敗のあとの取得し直しを応答させずに待たせ、取得し直しが終わらないうちの表示を見る
      const releaseRefetch = holdRequest('get', '/api/todos')

      onTestFinished(releaseRefetch)
      await page.find('input').setValue('牛乳を買う')
      await page.find('form').trigger('submit')

      await vi.waitFor(() => {
        expect(findShownToasts()).toHaveLength(1)
      })
      await vi.waitFor(() => {
        expect(page.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
      })
    })
  })
})

describe('利用者がtodoを完了にする', () => {
  describe('完了にするを押したとき', () => {
    it('完了を送り、取得し直した一覧で完了済みとして表示する', async () => {
      const todo = openTodo('00000000-0000-4000-8000-000000000001', '牛乳を買う')
      const completed = {
        ...todo,
        completedAt: '2026-01-02T00:00:00.000Z',
        status: 'completed' as const,
      }
      const setTodos = serveTodos([todo])

      server.use(http.post(`*/api/todos/${todo.id}/complete`, () => {
        setTodos([completed])

        return HttpResponse.json<TodoControllerCompleteResponse>({ todo: completed })
      }))
      const page = await mountSuspended(IndexPage, { route: '/' })

      await vi.waitFor(() => {
        expect(shownTitles(page)).toEqual(['牛乳を買う'])
      })
      await page.find('li button').trigger('click')

      await vi.waitFor(() => {
        expect(page.text()).toContain('未完了 0 件 / 完了 1 件')
      })
    })
  })

  describe('すでに完了しているtodoだったとき', () => {
    it('すでに完了していることを、トーストで伝える', async () => {
      const todo = openTodo('00000000-0000-4000-8000-000000000001', '牛乳を買う')

      serveTodos([todo])
      rejectRequest('post', `/api/todos/${todo.id}/complete`, 409, 'TODO_ALREADY_COMPLETED')
      const page = await mountSuspended(IndexPage, { route: '/' })

      await vi.waitFor(() => {
        expect(shownTitles(page)).toEqual(['牛乳を買う'])
      })
      await page.find('li button').trigger('click')

      await vi.waitFor(() => {
        expect(findShownToasts()).toEqual([{
          duration: 0,
          title: 'このtodoはすでに完了しています。',
        }])
      })
    })
  })

  describe('APIが失敗を返したとき', () => {
    it('しばらくしてから試すよう、トーストで伝える', async () => {
      const todo = openTodo('00000000-0000-4000-8000-000000000001', '牛乳を買う')

      serveTodos([todo])
      rejectRequest('post', `/api/todos/${todo.id}/complete`, 500, 'INTERNAL')
      const page = await mountSuspended(IndexPage, { route: '/' })

      await vi.waitFor(() => {
        expect(shownTitles(page)).toEqual(['牛乳を買う'])
      })
      await page.find('li button').trigger('click')

      await vi.waitFor(() => {
        expect(findShownToasts()).toEqual([{
          duration: 0,
          title: 'todoを完了にできませんでした。しばらくしてからもう一度お試しください。',
        }])
      })
    })
  })
})

describe('利用者がtodoを削除する', () => {
  describe('削除を押したとき', () => {
    it('削除を送り、取得し直した一覧から消す', async () => {
      const todo = openTodo('00000000-0000-4000-8000-000000000001', '牛乳を買う')
      const setTodos = serveTodos([todo])

      server.use(http.delete(`*/api/todos/${todo.id}`, () => {
        setTodos([])

        return new HttpResponse(null, { status: 204 })
      }))
      const page = await mountSuspended(IndexPage, { route: '/' })

      await vi.waitFor(() => {
        expect(shownTitles(page)).toEqual(['牛乳を買う'])
      })
      await page.find('button[aria-label="「牛乳を買う」を削除"]').trigger('click')

      await vi.waitFor(() => {
        expect(page.text()).toContain('まだtodoがありません。')
      })
    })
  })

  describe('すでに削除されたtodoだったとき', () => {
    it('すでに削除されていることを、トーストで伝える', async () => {
      const todo = openTodo('00000000-0000-4000-8000-000000000001', '牛乳を買う')

      serveTodos([todo])
      rejectRequest('delete', `/api/todos/${todo.id}`, 404, 'TODO_NOT_FOUND')
      const page = await mountSuspended(IndexPage, { route: '/' })

      await vi.waitFor(() => {
        expect(shownTitles(page)).toEqual(['牛乳を買う'])
      })
      await page.find('button[aria-label="「牛乳を買う」を削除"]').trigger('click')

      await vi.waitFor(() => {
        expect(findShownToasts()).toEqual([{
          duration: 0,
          title: 'このtodoはすでに削除されています。',
        }])
      })
    })
  })
})
