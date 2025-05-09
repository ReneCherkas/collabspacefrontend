<template>
  <div class="task-column"
       @dragover.prevent
       @drop="onDrop">
    <div class="tasks">
      <draggable
          :list="tasks"
          group="tasks"
          item-key="id"
          @end="onTaskReorder"
          @change="onTasksChange"
      >
        <template #item="{element}">
          <TaskCard
              :key="element.id"
              :task="element"
              @dragstart="onDragStart"
          />
        </template>
      </draggable>
    </div>
  </div>
</template>

<script>
import draggable from 'vuedraggable';
import TaskCard from './TaskCard.vue';

export default {
  components: { TaskCard, draggable },
  props: {
    status: String,
    tasks: Array
  },
  methods: {
    onTasksChange(evt) {
      this.$emit('update:tasks', this.tasks);
    },
    onTaskReorder() {
    },
    onDragStart(task) {
      this.$emit('drag-task', task);
    },
    onDrop(event) {
      const task = JSON.parse(event.dataTransfer.getData('task'));
      this.$emit('drop-task', { task, newStatus: this.status });
    }
  }
};
</script>

<style scoped>
.task-column {
  width: 280px;
  padding: 16px;
  background-color: #fff;
  border-radius: 12px;
  min-height: 400px;
  overflow-y: auto;
  box-shadow: 0 2px 6px rgb(30, 3, 3);
  border: 1px solid #e6e8f1;
}

h3 {
  margin-bottom: 16px;
  color: #4e42d8;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 2px solid #e6e8f1;
}

.tasks {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>