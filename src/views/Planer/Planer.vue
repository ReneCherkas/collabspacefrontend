<template>
  <div class="calendar">
    <div class="header">
      <button @click="prevMonth" class="nav-button">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6a11cb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"></path>
        </svg>
      </button>

      <h2 @click="openMonthYearPicker">{{ currentMonthYear }}</h2>

      <button @click="nextMonth" class="nav-button">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6a11cb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18l6-6-6-6"></path>
        </svg>
      </button>
    </div>

    <div class="days">
      <div v-for="day in days" :key="day" class="day">{{ day }}</div>
    </div>

    <div class="dates">
      <div
          v-for="date in visibleDates"
          :key="date.toISOString()"
          class="date"
          :class="{
            'current-day': isCurrentDay(date) && !date.isOtherMonth,
            'other-month': date.isOtherMonth
          }"
          @click="addTask(date)"
          @dragover.prevent
          @drop="dropTaskInDay($event, date)"
      >
        <div class="date-number">{{ date.getDate() }}</div>
        <div
            v-for="(task, index) in getTasksForDate(date)"
            :key="task.id"
            class="task"
            :style="{ backgroundColor: task.color }"
            draggable="true"
            @click.stop="editTask(task)"
            @dragstart="dragTask($event, task, index)"
            @dragover.prevent
            @drop="dropTaskInDay($event, date, index)"
            :class="{
              'completed-task': task.status === 'Close',
              'kanban-task': task.isKanban
          }"
        >
          <div class="task-content">
            <div class="task-title">{{ task.title }}</div>
            <span v-if="task.isKanban" class="task-priority" :class="getPriorityClass(task)">
              {{ getPriorityText(task) }}
            </span>
            <div v-if="task.description" class="task-description">{{ task.description }}</div>

            <span v-if="task.deadline" :style="deadlineColorStyles(task.deadline, date)">
              {{ formattedDeadline(task.deadline) }}
            </span>
                  </div>
          <div class="task-footer">
            <span
                v-for="label in getLabelsForTask(task)"
                :key="label.id"
                class="task-label"
                :style="{ backgroundColor: label.color }"
            >
              {{ label.name }}
            </span>
                      <span class="task-status" @click.stop="toggleTaskStatus(task)">
              {{ task.status === 'Close' ? '⟲' : '✓' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="dialog" class="dialog-overlay">
      <div class="dialog">
        <h3>{{ editingTaskId ? 'Редактировать задачу' : 'Добавить задачу' }}</h3>
        <input
            v-model="newTask.title"
            placeholder="Название задачи"
            class="task-input"
            :class="{ 'error': error.title }"
            @input="error.title = false"
        />
        <div v-if="error.title" class="error-message">{{ error.titleMessage }}</div>
        <textarea v-model="newTask.description" placeholder="Описание задачи" class="task-input"></textarea>
        <input v-model="newTask.deadline" type="datetime-local" class="task-input" />
        <div class="color-picker">
          <label>Цвет задачи:</label>
          <input v-model="newTask.color" type="color" class="color-input" required />
        </div>

        <!-- Новый блок для ярлыков -->
        <div class="labels-section">
          <label>Ярлыки:</label>
          <div class="labels-container">
            <div class="labels-scroll">
              <button @click="openLabelDialog" class="add-label-button">+</button>
              <div
                  v-for="label in userLabels"
                  :key="label.id"
                  class="label-button"
                  :style="{ backgroundColor: label.color }"
                  :class="{ 'selected-label': newTask.labelIds.includes(label.id) }"
                  @click="selectLabel(label)"
              >
                {{ label.name }}
                <button
                    class="delete-label-btn"
                    @click.stop="deleteLabel(label.id)"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="dialog-buttons">
          <button @click="saveTask" class="save-button">Сохранить</button>
          <button v-if="editingTaskId" @click="deleteCurrentTask" class="delete-button">Удалить</button>
          <button @click="dialog = false" class="cancel-button">Отмена</button>
        </div>
      </div>
    </div>

    <!-- Диалог добавления нового ярлыка -->
    <div v-if="labelDialog" class="dialog-overlay">
      <div class="dialog">
        <h3>Добавить новый ярлык</h3>
        <input v-model="newLabel.name" placeholder="Название ярлыка" class="task-input" required />
        <div class="color-picker">
          <label>Цвет ярлыка:</label>
          <input v-model="newLabel.color" type="color" class="color-input" required />
        </div>
        <div class="dialog-buttons">
          <button @click="saveLabel" class="save-button">Сохранить</button>
          <button @click="labelDialog = false" class="cancel-button">Отмена</button>
        </div>
      </div>
    </div>



    <div v-if="monthYearPicker" class="dialog-overlay" @click.self="closeMonthYearPicker">
      <div class="month-year-picker">
        <div class="year-selector">
          <button @click="prevYear">&lt;</button>
          <span>{{ currentYear }}</span>
          <button @click="nextYear">&gt;</button>
        </div>
        <div class="month-grid">
          <button
              v-for="(month, index) in months"
              :key="index"
              @click="selectMonth(index)"
              :class="{ 'selected-month': index === currentDate.getMonth() && currentYear === currentDate.getFullYear() }"
          >
            {{ month }}
          </button>
        </div>
        <button @click="closeMonthYearPicker" class="close-button">Закрыть</button>
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
      monthYearPicker: false,
      editingTaskId: null,
      newTask: {
        title: '',
        description: '',
        deadline: '',
        color: '#6a11cb',
        priority: 1,
        labelIds: [],
        status: 'Open',
        login: ''
      },
      labelDialog: false,
      userLabels: [],
      newLabel: {
        name: '',
        color: '#ffffff',
        login: ''
      },
      error: {
        title: false,
        titleMessage: ''
      },
      selectedDate: null,
      months: [
        'Январь', 'Февраль', 'Март', 'Апрель',
        'Май', 'Июнь', 'Июль', 'Август',
        'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
      ],
      currentYear: new Date().getFullYear(),
    };
  },
  computed: {
    deadlineColorStyles() {
      return (deadline) => {
        if (!deadline) return {};

        const deadlineDate = new Date(deadline);
        const today = new Date();

        // Приводим даты к началу дня для точного расчета
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const deadlineDayStart = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());

        const diffTime = deadlineDayStart - todayStart;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let backgroundColor;
        if (diffDays < 0) {
          backgroundColor = '#ff6b6b'; // Просрочено (красный)
        } else if (diffDays === 0) {
          backgroundColor = '#ff9e2c'; // Сегодня (оранжевый)
        } else if (diffDays <= 3) {
          backgroundColor = '#ffb347'; // 1-3 дня (светло-оранжевый)
        } else if (diffDays <= 7) {
          backgroundColor = '#a5d6a7'; // 4-7 дней (зеленый)
        } else {
          backgroundColor = '#66bb6a'; // Больше недели (темно-зеленый)
        }

        return {
          backgroundColor,
          color: '#000',
          padding: '2px 5px',
          borderRadius: '4px',
          fontSize: '0.8em',
          display: 'inline-block'
        };
      };
    },
    formattedDeadline() {
      return (deadline) => {
        if (!deadline) return '';
        const date = new Date(deadline);
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth()+1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      };
    },
    currentMonthYear() {
      const monthYear = this.currentDate.toLocaleString("ru-RU", {
        month: "long",
        year: "numeric"
      });
      return monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    },
    days() {
      return ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    },
    visibleDates() {
      const year = this.currentDate.getFullYear();
      const month = this.currentDate.getMonth();

      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);

      const firstDayOfWeek = firstDayOfMonth.getDay();
      const adjustedFirstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

      const dates = [];

      // Добавляем дни из предыдущего месяца
      const prevMonthLastDate = new Date(year, month, 0);
      for (let i = adjustedFirstDayOfWeek; i > 0; i--) {
        const prevDate = new Date(prevMonthLastDate);
        prevDate.setDate(prevMonthLastDate.getDate() - i + 1);
        const dateObj = new Date(prevDate);
        dateObj.isOtherMonth = true; // Устанавливаем флаг для дней не из текущего месяца
        dates.push(dateObj);
      }

      // Добавляем дни текущего месяца
      for (let d = new Date(firstDayOfMonth); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
        const dateObj = new Date(d);
        dateObj.isOtherMonth = false;
        dates.push(dateObj);
      }

      // Добавляем дни из следующего месяца
      const daysToAdd = 7 - (dates.length % 7);
      if (daysToAdd < 7) {
        for (let i = 1; i <= daysToAdd; i++) {
          const nextDate = new Date(lastDayOfMonth);
          nextDate.setDate(lastDayOfMonth.getDate() + i);
          const dateObj = new Date(nextDate);
          dateObj.isOtherMonth = true; // Устанавливаем флаг для дней не из текущего месяца
          dates.push(dateObj);
        }
      }

      return dates;
    }
  },
  methods: {
    getPriorityText(task) {
      if (!task.isKanban) return '';

      // Обработка как числовых, так и строковых приоритетов
      const priority = typeof task.priority === 'number'
          ? task.priority
          : task.priority === 'urgent' ? 1 :
              task.priority === 'high' ? 2 :
                  task.priority === 'medium' ? 3 : 4;

      const priorityMap = {
        1: 'Срочно',
        2: 'Высокий',
        3: 'Средний',
        4: 'Низкий'
      };
      return priorityMap[priority] || 'Средний';
    },

    getPriorityClass(task) {
      if (!task.isKanban) return {};

      const priority = typeof task.priority === 'number'
          ? task.priority
          : task.priority === 'urgent' ? 1 :
              task.priority === 'high' ? 2 :
                  task.priority === 'medium' ? 3 : 4;

      return {
        'urgent': priority === 1,
        'high': priority === 2,
        'medium': priority === 3,
        'low': priority === 4
      };
    },
    async dropTaskInDay(event, date, dropIndex = -1) {
      const taskId = event.dataTransfer.getData("taskId");
      const oldDate = event.dataTransfer.getData("oldDate");
      let movedTask = this.tasks.find(t => t.id == taskId);
      if (!movedTask) return;

      // Форматируем новую дату
      const newDate = date.toISOString().substr(0, 10);

      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`https://planer-service.onrender.com/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            date: newDate,
            priority: movedTask.priority
          })
        });

        if (response.ok) {
          await this.loadTasks();
        } else {
          console.error('Ошибка при обновлении задачи');
        }
      } catch (error) {
        console.error('Ошибка при запросе:', error);
      }
    },
    async loadUserLabels() {
      try {
        const token = localStorage.getItem('authToken');
        const login = localStorage.getItem('userLogin');

        const response = await fetch(`https://planer-service.onrender.com/api/labels/${login}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          this.userLabels = await response.json();
        } else {
          console.error('Ошибка загрузки ярлыков');
        }
      } catch (error) {
        console.error('Ошибка при запросе ярлыков:', error);
      }
    },

    openLabelDialog() {
      this.newLabel = {
        name: '',
        color: '#6a11cb',
        login: localStorage.getItem('userLogin')
      };
      this.labelDialog = true;
    },

    async saveLabel() {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('https://planer-service.onrender.com/api/labels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(this.newLabel)
        });

        if (response.ok) {
          this.labelDialog = false;
          await this.loadUserLabels();
        } else {
          const errorText = await response.text();
          console.error('Ошибка при сохранении ярлыка', errorText);
        }
      } catch (error) {
        console.error('Ошибка при запросе:', error);
      }
    },

    selectLabel(label) {
      const index = this.newTask.labelIds.indexOf(label.id);
      if (index === -1) {
        this.newTask.labelIds.push(label.id);
      } else {
        this.newTask.labelIds.splice(index, 1);
      }
    },
    getLabelsForTask(task) {
      if (!task.labelIds || task.labelIds.length === 0) return [];
      return this.userLabels.filter(label => task.labelIds.includes(label.id));
    },
    async toggleTaskStatus(task) {
      try {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        const newStatus = task.status === 'Open' ? 'Close' : 'Open';

        const response = await fetch(`https://planer-service.onrender.com/api/tasks/${task.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
          // Обновляем локальное состояние задачи
          task.status = newStatus;
          if (newStatus === 'Close') {
            task.closedAt = new Date().toISOString();
          } else {
            task.closedAt = null;
          }

          await fetch(`http://localhost:8084/api/challenges/update-progress/${userId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          // Обновляем список задач
          await this.loadTasks();
        } else {
          const errorText = await response.text();
          console.error('Ошибка при изменении статуса:', errorText);
        }
      } catch (error) {
        console.error('Ошибка при запросе:', error);
      }
    },
    async loadTasks() {
      try {
        const token = localStorage.getItem('authToken');
        const login = localStorage.getItem('userLogin');
        const today = new Date().toISOString().split('T')[0];

        // Получаем имя пользователя
        const userResponse = await fetch(`http://localhost:8081/api/auth/by-login/${login}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!userResponse.ok) {
          console.error('Ошибка при получении данных пользователя');
          return;
        }

        const userData = await userResponse.json();
        const userName = userData.name;

        // Получаем обычные задачи
        const tasksResponse = await fetch(`https://planer-service.onrender.com/api/tasks/${login}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Получаем Kanban-задачи, где пользователь является ответственным
        const kanbanTasksResponse = await fetch(`https://planer-service.onrender.com/api/tasks/assignee/${userName}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (tasksResponse.ok && kanbanTasksResponse.ok) {
          const tasks = await tasksResponse.json();
          const kanbanTasks = await kanbanTasksResponse.json();

          // Обрабатываем задачи
          this.tasks = [
            ...tasks.map(task => ({
              ...task,
              priority: typeof task.priority === 'number'
                  ? task.priority
                  : task.priority === 'urgent' ? 1 :
                      task.priority === 'high' ? 2 :
                          task.priority === 'medium' ? 3 : 4,
              date: task.date || today
            })),
            ...kanbanTasks.map(task => ({
              ...task,
              isKanban: true,
              priority: typeof task.priority === 'number'
                  ? task.priority
                  : task.priority === 'urgent' ? 1 :
                      task.priority === 'high' ? 2 :
                          task.priority === 'medium' ? 3 : 4,
              date: task.deadline
                  ? new Date(task.deadline).toISOString().split('T')[0]
                  : (task.date || today)
            }))
          ];

          console.log('Processed tasks:', this.tasks);
        } else {
          console.error('Ошибка загрузки задач');
        }
      } catch (error) {
        console.error('Ошибка при запросе задач:', error);
      }
    },

    prevMonth() {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.currentDate = new Date(this.currentDate);
      this.loadTasks();
    },


    nextMonth() {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.currentDate = new Date(this.currentDate);
      this.loadTasks();
    },

    addTask(date) {
      this.editingTaskId = null;
      this.selectedDate = date;

      this.newTask = {
        title: '',
        description: '',
        date: date.toISOString().substr(0, 10),
        deadline: '',
        color: '#6a11cb',
        priority: 1,
        labelIds: [],
        status: 'Open',
        login: ''
      };

      this.dialog = true;
    },

    async deleteLabel(labelId) {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`https://planer-service.onrender.com/api/labels/${labelId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          // Удаляем ярлык из локального списка
          this.userLabels = this.userLabels.filter(label => label.id !== labelId);
          // Удаляем ID ярлыка из текущей задачи, если он был выбран
          this.newTask.labelIds = this.newTask.labelIds.filter(id => id !== labelId);
        } else {
          console.error('Ошибка при удалении ярлыка');
        }
      } catch (error) {
        console.error('Ошибка при запросе:', error);
      }
    },

    getTasksForDate(date) {
      const formattedDate = date.toISOString().substr(0, 10);
      return this.tasks
          .filter(task => {
            const taskDate = task.date ? task.date.toString().substr(0, 10) : null;
            return taskDate === formattedDate;
          })
          .sort((a, b) => {
            // Сначала сортируем по приоритету (по убыванию)
            const priorityDiff = b.priority - a.priority;
            if (priorityDiff !== 0) return priorityDiff;

            // Если приоритеты равны, сортируем задачи с дедлайном выше
            return a.deadline ? -1 : 1;
          });
    },

    isCurrentDay(date) {
      const today = new Date();
      return (
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear()
      );
    },

    dragTask(event, task, index) {
      event.dataTransfer.setData("taskId", task.id);
      event.dataTransfer.setData("oldIndex", index);
      event.dataTransfer.setData("oldDate", task.date);
    },

    openMonthYearPicker() {
      this.currentYear = this.currentDate.getFullYear();
      this.monthYearPicker = true;
    },

    closeMonthYearPicker() {
      this.monthYearPicker = false;
    },

    prevYear() {
      this.currentYear--;
    },

    nextYear() {
      this.currentYear++;
    },

    selectMonth(monthIndex) {
      this.currentDate = new Date(this.currentYear, monthIndex, 1);
      this.loadTasks();
      this.closeMonthYearPicker();
    },

    editTask(task) {
      this.editingTaskId = task.id;
      this.selectedDate = new Date(task.date);

      this.newTask = {
        title: task.title,
        description: task.description || '',
        deadline: task.deadline ? this.formatDateTimeForInput(new Date(task.deadline)) : '',
        color: task.color || '#6a11cb',
        priority: task.priority || 1,
        status: task.status || 'Open',
        login: task.login || localStorage.getItem('userLogin'),
        labelIds: task.labelIds || [] // Ensure labelIds is set
      };

      this.dialog = true;
    },

    formatDateTimeForInput(date) {
      const pad = num => (num < 10 ? '0' + num : num);
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    },

    async saveTask() {
      // Сбрасываем ошибки
      this.error.title = false;
      this.error.titleMessage = '';

      // Проверяем название задачи
      if (!this.newTask.title || this.newTask.title.trim() === '') {
        this.error.title = true;
        this.error.titleMessage = 'Название задачи обязательно';
        return;
      }
      try {
        const token = localStorage.getItem('authToken');
        // Исправляем преобразование даты
        const deadlineDate = this.newTask.deadline ? new Date(this.newTask.deadline) : null;

        // Добавляем смещение временной зоны
        let deadlineISO = null;
        if (deadlineDate) {
          const timezoneOffset = deadlineDate.getTimezoneOffset() * 60000;
          deadlineISO = new Date(deadlineDate.getTime() - timezoneOffset).toISOString();
        }

        const taskData = {
          ...this.newTask,
          date: this.selectedDate.toISOString().substr(0, 10) + 'T00:00:00Z', // Явно указываем начало дня
          deadline: deadlineISO,
          kanban_status: 'To Do',
          team: 'Math Team',
          login: localStorage.getItem('userLogin'),
          status: 'Open',
          labelId: this.newTask.labelId
        };

        // Остальной код метода остается без изменений
        let response;
        if (this.editingTaskId) {
          response = await fetch(`https://planer-service.onrender.com/api/tasks/${this.editingTaskId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(taskData)
          });
        } else {
          response = await fetch('https://planer-service.onrender.com/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(taskData)
          });
        }

        if (response.ok) {
          this.dialog = false;
          this.editingTaskId = null;
          this.loadTasks();
        } else {
          const errorText = await response.text();
          console.error('Ошибка при сохранении задачи', errorText);
        }
      } catch (error) {
        console.error('Ошибка при запросе:', error);
      }
    },

    async deleteCurrentTask() {
      if (!this.editingTaskId) return;

      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`https://planer-service.onrender.com/api/tasks/${this.editingTaskId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          this.dialog = false;
          this.editingTaskId = null;
          this.loadTasks();
        } else {
          const errorText = await response.text();
          console.error('Ошибка при удалении задачи', errorText);
        }
      } catch (error) {
        console.error('Ошибка при запросе:', error);
      }
    },
    getLabelForTask(task) {
      if (!task.labelId) return null;
      return this.userLabels.find(label => label.id === task.labelId);
    },
  },
  mounted() {
    this.loadTasks();
    this.loadUserLabels();
  }
};
</script>

