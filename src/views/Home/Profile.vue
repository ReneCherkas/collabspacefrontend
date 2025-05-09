<template>
  <div class="profile-container">
    <div v-if="showNotification" class="notification">
      {{ notificationMessage }}
    </div>
    <form @submit.prevent="updateProfile">
      <div class="profile-info">
        <div class="photo-section">
          <label for="profilePhoto" class="photo-upload-label">
            <div class="photo-wrapper">
              <img :src="photoPreview || formData.photo || defaultPhoto" alt="Фото профиля" class="profile-photo" />
              <!-- затемнение + плюс при редактировании -->
              <div v-if="isEditing" class="overlay">
                <span class="plus-sign">+</span>
              </div>
            </div>
          </label>

          <button class="edit-toggle-button" @click="toggleEditMode" v-if="!isEditing" title="Редактировать профиль">
            <span v-html="icons.pen"></span>
          </button>
          <button type="submit" class="edit-toggle-button" v-if="isEditing" title="Сохранить изменения">
            <span v-html="icons.save"></span>
          </button>

          <input type="file" id="profilePhoto" @change="handlePhotoUpload" :disabled="!isEditing" style="display: none;" />
        </div>

        <div class="user-details" :class="isEditing ? 'edit-mode' : 'view-mode'">
          <div class="form-group">
            <div v-if="!isEditing" class="text-display">{{ formData.name }}</div>
            <div v-else class="input-with-cancel">
              <input
                  type="text"
                  id="name"
                  v-model="formData.name"
                  placeholder="Введите ФИО"
                  @input="validateName"
              />
              <button type="button" class="cancel-field-button" @click="resetField('name')" title="Отменить изменения">
                <span v-html="icons.back"></span>
              </button>
            </div>
            <label v-if="isEditing" class="field-label">Имя пользователя</label>
            <div v-if="isEditing && nameError" class="error-text">{{ nameError }}</div>
          </div>

          <div class="form-group">
            <div v-if="!isEditing" class="text-display">
              <span class="nickname" @click="copyNickname">{{ formData.nickname }}</span>
            </div>
            <div v-else class="input-with-cancel">
              <input
                  type="text"
                  id="nickname"
                  v-model="formData.nickname"
                  placeholder="Введите никнейм (без @)"
                  @input="validateNickname"
              />
              <button type="button" class="cancel-field-button" @click="resetField('nickname')" title="Отменить изменения">
                <span v-html="icons.back"></span>
              </button>
            </div>
            <label v-if="isEditing" class="field-label">Никнейм</label>
            <div v-if="isEditing && nicknameError" class="error-text">{{ nicknameError }}</div>
          </div>
          </div>
        </div>

      <div class="form-grid edit-mode" v-if="isEditing">
        <div class="form-row">
          <div class="form-group">
            <div class="input-with-cancel">
              <input
                  type="text"
                  id="login"
                  v-model="formData.login"
                  placeholder="Введите логин"
                  @input="validateLogin"
                  :class="{ 'error': loginError }"
              />
              <button type="button" class="cancel-field-button" @click="resetField('login')" title="Отменить изменения">
                <span v-html="icons.back"></span>
              </button>
            </div>
            <label class="field-label">Логин</label>
            <div v-if="loginError" class="error-text">{{ loginError }}</div>
          </div>
          <div class="form-group">
            <div class="input-with-cancel">
              <input
                  type="password"
                  id="password"
                  v-model="formData.password"
                  placeholder="Введите новый пароль"
                  @input="validatePassword"
                  :class="{ 'error': passwordError }"
              />
              <button type="button" class="cancel-field-button" @click="resetField('password')" title="Отменить изменения">
                <span v-html="icons.back"></span>
              </button>
            </div>
            <label class="field-label">Пароль</label>
            <div v-if="passwordError" class="error-text">{{ passwordError }}</div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script>
import axios from "axios";
import { icons } from "@/components/icons/icons.js";

