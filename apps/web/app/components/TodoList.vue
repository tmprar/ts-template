<template>
  <!-- todoの一覧の枠。行(TodoListItem)は親がslotで並べる -->
  <ul class="divide-y divide-default rounded-lg border border-default">
    <slot />
  </ul>
</template>
