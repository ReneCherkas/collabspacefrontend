<template>
  <div class="chat-app">
    <div class="sidebar">
      <div class="header">
        <h2 class="header-title">Сообщения</h2>
      </div>

      <div v-if="showUserSearch" class="user-search-modal">
        <div class="user-search-content">
          <div class="modal-header">
            <h3>Поиск пользователей</h3>
            <span @click="closeUserSearch" class="close-chat-btn">✖</span>
          </div>
          <input
              type="text"
              v-model="userSearchQuery"
              placeholder="Введите имя или ник"
              @input="searchUsers"
              class="search-input"
          />
          <ul class="user-search-results">
            <li v-for="user in foundUsers" :key="user.id" @click="startChat(user)">
              <img :src="user.avatar" class="avatar-small" />
              {{ user.displayName }}
            </li>
            <li v-if="foundUsers.length === 0 && userSearchQuery.length >= 2">
              Пользователь не найден
            </li>
          </ul>
        </div>
      </div>

      <div v-if="showGroupChatModal" class="user-search-modal">
        <div class="user-search-content">
          <div class="modal-header">
            <h3>Создать групповой чат</h3>
            <span @click="closeGroupChatModal" class="close-chat-btn">✖</span>
          </div>
          <input
              v-model="groupChatName"
              placeholder="Название чата"
              class="search-input"
          />
          <input
              type="text"
              v-model="userSearchQuery"
              placeholder="Добавить участников"
              @input="searchUsers"
              class="search-input"
          />
          <div class="selected-users">
            <div v-for="user in selectedUsers" :key="user.id" class="selected-user">
              <img :src="user.avatar" class="avatar-small" />
              <span>{{ user.displayName }}</span>
              <button @click="removeUser(user)" class="remove-user-btn">×</button>
            </div>
          </div>
          <ul class="user-search-results">
            <li v-for="user in foundUsers" :key="user.id" @click="addUser(user)">
              <img :src="user.avatar" class="avatar-small" />
              {{ user.displayName }}
            </li>
          </ul>
          <button
              @click="createGroupChat"
              class="create-group-btn"
              :disabled="selectedUsers.length < 2 || !groupChatName"
          >
            Создать групповой чат
          </button>
        </div>
      </div>

      <button @click="showChatTypeMenu = !showChatTypeMenu" class="gradient-plus floating-button">
        +
      </button>

      <div v-if="showChatTypeMenu" class="chat-type-menu">
        <button @click="handlePersonalChatClick">Личный чат</button>
        <button @click="handleGroupChatClick">Групповой чат</button>
      </div>

      <div v-else class="chats-list">
        <div
            v-for="chat in filteredChats"
            :key="chat.id"
            class="chat-item"
            @click="selectChat(chat.id)"
        >
          <img
              v-if="!chat.isGroup"
              :src="chat.avatar || defaultAvatar"
              @error="handleImageError"
              class="avatar"
          />
          <div v-else class="group-avatar">
            <svg
                version="1.1"
                id="Layer_1"
                xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink"
                x="0px"
                y="0px"
                width="28"
                height="28"
                viewBox="0 0 335.436 335.436"
                preserveAspectRatio="xMidYMid meet"
                style="enable-background:new 0 0 335.436 335.436;"
                xml:space="preserve">
    <g>
      <circle cx="255.436" cy="110.304" r="44.138" fill="#ffffff"></circle>
      <path d="M100.725,187.928C45.096,187.928,0,233.024,0,288.653h201.45C201.45,233.024,156.354,187.928,100.725,187.928z" fill="#ffffff"></path>
      <path d="M255.436,184.442c-20.787,0-39.711,7.938-53.931,20.938c14.212,17.138,23.672,37.368,27.712,59.062h106.219 C335.436,220.259,299.618,184.442,255.436,184.442z" fill="#ffffff"></path>
      <circle cx="100.725" cy="102.355" r="55.573" fill="#ffffff"></circle>
    </g>
  </svg>
          </div>

          <!--          <img :src="chat.avatar" class="avatar" />-->
          <div class="chat-info">
            <div class="chat-name-wrapper">
              <p class="chat-name">
                {{ chat.name }}
              </p>
            </div>
            <p class="chat-message">{{ chat.lastMessage }}</p>
          </div>
          <div class="chat-item-actions">
            <button @click.stop="toggleChatMenu(chat.id)" class="chat-menu-btn">⋮</button>
            <div v-if="activeChatMenu === chat.id" class="chat-menu">
              <button @click.stop="deleteChat(chat.id)" class="menu-item danger">Удалить чат</button>
            </div>
          </div>
        </div>

        <div v-if="chats.length === 0" class="no-chats">
          У вас пока нет чатов
        </div>
      </div>
    </div>

    <div class="chat-window" v-if="currentChatId">
      <div v-if="isLoadingMessages" class="loading">Загрузка сообщений...</div>
      <template v-else>
        <div class="chat-header">
          <!--          <img :src="currentChat.avatar" class="avatar" />-->
          <img
              :src="currentChat.avatar || defaultAvatar"
              @error="handleImageError"
              class="avatar"
          />
          <p class="chat-title">{{ currentChat.name }}</p>
          <span @click="closeChat" class="close-chat-btn">✖</span>
        </div>
        <div class="messages">
          <div
              v-for="message in messages"
              :key="message.timestamp"
              class="message-item"
              :class="{'sent': message.isCurrentUser, 'received': !message.isCurrentUser}"
          >
            <div class="message-content-wrapper">
              <p v-if="currentChat.isGroup && !message.isCurrentUser" class="sender-name">
                {{ message.senderName }}
              </p>
              <p class="message-content">{{ message.content }}</p>
              <div class="message-meta">
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                <button
                    v-if="message.isCurrentUser"
                    @click.stop="toggleMessageMenu(message)"
                    class="message-menu-btn"
                >
                  ⋮
                </button>
              </div>
            </div>
            <div
                v-if="activeMessageMenu === (message.id || message.timestamp)"
                class="message-menu"
                :class="{'sent-menu': message.isCurrentUser, 'received-menu': !message.isCurrentUser}"
            >
              <button @click.stop="editMessage(message)" class="menu-item">Редактировать</button>
              <button @click.stop="deleteMessage(message)" class="menu-item danger">Удалить</button>
            </div>
          </div>
        </div>

        <div class="input-container" v-if="editingMessage">
          <input
              v-model="newMessage"
              placeholder="Редактирование сообщения"
              class="message-input"
              @keyup.enter="sendUpdatedMessage"
          />
          <span @click="sendUpdatedMessage" class="confirm-edit-btn">✓</span>
          <span @click="cancelEdit" class="close-chat-btn-cancel">✖</span>
        </div>

        <div class="input-container" v-if="!editingMessage">
          <input
              v-model="newMessage"
              placeholder="Введите сообщение"
              class="message-input"
              @keyup.enter="sendMessage"
          />
          <button @click="sendMessage" class="send-button">Отправить</button>
        </div>


      </template>
    </div>
  </div>
