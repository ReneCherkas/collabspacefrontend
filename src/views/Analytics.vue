<template>
  <div class="analytics-container">
    <h2 class="analytics-title">Аналитика продуктивности</h2>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ totalTasksCount }}</div>
        <div class="stat-label">Всего задач выполнено</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{{ completedTodayCount }}</div>
        <div class="stat-label">Выполнено сегодня</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{{ remainingTodayCount }}</div>
        <div class="stat-label">Осталось сегодня</div>
      </div>

      <div class="stat-card urgent-stat">
        <div class="stat-value">{{ overdueTasksCount }}</div>
        <div class="stat-label">Близок конец дедлайна</div>
      </div>
    </div>

    <div class="chart-controls-wrapper">
      <div class="chart-controls">
        <button
            v-for="period in periods"
            :key="period.value"
            @click="changePeriod(period.value)"
            :class="{ 'active': selectedPeriod === period.value }"
        >
          {{ period.label }}
        </button>
      </div>
    </div>

    <!-- Отображаем только выбранный график -->
    <div class="chart-container" v-if="selectedChart === 'productivity'">
      <h3>Количество выполненных задач</h3>
      <canvas ref="productivityChart"></canvas>
    </div>

    <div class="chart-container" v-if="selectedChart === 'projects'">
      <h3>Выполнение задач по проектам</h3>
      <canvas ref="projectsChart" v-if="hasProjectsData"></canvas>
      <div v-else class="no-data-message">Нет данных для отображения</div>
    </div>

    <div class="chart-container" v-if="selectedChart === 'timeliness'">
      <h3>Своевременность выполнения задач</h3>
      <canvas ref="timelinessChart"></canvas>
    </div>


    <div class="chart-controls-wrapper">
      <div class="chart-selector">
        <button
            v-for="chart in availableCharts"
            :key="chart.value"
            @click="selectedChart = chart.value"
            :class="{ 'active': selectedChart === chart.value }"
        >
          {{ chart.label }}
        </button>
      </div>
    </div>

    <div class="task-distribution">
      <h3>Распределение задач по приоритетам</h3>
      <div class="distribution-grid">
        <div
            v-for="priority in priorities"
            :key="priority.value"
            class="distribution-item"
        >
          <div class="priority-badge" :class="priority.class">{{ priority.label }}</div>
          <div class="priority-count">{{ priorityDistribution[priority.value] || 0 }}</div>
        </div>
      </div>
    </div>

    <div class="recent-completed">
      <h3>Недавно выполненные задачи</h3>
      <div class="completed-list">
        <div
            v-for="task in recentCompletedTasks"
            :key="task.id"
            class="completed-task"
        >
          <div class="task-title">{{ task.title }}</div>
          <div class="task-time">
            Выполнено: {{ formatDateTime(task.closedAt) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export default {
  data() {
    return {
      tasks: [],
      completedTasks: [],
      projects: [],
      selectedPeriod: 'week',
      selectedChart: 'productivity',
      periods: [
        { label: 'Неделя', value: 'week' },
        { label: 'Месяц', value: 'month' },
        { label: 'Год', value: 'year' }
      ],
      availableCharts: [
        { label: 'Продуктивность', value: 'productivity' },
        { label: 'По проектам', value: 'projects' },
        { label: 'Своевременность', value: 'timeliness' }
      ],
      priorities: [
        { label: 'Срочные', value: 1, class: 'urgent' },
        { label: 'Высокие', value: 2, class: 'high' },
        { label: 'Средние', value: 3, class: 'medium' },
        { label: 'Низкие', value: 4, class: 'low' }
      ],
      productivityChart: null,
      projectsChart: null,
      timelinessChart: null,
      timeSpentChart: null,
      colors: [
        '#6a11cb', '#2575fc', '#11cbd7', '#2ed573', '#ffa502',
        '#ff6b81', '#ff4757', '#a55eea', '#45aaf2', '#26de81'
      ]
    };
  },
  computed: {
    hasProjectsData() {
      return this.completedTasks.length > 0;
    },
    totalTasksCount() {
      return this.completedTasks.length;
    },
    completedTodayCount() {
      const today = new Date().toISOString().split('T')[0];
      return this.completedTasks.filter(task =>
          task.closedAt &&
          new Date(task.closedAt).toISOString().split('T')[0] === today
      ).length;
    },

    remainingTodayCount() {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // Формат 'YYYY-MM-DD'

      // Для задач планера: проверяем на 1 день раньше текущей даты
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      return this.tasks.filter(task => {
        // Пропускаем закрытые задачи
        if (task.status === 'Close') return false;

        // Проверяем обычные задачи с дедлайном на сегодня
        if (task.deadline) {
          const deadlineStr = new Date(task.deadline).toISOString().split('T')[0];
          if (deadlineStr === todayStr) return true;
        }

        // Проверяем задачи планера с date = вчера (текущий день - 1)
        if (task.date) {
          const taskDateStr = new Date(task.date).toISOString().split('T')[0];
          if (taskDateStr === yesterdayStr) return true;
        }

        return false;
      }).length;
    },

    overdueTasksCount() {
      const now = new Date();
      return this.tasks.filter(task => {
        if (task.status === 'Close') return false;
        if (!task.deadline) return false;
        return new Date(task.deadline) < now;
      }).length;
    },
    recentCompletedTasks() {
      return [...this.completedTasks]
          .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))
          .slice(0, 5);
    },
    priorityDistribution() {
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0 };

      this.completedTasks.forEach(task => {
        if (task.isKanban) {
          const priority = task.priority || 3;
          distribution[priority]++;
        }
      });

      return distribution;
    },
    uniqueProjectIds() {
      return [...new Set(this.completedTasks.map(task => task.projectId).filter(id => id))];
    }
  },
  watch: {
    completedTasks() {
      this.updateCurrentChart();
    },
    selectedChart() {
      this.updateCurrentChart();
    }
  },
  methods: {
    updateCurrentChart() {
      // Уничтожаем все графики перед созданием нового
      this.destroyAllCharts();

      // Используем nextTick для гарантии, что DOM обновлен
      this.$nextTick(() => {
        switch (this.selectedChart) {
          case 'productivity':
            this.createProductivityChart();
            break;
          case 'projects':
            this.createProjectsChart();
            break;
          case 'timeliness':
            this.createTimelinessChart();
            break;
        }
      });
    },
    destroyAllCharts() {
      if (this.productivityChart) {
        this.productivityChart.destroy();
        this.productivityChart = null;
      }
      if (this.projectsChart) {
        this.projectsChart.destroy();
        this.projectsChart = null;
      }
      if (this.timelinessChart) {
        this.timelinessChart.destroy();
        this.timelinessChart = null;
      }
    },
    createProductivityChart() {
      if (!this.$refs.productivityChart || !this.completedTasks.length) return;

      const { labels, data } = this.getChartData();
      const ctx = this.$refs.productivityChart.getContext('2d');

      this.productivityChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Выполненные задачи',
            data: data,
            backgroundColor: '#6a11cb',
            borderColor: '#2575fc',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      });
    },
    async createProjectsChart() {
      if (!this.$refs.projectsChart || !this.completedTasks.length) return;

      // Уничтожаем предыдущий график
      if (this.projectsChart) {
        this.projectsChart.destroy();
      }

      // Собираем данные для всех проектов, включая задачи без проекта
      const projectData = await this.prepareProjectsChartData();

      // Если нет данных для отображения - выходим
      if (projectData.datasets.length === 0) {
        return;
      }

      // Создаем график
      const ctx = this.$refs.projectsChart.getContext('2d');
      this.projectsChart = new Chart(ctx, {
        type: 'line', // Изменяем тип на линейный график
        data: {
          labels: projectData.labels,
          datasets: projectData.datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.raw}`;
                }
              }
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: this.getPeriodAxisLabel()
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                precision: 0
              },
              title: {
                display: true,
                text: 'Количество задач'
              }
            }
          }
        }
      });
    },

    async prepareProjectsChartData() {
      const { labels } = this.getChartData();
      const datasets = [];

      // Собираем задачи без проекта
      const noProjectTasks = this.completedTasks.filter(task => !task.projectId);
      if (noProjectTasks.length > 0) {
        const noProjectData = this.calculateProjectData(noProjectTasks, labels);
        datasets.push({
          label: 'Личные задачи',
          data: noProjectData,
          backgroundColor: '#888', // Серый цвет для личных задач
          borderColor: '#555',
          borderWidth: 2,
          tension: 0.1 // Добавляем плавность линиям
        });
      }

      // Собираем данные для каждого проекта
      const projectIds = [...new Set(
          this.completedTasks
              .map(task => task.projectId)
              .filter(id => id !== null && id !== undefined)
      )];

      for (let i = 0; i < projectIds.length; i++) {
        const projectId = projectIds[i];
        const projectTasks = this.completedTasks.filter(task => task.projectId === projectId);

        if (projectTasks.length > 0) {
          const projectName = await this.getProjectName(projectId);
          const color = this.colors[i % this.colors.length];
          const projectData = this.calculateProjectData(projectTasks, labels);

          datasets.push({
            label: projectName,
            data: projectData,
            backgroundColor: color,
            borderColor: color,
            borderWidth: 2,
            tension: 0.1 // Добавляем плавность линиям
          });
        }
      }

      return { labels, datasets };
    },

    calculateProjectData(tasks, labels) {
      return labels.map((_, i) => {
        switch (this.selectedPeriod) {
          case 'week': {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dateStr = date.toISOString().split('T')[0];
            return tasks.filter(task =>
                task.closedAt &&
                new Date(task.closedAt).toISOString().split('T')[0] === dateStr
            ).length;
          }

          case 'month': {
            const now = new Date();
            const day = i + 1;
            return tasks.filter(task => {
              if (!task.closedAt) return false;
              const taskDate = new Date(task.closedAt);
              return taskDate.getDate() === day &&
                  taskDate.getMonth() === now.getMonth() &&
                  taskDate.getFullYear() === now.getFullYear();
            }).length;
          }

          case 'year': {
            const date = new Date();
            date.setMonth(date.getMonth() - (11 - i));
            const month = date.getMonth();
            const year = date.getFullYear();
            return tasks.filter(task => {
              if (!task.closedAt) return false;
              const taskDate = new Date(task.closedAt);
              return taskDate.getMonth() === month &&
                  taskDate.getFullYear() === year;
            }).length;
          }

          default:
            return 0;
        }
      });
    },

    getPeriodAxisLabel() {
      switch (this.selectedPeriod) {
        case 'week': return 'Дни недели';
        case 'month': return 'Дни месяца';
        case 'year': return 'Месяцы';
        default: return 'Период';
      }
    },

    createTimelinessChart() {
      if (!this.$refs.timelinessChart || !this.completedTasks.length) return;

      const { labels, timelyData, lateData } = this.getTimelinessData();
      const ctx = this.$refs.timelinessChart.getContext('2d');

      this.timelinessChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'В срок',
              data: timelyData,
              backgroundColor: '#2ed573',
              borderColor: '#26de81',
              borderWidth: 1
            },
            {
              label: 'С опозданием',
              data: lateData,
              backgroundColor: '#ff4757',
              borderColor: '#ff6b81',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      });
    },


    changePeriod(period) {
      this.selectedPeriod = period;
      this.updateAllCharts();
    },
    formatDateTime(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    // getProjectName(projectId) {
    //   const project = this.projects.find(p => p.id === projectId);
    //   return project ? project.name : `Проект ${projectId}`;
    // },
    async loadTasks() {
      try {
        const token = localStorage.getItem('authToken');
        const login = localStorage.getItem('userLogin');
        const userId = localStorage.getItem('userId');

        // Verify we have all required data
        if (!userId) {
          console.error('User ID not found in localStorage');
          return;
        }

        // Load tasks
        const tasksResponse = await fetch(`http://localhost:8083/api/tasks/${login}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Load projects - ensure correct URL and headers
        const projectsResponse = await fetch(`http://localhost:8084/api/projects/user`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-User-Id': userId,
            'Content-Type': 'application/json'
          }
        });

        if (!projectsResponse.ok) {
          const errorData = await projectsResponse.json();
          console.error('Projects response error:', errorData);
        }

        if (tasksResponse.ok && projectsResponse.ok) {
          const tasks = await tasksResponse.json();
          const projects = await projectsResponse.json();

          this.tasks = tasks;
          this.completedTasks = tasks.filter(task => task.status === 'Close' && task.closedAt);
          this.projects = projects;
        } else {
          console.error('Error loading data');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    },
    updateAllCharts() {
      this.updateCurrentChart();
    },
    updateProductivityChart() {
      if (!this.completedTasks.length) return;

      if (this.productivityChart) {
        this.productivityChart.destroy();
      }

      const { labels, data } = this.getChartData();
      const ctx = this.$refs.productivityChart.getContext('2d');

      this.productivityChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Выполненные задачи',
            data: data,
            backgroundColor: '#6a11cb',
            borderColor: '#2575fc',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    },
    async getProjectById(projectId) {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`http://localhost:8084/api/projects/analytics/${projectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error('Error fetching project:', error);
        return null;
      }
    },

    async getProjectName(projectId) {
      if (!projectId) return 'Без проекта';

      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`http://localhost:8084/api/projects/${projectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const project = await response.json();
          return project.title || `Проект ${projectId}`;
        }
        return `Проект ${projectId}`;
      } catch (error) {
        console.error('Ошибка при получении проекта:', error);
        return `Проект ${projectId}`;
      }
    },
    updateProjectsChart() {
      if (!this.completedTasks.length || !this.uniqueProjectIds.length) return;

      if (!this.$refs.projectsChart || !this.completedTasks.length || !this.uniqueProjectIds.length) {
        return;
      }

      if (this.projectsChart) {
        this.projectsChart.destroy();
      }

      const { labels, datasets } = this.getProjectsChartData();
      const ctx = this.$refs.projectsChart.getContext('2d');

      const hasData = datasets.some(dataset => dataset.data.some(value => value > 0));
      if (!hasData) return;

      this.projectsChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          scales: {
            x: {
              stacked: true,
            },
            y: {
              stacked: true,
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    },
    updateTimelinessChart() {
      if (!this.completedTasks.length) return;

      if (this.timelinessChart) {
        this.timelinessChart.destroy();
      }

      const { labels, timelyData, lateData } = this.getTimelinessData();
      const ctx = this.$refs.timelinessChart.getContext('2d');

      this.timelinessChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'В срок',
              data: timelyData,
              backgroundColor: '#2ed573',
              borderColor: '#26de81',
              borderWidth: 1
            },
            {
              label: 'С опозданием',
              data: lateData,
              backgroundColor: '#ff4757',
              borderColor: '#ff6b81',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    },
    updateTimeSpentChart() {
      if (!this.completedTasks.length) return;

      if (this.timeSpentChart) {
        this.timeSpentChart.destroy();
      }

      const { labels, avgData } = this.getTimeSpentData();
      const ctx = this.$refs.timeSpentChart.getContext('2d');

      this.timeSpentChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Среднее время выполнения (часы)',
            data: avgData,
            backgroundColor: '#2575fc',
            borderColor: '#6a11cb',
            borderWidth: 2,
            fill: false,
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    },
    getChartData() {
      const now = new Date();
      let labels = [];
      let data = [];

      switch (this.selectedPeriod) {
        case 'week':
          labels = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toLocaleDateString('ru-RU', { weekday: 'short' });
          });

          data = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dateStr = date.toISOString().split('T')[0];
            return this.completedTasks.filter(task =>
                task.closedAt &&
                new Date(task.closedAt).toISOString().split('T')[0] === dateStr
            ).length;
          });
          break;

        case 'month':
          // Изменяем отображение месяца на дни вместо недель
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

          data = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            return this.completedTasks.filter(task => {
              if (!task.closedAt) return false;
              const taskDate = new Date(task.closedAt);
              return taskDate.getDate() === day &&
                  taskDate.getMonth() === now.getMonth() &&
                  taskDate.getFullYear() === now.getFullYear();
            }).length;
          });
          break;

        case 'year':
          labels = Array.from({ length: 12 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - (11 - i));
            return date.toLocaleDateString('ru-RU', { month: 'short' });
          });

          data = Array.from({ length: 12 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - (11 - i));
            const month = date.getMonth();
            const year = date.getFullYear();

            return this.completedTasks.filter(task => {
              if (!task.closedAt) return false;
              const taskDate = new Date(task.closedAt);
              return taskDate.getMonth() === month && taskDate.getFullYear() === year;
            }).length;
          });
          break;
      }

      return { labels, data };
    },
    getProjectsChartData() {
      const { labels } = this.getChartData();
      const datasets = [];

      this.uniqueProjectIds.forEach((projectId, index) => {
        const projectName = this.getProjectName(projectId);
        const color = this.colors[index % this.colors.length];

        const data = labels.map((_, i) => {
          switch (this.selectedPeriod) {
            case 'week': {
              const date = new Date();
              date.setDate(date.getDate() - (6 - i));
              const dateStr = date.toISOString().split('T')[0];
              return this.completedTasks.filter(task =>
                  task.projectId === projectId &&
                  task.closedAt &&
                  new Date(task.closedAt).toISOString().split('T')[0] === dateStr
              ).length;
            }
            case 'month': {
              const startDate = new Date();
              startDate.setDate(startDate.getDate() - 28 + (i * 7));
              const endDate = new Date(startDate);
              endDate.setDate(endDate.getDate() + 6);

              return this.completedTasks.filter(task =>
                  task.projectId === projectId &&
                  task.closedAt &&
                  new Date(task.closedAt) >= startDate &&
                  new Date(task.closedAt) <= endDate
              ).length;
            }
            case 'quarter': {
              const date = new Date();
              date.setMonth(date.getMonth() - (2 - i));
              const month = date.getMonth();
              const year = date.getFullYear();

              return this.completedTasks.filter(task =>
                  task.projectId === projectId &&
                  task.closedAt &&
                  new Date(task.closedAt).getMonth() === month &&
                  new Date(task.closedAt).getFullYear() === year
              ).length;
            }
            case 'year': {
              const date = new Date();
              date.setMonth(date.getMonth() - (11 - i));
              const month = date.getMonth();
              const year = date.getFullYear();

              return this.completedTasks.filter(task =>
                  task.projectId === projectId &&
                  task.closedAt &&
                  new Date(task.closedAt).getMonth() === month &&
                  new Date(task.closedAt).getFullYear() === year
              ).length;
            }
          }
        });

        datasets.push({
          label: projectName,
          data: data,
          backgroundColor: color,
          borderColor: color,
          borderWidth: 1
        });
      });

      return { labels, datasets };
    },
    getTimelinessData() {
      const { labels } = this.getChartData();
      const timelyData = [];
      const lateData = [];

      labels.forEach((_, i) => {
        let timelyCount = 0;
        let lateCount = 0;

        switch (this.selectedPeriod) {
          case 'week': {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dateStr = date.toISOString().split('T')[0];

            this.completedTasks.forEach(task => {
              if (task.closedAt && new Date(task.closedAt).toISOString().split('T')[0] === dateStr) {
                if (task.deadline && new Date(task.closedAt) > new Date(task.deadline)) {
                  lateCount++;
                } else {
                  timelyCount++;
                }
              }
            });
            break;
          }
          case 'month': {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 28 + (i * 7));
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);

            this.completedTasks.forEach(task => {
              if (task.closedAt) {
                const taskDate = new Date(task.closedAt);
                if (taskDate >= startDate && taskDate <= endDate) {
                  if (task.deadline && taskDate > new Date(task.deadline)) {
                    lateCount++;
                  } else {
                    timelyCount++;
                  }
                }
              }
            });
            break;
          }
          case 'quarter': {
            const date = new Date();
            date.setMonth(date.getMonth() - (2 - i));
            const month = date.getMonth();
            const year = date.getFullYear();

            this.completedTasks.forEach(task => {
              if (task.closedAt) {
                const taskDate = new Date(task.closedAt);
                if (taskDate.getMonth() === month && taskDate.getFullYear() === year) {
                  if (task.deadline && taskDate > new Date(task.deadline)) {
                    lateCount++;
                  } else {
                    timelyCount++;
                  }
                }
              }
            });
            break;
          }
          case 'year': {
            const date = new Date();
            date.setMonth(date.getMonth() - (11 - i));
            const month = date.getMonth();
            const year = date.getFullYear();

            this.completedTasks.forEach(task => {
              if (task.closedAt) {
                const taskDate = new Date(task.closedAt);
                if (taskDate.getMonth() === month && taskDate.getFullYear() === year) {
                  if (task.deadline && taskDate > new Date(task.deadline)) {
                    lateCount++;
                  } else {
                    timelyCount++;
                  }
                }
              }
            });
            break;
          }
        }

        timelyData.push(timelyCount);
        lateData.push(lateCount);
      });

      return { labels, timelyData, lateData };
    },
    getTimeSpentData() {
      const { labels } = this.getChartData();
      const avgData = [];

      labels.forEach((_, i) => {
        let totalHours = 0;
        let taskCount = 0;

        switch (this.selectedPeriod) {
          case 'week': {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dateStr = date.toISOString().split('T')[0];

            this.completedTasks.forEach(task => {
              if (task.closedAt && new Date(task.closedAt).toISOString().split('T')[0] === dateStr) {
                if (task.createdAt && task.closedAt) {
                  const created = new Date(task.createdAt);
                  const closed = new Date(task.closedAt);
                  totalHours += (closed - created) / (1000 * 60 * 60);
                  taskCount++;
                }
              }
            });
            break;
          }
          case 'month': {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 28 + (i * 7));
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);

            this.completedTasks.forEach(task => {
              if (task.closedAt) {
                const taskDate = new Date(task.closedAt);
                if (taskDate >= startDate && taskDate <= endDate) {
                  if (task.createdAt) {
                    const created = new Date(task.createdAt);
                    totalHours += (taskDate - created) / (1000 * 60 * 60);
                    taskCount++;
                  }
                }
              }
            });
            break;
          }
          case 'quarter': {
            const date = new Date();
            date.setMonth(date.getMonth() - (2 - i));
            const month = date.getMonth();
            const year = date.getFullYear();

            this.completedTasks.forEach(task => {
              if (task.closedAt) {
                const taskDate = new Date(task.closedAt);
                if (taskDate.getMonth() === month && taskDate.getFullYear() === year) {
                  if (task.createdAt) {
                    const created = new Date(task.createdAt);
                    totalHours += (taskDate - created) / (1000 * 60 * 60);
                    taskCount++;
                  }
                }
              }
            });
            break;
          }
          case 'year': {
            const date = new Date();
            date.setMonth(date.getMonth() - (11 - i));
            const month = date.getMonth();
            const year = date.getFullYear();

            this.completedTasks.forEach(task => {
              if (task.closedAt) {
                const taskDate = new Date(task.closedAt);
                if (taskDate.getMonth() === month && taskDate.getFullYear() === year) {
                  if (task.createdAt) {
                    const created = new Date(task.createdAt);
                    totalHours += (taskDate - created) / (1000 * 60 * 60);
                    taskCount++;
                  }
                }
              }
            });
            break;
          }
        }

        avgData.push(taskCount > 0 ? Math.round(totalHours / taskCount) : 0);
      });

      return { labels, avgData };
    }
  },
  mounted() {
    this.loadTasks();
  },
  beforeUnmount() {
    if (this.productivityChart) this.productivityChart.destroy();
    if (this.projectsChart) this.projectsChart.destroy();
    if (this.timelinessChart) this.timelinessChart.destroy();
    if (this.timeSpentChart) this.timeSpentChart.destroy();
  }
};
</script>

