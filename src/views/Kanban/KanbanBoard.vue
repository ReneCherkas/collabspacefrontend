<template>
  <div class="kanban-container">
    <div class="header">
      <div class="select-container" :class="{ 'has-selection': selectedProject }">
        <select
            v-model="selectedProject"
            @change="fetchProjectDetails"
            class="project-select"
        >
          <option disabled value="">Выберите проект</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.title }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="!selectedProject" class="empty-state">
      <p>Выберите проект из списка</p>
    </div>

    <div v-else>
      <div class="kanban-board">
        <draggable
            v-model="columns"
            group="columns"
            item-key="id"
            @end="onColumnReorder"
            class="columns-container"
            handle=".column-header"
        >
          <template #item="{element}">
            <div class="task-column-wrapper" :key="element.id">
              <div class="column-header">
                <h3>{{ element.title }}</h3>
                <button @click="openEditColumnModal(element)" class="edit-column-btn">
                  ✏️
                </button>
              </div>
              <draggable
                  :list="getTasksForColumn(element.title)"
                  group="tasks"
                  item-key="id"
                  @change="(evt) => handleTaskMove(evt, element.title)"
                  class="task-list"
              >
                <template #item="{element: task}">
                  <TaskCard
                      :task="task"
                      @click="openTaskModal(task)"
                      :key="task.id"
                  />
                </template>
              </draggable>
            </div>
          </template>
        </draggable>

        <!-- Кнопка "+" -->
        <div class="add-button" @click="toggleMenu">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5v14M5 12h14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <!-- Всплывающее меню -->
        <transition name="fade">
          <div v-if="showMenu" class="menu">
            <button @click="openCreateColumnModal">
              <span class="icon">➕</span> Добавить столбец
            </button>
            <button @click="openTaskModal">
              <span class="icon">📝</span> Добавить задачу
            </button>
          </div>
        </transition>
      </div>

      <!-- Модальное окно для создания колонки -->
      <ColumnModal
          v-if="showCreateColumnModal"
          mode="create"
          :projectId="selectedProject"
          @close="showCreateColumnModal = false"
          @saved="fetchColumns"
      />

      <!-- Модальное окно для редактирования колонки -->
      <ColumnModal
          v-if="showEditColumnModal"
          mode="edit"
          :projectId="selectedProject"
          :initialTitle="editingColumn.title"
          :columnId="editingColumn.id"
          @close="showEditColumnModal = false"
          @saved="fetchColumns"
          @deleted="fetchColumns"
      />

      <!-- Модальное окно для задачи -->
      <div v-if="isTaskModalOpen" class="modal-overlay" @click.self="closeTaskModal">
        <div class="modal-content" @click.stop>
          <TaskForm
              ref="taskForm"
              :task="editingTask"
              :columns="columns.map(c => c.title)"
              :editing="!!editingTask"
              :projectUsers="projectUsers"
              @submit="handleTaskSubmit"
              @cancel="closeTaskModal"
              @deleted="fetchKanbanTasks"
              @open-label-dialog="openLabelDialog"/>
        </div>
      </div>

      <div v-if="labelDialog" class="dialog-overlay" @click.self="labelDialog = false">
        <div class="dialog" @click.stop>
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
    </div>
  </div>
</template>

<script>
import TaskCard from './TaskCard.vue';
import draggable from 'vuedraggable';
import ColumnModal from './ColumnModal.vue';
import TaskForm from './TaskForm.vue';
import { ref, onMounted } from "vue";
import axios from "axios";