</template>

<script>
import SockJS from 'sockjs-client';
import Stomp from 'webstomp-client';

export default {
  data() {
    return {
      showMessageInput: true,
      currentChat: null,
      showGroupChatModal: false,
      showChatTypeMenu: false,
      groupChatName: '',
      selectedUsers: [],
      groupChats: [],
      activeMessageMenu: null,
      editingMessage: null,
      activeChatMenu: null,
      isLoading: false,
      isLoadingMessages: false,
      searchQuery: "",
      userSearchQuery: "",
      showUserSearch: false,
      foundUsers: [],
      currentChatId: null,
      messages: [],
      newMessage: "",
      username: localStorage.getItem('userLogin') || 'User',
      userId: parseInt(localStorage.getItem('userId')) || null,
      stompClient: null,
      socket: null,
      chats: [],
      defaultAvatar: "https://i.pinimg.com/736x/ad/70/4c/ad704c241e99a387945b40a7dce6e55d.jpg",
      userAvatars: {} ,
      refreshInterval: null, // Добавлено для хранения интервала обновления
      messageRefreshInterval: null // Добавлено для хранения интервала обновления сообщений
    };
  },
  created() {
    this.checkAuthAndInit();
    this.loadCurrentUserAvatar();

    this.refreshInterval = setInterval(() => {
      this.loadUserChats();
    }, 1000);

    window.addEventListener('beforeunload', () => {
      if (this.stompClient) {
        this.stompClient.disconnect();
      }

      clearInterval(this.refreshInterval);
      clearInterval(this.messageRefreshInterval);
    });

    this.handleClickOutside = this.handleClickOutside.bind(this);
  },
  beforeDestroy() {
    // Очищаем интервалы при уничтожении компонента
    clearInterval(this.refreshInterval);
    clearInterval(this.messageRefreshInterval);
    document.removeEventListener('click', this.handleClickOutside);
  },
  computed: {
    validMessages() {
      return this.messages.filter(msg => msg && (msg.id || msg.timestamp));
    },
    filteredChats() {
      return this.chats.filter(chat => {
        if (!chat || !chat.name) return false;

        const chatName = chat.name.toString().toLowerCase();
        const searchTerm = this.searchQuery.toLowerCase();
        return chatName.includes(searchTerm);
      });
    },
    currentChat() {
      return this.chats.find(chat => chat.id === this.currentChatId) || {};
    }
  },
  watch: {
    currentChatId(newVal) {
      // Очищаем предыдущий интервал при смене чата
      clearInterval(this.messageRefreshInterval);

      if (newVal) {
        // Устанавливаем новый интервал для обновления сообщений текущего чата
        this.messageRefreshInterval = setInterval(() => {
          this.loadMessagesForCurrentChat();
        }, 1000);
      }
    }
  },
  methods: {
    async loadMessagesForCurrentChat() {
      if (!this.currentChatId) return;

      try {
        const token = localStorage.getItem('authToken');
        const currentChat = this.chats.find(c => c.id === this.currentChatId);
        if (!currentChat) return;

        const response = await fetch(
            `http://localhost:8086/api/chat/messages?${currentChat.isGroup ? 'groupId' : 'chatId'}=${this.currentChatId}&currentUserId=${this.userId}`,
            {headers: {'Authorization': `Bearer ${token}`}}
        );

        if (!response.ok) throw new Error("Ошибка загрузки сообщений");

        const messages = await response.json();
        this.messages = messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: msg.timestamp,
          isCurrentUser: msg.senderId === this.userId,
          senderName: msg.senderName,
          senderId: msg.senderId
        }));

      } catch (error) {
        console.error("Error refreshing messages:", error);
      }
    },
    handleImageError(event) {
      event.target.src = this.defaultAvatar;
      event.target.onerror = null; // Предотвращаем бесконечный цикл
    },
    async checkAuthAndInit() {
      try {
        await this.checkTokenAndRefresh();

        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        const userLogin = localStorage.getItem('userLogin');

        if (!token || !userId) {
          console.error("Требуется авторизация");
          this.$router.push("/");
          return;
        }

        this.userId = parseInt(userId);
        this.username = userLogin || 'User';

        // Очищаем старые данные чатов
        localStorage.removeItem('cachedChats');
        localStorage.removeItem('chatsLastUpdated');

        await this.initChats();
      } catch (error) {
        console.error("Ошибка проверки авторизации:", error);
      }
    },
    async initChats() {
      const cachedChats = localStorage.getItem('cachedChats');
      const lastUpdated = localStorage.getItem('chatsLastUpdated');

      if (cachedChats && lastUpdated && (Date.now() - lastUpdated < 300000)) {
        this.chats = JSON.parse(cachedChats);
      }

      await this.loadUserChats();

      this.connectWebSocket();
    },

    async loadUserChats() {
      if (!this.checkAuth()) return;

      try {
        this.isLoading = true;
        const token = localStorage.getItem('authToken');

        // 1. Загружаем личные чаты
        const personalResponse = await fetch(
            `http://localhost:8086/api/chat/list?userId=${this.userId}`,
            { headers: {'Authorization': `Bearer ${token}`} }
        );

        // 2. Загружаем групповые чаты
        const groupResponse = await fetch(
            `http://localhost:8086/api/chat/group-list?userId=${this.userId}`,
            { headers: {'Authorization': `Bearer ${token}`} }
        );

        if (!personalResponse.ok) throw new Error("Ошибка загрузки личных чатов");
        if (!groupResponse.ok) throw new Error("Ошибка загрузки групповых чатов");

        const personalChats = await personalResponse.json();
        const groupChats = await groupResponse.json();

        // 3. Обрабатываем личные чаты
        const processedPersonalChats = await Promise.all(personalChats.map(async chat => {
          const otherUserId = chat.firstUserId === this.userId ? chat.secondUserId : chat.firstUserId;
          let avatarUrl = this.defaultAvatar;
          let lastMessageText = "Нет сообщений";
          let timestamp = null;
          let senderName = "";

          try {
            // Загружаем аватар пользователя
            const profileResponse = await fetch(
                `http://localhost:8081/api/auth/user-profile/${otherUserId}`,
                { headers: {'Authorization': `Bearer ${token}`}
                });

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              avatarUrl = profileData.photo
                  ? profileData.photo.replace('uploads/uploads/', 'uploads/')
                  : this.defaultAvatar;
            }

            // Загружаем последнее сообщение (с сортировкой по убыванию даты)
            const messagesResponse = await fetch(
                `http://localhost:8086/api/chat/messages?chatId=${chat.id}&currentUserId=${this.userId}&limit=1&sort=timestamp,desc`,
                { headers: {'Authorization': `Bearer ${token}`} }
            );

            if (messagesResponse.ok) {
              const messages = await messagesResponse.json();
              if (messages.length > 0) {
                const lastMessage = messages[0]; // Берем первое сообщение (так как сортировка DESC)
                lastMessageText = lastMessage.content;
                timestamp = lastMessage.timestamp;
                senderName = lastMessage.senderName;

                // Форматируем текст последнего сообщения
                const prefix = lastMessage.senderId === this.userId ? 'Вы: ' : `${senderName}: `;
                lastMessageText = prefix + lastMessageText;

                // Обрезаем длинные сообщения
                if (lastMessageText.length > 30) {
                  lastMessageText = lastMessageText.substring(0, 30) + '...';
                }
              }
            }
          } catch (e) {
            console.error("Error loading user profile or messages:", e);
          }

          return {
            id: chat.id,
            name: chat.firstUserId === this.userId ? chat.secondUserName : chat.firstUserName,
            lastMessage: lastMessageText,
            timestamp: timestamp,
            avatar: avatarUrl,
            firstUserId: chat.firstUserId,
            secondUserId: chat.secondUserId,
            isGroup: false
          };
        }));

        // 4. Обрабатываем групповые чаты
        const processedGroupChats = await Promise.all(groupChats.map(async chat => {
          let lastMessageText = "Нет сообщений";
          let timestamp = null;
          let senderName = "";

          try {
            // Загружаем последнее сообщение (с сортировкой по убыванию даты)
            const messagesResponse = await fetch(
                `http://localhost:8086/api/chat/messages?groupId=${chat.id}&currentUserId=${this.userId}&limit=1&sort=timestamp,desc`,
                { headers: {'Authorization': `Bearer ${token}`} }
            );

            if (messagesResponse.ok) {
              const messages = await messagesResponse.json();
              if (messages.length > 0) {
                const lastMessage = messages[0]; // Берем первое сообщение (так как сортировка DESC)
                lastMessageText = lastMessage.content;
                timestamp = lastMessage.timestamp;
                senderName = lastMessage.senderName;

                // Форматируем текст последнего сообщения
                if (lastMessage.senderId === this.userId) {
                  lastMessageText = `Вы: ${lastMessageText}`;
                } else {
                  lastMessageText = `${senderName}: ${lastMessageText}`;
                }

                // Обрезаем длинные сообщения
                if (lastMessageText.length > 30) {
                  lastMessageText = lastMessageText.substring(0, 30) + '...';
                }
              }
            }
          } catch (e) {
            console.error("Error loading messages:", e);
          }

          return {
            id: chat.id,
            name: chat.name,
            lastMessage: lastMessageText,
            timestamp: timestamp,
            avatar: this.defaultAvatar,
            isGroup: true,
            participantIds: chat.participantIds
          };
        }));

        // 5. Объединяем и сортируем чаты по времени последнего сообщения
        this.chats = [...processedPersonalChats, ...processedGroupChats]
            .sort((a, b) => {
              const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
              const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
              return timeB - timeA; // Сначала новые чаты
            });

        // 6. Кэшируем результат
        localStorage.setItem('cachedChats', JSON.stringify(this.chats));
        localStorage.setItem('chatsLastUpdated', Date.now());

      } catch (error) {
        console.error("Ошибка:", error);
        // Пробуем загрузить из кэша при ошибке
        const cached = localStorage.getItem('cachedChats');
        if (cached) this.chats = JSON.parse(cached);
      } finally {
        this.isLoading = false;
      }
    },
    connectWebSocket() {
      if (this.stompClient && this.stompClient.connected) return;

      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error("Cannot connect WebSocket: no auth token");
        return;
      }

      this.socket = new SockJS('http://localhost:8086/ws');
      this.stompClient = Stomp.over(this.socket);

      const headers = {
        'Authorization': `Bearer ${token}`,
        'userId': this.userId
      };

      this.stompClient.connect(headers, () => {
        console.log("WebSocket connected successfully");

        // Подписка на личные сообщения
        this.stompClient.subscribe(`/user/queue/private`, (message) => {
          const newMessage = JSON.parse(message.body);
          console.log("Received private message:", newMessage);
          this.handleIncomingMessage(newMessage);
        });

        // Подписка на групповые чаты (если есть активный групповой чат)
        if (this.currentChatId && this.currentChat?.isGroup) {
          this.subscribeToGroupChat();
        }

      }, (error) => {
        console.error("WebSocket connection error:", error);
        if (error.includes('401')) {
          // При ошибке авторизации пытаемся обновить токен
          this.refreshToken().then(() => {
            setTimeout(() => this.connectWebSocket(), 1000);
          });
        } else {
          setTimeout(() => this.connectWebSocket(), 5000);
        }
      });
    },
    subscribeToGroupChat() {
      if (this.currentChatId && this.currentChat?.isGroup && this.stompClient) {
        // Отписываемся от предыдущей подписки, если есть
        if (this.groupSubscription) {
          this.groupSubscription.unsubscribe();
        }

        this.groupSubscription = this.stompClient.subscribe(
            `/topic/group.${this.currentChatId}`,
            (message) => {
              const newMessage = JSON.parse(message.body);
              this.handleIncomingMessage(newMessage);
            }
        );
      }
    },

    handleIncomingMessage(newMessage) {
      try {
        // 1. Обработка уведомлений об удалении сообщений
        if (newMessage.action && newMessage.action === 'delete') {
          this.messages = this.messages.filter(m => m.id !== newMessage.messageId);
          this.updateChatLastMessage();
          return;
        }

        // 2. Определяем ID чата, к которому относится сообщение
        const chatId = newMessage.chatId || newMessage.groupId;

        // 3. Обновляем список сообщений в текущем чате, если он открыт
        const isForCurrentChat = chatId && chatId.toString() === this.currentChatId?.toString();

        if (isForCurrentChat) {
          const existingIndex = this.messages.findIndex(m => m.id === newMessage.id);

          if (existingIndex !== -1) {
            // Обновляем существующее сообщение
            this.messages.splice(existingIndex, 1, {
              ...this.messages[existingIndex],
              content: newMessage.content,
              timestamp: newMessage.timestamp
            });
          } else {
            // Добавляем новое сообщение
            this.messages = [...this.messages, {
              id: newMessage.id,
              content: newMessage.content,
              timestamp: newMessage.timestamp,
              isCurrentUser: newMessage.senderId === this.userId,
              senderName: newMessage.senderName,
              senderId: newMessage.senderId
            }];
            this.scrollToBottom();
          }
        }

        // 4. Обновляем последнее сообщение в списке чатов
        const chatIndex = this.chats.findIndex(c => c.id.toString() === chatId?.toString());

        if (chatIndex !== -1) {
          // Создаем новый массив чатов для реактивности
          const updatedChats = [...this.chats];

          // Формируем текст последнего сообщения
          let lastMessageText = newMessage.content;
          if (lastMessageText.length > 30) {
            lastMessageText = lastMessageText.substring(0, 30) + '...';
          }

          // Форматируем текст для отображения
          if (newMessage.senderId === this.userId) {
            lastMessageText = `Вы: ${lastMessageText}`;
          } else {
            lastMessageText = `${newMessage.senderName}: ${lastMessageText}`;
          }

          // Обновляем чат
          updatedChats[chatIndex] = {
            ...updatedChats[chatIndex],
            lastMessage: lastMessageText,
            timestamp: newMessage.timestamp
          };

          this.chats = updatedChats;
          this.sortChatsByLastMessage();
        }
      } catch (error) {
        console.error("Error handling incoming message:", error);
      }
    },