<style scoped>
.analytics-container {
  font-family: 'Montserrat', sans-serif;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  color: #000;
}

.analytics-title {
  text-align: center;
  margin-bottom: 30px;
  color: #6a11cb;
  font-size: 28px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #6a11cb;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.chart-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.chart-controls button {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background: #e0e0e0;
  color: #333;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.chart-controls button.active {
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  color: white;
}

.chart-controls button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.task-distribution {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.task-distribution h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #6a11cb;
  text-align: center;
}

.distribution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.distribution-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  background: #f9f9f9;
}

.priority-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  margin-bottom: 8px;
}

.priority-count {
  font-size: 24px;
  font-weight: bold;
  color: #333;
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

.recent-completed {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.recent-completed h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #6a11cb;
  text-align: center;
}

.completed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.completed-task {
  padding: 15px;
  border-radius: 8px;
  background: #f5f5f5;
  transition: transform 0.2s;
}

.completed-task:hover {
  transform: translateX(5px);
  background: #f0f0f0;
}

.task-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.task-time {
  font-size: 12px;
  color: #666;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .distribution-grid {
    grid-template-columns: 1fr 1fr;
  }

  .chart-controls {
    flex-wrap: wrap;
  }

  .analytics-title {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .distribution-grid {
    grid-template-columns: 1fr;
  }
}

.chart-selector {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.chart-selector button {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background: #e0e0e0;
  color: #333;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.chart-selector button.active {
  background: linear-gradient(135deg, #2575fc, #6a11cb);
  color: white;
}

.chart-selector button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.chart-container h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #6a11cb;
  text-align: center;
}

.analytics-container {
  font-family: 'Montserrat', sans-serif;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  color: #000;
}

.analytics-title {
  text-align: center;
  margin-bottom: 30px;
  color: #6a11cb;
  font-size: 28px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #6a11cb;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.chart-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.chart-controls button {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background: #e0e0e0;
  color: #333;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.chart-controls button.active {
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  color: white;
}

.chart-controls button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.task-distribution {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.task-distribution h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #6a11cb;
  text-align: center;
}

.distribution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.distribution-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  background: #f9f9f9;
}

.priority-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  margin-bottom: 8px;
}

