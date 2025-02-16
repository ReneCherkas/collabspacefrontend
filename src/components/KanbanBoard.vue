<template>
  <div class="kanban-board">
    <div
        v-for="(column, status) in columns"
        :key="status"
        class="kanban-column"
    >
      <h2>{{ column.title }}</h2>
      <draggable
          v-model="column.tasks"
          group="tasks"
          @end="onTaskDrop(status)"
          class="kanban-tasks"
      >
        <template v-slot:item="{element}">
          <div
              :key="element.id"
              class="kanban-task"
          >
            <h3>{{ element.title }}</h3>
            <p>{{ element.description }}</p>
            <span class="priority">{{ element.priority }}</span>
            <button @click="editTask(element)">Редактировать</button>
            <button @click="deleteTask(element.id)">Удалить</button>
          </div>
        </template>
      </draggable>
    </div>

    <button @click="openTaskForm">Добавить задачу</button>

    <task-form
        v-if="showTaskForm"
        :task="currentTask"
        @save="saveTask"
        @close="closeTaskForm"
    />
  </div>
</template>

<script>
import axios from "axios";
import draggable from "vuedraggable";
import TaskForm from "./TaskForm.vue";

export default {
  components: { draggable, TaskForm },
  data() {
    return {
      columns: {
        todo: { title: "To Do", tasks: [] },
        inProgress: { title: "In Progress", tasks: [] },
        done: { title: "Done", tasks: [] },
      },
      showTaskForm: false,
      currentTask: null,
    };
  },
  methods: {
    // Получение задач с сервера
    fetchTasks() {
      axios.get("/api/tasks").then((response) => {
        this.columns.todo.tasks = response.data.filter(
            (task) => task.status === "To Do"
        );
        this.columns.inProgress.tasks = response.data.filter(
            (task) => task.status === "In Progress"
        );
        this.columns.done.tasks = response.data.filter(
            (task) => task.status === "Done"
        );
      });
    },
    saveTask(task) {
      if (task.id) {
        axios.put(`/api/tasks/${task.id}`, task).then(() => this.fetchTasks());
      } else {
        axios.post("/api/tasks", task).then(() => this.fetchTasks());
      }
      this.closeTaskForm();
    },
    deleteTask(taskId) {
      axios.delete(`/api/tasks/${taskId}`).then(() => this.fetchTasks());
    },
    openTaskForm(task = null) {
      this.currentTask = task
          ? { ...task }
          : { title: "", description: "", priority: "Medium", status: "To Do" };
      this.showTaskForm = true;
    },
    closeTaskForm() {
      this.showTaskForm = false;
      this.currentTask = null;
    },
    onTaskDrop(newStatus) {
      this.columns[newStatus].tasks.forEach((task) => {
        if (task.status !== newStatus) {
          task.status = newStatus;
          axios.put(`/api/tasks/${task.id}`, task);
        }
      });
    },
    editTask(task) {
      this.openTaskForm(task);
    },
  },
  mounted() {
    this.fetchTasks();
  },
};
</script>

<style scoped>
.kanban-board {
  display: flex;
  gap: 20px;
}

.kanban-column {
  flex: 1;
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
}

.kanban-tasks {
  min-height: 100px;
}

.kanban-task {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
  padding: 10px;
}

.priority {
  font-size: 0.9em;
  color: #1e0303;
}
</style>