// Добавьте этот метод для сортировки чатов
    sortChatsByLastMessage() {
      this.chats.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA; // Сначала новые чаты
      });
    },
    async selectChat(chatId) {
      this.currentChatId = chatId;
      this.messages = [];

      // Отписываемся от предыдущих подписок
      if (this.currentSubscription) {
        this.currentSubscription.unsubscribe();
      }

      try {
        this.isLoadingMessages = true;
        const token = localStorage.getItem('authToken');
        const currentChat = this.chats.find(c => c.id === chatId);

        if (!currentChat) return;

        // Подписываемся на групповой чат, если это групповой чат
        if (currentChat.isGroup) {
          this.subscribeToGroupChat();
        }

        const response = await fetch(
            `http://localhost:8086/api/chat/messages?${currentChat.isGroup ? 'groupId' : 'chatId'}=${chatId}&currentUserId=${this.userId}`,
            {headers: {'Authorization': `Bearer ${token}`}}
        );

        if (!response.ok) throw new Error("Ошибка загрузки сообщений");

        const messages = await response.json();
        this.messages = messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: msg.timestamp,
          isCurrentUser: msg.senderId === this.userId,
          senderName: msg.senderName,
          senderId: msg.senderId
        }));

        // Принудительно обновляем текущий чат
        this.currentChat = {...currentChat};

        // Прокручиваем вниз после загрузки сообщений
        this.$nextTick(() => {
          this.scrollToBottom();
        });

      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        this.isLoadingMessages = false;
      }
    },

    scrollToBottom() {
      const messagesContainer = this.$el.querySelector('.messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    },
    async sendMessage() {
      if (!this.newMessage.trim() || !this.currentChatId) return;

      const currentChat = this.chats.find(c => c.id === this.currentChatId);
      if (!currentChat) return;

      // Создаем временное сообщение для оптимистичного обновления
      const tempMessage = {
        id: 'temp-' + Date.now(),
        senderId: this.userId,
        content: this.newMessage,
        timestamp: new Date().toISOString(),
        isCurrentUser: true,
        senderName: this.username
      };

      // Добавляем временное сообщение в UI
      this.messages = [...this.messages, tempMessage];

      const chatIndex = this.chats.findIndex(c => c.id === this.currentChatId);
      if (chatIndex !== -1) {
        const updatedChats = [...this.chats];
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          lastMessage: this.newMessage.length > 30
              ? this.newMessage.substring(0, 30) + '...'
              : this.newMessage,
          timestamp: tempMessage.timestamp
        };
        this.chats = updatedChats;
        this.sortChatsByLastMessage();
      }

      this.scrollToBottom();

      // Очищаем поле ввода
      const messageToSend = this.newMessage;
      this.newMessage = "";

      // Формируем сообщение для сервера
      const message = {
        senderId: this.userId,
        content: messageToSend,
        timestamp: new Date().toISOString()
      };

      // Добавляем правильное поле в зависимости от типа чата
      if (currentChat.isGroup) {
        message.groupId = this.currentChatId;
      } else {
        message.chatId = this.currentChatId;
      }

      if (!this.stompClient || !this.stompClient.connected) {
        console.warn("WebSocket not connected, reconnecting...");
        this.connectWebSocket();
        setTimeout(() => {
          this.stompClient.send("/app/chat.send", JSON.stringify(message), {});
        }, 500);
        return;
      }

      try {
        this.stompClient.send("/app/chat.send", JSON.stringify(message), {});
      } catch (error) {
        console.error("Error sending message:", error);
        // Удаляем временное сообщение при ошибке
        this.messages = this.messages.filter(m => m.id !== tempMessage.id);
        this.connectWebSocket();
      }
    },
    async searchUsers() {
      if (this.userSearchQuery.trim().length < 2) {
        this.foundUsers = [];
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(
            `http://localhost:8086/api/chat/search-users?query=${encodeURIComponent(this.userSearchQuery)}`,
            {headers: {'Authorization': `Bearer ${token}`}}
        );

        if (!response.ok) throw new Error('Ошибка поиска');

        const users = await response.json();

        // Загружаем аватары для найденных пользователей
        this.foundUsers = await Promise.all(users.map(async user => {
          let avatarUrl = this.defaultAvatar;

          try {
            const profileResponse = await fetch(`http://localhost:8081/api/auth/user-profile/${user.id}`, {
              headers: {'Authorization': `Bearer ${token}`}
            });

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              avatarUrl = profileData.photo
                  ? profileData.photo.replace('uploads/uploads/', 'uploads/')
                  : this.defaultAvatar;
            }
          } catch (e) {
            console.error("Error loading user profile:", e);
          }

          return {
            ...user,
            avatar: avatarUrl,
            // avatar: avatarUrl.includes('http') ? avatarUrl : `http://localhost:8081${avatarUrl}`,
          };
        }));
      } catch (error) {
        console.error("Ошибка при поиске пользователей:", error);
        this.foundUsers = [];
      }
    },
    async startChat(user) {
      if (!this.checkAuth()) return;

      try {
        const token = localStorage.getItem('authToken');

        // 1. Проверяем, есть ли уже чат с этим пользователем
        const existingChat = this.chats.find(chat =>
            (chat.firstUserId === this.userId && chat.secondUserId === user.id) ||
            (chat.firstUserId === user.id && chat.secondUserId === this.userId)
        );

        if (existingChat) {
          // 2. Если чат существует - открываем его
          this.selectChat(existingChat.id);
          this.showUserSearch = false;
          return;
        }

        // 3. Если чата нет - создаем новый
        console.log("Отправка запроса на создание чата с токеном:", token);

        const response = await fetch('http://localhost:8086/api/chat/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            user1Id: this.userId,
            user2Id: user.id
          })
        });

        console.log("Ответ сервера:", response);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ошибка сервера: ${response.status} - ${errorText}`);
        }

        const newChat = await response.json();
        console.log("Создан новый чат:", newChat);

        await this.loadUserChats();
        this.selectChat(newChat.id);
        this.showUserSearch = false;
      } catch (error) {
        console.error("Ошибка при создании чата:", error);
        alert(`Не удалось создать чат: ${error.message}`);
      }
    },
    async createGroupChat() {
      try {
        const token = localStorage.getItem('authToken');

        // Добавляем текущего пользователя в участники
        const participantIds = [...this.selectedUsers.map(user => user.id), this.userId];

        // Проверяем, что название чата не пустое
        if (!this.groupChatName.trim()) {
          throw new Error("Название чата не может быть пустым");
        }

        // Проверяем, что участников достаточно
        if (participantIds.length < 2) {
          throw new Error("Должно быть минимум 2 участника");
        }

        const response = await fetch('http://localhost:8086/api/chat/create-group', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: this.groupChatName,
            participantIds: participantIds
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Ошибка создания группового чата");
        }

        const newGroupChat = await response.json();

        // Обновляем список чатов
        await this.loadUserChats();

        // Закрываем модальное окно
        this.closeGroupChatModal();

        // Открываем новый чат
        this.selectChat(newGroupChat.id);

      } catch (error) {
        console.error("Ошибка при создании группового чата:", error);
        alert(`Не удалось создать групповой чат: ${error.message}`);
      }
    },
    formatTime(time) {
      if (!time) return 'только что';

      try {
        // Пытаемся разобрать время в разных форматах
        let date;

        // Попробуем ISO формат (новые сообщения)
        if (time.includes("T")) {
          date = new Date(time);
        }
        // Попробуем старый формат (Sun Apr 13 13:38:23 MSK 2025)
        else if (time.match(/[A-Za-z]{3} [A-Za-z]{3} \d{2} \d{2}:\d{2}:\d{2} [A-Za-z]{3} \d{4}/)) {
          date = new Date(time);
        }
        // Другие форматы
        else {
          date = new Date(time.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3'));
        }

        if (isNaN(date.getTime())) {
          return 'только что';
        }

        // Текущая дата для сравнения
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        // Форматируем время
        const timeStr = date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        // Если сообщение не сегодняшнее - добавляем дату
        if (messageDate.getTime() !== today.getTime()) {
          const dateStr = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short'
          });
          return `${dateStr} ${timeStr}`; // Например: "13 апр 14:30"
        }

        return timeStr; // Только время для сегодняшних сообщений
      } catch (e) {
        console.error("Error formatting time:", e);
        return 'только что';
      }
    },
    openUserSearch() {
      this.showUserSearch = true;
      this.userSearchQuery = "";
    },
    closeUserSearch() {
      this.showUserSearch = false;
    },
    closeChat() {
      this.currentChatId = null;
      this.messages = [];
      window.history.pushState(null, null, window.location.pathname);
    },
    checkAuth() {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');

      if (!token || !userId) {
        console.error("Authentication required");
        return false;
      }

      this.userId = parseInt(userId);
      return true;
    },
    async loadCurrentUserAvatar() {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:8081/api/auth/profile', {
          headers: {'Authorization': `Bearer ${token}`}
        });

        if (response.ok) {
          const profileData = await response.json();
          this.userAvatars[this.userId] = profileData.photo
              ? `http://localhost:8081${profileData.photo}`
              : this.defaultAvatar;
        }
      } catch (error) {
        console.error("Ошибка загрузки аватара:", error);
      }
    },
    toggleChatMenu(chatId) {
      if (this.activeChatMenu === chatId) {
        this.closeChatMenu();
        return;
      }

      this.activeChatMenu = chatId;

      // Добавляем обработчик клика по документу
      setTimeout(() => {
        document.addEventListener('click', this.handleClickOutside);
      }, 0);
    },
    closeChatMenu() {
      this.activeChatMenu = null;
      document.removeEventListener('click', this.handleClickOutside);
    },
    handleClickOutside(event) {
      const menuElement = document.querySelector('.chat-menu');
      const buttonElement = document.querySelector('.chat-menu-btn');

      // Если клик был не по меню и не по кнопке меню
      if (menuElement && !menuElement.contains(event.target)) {
        if (buttonElement && !buttonElement.contains(event.target)) {
          this.closeChatMenu();
        }
      }
    },

    beforeDestroy() {
      document.removeEventListener('click', this.handleClickOutside);
    },

    async deleteChat(chatId) {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`http://localhost:8086/api/chat/delete?chatId=${chatId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Ошибка при удалении чата');

        // Обновляем список чатов
        await this.loadUserChats();
        this.activeChatMenu = null;

        // Если удалили текущий открытый чат - закрываем его
        if (this.currentChatId === chatId) {
          this.closeChat();
        }
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось удалить чат');
      }
    },
    toggleMessageMenu(message) {
      if (!message) return;

      const messageKey = message.id || message.timestamp;
      if (this.activeMessageMenu === messageKey) {
        this.activeMessageMenu = null;
        return;
      }
      this.activeMessageMenu = messageKey;

      setTimeout(() => {
        document.addEventListener('click', this.closeMessageMenu);
      }, 0);
    },

    closeMessageMenu() {
      this.activeMessageMenu = null;
      document.removeEventListener('click', this.closeMessageMenu);
    },

    async deleteMessage(message) {
      try {
        // Проверяем актуальность токена
        await this.checkTokenAndRefresh();

        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('Токен авторизации не найден');
        }

        const response = await fetch(`http://localhost:8086/api/chat/messages/${message.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ошибка при удалении сообщения: ${response.status} - ${errorText}`);
        }

        // Удаляем сообщение из локального списка
        this.messages = this.messages.filter(m => m.id !== message.id);
        this.activeMessageMenu = null;

        // Обновляем последнее сообщение в чате
        this.updateChatLastMessage();

      } catch (error) {
        console.error('Ошибка:', error);
        alert(`Не удалось удалить сообщение: ${error.message}`);
      }
    },

    async checkTokenAndRefresh() {
      const token = localStorage.getItem('authToken');
      const tokenExp = this.getTokenExpiration(token);

      // Если токен истек или истечет в ближайшие 5 минут
      if (!token || (tokenExp && tokenExp < Date.now() + 300000)) {
        await this.refreshToken();
      }
    },


    getTokenExpiration(token) {
      if (!token) return null;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp ? payload.exp * 1000 : null;
      } catch (e) {
        console.error('Ошибка при разборе токена:', e);
        return null;
      }
    },

    async refreshToken() {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('Refresh token не найден');
        }

        const response = await fetch('http://localhost:8081/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refreshToken: refreshToken
          })
        });

        if (!response.ok) {
          throw new Error('Ошибка обновления токена');
        }

        const data = await response.json();
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

      } catch (error) {
        console.error('Ошибка обновления токена:', error);
        throw error;
      }
    },


    updateChatLastMessage() {
      if (!this.currentChatId) return;

      const chatIndex = this.chats.findIndex(c => c.id === this.currentChatId);
      if (chatIndex === -1) return;

      // Находим последнее сообщение или устанавливаем "Нет сообщений"
      const lastMessage = this.messages.length > 0
          ? this.messages[this.messages.length - 1]
          : null;

      const updatedChats = [...this.chats];
      updatedChats[chatIndex] = {
        ...updatedChats[chatIndex],
        lastMessage: lastMessage
            ? (lastMessage.isCurrentUser
                ? `Вы: ${lastMessage.content.substring(0, 30)}${lastMessage.content.length > 30 ? '...' : ''}`
                : `${lastMessage.senderName}: ${lastMessage.content.substring(0, 30)}${lastMessage.content.length > 30 ? '...' : ''}`)
            : "Нет сообщений",
        timestamp: lastMessage?.timestamp || null
      };

      this.chats = updatedChats;
    },


    editMessage(message) {
      if (message.id && message.id.toString().startsWith('temp-')) {
        alert("Пожалуйста, подождите, пока сообщение сохранится");
        return;
      }

      this.showMessageInput = false;
      if (!message) return;

      this.editingMessage = {...message};
      this.newMessage = message.content;
      this.activeMessageMenu = null;

      this.$nextTick(() => {
        const input = this.$el.querySelector('.message-input');
        if (input) {
          input.focus();
          input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
              this.sendUpdatedMessage();
            }
          });
        }
      });
    },

    openGroupChatModal() {
      this.showGroupChatModal = true;
      this.userSearchQuery = "";
      this.selectedUsers = [];
      this.groupChatName = "";
    },

    closeGroupChatModal() {
      this.showGroupChatModal = false;
    },

    addUser(user) {
      if (!this.selectedUsers.some(u => u.id === user.id)) {
        this.selectedUsers.push(user);
      }
      this.userSearchQuery = "";
      this.foundUsers = [];
    },

    removeUser(user) {
      this.selectedUsers = this.selectedUsers.filter(u => u.id !== user.id);
    },

    handlePersonalChatClick() {
      this.openUserSearch();
      this.showChatTypeMenu = false;
    },

    handleGroupChatClick() {
      this.openGroupChatModal();
      this.showChatTypeMenu = false;
    },

    async sendUpdatedMessage() {
      if (!this.editingMessage || !this.newMessage.trim()) return;

      try {
        if (this.editingMessage.id && this.editingMessage.id.toString().startsWith('temp-')) {
          throw new Error("Cannot edit unsaved messages");
        }

        const messageToUpdate = {
          id: this.editingMessage.id,
          content: this.newMessage,
          senderId: this.userId,
          // Не включаем timestamp, чтобы сервер сохранил оригинальное время
          timestamp: this.editingMessage.timestamp // Добавляем оригинальное время
        };

        if (this.currentChat.isGroup) {
          messageToUpdate.groupId = this.currentChatId;
        } else {
          messageToUpdate.chatId = this.currentChatId;
        }

        this.editingMessage = null;
        this.newMessage = "";

        this.stompClient.send("/app/chat.update", JSON.stringify(messageToUpdate), {});

      } catch (error) {
        console.error("Error updating message:", error);
        alert("Не удалось обновить сообщение");
      }
    },
    cancelEdit() {
      this.editingMessage = null;
      this.newMessage = "";
    }


  }
};
</script>

