<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <h3>{{ mode === 'create' ? 'Создать колонку' : 'Редактировать колонку' }}</h3>

      <div class="form-group">
        <input v-model="columnTitle" placeholder="Введите название" class="form-input" />
      </div>

      <div class="form-actions">
        <button v-if="mode === 'edit'" @click="deleteColumn" class="delete-btn">
          Удалить
        </button>
        <button @click="close" class="cancel-btn">
          Отмена
        </button>
        <button @click="submit" class="submit-btn">
          {{ mode === 'create' ? 'Создать' : 'Сохранить' }}
        </button>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  props: {
    mode: {
      type: String,
      required: true,
      validator: value => ['create', 'edit'].includes(value)
    },
    projectId: {
      type: Number,
      required: true
    },
    initialTitle: {
      type: String,
      default: ''
    },
    columnId: {
      type: Number,
      default: null
    }
  },
  data() {
    return {
      columnTitle: this.initialTitle,
      error: ''
    };
  },
  methods: {
    close() {
      this.$emit('close');
    },
    async submit() {
      if (!this.columnTitle.trim()) {
        this.error = 'Название колонки обязательно';
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        if (this.mode === 'create') {
          await axios.post(
              'https://planer-service.onrender.com/api/kanban-columns',
              null,
              {
                params: {
                  projectId: this.projectId,
                  title: this.columnTitle
                },
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              }
          );
        } else {
          await axios.put(
              `https://planer-service.onrender.com/api/kanban-columns/${this.columnId}`,
              null,
              {
                params: {
                  newTitle: this.columnTitle
                },
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              }
          );
        }

        this.$emit('saved');
        this.close();
      } catch (error) {
        this.error = error.response?.data?.message || 'Произошла ошибка';
        console.error("Error saving column:", error);
      }
    },
    async deleteColumn() {
      try {
        const token = localStorage.getItem('authToken');
        await axios.delete(
            `https://planer-service.onrender.com/api/kanban-columns/${this.columnId}`,
            {
              params: {
                projectId: this.projectId
              },
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
        );

        this.$emit('deleted');
        this.close();
      } catch (error) {
        this.error = error.response?.data?.message ||
            (error.response?.status === 500 ?
                'Нельзя удалить колонку с задачами' :
                'Произошла ошибка');
        console.error("Error deleting column:", error);
      }
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  color: black;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
}

.form-group {
  margin-bottom: 15px;
}

.form-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 20px;
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
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn {
  background: #4caf50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.delete-btn {
  background: #ff9800;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: auto;
}

.error-message {
  color: #f44336;
  margin-top: 10px;
  font-size: 14px;
}
</style>