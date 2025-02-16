<template>
  <div class="chat-app">
    <div class="sidebar">
      <button class="find-user-btn" @click="openUserSearch">
        Найти пользователя
      </button>
      <div class="chats-list">
        <button
            v-for="chat in chats"
            :key="chat.id"
            class="chat-btn"
            @click="selectChat(chat.id)"
        >
          {{ chat.name }}
        </button>
      </div>
    </div>

    <div class="chat-window">
      <div v-if="!currentChatId" class="no-chat">
        <p>Выберите чат или начните новый, чтобы общаться.</p>
      </div>
      <div v-else>
        <div class="messages">
          <div
              v-for="message in messages"
              :key="message.timestamp + message.username"
              class="message-item"
          >
            <div class="message-header">
              <strong>{{ message.username }}</strong>
              <span class="message-time">{{ message.timestamp }}</span>
            </div>
            <div class="message-content">{{ message.content }}</div>
          </div>
        </div>
      </div>

      <!-- Панель для ввода сообщений -->
      <div class="input-container">
        <input
            v-model="newMessage"
            placeholder="Введите сообщение"
            class="message-input"
        />
        <button @click="sendMessage" class="send-button">Отправить</button>
      </div>
    </div>

    <div v-if="showUserSearch" class="modal-overlay">
      <div class="modal">
        <h2>Выберите пользователя</h2>
        <select v-model="selectedUser" class="user-select">
          <option disabled value="">Выберите пользователя</option>
          <option v-for="user in searchResults" :key="user" :value="user">
            {{ user }}
          </option>
        </select>
        <div class="modal-buttons">
          <button
              @click="startChatWithSelectedUser"
              class="modal-confirm-btn"
              :disabled="!selectedUser"
          >
            Начать чат
          </button>
          <button class="modal-cancel-btn" @click="showUserSearch = false">
            Отмена
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SockJS from "sockjs-client";
import Stomp from "stompjs";

export default {
  data() {
    return {
      searchResults: [],
      chats: [],
      currentChatId: null,
      messages: [],
      newMessage: "",
      username: "",
      stompClient: null, // WebSocket клиент
      showUserSearch: false, // Флаг отображения окна выбора пользователя
      selectedUser: "", // Выбранный пользователь для нового чата
    };
  },
  methods: {
    // Открытие окна выбора пользователя
    async openUserSearch() {
      this.showUserSearch = true;
      await this.loadUsers();
    },

    saveMessages() {
      localStorage.setItem(`messages_${this.currentChatId}`, JSON.stringify(this.messages));
    },


    // Загрузка списка пользователей
    async loadUsers() {
      try {
        const response = await fetch("http://localhost:8081/api/auth/api/users");
        if (!response.ok) {
          throw new Error(`Ошибка загрузки пользователей: ${response.statusText}`);
        }
        this.searchResults = await response.json();
      } catch (error) {
        console.error("Ошибка загрузки списка пользователей:", error);
      }
    },

    // Начало чата с выбранным пользователем
    async startChatWithSelectedUser() {
      if (!this.selectedUser) return;
      try {
        const chatName = `Чат с ${this.selectedUser}`;
        const chatId = `chat_${this.username}_${this.selectedUser}`;

        // Проверяем, существует ли чат
        const existingChat = this.chats.find((chat) => chat.id === chatId);

        if (!existingChat) {
          this.chats.push({id: chatId, name: chatName});
          this.saveChats(); // Сохраняем чаты
        }

        // Сразу переключаемся на чат
        this.selectChat(chatId);
        this.showUserSearch = false;
        this.selectedUser = ""; // Сброс выбранного пользователя
      } catch (error) {
        console.error("Ошибка создания чата:", error);
      }
    },

    // Метод для отправки сообщений
    sendMessage() {
      if (this.newMessage.trim() && this.stompClient) {
        const message = {
          username: this.username,
          content: this.newMessage,
          timestamp: new Date().toISOString(),
          chatId: this.currentChatId,
        };

        // Отправка сообщения на сервер
        this.stompClient.send("/app/chat.send", {}, JSON.stringify(message));
        this.newMessage = ""; // Очищаем поле ввода

        // Сохраняем сообщение локально, но только если его ещё нет в списке
        if (!this.messages.find(msg => msg.timestamp === message.timestamp)) {
          this.messages.push(message);
          this.saveMessages();
        }
      }
    },

    // Переключение чатов
    selectChat(chatId) {
      this.currentChatId = chatId;
      this.loadMessages(chatId);
    },

    // Загрузка чатов из localStorage
    loadChats() {
      const savedChats = localStorage.getItem("chats");
      if (savedChats) {
        const allChats = JSON.parse(savedChats);

        // Фильтруем чаты, чтобы показывались только те, где текущий пользователь участвует
        this.chats = allChats.filter(chat => chat.id.includes(this.username));
      }
    },

    // Загрузка сообщений для текущего чата
    async loadMessages(chatId) {
      try {
        const response = await fetch(
            `http://localhost:8080/chat/messages?chatId=${chatId}`
        );
        if (!response.ok) {
          throw new Error(`Ошибка загрузки сообщений: ${response.statusText}`);
        }
        this.messages = await response.json();
      } catch (error) {
        console.error("Ошибка загрузки сообщений:", error);
      }
    },

    // Подключение WebSocket
    // Подключение WebSocket
    connectWebSocket() {
      const socket = new SockJS("http://localhost:8080/ws");
      this.stompClient = Stomp.over(socket);

      this.stompClient.connect({}, () => {
        console.log("WebSocket подключен");

        this.stompClient.subscribe("/topic/messages", (message) => {
          const receivedMessage = JSON.parse(message.body);

          // Добавляем только те сообщения, которые относятся к текущему чату
          // и которые ещё не были добавлены
          if (receivedMessage.chatId === this.currentChatId && !this.messages.find(msg => msg.timestamp === receivedMessage.timestamp)) {
            this.messages.push(receivedMessage);
            this.saveMessages(); // Сохраняем сообщения
          }
        });
      });
    }
  },
  mounted() {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      this.username = payload.sub;
    }

    if (this.username) {
      this.loadChats(); // Загружаем чаты
      if (this.chats.length > 0) {
        this.selectChat(this.chats[0].id); // Открываем первый чат
      }
      this.connectWebSocket();
    }
  },
};