<style scoped>
.chat-app {
  display: flex;
  height: 100%;
  color: black;
  font-family: 'Montserrat', sans-serif;
}

.sidebar {
  width: 320px;
  min-width: 320px;
  background: white;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  position: relative;
  margin: -20px 0 -20px -20px;
  display: flex;
  flex-direction: column;
}

.chats-list {
  padding: 0; /* Изменил с 15px на 0 */
  width: 100%; /* Изменил с фиксированной ширины */
  display: flex;
  align-items: center;
  flex-direction: column; /* Добавил для вертикального расположения чатов */
  overflow-y: auto;
}

.chat-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 15px;
  width: 100%;
  box-sizing: border-box;
}

.chat-item-actions {
  margin-left: auto;
  position: relative;
}

.chat-menu {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 1000;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  overflow: hidden; /* Добавлено для устранения прокрутки */
  min-width: 180px;
  max-height: none; /* Убедимся, что нет ограничения высоты */
}

.chat-info {
  margin-left: 10px;
}

.chat-name {
  font-weight: 600;
  margin-bottom: 5px;
}

.chat-message {
  font-size: 14px;
  color: #666;
}

.chat-window {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background: white;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
  border-radius: 15px;
  margin-left: 20px; /* Отступ от sidebar */
  overflow: hidden;
  width: calc(100% - 340px); /* Ширина с учетом sidebar */
  min-width: 400px; /* Минимальная ширина чата */
}

