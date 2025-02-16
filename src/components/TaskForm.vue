<template>
  <div class="task-form">
    <input
        v-model="task.title"
        type="text"
        placeholder="Заголовок"
        required
    />

    <textarea
        v-model="task.description"
        placeholder="Описание"
        required
    ></textarea>

    <select v-model="task.priority" required>
      <option value="High">High</option>
      <option value="Medium">Medium</option>
      <option value="Low">Low</option>
    </select>

    <button @click="saveTask">Сохранить</button>

    <button @click="$emit('close')">Отмена</button>
  </div>
</template>

<script>
export default {
  props: {
    task: {
      type: Object,
      default: () => ({
        title: "",
        description: "",
        priority: "Medium",
        status: "To Do",
      }),
    },
  },
  methods: {
    saveTask() {
      this.$emit("save", { ...this.task });
    },
  },
};
</script>

<style scoped>
.task-form {
  background: #f9f9f9;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

input, textarea, select {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  cursor: pointer;
}

button:hover {
  background: #45a049;
}

button:last-child {
  background: #f44336;
}

button:last-child:hover {
  background: #e53935;
}
</style>