</script>

<style scoped>
/* Основной контейнер для приложения */
.chat-app {
  display: flex;
  height: 100vh;
  font-family: 'Arial', sans-serif;
  background-color: #f4f7fc;
}

/* Сайдбар */
.sidebar {
  width: 250px;
  background: #ffffff;
  padding: 20px;
  border-right: 1px solid #ddd;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

/* Кнопки поиска и чатов */
.find-user-btn,
.chat-btn,
.send-button {
  width: 100%;
  margin-bottom: 10px;
  padding: 12px;
  font-size: 16px;
  background-color: #6c63ff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.find-user-btn:hover,
.chat-btn:hover,
.send-button:hover {
  background-color: #4e42d8;
}

/* Стиль для сообщений */
.chat-window {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 20px;
  overflow: hidden;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 20px;
}

.message-item {
  background: #ffffff;
  margin-bottom: 12px;
  padding: 10px;
  border-radius: 10px;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
  transition: background-color 0.2s;
}

.message-item:hover {
  background-color: #f5f5f5;
}

.message-header {
  font-size: 14px;
  color: #555;
  margin-bottom: 5px;
}

.message-content {
  color: #333;
  font-size: 16px;
}

.input-container {
  display: flex;
  padding: 10px;
  background-color: #ffffff;
  border-top: 1px solid #ddd;
  position: sticky;
  bottom: 0;
}

.message-input {
  flex: 1;
  padding: 12px;
  font-size: 16px;
  border-radius: 8px;
  border: 1px solid #ddd;
  margin-right: 10px;
  background-color: #f9f9f9;
  box-sizing: border-box;
  transition: border-color 0.3s ease;
}

.message-input:focus {
  outline: none;
  border-color: #6c63ff;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 350px;
  box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1);
}

.user-select {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  background-color: #f9f9f9;
  margin-bottom: 20px;
}

.modal-buttons {
  display: flex;
  justify-content: space-between;
}

.modal-confirm-btn,
.modal-cancel-btn {
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  background-color: #6c63ff;
  color: white;
  border: none;
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.modal-confirm-btn:hover,
.modal-cancel-btn:hover {
  background-color: #4e42d8;
}
</style>