.chat-header {
  display: flex;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #eee;
  position: relative;
}

.messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message-item {
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 15px;
  margin-bottom: 10px;
  position: relative;
  transition: opacity 0.3s;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  word-wrap: break-word; /* Добавьте это свойство */
}

.sent {
  align-self: flex-end;
  background: linear-gradient(135deg, #6e8efb, #4e42d8);
  color: white;
  flex-direction: row-reverse;
}

.received {
  align-self: flex-start;
  background: #e6e8f1;
  text-align: left;
  margin-left: 0;
}

.message-content-wrapper {
  display: flex;
  flex-direction: column;
  min-width: 0; /* Это поможет с flex-контейнерами */
}

.message-content {
  margin: 0;
  word-wrap: break-word; /* Перенос длинных слов */
  white-space: pre-wrap; /* Сохраняет переносы строк и пробелы */
  max-width: 100%; /* Ограничивает ширину содержимого */
}

.message-time {
  font-size: 12px;
  color: #999;
  align-self: flex-end;
}

.sent .message-time {
  color: rgba(255, 255, 255, 0.7);
}

.input-container {
  display: flex;
  padding: 15px;
  background: white;
  border-top: 1px solid #ddd;
}

.message-input {
  flex-grow: 1;
  padding: 10px;
  border-radius: 20px;
  border: 1px solid #ddd;
  margin-right: 10px;
  font-size: 14px;
}

.send-button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.3s;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-small {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}

.user-search-results li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
}