<style scoped>
.calendar {
  font-family: 'Montserrat', sans-serif;
  height: 100vh;
  width: 100%;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  min-width: 100%;
}

.nav-button {
  color: #6a11cb;
  background: none;
  border: none;
  margin-left: 200px;
  margin-right: 200px;
  cursor: pointer;
  font-size: 28px;
  font-weight: bold;
  transition: background 0.3s;
  flex-shrink: 0;
}

.nav-button:hover {
  color: #2575fc;
  transform: scale(1.2);
}

h2 {
  font-size: 24px;
  color: #000;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  padding: 0 10px;
  flex-grow: 1;
  text-align: center;
  min-width: 0;
  cursor: pointer;
  transition: color 0.3s;
}

h2:hover {
  color: #6a11cb;
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
  color: #6a11cb;
  border: 3px solid transparent;
  cursor: pointer;
  border-radius: 5px;
  background:
      linear-gradient(white, white) padding-box,
      linear-gradient(135deg, #6a11cb, #2575fc) border-box;
  background-origin: border-box;
  box-shadow: 0 4px 8px rgba(106, 17, 203, 0.2);
}

.date-number {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 5px;
  color: #000;
}

.task {
   max-width: 300px;
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 2px 0 7px 0;
  padding: 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s, transform 0.2s;
}

.task-content {
  flex: 1;
  margin-bottom: 4px;
}

.task-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.task-label {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  color: white;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  flex-shrink: 0;
}

.task-status {
  margin-left: auto;
  flex-shrink: 0;
}

.task span {
  white-space: nowrap;
}

.task:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
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
  animation: fadeIn 0.3s ease-in-out;
  z-index: 1000;
}

