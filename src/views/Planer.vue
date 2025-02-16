<template>
  <div class="calendar">
    <div class="header">
      <button @click="prevMonth" class="nav-button">←</button>
      <h2>{{ currentMonth }}</h2>
      <button @click="nextMonth" class="nav-button">→</button>
    </div>

    <div class="days">
      <div v-for="day in days" :key="day" class="day">{{ day }}</div>
    </div>

    <div class="dates">
      <div
          v-for="date in visibleDates"
          :key="date.toISOString()"
          class="date"
          @click="addTask(date)"
          :class="{ 'current-day': isCurrentDay(date) }"
      >
        <div class="date-number">{{ date.getDate() }}</div>
        <div
            v-for="task in getTasksForDate(date)"
            :key="task.id"
            class="task"
            :style="{ backgroundColor: task.color }"
        >
          {{ task.title }} ({{ task.time }})
        </div>
      </div>
    </div>

    <div v-if="dialog" class="dialog-overlay">
      <div class="dialog">
        <h3>Добавить задачу</h3>
        <input v-model="newTask.title" placeholder="Название задачи" class="task-input" />
        <input v-model="newTask.time" type="time" class="task-input" />
        <div class="color-picker">
          <label>Цвет задачи:</label>
          <input v-model="newTask.color" type="color" class="color-input" />
        </div>
        <div class="dialog-buttons">
          <button @click="saveTask" class="save-button">Сохранить</button>
          <button @click="dialog = false" class="cancel-button">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      currentDate: new Date(),
      tasks: [],
      dialog: false,
      newTask: { title: '', time: '', color: '#6a11cb' },
      selectedDate: null,
    };
  },
  computed: {
    currentMonth() {
      return this.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    },
    days() {
      return ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    },
    visibleDates() {
      const start = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
      const end = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
      const dates = [];
      for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      return dates;
    },
  },
  methods: {
    prevMonth() {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.currentDate = new Date(this.currentDate);
    },
    nextMonth() {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.currentDate = new Date(this.currentDate);
    },
    addTask(date) {
      this.selectedDate = date;
      this.newTask = { title: '', time: '', color: '#6a11cb' };
      this.dialog = true;
    },
    saveTask() {
      this.tasks.push({
        id: Date.now(),
        date: this.selectedDate.toISOString().substr(0, 10),
        title: this.newTask.title,
        time: this.newTask.time,
        color: this.newTask.color,
      });
      this.dialog = false;
    },
    getTasksForDate(date) {
      return this.tasks.filter(
          (task) => task.date === date.toISOString().substr(0, 10)
      );
    },
    isCurrentDay(date) {
      const today = new Date();
      return (
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear()
      );
    },
  },
};
</script>

<style scoped>
.calendar {
  font-family: 'Arial', sans-serif;
  height: 100vh;
  width: 100%;
  padding: 20px;
  background: #ffffff;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.nav-button {
  background: #6a11cb;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.nav-button:hover {
  background: #2575fc;
}

h2 {
  font-size: 24px;
  color: #000;
}

.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.day {
  text-align: center;
  font-weight: bold;
  color: #000;
}

.dates {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  height: calc(100vh - 200px);
}

.date {
  border: 1px solid #e0e0e0;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s, transform 0.2s;
}

.date:hover {
  background: #f5f5f5;
  transform: translateY(-2px);
}

.current-day {
  background: rgb(136, 123, 253);
  color: black;
}

.date-number {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 5px;
  color: #000;
}

.task {
  margin: 2px 0;
  padding: 4px;
  border-radius: 4px;
  font-size: 12px;
  color: #000;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.dialog {
  background: white;
  padding: 20px;
  border-radius: 12px;
  width: 300px;
  color: black;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.task-input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
  color: #000;
}

.color-picker {
  margin: 10px 0;
  color: black;
}

.color-input {
  margin-left: 10px;
}

.dialog-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.save-button {
  background: #6a11cb;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.save-button:hover {
  background: #2575fc;
}

.cancel-button {
  background: #ccc;
  color: #000;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.cancel-button:hover {
  background: #999;
}
</style>