.messages::-webkit-scrollbar {
  width: 8px;
}

.messages::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.messages::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: #555;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #ddd;
  }

  .chat-window {
    display: none;
  }

  .chat-window.active {
    display: flex;
  }
}

.user-search-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.user-search-content {
  background: white;
  padding: 20px;
  border-radius: 10px;
  width: 300px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.user-search-results {
  list-style: none;
  padding: 0;
  margin: 10px 0;
}

.user-search-results li {
  padding: 10px;
  cursor: pointer;
  transition: background 0.3s;
}

.user-search-results li:hover {
  background: #e6e8f1;
}

button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.3s;
}

.header {
  display: flex;
  align-items: flex-start;
  padding: -10px 0 5px 20px;
  position: relative;
}


.loading {
  padding: 20px;
  text-align: center;
  color: #666;
  font-style: italic;
  border-radius: 8px;
  margin: 10px;
}

.close-chat-btn {
  margin-left: auto; /* Размещает справа */
  color: #ff4444; /* Красный цвет */
  font-size: 20px;
  cursor: pointer;
  padding: 5px 10px;
  transition: all 0.2s;
  display: block !important; /* Важно: всегда показывать */
  opacity: 1 !important; /* Гарантированно видим */
}


.close-chat-btn-cancel {
  margin-left: auto; /* Размещает справа */
  color: #ff4444; /* Красный цвет */
  font-size: 20px;
  cursor: pointer;
  padding-left: 15px;
  transition: all 0.2s;
  display: block !important; /* Важно: всегда показывать */
  opacity: 1 !important; /* Гарантированно видим */
}

