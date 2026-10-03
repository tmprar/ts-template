// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'

import type { TodoItem } from '~/domain/todo'

import TodoListItem from '~/components/TodoListItem.vue'

const mount = async (item: TodoItem) =>
  await mountSuspended(TodoListItem, { props: { item } })

describe('TodoListItem', () => {
  it('未完了のtodoには完了にする操作を出す', async () => {
    const wrapper = await mount({
      id: 'todo-1',
      status: 'incomplete',
      title: '牛乳を買う',
    })

    expect(wrapper.text()).toContain('牛乳を買う')
    expect(wrapper.text()).toContain('完了にする')
  })

  it('完了にするを押すと、そのtodoのIDを親へ伝える', async () => {
    const wrapper = await mount({
      id: 'todo-1',
      status: 'incomplete',
      title: '牛乳を買う',
    })

    await wrapper.findAll('button')[0]?.trigger('click')

    expect(wrapper.emitted('complete')).toEqual([['todo-1']])
  })

  it('完了済みのtodoには完了にする操作を出さない', async () => {
    const wrapper = await mount({
      id: 'todo-1',
      status: 'completed',
      title: '牛乳を買う',
    })

    expect(wrapper.text()).toContain('完了')
    expect(wrapper.text()).not.toContain('完了にする')
  })

  it('削除を押すと、そのtodoのIDを親へ伝える', async () => {
    const wrapper = await mount({
      id: 'todo-1',
      status: 'completed',
      title: '牛乳を買う',
    })

    await wrapper.find('button[aria-label="「牛乳を買う」を削除"]').trigger('click')

    expect(wrapper.emitted('remove')).toEqual([['todo-1']])
  })
})