export default {
  data() {
    return {
      icons,
      notificationMessage: '',
      nameError: '',
      nicknameError: '',
      loginError: '',
      passwordError: '',
      formData: {
        name: "",
        nickname: "",
        login: "",
        password: "",
        birthdate: "",
        city: "",
        photo: null,
      },
      originalData: {},
      role: "",
      photoPreview: null,
      isEditing: false,
      defaultPhoto: "https://i.pinimg.com/736x/ad/70/4c/ad704c241e99a387945b40a7dce6e55d.jpg",
      showNotification: false,
      notificationTimeout: null
    };
  },
  methods: {
    validateName() {
      if (!/^[А-Яа-яA-Za-z\s-]{2,50}$/.test(this.formData.name)) {
        this.nameError = "Только буквы, пробелы и дефисы, 2-50 символов";
      } else {
        this.nameError = '';
      }
    },

    validateNickname() {
      const nickname = this.formData.nickname.startsWith('@')
          ? this.formData.nickname.substring(1)
          : this.formData.nickname;

      if (nickname.length < 3 || nickname.length > 20) {
        this.nicknameError = "Должно быть 3-20 символов (без @)";
      } else if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
        this.nicknameError = "Только буквы, цифры и _";
      } else {
        this.nicknameError = '';
      }
    },

    validateLogin() {
      if (this.formData.login.length < 3 || this.formData.login.length > 20) {
        this.loginError = "Должно быть 3-20 символов";
      } else if (!/^[a-zA-Z0-9_@.]+$/.test(this.formData.login)) {
        this.loginError = "Только буквы, цифры и _@.";
      } else {
        this.loginError = '';
      }
    },

    validatePassword() {
      if (this.formData.password &&
          (this.formData.password.length < 8 || this.formData.password.length > 30)) {
        this.passwordError = "Должно быть 8-30 символов";
      } else if (this.formData.password &&
          !/^[a-zA-Z0-9!@#$%^&*()_+]+$/.test(this.formData.password)) {
        this.passwordError = "Только буквы, цифры и !@#$%^&*()_+";
      } else {
        this.passwordError = '';
      }
    },

    async fetchProfile() {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          this.showNotificationMessage("Требуется авторизация", 'error');
          return;
        }

        const response = await axios.get("https://auth-service-gkie.onrender.com/api/auth/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });

        this.formData = {
          name: response.data.name || "",
          nickname: response.data.nickname || "",
          login: response.data.login || response.data.username || "",
          password: "", // Пароль никогда не сохраняем из ответа
          photo: response.data.photo || null,
        };

        this.originalData = {
          ...this.formData,
          password: "" // Явно обнуляем пароль в оригинальных данных
        };

        this.role = response.data.role || "";

        // Обработка фото
        if (response.data.photo) {
          this.photoPreview = response.data.photo.startsWith('http')
              ? response.data.photo
              : `https://auth-service-gkie.onrender.com${response.data.photo}`;
        } else {
          this.photoPreview = null;
        }

      } catch (error) {
        console.error("Ошибка загрузки профиля:", error);

        let errorMessage = "Ошибка загрузки профиля";
        if (error.response) {
          if (error.response.status === 401) {
            errorMessage = "Требуется авторизация";
          } else if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          }
        }

        this.showNotificationMessage(errorMessage, 'error');

        if (error.response?.status === 401) {
          localStorage.removeItem("authToken");
          this.$router.push("/login");
        }
      }
    },

    handlePhotoUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.formData.photo = file;
        this.photoPreview = URL.createObjectURL(file);
      }
    },

    resetField(fieldName) {
      if (fieldName === 'nickname' && this.originalData.nickname) {
        // Убираем @ при сбросе поля
        this.formData.nickname = this.originalData.nickname.startsWith('@')
            ? this.originalData.nickname.substring(1)
            : this.originalData.nickname;
      } else {
        this.formData[fieldName] = this.originalData[fieldName];
      }

      if (fieldName === 'photo') {
        this.photoPreview = this.originalData.photo
            ? `https://auth-service-gkie.onrender.com${this.originalData.photo}`
            : null;
      }
    },

    async updateProfile() {
      try {
        // Валидация данных перед отправкой
        if (!/^[А-Яа-яA-Za-z\s-]{2,50}$/.test(this.formData.name)) {
          this.showNotificationMessage("Имя должно содержать только буквы, пробелы и дефисы, от 2 до 50 символов", 'error');
          return;
        }

        // Обработка никнейма
        let nickname = this.formData.nickname;
        if (nickname) {
          nickname = nickname.startsWith('@') ? nickname.substring(1) : nickname;
          if (nickname.length < 3 || nickname.length > 20) {
            this.showNotificationMessage("Никнейм должен быть от 3 до 20 символов (без @)", 'error');
            return;
          }
          if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
            this.showNotificationMessage("Никнейм может содержать только буквы, цифры и _", 'error');
            return;
          }
          this.formData.nickname = `@${nickname}`;
        }

        // Валидация логина
        if (this.formData.login.length < 3 || this.formData.login.length > 20) {
          this.showNotificationMessage("Логин должен быть от 3 до 20 символов", 'error');
          return;
        }

        // Валидация пароля
        if (this.formData.password && this.formData.password !== this.originalData.password) {
          if (this.formData.password.length < 8) {
            this.showNotificationMessage("Пароль должен быть не менее 8 символов", 'error');
            return;
          }
        }

        // Формируем FormData
        const formData = new FormData();
        const updates = {
          currentLogin: this.originalData.login // Текущий логин для идентификации
        };

        // Добавляем только измененные поля
        if (this.formData.name !== this.originalData.name) updates.name = this.formData.name;
        if (this.formData.nickname !== this.originalData.nickname) updates.nickname = this.formData.nickname;
        if (this.formData.login !== this.originalData.login) updates.newLogin = this.formData.login;
        if (this.formData.password && this.formData.password !== this.originalData.password) {
          updates.password = this.formData.password;
        }

        formData.append('updates', JSON.stringify(updates));

        // Добавляем фото если есть
        if (this.formData.photo instanceof File) {
          if (this.formData.photo.size > 2 * 1024 * 1024) {
            this.showNotificationMessage("Размер файла не должен превышать 2MB", 'error');
            return;
          }
          formData.append('photo', this.formData.photo);
        }

        // Отправка запроса
        const response = await axios.put("/auth/profile/update", formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        // Обработка ответа
        if (response.data.message === "Профиль успешно обновлен") {
          this.isEditing = false;
          this.originalData = {...this.formData};
          await this.fetchProfile();
          this.showNotificationMessage(response.data.message, 'success');

          // Если изменился логин, обновляем токен
          if (response.data.newToken) {
            localStorage.setItem("authToken", response.data.newToken);
          }
        }

      } catch (error) {
        console.error('Update error:', error);

        if (error.response) {
          const errorData = error.response.data;
          let errorMessage = "Ошибка при обновлении профиля";

          if (errorData.error) {
            errorMessage = errorData.error;
            if (errorData.field === 'login') this.loginError = errorMessage;
            if (errorData.field === 'nickname') this.nicknameError = errorMessage;
          }

          this.showNotificationMessage(errorMessage, 'error');
        } else {
          this.showNotificationMessage("Ошибка сети. Проверьте соединение.", 'error');
        }
      }
    },

    toggleEditMode() {
      this.isEditing = !this.isEditing;
      if (this.isEditing && this.formData.nickname) {
        // Убираем @ при входе в режим редактирования
        this.formData.nickname = this.formData.nickname.startsWith('@')
            ? this.formData.nickname.substring(1)
            : this.formData.nickname;
      }
    },

    copyNickname() {
      if (!this.formData.nickname) return;

      navigator.clipboard.writeText(this.formData.nickname)
          .then(() => {
            this.showNotificationMessage("Никнейм скопирован!", 'success');
          })
          .catch(err => {
            console.error("Не удалось скопировать никнейм: ", err);
            const textarea = document.createElement('textarea');
            textarea.value = this.formData.nickname;
            document.body.appendChild(textarea);
            textarea.select();
            try {
              document.execCommand('copy');
              this.showNotificationMessage("Никнейм скопирован!", 'success');
            } catch (e) {
              console.error("Не удалось скопировать никнейм: ", e);
              this.showNotificationMessage("Не удалось скопировать никнейм", 'error');
            }
            document.body.removeChild(textarea);
          });
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.showNotification = true;

      if (this.notificationTimeout) {
        clearTimeout(this.notificationTimeout);
      }

      this.notificationTimeout = setTimeout(() => {
        this.showNotification = false;
      }, 3000);
    }
  },
  async mounted() {
    if (!localStorage.getItem("authToken")) {
      this.$router.push("/login");
      return;
    }

    await this.fetchProfile();

    setTimeout(() => {
      console.log("Проверка данных через 1 секунду:", {
        formData: this.formData,
        originalData: this.originalData,
        localStorage: localStorage.getItem("userData")
      });
    }, 1000);
  }
};
</script>