.confirm-edit-btn {
  margin-left: auto; /* Размещает справа */
  color: #00C851;
  font-size: 20px;
  cursor: pointer;
  padding-left: 15px;
  transition: all 0.2s;
  display: block !important; /* Важно: всегда показывать */
  opacity: 1 !important; /* Гарантированно видим */
}

.floating-button {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  color: white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;
  z-index: 2;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.search-input {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 15px;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #6a11cb;
  box-shadow: 0 0 0 2px rgba(106, 17, 203, 0.2);
}

.user-search-results {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
}

.user-search-results li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  cursor: pointer;
  transition: background 0.3s;
  border-radius: 6px;
}

.user-search-results li:hover {
  background: #f5f5f5;
}

.avatar-small {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}

.chat-menu-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 5px 10px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-menu-btn:hover {
  color: #333;
}

.chat-menu {
  position: absolute;
  right: 0;
  top: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 180px;
  overflow: hidden;
}

.menu-item {
  width: 100%;
  padding: 10px 15px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  color: #333;
  font-size: 14px;
  white-space: nowrap; /* Предотвращаем перенос текста */
}

.menu-item:hover {
  background: #f5f5f5;
}

.menu-item.danger {
  color: #ff4444;
}

.menu-item.danger:hover {
  background: #ffeeee;
}