.priority-count {
  font-size: 24px;
  font-weight: bold;
  color: #333;
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

.recent-completed {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.recent-completed h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #6a11cb;
  text-align: center;
}

.completed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.completed-task {
  padding: 15px;
  border-radius: 8px;
  background: #f5f5f5;
  transition: transform 0.2s;
}

.completed-task:hover {
  transform: translateX(5px);
  background: #f0f0f0;
}

.task-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.task-time {
  font-size: 12px;
  color: #666;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .distribution-grid {
    grid-template-columns: 1fr 1fr;
  }

  .chart-controls,
  .chart-selector {
    flex-wrap: wrap;
  }

  .analytics-title {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .distribution-grid {
    grid-template-columns: 1fr;
  }
}

.chart-controls-wrapper {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.chart-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  height: 500px; /* Фиксированная высота для всех графиков */
}

.chart-container canvas {
  height: 400px !important; /* Уменьшаем высоту canvas */
  width: 100% !important;
}

.chart-controls, .chart-selector {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.chart-controls button, .chart-selector button {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background: #e0e0e0;
  color: #333;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.chart-controls button.active, .chart-selector button.active {
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  color: white;
}

.chart-controls button:hover, .chart-selector button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Остальные стили остаются без изменений */
.analytics-container {
  font-family: 'Montserrat', sans-serif;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  color: #000;
}

.analytics-title {
  text-align: center;
  margin-bottom: 30px;
  color: #6a11cb;
  font-size: 28px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #6a11cb;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.task-distribution {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.task-distribution h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #6a11cb;
  text-align: center;
}

.distribution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.distribution-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  background: #f9f9f9;
}

.priority-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  margin-bottom: 8px;
}

.priority-count {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.recent-completed {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.recent-completed h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #6a11cb;
  text-align: center;
}

.completed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.completed-task {
  padding: 15px;
  border-radius: 8px;
  background: #f5f5f5;
  transition: transform 0.2s;
}

.completed-task:hover {
  transform: translateX(5px);
  background: #f0f0f0;
}

.task-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.task-time {
  font-size: 12px;
  color: #666;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .distribution-grid {
    grid-template-columns: 1fr 1fr;
  }

  .chart-container {
    height: 350px;
  }

  .chart-container canvas {
    height: 250px !important;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .distribution-grid {
    grid-template-columns: 1fr;
  }

  .chart-container {
    height: 300px;
    padding: 15px;
  }

  .chart-container canvas {
    height: 200px !important;
  }
}

.urgent-stat {
  border: 2px solid #ff4757;
}

/* Остальные стили остаются без изменений */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #6a11cb;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

/* Сделаем текст в карточке с просрочками красным */
.urgent-stat .stat-value {
  color: #ff4757;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.no-data-message {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}
</style>