.dialog {
  background: white;
  padding: 20px;
  border-radius: 12px;
  width: 324px;
  color: black;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-in-out;
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
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.save-button:hover {
  background: linear-gradient(135deg, #2575fc, #6a11cb);
}

.cancel-button {
  background: linear-gradient(135deg, #ccc, #999);
  color: #000;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.cancel-button:hover {
  background: linear-gradient(135deg, #999, #ccc);
}

.other-month {
  color: #a8a8a8;
  opacity: 0.6;
  background-color: #d8d7d7;
  border: 1px solid #e0e0e0;
}

.month-year-picker {
  background: white;
  padding: 20px;
  border-radius: 12px;
  width: 300px;
  color: black;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-in-out;
}

.year-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: bold;
}

.year-selector button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #6a11cb;
  transition: transform 0.2s;
}

.year-selector button:hover {
  transform: scale(1.2);
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.month-grid button {
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: none;
  cursor: pointer;
  transition: all 0.3s;
}

.month-grid button:hover {
  background: #f5f5f5;
  transform: translateY(-2px);
}

.selected-month {
  background: linear-gradient(135deg, #6a11cb, #2575fc) !important;
  color: white !important;
  border-color: transparent !important;
}

.close-button {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

.close-button:hover {
  background: linear-gradient(135deg, #2575fc, #6a11cb);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .nav-button {
    margin-left: 10px;
    margin-right: 10px;
    padding: 8px 12px;
    font-size: 14px;
  }

  h2 {
    font-size: 20px;
  }

  .dates {
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
  }

  .date {
    padding: 5px;
  }

  .task-input {
    padding: 8px;
    font-size: 12px;
  }

  .dialog, .month-year-picker {
    width: 90%;
    padding: 15px;
  }
}

.dialog-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  gap: 10px;
}

.delete-button {
  background: linear-gradient(135deg, #ff4d4d, #cc0000);
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
  flex: 1;
}

.delete-button:hover {
  background: linear-gradient(135deg, #cc0000, #ff4d4d);
}

.save-button {
  flex: 1;
}

.cancel-button {
  flex: 1;
}

.completed-task {
  opacity: 0.7;
  text-decoration: line-through;
  background-color: #e0e0e0 !important;
}

.task-status {
  position: absolute;
  right: 5px;
  top: 2px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  color: #000;
}

.labels-section {
  margin: 20px 0;
}

.labels-container {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 0;
}

.add-label-button {
  background: #6a11cb;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 18px;
  margin-left: 5px;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.add-label-button:hover {
  transform: scale(1.1);
}

.labels-scroll {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
  padding: 4px;
  margin-top: 8px;
}

.label-button {
  position: relative;
  border: none;
  border-radius: 16px;
  padding: 4px 24px 4px 12px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  margin-right: 8px;
  margin-bottom: 8px;
}

.delete-label-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: white;
  font-size: 10px;
  cursor: pointer;
  padding: 0 4px;
  opacity: 0.7;
}

.delete-label-btn:hover {
  opacity: 1;
  color: #ff6b6b;
}

.label-button:hover {
  opacity: 0.8;
  transform: translateY(-2px);
}

.selected-label {
  box-shadow: 0 0 0 2px #2575fc;
}

.labels-scroll::-webkit-scrollbar {
  width: 6px;
}

.labels-scroll::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.labels-scroll::-webkit-scrollbar-thumb {
  background: #6a11cb;
  border-radius: 3px;
}

.labels-scroll::-webkit-scrollbar-thumb:hover {
  background: #2575fc;
}

.task-title {
  font-weight: bold;
  margin-bottom: 4px;
}

.task-description {
  font-size: 0.9em;
  color: #555;
  margin-bottom: 4px;
  white-space: normal;
  word-break: break-word;
}

.task-input.error {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.2);
}

.error-message {
  color: #ff6b6b;
  font-size: 12px;
  margin-top: -8px;
  margin-bottom: 10px;
}

.kanban-task {
  border-left: 4px solid #4e42d8;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.task-priority {
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: white;
}

.urgent {
  background-color: #ff4757;
}

.high {
  background-color: #ff6b81;
}

.medium {
  background-color: #ffa502;
}

.low {
  background-color: #2ed573;
}

.completed-task {
  opacity: 0.7;
  text-decoration: line-through;
  background-color: #e0e0e0 !important;
}

.other-month.current-day {
  background: linear-gradient(white, white) padding-box,
  linear-gradient(135deg, #a8a8a8, #cccccc) border-box !important;
  color: #a8a8a8 !important;
}
</style>