.no-chats {
  justify-content: center;
  align-items: center;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
  justify-content: flex-end;
}

.message-menu-btn {
  display: flex;
  flex-direction: column;
  gap: 2px; /* Уменьшает расстояние между кнопками */
  padding: 4px 0; /* Добавляет небольшой отступ сверху и снизу */
}

.message-menu-btn:hover {
  opacity: 1;
}

.sent .message-menu-btn {
  color: rgba(255, 255, 255, 0.8);
}

.message-menu {
  position: absolute;
  right: 0;
  z-index: 100;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  min-width: 150px;
}


.message-menu {
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: white;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.menu-item {
  background: white;
  padding: 8px 12px; /* Уменьшает внутренние отступы кнопок */
  margin: 0; /* Убирает внешние отступы */
}

.message-menu :hover {
  background: #f5f5f5;
}

.message-menu .danger {
  color: #ff4444;
}

.message-menu .danger:hover {
  background: #ffeeee;
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

.remove-user-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #ff4444;
  font-size: 16px;
  padding: 0 5px;
}

.create-group-btn {
  width: 100%;
  padding: 12px;
  margin-top: 15px;
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.create-group-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chat-type-menu {
  position: absolute;
  bottom: 70px;
  right: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 150px;
  overflow: hidden;
}

.chat-type-menu button {
  width: 100%;
  padding: 10px 15px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.chat-type-menu button:hover {
  background: #f5f5f5;
}

.group-avatar {
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.sender-name {
  font-size: 14px;
  font-weight: 600;
  color: #6a11cb;
}

.received .sender-name {
  color: #6a11cb;
}

.sent .sender-name {
  display: none;
}

.message-input {
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  padding: 8px 15px;
  outline: none;
  transition: border-color 0.3s ease;
}

.message-input:focus {
  border-color: #d0d0d0;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.1);
}

.chat-name-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
</style>