export default {
  components: { draggable, ColumnModal, TaskCard, TaskForm },
  setup() {
    const projects = ref([]);
    const selectedProject = ref(null);
    const columns = ref([]);
    const tasks = ref([]);
    const showMenu = ref(false);
    const showCreateColumnModal = ref(false);
    const showEditColumnModal = ref(false);
    const editingColumn = ref({ id: null, title: '' });
    const isTaskModalOpen = ref(false);
    const editingTask = ref(null);
    const projectUsers = ref([]);
    const labelDialog = ref(false);
    const newLabel = ref({
      name: '',
      color: '#6a11cb',
      login: localStorage.getItem('userLogin')
    });

    const getDefaultAvatar = (name) => {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=random`;
    };

    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');

        const response = await axios.get("https://collabspace-7r1k.onrender.com/api/projects/user", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-User-Id': userId
          }
        });
        projects.value = response.data;
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    const fetchColumns = async () => {
      if (!selectedProject.value) return;

      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(
            `https://planer-service.onrender.com/api/kanban-columns/project/${selectedProject.value}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        columns.value = response.data.map(col => ({
          id: col.id,
          title: col.title,
          position: col.position
        }));

        await fetchKanbanTasks();
      } catch (error) {
        console.error("Error fetching columns:", error);
      }
    };

    const fetchKanbanTasks = async () => {
      if (!selectedProject.value) return;

      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(
            `https://planer-service.onrender.com/api/tasks/kanban/${selectedProject.value}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        const defaultStatus = columns.value[0]?.title || 'Backlog';

        tasks.value = response.data.map(task => {
          const assignees = task.assignees?.map(assignee => ({
            id: assignee.login,
            name: assignee.name,
            avatar: getDefaultAvatar(assignee.name)
          })) || [];

          return {
            ...task,
            kanbanStatus: task.kanbanStatus || defaultStatus,
            priority: mapPriorityToString(task.priority),
            assignees: assignees
          };
        });
        console.log("Processed tasks:", tasks.value);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };

    const mapPriorityToString = (priority) => {
      switch(priority) {
        case 3: return 'urgent';
        case 2: return 'high';
        case 1: return 'medium';
        case 0: return 'low';
        default: return 'medium';
      }
    };

    const fetchProjectDetails = async () => {
      if (!selectedProject.value) return;

      try {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        const response = await axios.get(
            `https://collabspace-7r1k.onrender.com/api/projects/${selectedProject.value}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-User-Id': userId
              }
            }
        );

        projectUsers.value = [
          ...(response.data.admins || []).map(admin => ({
            id: admin.id,
            name: admin.name || admin.login || `Admin ${admin.id}`,
            avatar: admin.avatar || getDefaultAvatar(admin.name || admin.id)
          })),
          ...(response.data.teamMembers || []).map(member => ({
            id: member.id,
            name: member.name || member.login || `Member ${member.id}`,
            avatar: member.avatar || getDefaultAvatar(member.name || member.id)
          }))
        ];

      } catch (error) {
        console.error("Error fetching project details:", error);
      }
    };

    onMounted(() => {
      fetchProjects();
    });

    return {
      projects,
      selectedProject,
      columns,
      tasks,
      showMenu,
      showCreateColumnModal,
      showEditColumnModal,
      editingColumn,
      isTaskModalOpen,
      editingTask,
      projectUsers,
      labelDialog,
      newLabel,
      getDefaultAvatar,
      fetchColumns,
      fetchKanbanTasks,
      fetchProjectDetails,
      mapPriorityToString
    };
  },
  methods: {
    getTasksForColumn(columnTitle) {
      return this.tasks.filter(task => task.kanbanStatus === columnTitle);
    },

    toggleMenu() {
      this.showMenu = !this.showMenu;
    },

    openCreateColumnModal() {
      this.showCreateColumnModal = true;
      this.showMenu = false;
    },

    openEditColumnModal(column) {
      this.editingColumn = {
        id: column.id,
        title: column.title
      };
      this.showEditColumnModal = true;
    },

    openTaskModal(task = null) {
      if (this.isTaskModalOpen) return;

      this.editingTask = task ? {
        ...task,
        assignees: task.assignees?.map(a => ({
          id: a.id || a.login,
          name: a.name || a.displayName || a.login,
          avatar: a.avatar || a.photoPath || this.getDefaultAvatar(a.name || a.login)
        })) || [],
        labelIds: task.labelIds || (task.labels?.map(l => l.id) || [])
      } : null;

      this.isTaskModalOpen = true;
      this.showMenu = false;
    },

    closeTaskModal() {
      this.isTaskModalOpen = false;
      this.editingTask = null;
    },

    async onColumnReorder() {
      try {
        const token = localStorage.getItem('authToken');
        await axios.put(
            `https://planer-service.onrender.com/api/kanban-columns/reorder/${this.selectedProject}`,
            this.columns.map(c => c.id),
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (error) {
        console.error("Error updating column order:", error);
      }
    },

    async handleTaskMove(evt, newStatus) {
      if (evt.added) {
        const task = evt.added.element;
        try {
          await this.moveTask({
            task,
            newStatus
          });

          const taskIndex = this.tasks.findIndex(t => t.id === task.id);
          if (taskIndex !== -1) {
            this.tasks.splice(taskIndex, 1, {
              ...this.tasks[taskIndex],
              kanbanStatus: newStatus
            });
          }
        } catch (error) {
          console.error("Ошибка при перемещении задачи:", error);
        }
      }
    },

    async moveTask({task, newStatus}) {
      try {
        const token = localStorage.getItem('authToken');
        await axios.patch(
            `https://planer-service.onrender.com/api/tasks/${task.id}/kanban/status`,
            { kanbanStatus: newStatus },
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
        );
      } catch (error) {
        console.error("Error updating task status:", error);
        throw error;
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
        await axios.post(
            'https://planer-service.onrender.com/api/labels',
            this.newLabel,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        this.labelDialog = false;
        if (this.isTaskModalOpen && this.$refs.taskForm) {
          await this.$refs.taskForm.loadUserLabels();
        }
      } catch (error) {
        console.error("Ошибка при сохранении ярлыка:", error);
      }
    },

    async handleTaskSubmit(taskData) {
      try {
        const token = localStorage.getItem('authToken');
        const taskToSend = {
          title: taskData.title,
          description: taskData.description || '',
          kanbanStatus: taskData.status,
          status: 'Open',
          priority: this.mapPriorityToNumber(taskData.priority),
          color: taskData.color || this.getRandomColor(),
          isKanban: true,
          projectId: this.selectedProject,
          assigneeLogins: taskData.assigneeLogins || [],
          assigneeNames: taskData.assigneeNames || [],
          labelIds: taskData.labelIds || [],
          deadline: taskData.deadline ? new Date(taskData.deadline) : null
        };

        let response;
        if (this.editingTask && this.editingTask.id) {
          response = await axios.patch(
              `https://planer-service.onrender.com/api/tasks/${this.editingTask.id}`,
              taskToSend,
              { headers: { 'Authorization': `Bearer ${token}` } }
          );
        } else {
          taskToSend.login = localStorage.getItem('userLogin');
          response = await axios.post(
              `https://planer-service.onrender.com/api/tasks/kanban`,
              taskToSend,
              { headers: { 'Authorization': `Bearer ${token}` } }
          );
        }

        await this.fetchKanbanTasks();
        this.closeTaskModal();
      } catch (error) {
        console.error("Error saving task:", error);
      }
    },

    mapPriorityToNumber(priority) {
      switch(priority) {
        case 'urgent': return 1;
        case 'high': return 2;
        case 'medium': return 3;
        case 'low': return 4;
        default: return 3;
      }
    },

    getRandomColor() {
      const colors = ['#FF9E9E', '#9EFF9E', '#9EE0FF', '#FFD79E', '#D79EFF'];
      return colors[Math.floor(Math.random() * colors.length)];
    }
  },
  watch: {
    selectedProject(newVal) {
      if (newVal) {
        this.fetchColumns();
        this.fetchProjectDetails();
      }
    }
  }
};
</script>

<style scoped>
.kanban-container {
  padding-top: 10px;
  border-radius: 12px;
  font-family: 'Segoe UI', 'Roboto', sans-serif;
}

.header {
  margin-bottom: 20px;
}

.project-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background: transparent;
  border: none;
  border-bottom: 2px solid #4e42d8;
  padding: 8px 24px 8px 0;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  min-width: 200px;
  position: relative;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234e42d8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right center;
  background-size: 16px;
  transition: all 0.3s ease;
}

.project-select:focus {
  outline: none;
  border-bottom-color: #6e8efb;
}

.project-select option {
  color: #333;
  background: white;
}

.project-select option[disabled] {
  color: #999;
}

.project-select:hover {
  border-bottom-color: #6e8efb;
}

.select-container {
  position: relative;
  display: inline-block;
}

.select-container::after {
  content: 'Выберите проект';
  position: absolute;
  left: 0;
  top: 0;
  color: #999;
  pointer-events: none;
  transition: all 0.3s ease;
}

.select-container:focus-within::after,
.select-container.has-selection::after {
  transform: translateY(-20px);
  font-size: 12px;
  color: #4e42d8;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: #666;
  font-size: 18px;
  border: 2px dashed #ddd;
  border-radius: 10px;
  margin-top: 20px;
}

.kanban-board {
  display: flex;
  overflow-x: auto;
  min-height: 70vh;
}

.columns-container {
  display: flex;
  gap: 20px;
  padding-bottom: 20px;
}

.task-column-wrapper {
  min-width: 280px;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  border: 1px solid #e6e8f1;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 8px;
  cursor: grab;
}

.column-header h3 {
  margin: 0;
  color: #4e42d8;
  font-weight: 600;
}

.task-list {
  min-height: 100px;
  padding: 8px;
  background: #f9fafc;
  border-radius: 8px;
}

.edit-column-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.edit-column-btn:hover {
  background: #f5f5f5;
}

.task-list {
  min-height: 100px;
}

.add-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: linear-gradient(135deg, #6e8efb, #4e42d8);
  color: #fff;
  font-size: 28px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(110, 142, 251, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
  z-index: 10;
}

.add-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(110, 142, 251, 0.4);
}

.menu {
  position: fixed;
  bottom: 100px;
  right: 30px;
  background-color: white;
  padding: 12px 0;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 100;
  min-width: 220px;
  border: 1px solid #e6e8f1;
}

.menu button {
  background-color: transparent;
  color: #333;
  padding: 10px 16px;
  border: none;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.menu button:hover {
  background-color: #f4f7fc;
  color: #4e42d8;
}

.menu button .icon {
  font-size: 16px;
}

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
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.column-header {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.task-column-wrapper {
  user-select: none;
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
  z-index: 2000;
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
</style>