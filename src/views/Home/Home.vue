<template>
  <div class="container">
    <div class="gamification-container">
      <div class="main-container">
        <div class="left-section">
          <!-- Блок с прогрессом уровня -->
          <div class="level-card">
            <div class="progress-container-wrapper">
              <div class="level-badge">
                {{ userLevel }}
              </div>
              <div class="progress-container">
                <div class="progress-bar" :style="{ width: progressPercentage + '%' }"></div>
                <span class="progress-text">{{ currentXP }} / {{ xpToNextLevel }} XP</span>
              </div>
            </div>
          </div>

          <!-- Блок с достижениями -->
          <div class="achievements-section">
            <h3>Достижения</h3>
            <div class="achievements-grid">
              <div v-for="achievement in achievements" :key="achievement.id"
                   class="achievement-card" :class="{ 'locked': !achievement.unlocked }">
                <div class="achievement-icon">
                  <span v-if="achievement.unlocked">🏆</span>
                  <span v-else>🔒</span>
                </div>
                <div class="achievement-info">
                  <h4>{{ achievement.title }}</h4>
                  <p>{{ achievement.description }}</p>
                  <small v-if="!achievement.unlocked">Прогресс: {{ achievement.progress }}/{{ achievement.required }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Профиль -->
        <Profile class="profile" />
      </div>

      <div class="quests-challenge-row">
        <!-- Блок с квестами -->
        <div class="quests-section">
          <h3>Текущие квесты</h3>
          <div class="quests-list">
            <div v-for="quest in activeQuests" :key="quest.id" class="quest-card">
              <div class="quest-info">
                <h4>{{ quest.title }}</h4>
                <p>{{ quest.description }}</p>
                <div class="quest-progress">
                  <div class="progress-bar" :style="{ width: quest.progressPercentage + '%' }"></div>
                  <span>{{ quest.progress }}/{{ quest.required }}</span>
                </div>
              </div>
              <div class="quest-reward">
                +{{ quest.reward }} XP
              </div>
            </div>
          </div>
        </div>

        <!-- Блок с челленджами -->
        <div class="challenge-section">
          <h3>Челлендж</h3>
          <div class="challenge-scroll-wrapper">
            <TeamChallenge />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Profile from "@/views/Home/Profile.vue";
import TeamChallenge from "@/views/Home/TeamChallenge.vue";
import axios from "axios";

export default {
  components: {
    TeamChallenge,
    Profile
  },
  data() {
    return {
      completedTasks: [],
      userLevel: 1,
      currentXP: 0,
      xpToNextLevel: 100,
      achievements: [
        { id: 1, title: "Новичок", description: "Выполнить 5 задач", required: 5, progress: 0, unlocked: false },
        { id: 2, title: "Специалист", description: "Выполнить 20 задач", required: 20, progress: 0, unlocked: false },
        { id: 3, title: "Срочный режим", description: "Выполнить 10 срочных задач из канбана", required: 10, progress: 0, unlocked: false },
        { id: 4, title: "Ранняя пташка", description: "Выполнить задачу до 9 утра", required: 1, progress: 0, unlocked: false },
        { id: 5, title: "Спринтер", description: "Выполнить 5 задач за день", required: 5, progress: 0, unlocked: false },
        { id: 6, title: "Командный игрок", description: "Принять участие в 3 проектах", required: 3, progress: 0, unlocked: false },
        { id: 7, title: "Эксперт", description: "Достичь 5 уровня", required: 5, progress: 0, unlocked: false },
        { id: 8, title: "Ночной совенок", description: "Выполнить 3 задачи после 22:00", required: 3, progress: 0, unlocked: false }
      ],
      activeQuests: [
        {
          id: 1,
          title: "Ежедневный квест",
          description: "Выполни 3 задачи сегодня",
          required: 3,
          progress: 0,
          reward: 30,
          completed: false,
          progressPercentage: 0,
          lastCompletedDate: null,
          xpAwarded: false
        },
        {
          id: 2,
          title: "Срочные задачи",
          description: "Закрой 3 срочные задачи",
          required: 3,
          progress: 0,
          reward: 50,
          completed: false,
          progressPercentage: 0,
          xpAwarded: false
        },
        {
          id: 3,
          title: "Канбан-мастер",
          description: "Выполни 5 задач из канбан-доски",
          required: 5,
          progress: 0,
          reward: 70,
          completed: false,
          progressPercentage: 0,
          xpAwarded: false
        }
      ]
    };
  },
  computed: {
    progressPercentage() {
      return (this.currentXP / this.xpToNextLevel) * 100;
    }
  },
  async mounted() {
    await this.loadCompletedTasks();
    this.calculateXP();
    this.updateAchievementsProgress();
    this.updateQuestsProgress();
  },
  methods: {
    async loadCompletedTasks() {
      try {
        const token = localStorage.getItem('authToken');
        const login = localStorage.getItem('userLogin');

        const regularTasksResponse = await axios.get(
            `http://localhost:8083/api/tasks/${login}?status=Close`,
            {headers: {'Authorization': `Bearer ${token}`}}
        );

        const regularTasks = regularTasksResponse.data
            .filter(t => t.status === 'Close' && t.closedAt)
            .map(t => ({
              ...t,
              isKanban: t.isKanban || false,
              priority: t.priority || 0
            }));

        this.completedTasks = [...regularTasks];
      } catch (error) {
        console.error("Ошибка загрузки задач:", error);
      }
    },

    calculateXP() {
      let totalXP = 0;

      this.completedTasks.forEach(task => {
        if (task.deadline) {
          const deadlineDate = new Date(task.deadline);
          const closedDate = new Date(task.closedAt);

          if (closedDate <= deadlineDate) {
            totalXP += 20;
          } else {
            totalXP += 10;
          }
        } else {
          totalXP += 15;
        }
      });

      let questsXP = 0;
      this.activeQuests.forEach(quest => {
        if (quest.completed && !quest.xpAwarded) {
          questsXP += quest.reward;
          quest.xpAwarded = true;
        }
      });

      this.currentXP = totalXP + questsXP;
      this.calculateLevel();
    },

    calculateLevel() {
      let level = 1;
      let xpNeeded = 100;
      let xpAccumulated = 0;

      while (this.currentXP >= xpAccumulated + xpNeeded) {
        xpAccumulated += xpNeeded;
        level++;
        xpNeeded = Math.floor(xpNeeded * 1.5);
      }

      this.userLevel = level;
      this.currentXP = this.currentXP - xpAccumulated;
      this.xpToNextLevel = xpNeeded;
    },

    updateAchievementsProgress() {
      const totalCompleted = this.completedTasks.length;
      const urgentKanbanCompleted = this.completedTasks.filter(task =>
          (task.priority === 1 || task.priority === 'urgent') &&
          task.isKanban === true
      ).length;

      const earlyMorningTasks = this.completedTasks.filter(task => {
        if (!task.closedAt) return false;
        return new Date(task.closedAt).getHours() < 9;
      }).length;

      const dailyTasks = {};
      this.completedTasks.forEach(task => {
        if (!task.closedAt) return;
        const date = new Date(task.closedAt).toDateString();
        dailyTasks[date] = (dailyTasks[date] || 0) + 1;
      });
      const maxTasksPerDay = Math.max(...Object.values(dailyTasks), 0);

      const uniqueProjects = new Set(
          this.completedTasks.map(task => task.projectId).filter(Boolean)
      ).size;

      const nightTasks = this.completedTasks.filter(task => {
        if (!task.closedAt) return false;
        return new Date(task.closedAt).getHours() >= 22;
      }).length;

      this.achievements.forEach(ach => {
        switch(ach.id) {
          case 1:
            ach.progress = Math.min(totalCompleted, ach.required);
            ach.unlocked = totalCompleted >= ach.required;
            break;
          case 2:
            ach.progress = Math.min(totalCompleted, ach.required);
            ach.unlocked = totalCompleted >= ach.required;
            break;
          case 3:
            ach.progress = Math.min(urgentKanbanCompleted, ach.required);
            ach.unlocked = urgentKanbanCompleted >= ach.required;
            break;
          case 4:
            ach.progress = Math.min(earlyMorningTasks, ach.required);
            ach.unlocked = earlyMorningTasks >= ach.required;
            break;
          case 5:
            ach.progress = Math.min(maxTasksPerDay, ach.required);
            ach.unlocked = maxTasksPerDay >= ach.required;
            break;
          case 6:
            ach.progress = Math.min(uniqueProjects, ach.required);
            ach.unlocked = uniqueProjects >= ach.required;
            break;
          case 7:
            ach.progress = Math.min(this.userLevel, ach.required);
            ach.unlocked = this.userLevel >= ach.required;
            break;
          case 8:
            ach.progress = Math.min(nightTasks, ach.required);
            ach.unlocked = nightTasks >= ach.required;
            break;
        }
      });
    },

    updateQuestsProgress() {
      const today = new Date().toISOString().split('T')[0];

      const todayCompleted = this.completedTasks.filter(task =>
          task.closedAt && new Date(task.closedAt).toISOString().split('T')[0] === today
      ).length;

      const highPriorityKanbanCompleted = this.completedTasks.filter(task =>
          (task.priority === 1 || task.priority === 'urgent') &&
          task.isKanban === true &&
          task.status === 'Close'
      ).length;

      const kanbanCompleted = this.completedTasks.filter(task =>
          task.isKanban === true &&
          task.status === 'Close'
      ).length;

      this.activeQuests.forEach(quest => {
        if (quest.completed && quest.xpAwarded) return;

        if (quest.id === 1 && quest.lastCompletedDate !== today) {
          quest.progress = 0;
          quest.completed = false;
          quest.progressPercentage = 0;
          quest.xpAwarded = false;
        }

        switch(quest.id) {
          case 1:
            quest.progress = Math.min(todayCompleted, quest.required);
            quest.progressPercentage = (quest.progress / quest.required) * 100;
            if (quest.progress >= quest.required) {
              quest.completed = true;
              quest.lastCompletedDate = today;
            }
            break;

          case 2:
            quest.progress = Math.min(highPriorityKanbanCompleted, quest.required);
            quest.progressPercentage = (quest.progress / quest.required) * 100;
            if (quest.progress >= quest.required) {
              quest.completed = true;
            }
            break;

          case 3:
            quest.progress = Math.min(kanbanCompleted, quest.required);
            quest.progressPercentage = (quest.progress / quest.required) * 100;
            if (quest.progress >= quest.required) {
              quest.completed = true;
            }
            break;
        }
      });

      this.calculateXP();
    },
  }
};
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.profile {
  width: 180px;
  align-items: flex-end;
  background: #ffffff;
  border-radius: 15px;
  justify-content: center;
  padding: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.gamification-container {
  display: flex;
  flex-direction: column;
  font-family: 'Montserrat', sans-serif;
  color: black;
}

.level-card {
  flex-grow: 1;
  position: relative;
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  padding: 4px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.level-card h3 {
  margin: 0 0 10px 0;
  font-size: 1.5rem;
}

.progress-container {
  position: relative;
  flex-grow: 1;
  height: 20px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: #f5f5f5;
  transition: width 0.5s ease;
}

.progress-text {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  font-weight: bold;
  color: #333;
  z-index: 2;
}

.level-badge {
  position: absolute;
  top: 50%;
  left: -10px;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background: #6a11cb;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.achievements-section h3, .quests-section h3, .challenge-section h3 {
  margin: 0 0 15px 0;
  color: #6a11cb;
  font-size: 1.2rem;
}

.achievement-card {
  display: flex;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.achievement-card:hover {
  transform: translateY(-3px);
}

.achievement-card.locked {
  opacity: 0.7;
  background: #f9f9f9;
}

.achievement-icon {
  font-size: 2rem;
  margin-right: 15px;
}

.achievement-info {
  flex: 1;
}

.achievement-info h4 {
  margin: 0 0 5px 0;
  color: #333;
}

.achievement-info p {
  margin: 0 0 5px 0;
  color: #666;
  font-size: 0.9rem;
}

.achievement-info small {
  color: #999;
  font-size: 0.8rem;
}

.quests-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quest-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.quest-info {
  flex: 1;
}

.quest-info h4 {
  margin: 0 0 5px 0;
  color: #333;
}

.quest-info p {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 0.9rem;
}

.quest-progress {
  position: relative;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.quest-progress .progress-bar {
  background: #6a11cb;
}

.quest-progress span {
  position: absolute;
  right: 0;
  top: -20px;
  font-size: 0.8rem;
  color: #999;
}

.quest-reward {
  background: #6a11cb;
  color: white;
  padding: 5px 10px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }

  .profile {
    width: 100%;
    margin-bottom: 20px;
  }

  .achievements-grid {
    grid-template-columns: 1fr;
  }
}

.progress-container-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.main-container {
  display: flex;
  gap: 30px;
}

.left-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1100px;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.profile {
  width: 250px;
  background: #ffffff;
  border-radius: 15px;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.quests-challenge-row {
  display: flex;
  gap: 30px;
  margin-top: 20px;
  align-items: flex-start;
}

.quests-section {
  width: 520px;
  flex-shrink: 0;
  height: 100%;
}

.challenge-section {
  width: 798px;
  flex-shrink: 0;
  height: auto;
}

.challenge-scroll-wrapper {
  max-height: 100%;
  overflow-y: auto;
  padding-right: 10px;
  height: 100%;
}

.challenge-scroll-wrapper::-webkit-scrollbar {
  width: 8px;
}

.challenge-scroll-wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.challenge-scroll-wrapper::-webkit-scrollbar-thumb {
  background: #6a11cb;
  border-radius: 4px;
}

.challenge-scroll-wrapper::-webkit-scrollbar-thumb:hover {
  background: #5a0db3;
}
</style>