<template>
  <div class="task-form-container">
    <h3>{{ editing ? 'Редактировать задачу' : 'Новая задача' }}</h3>

    <div class="form-group">
      <label>Название задачи</label>
      <input
          v-model="form.title"
          placeholder="Введите название задачи"
          class="form-input"
      />
    </div>

    <div class="form-group">
      <label>Статус</label>
      <select v-model="form.status">
        <option v-for="column in columns" :key="column" :value="column">{{ column }}</option>
      </select>
    </div>

    <div class="form-group">
      <label>Приоритет</label>
      <div class="priority-options">
        <label v-for="(label, value) in priorityOptions" :key="value">
          <input type="radio" v-model="form.priority" :value="value" />
          <span class="priority-badge" :class="value">{{ label }}</span>
        </label>
      </div>
    </div>

    <div class="form-group">
      <label>Дедлайн</label>
      <input type="date" v-model="form.deadline" />
    </div>

    <div class="form-group">
      <label>Ярлыки</label>
      <div class="labels-container">
        <div class="labels-scroll">
          <button @click="openLabelDialog" class="add-label-button">+</button>
          <div
              v-for="label in userLabels"
              :key="label.id"
              class="label-button"
              :style="{ backgroundColor: label.color }"
              :class="{ 'selected-label': form.labelIds.includes(label.id) }"
              @click="toggleLabel(label.id)"
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

    <div class="form-group">
      <label>Ответственные</label>
      <div class="users-container">
        <div class="users-scroll">
          <div
              v-for="user in projectUsers"
              :key="user.id"
              class="user-card"
              :class="{ 'selected-user': isAssignee(user.id) }"
              @click="toggleAssignee(user)"
          >
            <img :src="user.avatar || getDefaultAvatar(user.name)" class="user-avatar" />
            <span class="user-name">{{ user.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button v-if="editing" @click="deleteTask" class="delete-btn">
        Удалить
      </button>
      <button @click="cancel" class="cancel-btn">Отмена</button>
      <button @click="submit" class="submit-btn">{{ editing ? 'Сохранить' : 'Создать' }}</button>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  props: {
    task: Object,
    columns: Array,
    editing: Boolean,
    projectUsers: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      form: {
        title: '',
        status: '',
        priority: 'medium',
        deadline: '',
        labelIds: [],
        assignees: []
      },
      userLabels: [],
      newLabel: {
        name: '',
        color: '#6a11cb',
        login: localStorage.getItem('userLogin')
      },
      userSearchQuery: '',
      userSearchResults: []
    };
  },
  computed: {
    priorityOptions() {
      return {
        'urgent': 'Срочно',
        'high': 'Высокий',
        'medium': 'Средний',
        'low': 'Низкий'
      };
    },
  },
  methods: {
    async deleteTask() {
      if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
        try {
          const token = localStorage.getItem('authToken');
          await axios.delete(
              `http://localhost:8083/api/tasks/${this.task.id}`,
              { headers: { 'Authorization': `Bearer ${token}` } }
          );
          this.$emit('deleted');
          this.$emit('cancel');
        } catch (error) {
          console.error("Ошибка при удалении задачи:", error);
          alert('Не удалось удалить задачу');
        }
      }
    },
    isAssignee(userId) {
      return this.form.assignees.some(a => a.id === userId);
    },

    toggleAssignee(user) {
      if (this.isAssignee(user.id)) {
        this.form.assignees = this.form.assignees.filter(a => a.id !== user.id);
      } else {
        this.form.assignees.push({
          id: user.id,
          name: user.name,
          avatar: user.avatar
        });
      }
    },
    async loadUserLabels() {
      try {
        const token = localStorage.getItem('authToken');
        const login = localStorage.getItem('userLogin');
        const response = await axios.get(
            `http://localhost:8083/api/labels/${login}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        this.userLabels = response.data;

        // После загрузки ярлыков проверяем, какие из них должны быть выбраны
        if (this.editing && this.task) {
          this.form.labelIds = Array.isArray(this.task.labelIds)
              ? this.task.labelIds
              : (Array.isArray(this.task.labels)
                  ? this.task.labels.map(l => l.id)
                  : []);
        }
      } catch (error) {
        console.error('Ошибка загрузки ярлыков:', error);
      }
    },
    async searchUsers() {
      if (this.userSearchQuery.trim().length < 2) {
        this.userSearchResults = [];
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(
            `http://localhost:8086/api/chat/search-users?query=${encodeURIComponent(this.userSearchQuery)}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        // Фильтруем уже выбранных пользователей
        this.userSearchResults = response.data
            .map(user => ({
              id: user.id,
              name: user.displayName || user.login,
              avatar: user.photoPath ? `http://localhost:8081${user.photoPath}` : null
            }))
            .filter(user =>
                !this.form.assignees.some(a => a.id === user.id) &&
                this.projectUsers.some(pu => pu.id === user.id)
            );
      } catch (error) {
        console.error("Ошибка при поиске пользователей:", error);
        this.userSearchResults = [];
      }
    },

    async openLabelDialog() {
      this.$emit('open-label-dialog');
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.loadUserLabels();
    },
    toggleLabel(labelId) {
      const index = this.form.labelIds.indexOf(labelId);
      if (index === -1) {
        this.form.labelIds.push(labelId);
      } else {
        this.form.labelIds.splice(index, 1);
      }
    },
    async deleteLabel(labelId) {
      try {
        const token = localStorage.getItem('authToken');
        await axios.delete(
            `http://localhost:8083/api/labels/${labelId}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        this.userLabels = this.userLabels.filter(label => label.id !== labelId);
        this.form.labelIds = this.form.labelIds.filter(id => id !== labelId);
      } catch (error) {
        console.error("Ошибка при удалении ярлыка:", error);
      }
    },
    getDefaultAvatar(name) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=random`;
    },
    cancel() {
      this.$emit('cancel');
    },
    submit() {
      if (!this.form?.title?.trim()) {
        alert('Название задачи обязательно');
        return;
      }

      const taskData = {
        title: this.form.title,
        description: this.form.description || '',
        status: this.form.status,
        priority: this.form.priority,
        deadline: this.form.deadline || null,
        labelIds: Array.isArray(this.form.labelIds) ? this.form.labelIds : [],
        assignees: this.form.assignees || [],
        assigneeLogins: this.form.assignees.map(a => a.id) || [],
        assigneeNames: this.form.assignees.map(a => a.name) || [],
        kanbanStatus: this.form.status
      };

      this.$emit('submit', taskData);
    },

  },
  created() {
    this.loadUserLabels();
    console.log("Project users in TaskForm:", this.projectUsers);

    if (this.editing && this.task) {
      const deadline = this.task.deadline ?
          new Date(this.task.deadline).toISOString().split('T')[0] :
          '';

      const assignees = this.task.assignees?.length ?
          this.task.assignees :
          (this.task.assigneeLogins?.map(login => {
            const user = this.projectUsers.find(u => u.id === login || u.login === login);
            return user || {
              id: login,
              name: login,
              avatar: this.getDefaultAvatar(login)
            };
          }) || []);

      this.form = {
        title: this.task.title || '',
        status: this.task.kanbanStatus || (this.columns.length > 0 ? this.columns[0] : ''),
        priority: this.task.priority || 'medium',
        deadline: deadline,
        assignees: assignees,
        labelIds: this.task.labelIds || []
      };
    } else if (this.columns.length > 0) {
      this.form.status = this.columns[0];
    }
  },
  watch: {
    columns: {
      immediate: true,
      handler(newColumns) {
        if (newColumns.length > 0 && !this.form.status) {
          this.form.status = newColumns[0];
        }
      }
    }
  }
};
</script>

<style scoped>
.task-form-container {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  margin: 0 auto;
}

.task-form-container h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  text-align: center;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.form-group input[type="text"],
.form-group input[type="date"],
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.priority-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.priority-options label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.priority-options input[type="radio"] {
  display: none;
}

.priority-badge {
  padding: 5px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.priority-badge.urgent {
  background-color: #ff4757;
  color: white;
}

.priority-badge.high {
  background-color: #ff6b81;
  color: white;
}

.priority-badge.medium {
  background-color: #ffa502;
  color: white;
}

.priority-badge.low {
  background-color: #2ed573;
  color: white;
}

.labels-container, .users-container {
  color: black;
  border-radius: 6px;
  padding: 8px;
}

.labels-scroll, .users-scroll {
  color: black;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
  padding: 4px;
}

.add-label-button {
  background: #6a11cb;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.2s;
}

.add-label-button:hover {
  transform: scale(1.1);
}

.label-button {
  position: relative;
  padding: 4px 24px 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  color: white;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
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

.selected-label {
  box-shadow: 0 0 0 2px #2575fc;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 16px;
  background-color: #e6e8f1;
  cursor: pointer;
  transition: all 0.2s;
}

.user-card:hover {
  background-color: #d0d4e7;
}

.selected-user {
  background-color: #6a11cb;
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.user-name {
  font-size: 14px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-btn {
  background: #f44336;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.submit-btn {
  background: #4caf50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.priority-options input[type="radio"]:checked + .priority-badge {
  box-shadow: 0 0 0 2px #6a11cb;
}

.form-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 10px;
}

/* Стили для скролла */
.labels-scroll::-webkit-scrollbar,
.users-scroll::-webkit-scrollbar {
  width: 6px;
}

.labels-scroll::-webkit-scrollbar-track,
.users-scroll::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.labels-scroll::-webkit-scrollbar-thumb,
.users-scroll::-webkit-scrollbar-thumb {
  background: #6a11cb;
  border-radius: 3px;
}

.labels-scroll::-webkit-scrollbar-thumb:hover,
.users-scroll::-webkit-scrollbar-thumb:hover {
  background: #2575fc;
}

.user-search-results li {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-search-results li:hover {
  background-color: #f5f5f5;
}

.selected-user {
  display: flex;
  align-items: center;
  background: #e6e8f1;
  padding: 5px 10px;
  border-radius: 20px;
  gap: 5px;
}

.delete-btn {
  background: #ff9800;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  margin-right: auto;
}
</style>