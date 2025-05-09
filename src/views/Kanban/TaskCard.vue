<template>
  <div class="task-card"
       draggable="true"
       @dragstart="onDragStart"
       @click.stop="handleClick"
       :style="{borderLeft: `4px solid ${taskColor}`}">
    <div class="header">
      <span class="priority" :class="priorityClass">{{ priorityText }}</span>
      <span v-if="task.deadline" class="date" :style="deadlineStyle">{{ formattedDeadline }}</span>
    </div>
    <div class="title">{{ task.title }}</div>
    <div class="labels" v-if="task.labels && task.labels.length">
      <span class="label" v-for="label in task.labels" :key="label">{{ translateLabel(label) }}</span>
    </div>
    <div class="assignees" v-if="task.assignees && task.assignees.length">
      <div v-for="assignee in task.assignees" :key="assignee.name" class="assignee-container">
        <img
            :src="assignee.avatar || getDefaultAvatar(assignee.name)"
            :alt="assignee.name"
            class="assignee-avatar"
        />
        <span class="assignee-name">{{ assignee.name }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    task: {
      type: Object,
      required: true,
      validator: (value) => {
        return (
            value.title !== undefined &&
            value.priority !== undefined &&
            (value.assignees === undefined || Array.isArray(value.assignees))
        );
      }
    }
  },
  computed: {
    taskColor() {
      return this.task.color || '#6e8efb';
    },
    priorityClass() {
      return {
        'urgent': this.task.priority === 'urgent',
        'high': this.task.priority === 'high',
        'medium': this.task.priority === 'medium',
        'low': this.task.priority === 'low'
      };
    },
    priorityText() {
      const priorities = {
        'urgent': 'Срочно',
        'high': 'Высокий',
        'medium': 'Средний',
        'low': 'Низкий'
      };
      return priorities[this.task.priority] || this.task.priority;
    },
    formattedDeadline() {
      if (!this.task.deadline) return '';

      const date = typeof this.task.deadline === 'string' ?
          new Date(this.task.deadline) :
          this.task.deadline;

      return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth()+1).toString().padStart(2, '0')}`;
    },
    deadlineStyle() {
      if (!this.task.deadline) return {};

      const deadlineDate = new Date(this.task.deadline);
      const today = new Date();

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
    }
  },
  methods: {
    handleClick() {
      setTimeout(() => {
        this.$emit('click', this.task);
      }, 150);
    },
    onDragStart(event) {
      event.dataTransfer.setData('task', JSON.stringify(this.task));
    },
    translateLabel(label) {
      const labels = {
        'Design': 'Дизайн',
        'UI': 'Интерфейс',
        'Testing': 'Тестирование',
        'Frontend': 'Фронтенд',
        'Backend': 'Бэкенд',
        'Security': 'Безопасность'
      };
      return labels[label] || label;
    },
    getDefaultAvatar(name) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=random`;
    }
  }
};
</script>

<style scoped>
.task-card {
  padding: 12px;
  background-color: #fff;
  color: #2c3e50;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: grab;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 8px;
  color: #7f8c8d;
}

.title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.priority {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.urgent {
  background-color: #ff4757;
  color: white;
}

.high {
  background-color: #ff6b81;
  color: white;
}

.medium {
  background-color: #ffa502;
  color: white;
}

.low {
  background-color: #2ed573;
  color: white;
}

.labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.label {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  background-color: #e6e8f1;
  color: #4e42d8;
}

.assignees {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.assignee-container {
  display: flex;
  align-items: center;
  gap: 4px;
}

.assignee-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.assignee-name {
  font-size: 12px;
  color: #555;
}
</style>