<style scoped>
.profile-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 300px;
  color: black;
  font-family: 'Montserrat', sans-serif;
}

.notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #4CAF50;
  color: white;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  animation: fadeInOut 3s ease-in-out;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  10% { opacity: 1; transform: translateX(-50%) translateY(0); }
  90% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
}

.profile-info {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.profile-photo {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid #ddd;
  cursor: pointer;
}

.view-mode .user-details {
  margin-top: 10px;
  width: 100%;
}

.view-mode .form-group {
  margin-bottom: 5px;
}

.view-mode .text-display {
  text-align: center;
  margin: 3px 0;
  font-size: 16px;
  line-height: 1.3;
}

.edit-mode .form-group {
  margin-bottom: 1px;
}

.edit-mode .field-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #3307a3;
  font-weight: 500;
}

.edit-mode .input-with-cancel {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.edit-mode input[type="text"],
.edit-mode input[type="password"],
.edit-mode input[type="date"] {
  width: 100%;
  padding: 8px 35px 8px 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #f9f9f9;
  font-size: 14px;
}

.edit-mode .cancel-field-button {
  position: absolute;
  right: 5px;
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  padding: 5px;
}

.cancel-field-button:hover {
  color: #ff4444;
}

.edit-toggle-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.3s ease;
  z-index: 10;
}

.photo-section {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.nickname {
  color: #2575fc;
  cursor: pointer;
  text-decoration: none;
}

.nickname:hover {
  color: #6a11cb;
}

.photo-upload-label {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.edit-toggle-button:hover {
  background-color: #6a11cb;
}

.photo-wrapper {
  position: relative;
  display: inline-block;
  width: 150px;
  height: 150px;
}

.profile-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(128, 128, 128, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plus-sign {
  font-size: 72px;
  color: white;
  font-weight: 300;
  line-height: 1;
  pointer-events: none;
}

.error-text {
  color: #ff3860;
  font-size: 12px;
  margin-top: 4px;
  text-align: left;
}
</style>