<template>
  <div class="team-challenge-container">
    <div class="challenge-header">
      <button @click="openModal" class="add-button">+</button>

      <select v-model="selectedChallenge" @change="fetchChallengeDetails" class="challenge-select">
        <option disabled value="">Выберите челлендж</option>
        <option v-for="challenge in challenges" :key="challenge.id" :value="challenge.id">
          {{ challenge.title }}
        </option>
        <option v-if="challenges.length === 0" disabled value="">У вас нет доступных челленджей</option>
      </select>

      <div v-if="selectedChallengeData" class="challenge-info">
        <span>Цель: {{ selectedChallengeData.targetXP }} XP</span>
        <span>До: {{ formatDate(selectedChallengeData.endDate) }}</span>
      </div>
    </div>

    <div v-if="selectedChallengeData" class="leaderboard">
      <h3>Рейтинг участников</h3>
      <div class="leaderboard-list">
        <div
            v-for="(participant, index) in sortedParticipants"
            :key="participant.userId"
            class="participant-card"
            :class="{ 'winner': participant.currentXP >= selectedChallengeData.targetXP }"
        >
          <div class="participant-rank">{{ index + 1 }}</div>
          <img :src="getDefaultAvatar(participant.userName)" class="participant-avatar" />
          <div class="participant-info">
            <span class="participant-name">{{ participant.userName }}</span>
            <div class="progress-container">
              <div class="progress-bar" :style="{ width: Math.min(participant.progressPercentage, 100) + '%' }"></div>
              <span class="progress-text">{{ participant.currentXP }} XP ({{ participant.xpGained }} за челлендж)</span>
            </div>
          </div>
          <div v-if="participant.currentXP >= selectedChallengeData.targetXP" class="winner-badge">🏆</div>
        </div>
      </div>
    </div>

    <!-- Модальное окно создания челленджа -->
    <div v-if="isModalOpen" class="modal-overlay">
      <div class="modal-content">
        <h2>Создать челлендж</h2>

        <div class="input-field">
          <label>Название челленджа</label>
          <input v-model="newChallenge.title" placeholder="Введите название" />
        </div>

        <div class="input-field">
          <label>Целевое количество XP</label>
          <input v-model="newChallenge.targetXP" type="number" min="100" placeholder="Введите количество XP" />
        </div>

        <div class="input-field">
          <label>Продолжительность (дни)</label>
          <input type="range" v-model="newChallenge.duration" min="1" max="10" step="1" />
          <span>{{ newChallenge.duration }} дней</span>
        </div>

        <div class="input-field">
          <label>Добавить участников</label>
          <div class="user-search-container">
            <input
                type="text"
                v-model="participantSearchQuery"
                placeholder="Введите имя или ник"
                @input="searchParticipants"
                class="search-input"
            />
            <div class="selected-users">
              <div v-for="user in newChallenge.participants" :key="user.id" class="selected-user">
                <img :src="getDefaultAvatar(user.name)" class="user-avatar-small" />
                <span>{{ user.name }}</span>
                <button @click="removeParticipant(user)" class="remove-user-btn">×</button>
              </div>
            </div>
            <ul v-if="participantSearchResults.length > 0" class="user-search-results">
              <li v-for="user in participantSearchResults" :key="user.id" @click="addParticipant(user)">
                <img :src="getDefaultAvatar(user.name)" class="user-avatar-small" />
                {{ user.name }}
              </li>
            </ul>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeModal" class="cancel-button">Отмена</button>
          <button @click="createChallenge" class="save-button">Создать</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      challenges: [],
      selectedChallenge: null,
      selectedChallengeData: null,
      isModalOpen: false,
      newChallenge: {
        title: "",
        targetXP: 1000,
        duration: 7,
        participants: []
      },
      participantSearchQuery: "",
      participantSearchResults: [],
      participantsXP: []
    };
  },
  computed: {
    sortedParticipants() {
      if (!this.selectedChallengeData || !this.participantsXP.length) return [];

      return [...this.participantsXP]
          .map(p => ({
            userId: p.userId,
            userName: p.userName,
            avatar: p.avatarUrl,
            currentXP: p.currentXP,
            initialXP: p.initialXP || 0,
            xpGained: p.xpGained || (p.currentXP - (p.initialXP || 0)),
            progressPercentage: (p.currentXP / this.selectedChallengeData.targetXP) * 100
          }))
          .sort((a, b) => b.currentXP - a.currentXP); // Сортируем по currentXP (убывание)
    }
  },
  async mounted() {
    await this.loadChallenges();
    if (this.challenges.length > 0) {
      this.selectedChallenge = this.challenges[0].id;
      await this.fetchChallengeDetails();
    } else {
      console.log("Нет доступных челленджей для текущего пользователя");
    }

    this.autoUpdateInterval = setInterval(() => {
      if (this.selectedChallenge) {
        this.fetchChallengeDetails();
      }
    }, 30000);
  },
  beforeUnmount() {
    clearInterval(this.autoUpdateInterval);
  },
  methods: {
    formatDate(dateString) {
      const options = { day: 'numeric', month: 'long' };
      return new Date(dateString).toLocaleDateString('ru-RU', options);
    },

    async loadChallenges() {
      try {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');

        const response = await axios.get("http://localhost:8084/api/challenges/user", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-User-Id': userId
          }
        });

        this.challenges = response.data;
        console.log("Загруженные челленджи:", this.challenges);

        const savedChallenge = localStorage.getItem('selectedChallenge');
        if (savedChallenge && this.challenges.some(c => c.id.toString() === savedChallenge)) {
          this.selectedChallenge = savedChallenge;
          await this.fetchChallengeDetails();
        } else if (this.challenges.length > 0) {
          this.selectedChallenge = this.challenges[0].id;
          await this.fetchChallengeDetails();
        }
      } catch (error) {
        console.error("Ошибка загрузки челленджей:", error);
      }
    },

    async fetchChallengeDetails() {
      if (!this.selectedChallenge) return;

      try {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');

        const challengeResponse = await axios.get(
            `http://localhost:8084/api/challenges/${this.selectedChallenge}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-User-Id': userId
              }
            }
        );

        this.selectedChallengeData = challengeResponse.data;

        const xpResponse = await axios.get(
            `http://localhost:8084/api/challenges/${this.selectedChallenge}/teams/progress`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-User-Id': userId
              }
            }
        );

        this.participantsXP = xpResponse.data.map(p => ({
          ...p,
          // Пересчитываем процент выполнения
          progressPercentage: (p.currentXP / this.selectedChallengeData.targetXP) * 100
        }));
      } catch (error) {
        console.error("Ошибка загрузки деталей челленджа:", error);
      }
    },

    openModal() {
      this.isModalOpen = true;
    },

    closeModal() {
      this.isModalOpen = false;
      this.resetNewChallenge();
    },

    resetNewChallenge() {
      this.newChallenge = {
        title: "",
        targetXP: 1000,
        duration: 7,
        participants: []
      };
      this.participantSearchQuery = "";
      this.participantSearchResults = [];
    },

    async searchParticipants() {
      const query = this.participantSearchQuery.trim();

      if (query.length < 2) {
        this.participantSearchResults = [];
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(
            `http://localhost:8086/api/chat/search-users?query=${encodeURIComponent(query)}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        this.participantSearchResults = response.data
            .map(user => ({
              id: user.id,
              name: user.displayName || user.login,
              avatar: user.photoPath ? `http://localhost:8081${user.photoPath}` : null
            }))
            .filter(user => !this.newChallenge.participants.some(p => p.id === user.id));
        console.log(this.participantSearchResults)
      } catch (error) {
        console.error("Ошибка при поиске участников:", error);
        this.participantSearchResults = [];
      }
    },

    getDefaultAvatar(name) {
      if (!name) return 'https://ui-avatars.com/api/?name=U&background=random';

      // Удаляем все лишние пробелы и разбиваем на части
      const parts = name.trim().split(/\s+/);

      // Берем первую букву имени
      let initials = parts[0] ? parts[0][0].toUpperCase() : 'U';

      // Если есть фамилия, добавляем первую букву фамилии
      if (parts.length > 1) {
        initials += parts[parts.length - 1][0].toUpperCase();
      }

      // Генерируем цвет на основе имени для консистентности
      const colors = ['ffadad', 'ffd6a5', 'fdffb6', 'caffbf', '9bf6ff', 'a0c4ff', 'bdb2ff', 'ffc6ff'];
      const colorIndex = Math.abs(this.hashCode(name)) % colors.length;
      const bgColor = colors[colorIndex];

      return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bgColor}&color=fff&size=128&bold=true&length=${initials.length}`;
    },

    hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return hash;
    },

    addParticipant(user) {
      if (!this.newChallenge.participants.some(p => p.id === user.id)) {
        this.newChallenge.participants.push(user);
      }
      this.participantSearchQuery = "";
      this.participantSearchResults = [];
    },

    removeParticipant(user) {
      this.newChallenge.participants = this.newChallenge.participants.filter(p => p.id !== user.id);
    },


    async createChallenge() {
      try {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');

        const challengeData = {
          title: this.newChallenge.title,
          targetXP: parseInt(this.newChallenge.targetXP),
          durationDays: parseInt(this.newChallenge.duration),
          // Добавляем текущего пользователя в участники
          participantIds: [
            userId,
            ...this.newChallenge.participants.map(p => p.id)
          ],
          teamName: "Команда " + this.newChallenge.title
        };

        const response = await axios.post(
            "http://localhost:8084/api/challenges",
            challengeData,
            { headers: { 'Authorization': `Bearer ${token}`, 'X-User-Id': userId } }
        );

        if (response.data) {
          this.closeModal();
          await this.loadChallenges();

          if (response.data.id) {
            this.selectedChallenge = response.data.id;
            await this.fetchChallengeDetails();
          }
        }
      } catch (error) {
        console.error("Ошибка:", error);
        alert(error.response?.data?.message || error.message);
      }
    }
  }
};
</script>

<style scoped>
.team-challenge-container {
  background: white;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  height: 320px;
}

.challenge-header {
  display: flex;
  align-items: center;
  gap: 15px;

  flex-wrap: wrap;
}

.add-button {
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: 0.3s;
  white-space: nowrap;
}

.challenge-select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  min-width: 200px;
  flex-grow: 1;
}

.challenge-info {
  display: flex;
  gap: 15px;
  font-size: 0.9rem;
  color: #555;
}

.leaderboard {
  margin-top: 20px;
}

.leaderboard h3 {
  color: #6a11cb;
  margin-bottom: 15px;
  font-size: 1.2rem;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 180px;
  overflow-y: auto;
  padding-right: 5px;
}

.leaderboard-list::-webkit-scrollbar {
  width: 6px;
}

.leaderboard-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.leaderboard-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.leaderboard-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.participant-card {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.participant-rank {
  font-weight: bold;
  font-size: 1.2rem;
  width: 30px;
  text-align: center;
  color: #6a11cb;
}

.participant-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 15px;
}

.participant-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.participant-name {
  font-weight: bold;
  color: #333;
}

.progress-container {
  position: relative;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #6a11cb, #2575fc);
  transition: width 0.5s ease;
}

.progress-text {
  position: absolute;
  left: 0;
  top: 12px;
  font-size: 0.8rem;
  color: #777;
}

/* Обновленные стили для победителя */
.participant-card.winner {
  background: linear-gradient(135deg, #fff9f9, #fff);
  border: 2px solid #cd0b1c;
}

.winner .progress-bar {
  background: linear-gradient(90deg, #ff0a78, #ff8a00);
  box-shadow: 0 0 10px rgba(255, 10, 120, 0.5);
}

.winner .progress-text {
  color: #ff0a78;
  font-weight: bold;
}

.winner-badge {
  font-size: 1.5rem;
  margin-left: 10px;
  animation: pulse 1.5s infinite, float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.winner .participant-name {
  color: #ff0a78;
  font-weight: bold;
}

.winner .participant-rank {
  color: #ff0a78;
  font-weight: bold;
}

.winner {
  position: relative;
  overflow: hidden;
}

.winner::before {
  content: "";
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="2" fill="%23ff0a78"/></svg>'),
  url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><polygon points="5,0 6,3 9,5 6,7 5,10 4,7 1,5 4,3" fill="%23ff8a00"/></svg>');
  background-size: 8px 8px, 10px 10px;
  opacity: 0.1;
  z-index: 0;
  animation: confetti 10s linear infinite;
}

@keyframes confetti {
  0% { background-position: 0 0, 0 0; }
  100% { background-position: 100px 100px, 80px 80px; }
}

/* Стили для аватарки победителя */
.winner .participant-avatar {
  position: relative;
  filter:
      sepia(100%)
      hue-rotate(-50deg)
      saturate(1200%)
      brightness(80%)
      contrast(140%);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 25px;
  border-radius: 10px;
  width: 500px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-content h2 {
  margin-bottom: 20px;
  font-size: 1.4rem;
  color: #333;
  text-align: center;
}

.input-field {
  margin-bottom: 15px;
}

.input-field label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.input-field input,
.input-field textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.input-field input[type="range"] {
  width: 100%;
  margin-bottom: 5px;
}

.user-search-container {
  position: relative;
  margin-top: 10px;
}

.search-input {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 10px;
}

.selected-users {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.selected-user {
  display: flex;
  align-items: center;
  background: #e6e8f1;
  padding: 5px 10px;
  border-radius: 20px;
  gap: 5px;
}

.user-avatar-small {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.remove-user-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #ff4444;
  font-size: 16px;
  padding: 0 5px;
}

.user-search-results {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  position: absolute;
  width: 100%;
  background: white;
  z-index: 10;
}

.user-search-results li {
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-search-results li:hover {
  background-color: #f5f5f5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-button {
  background: #f44336;
  color: white;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.3s;
  border: none;
}

.cancel-button:hover {
  background: #d32f2f;
}

.save-button {
  background: #4caf50;
  color: white;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.3s;
  border: none;
}

.save-button:hover {
  background: #388e3c;
}
</style>