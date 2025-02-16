<template>
  <div class="profile-container">
    <router-link to="/" class="icon-link" title="Стартовая страница">
      ↩️
    </router-link>
    <form @submit.prevent="updateProfile">
      <div class="profile-info">
        <div class="photo-section">
          <label for="profilePhoto" class="photo-upload-label">
            <img :src="photoPreview || formData.photo || defaultPhoto" alt="Фото профиля" class="profile-photo" />
          </label>
          <input
              type="file"
              id="profilePhoto"
              @change="handlePhotoUpload"
              :disabled="!isEditing"
              style="display: none;"
          />
        </div>
        <div class="user-details">
          <div class="form-group">
            <div v-if="!isEditing" class="text-display">{{ formData.name || 'Добавьте ФИО' }}</div>
            <input
                v-else
                type="text"
                id="name"
                v-model="formData.name"
                placeholder="Введите ФИО"
            />
          </div>
          <div class="form-group">
            <div v-if="!isEditing" class="text-display">{{ formData.nickname || 'Не указан' }}</div>
            <input
                v-else
                type="text"
                id="nickname"
                v-model="formData.nickname"
                placeholder="Введите никнейм"
            />
          </div>
          <div class="form-group">
            <p class="text-display">{{ role }}</p>
<!--            <p class="role-display">{{ role }}</p>-->
          </div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-row">
          <div class="form-group">
            <label for="login">Логин:</label>
            <input
                type="text"
                id="login"
                v-model="formData.login"
                placeholder="Введите логин"
                :disabled="!isEditing"
            />
          </div>
          <div class="form-group">
            <label for="password">Пароль:</label>
            <input
                type="password"
                id="password"
                v-model="formData.password"
                placeholder="Введите новый пароль"
                :disabled="!isEditing"
            />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="birthdate">Дата рождения:</label>
            <input
                type="date"
                id="birthdate"
                v-model="formData.birthdate"
                :disabled="!isEditing"
            />
          </div>
          <div class="form-group">
            <label for="city">Город:</label>
            <input
                type="text"
                id="city"
                v-model="formData.city"
                placeholder="Введите город"
                :disabled="!isEditing"
            />
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button
            type="submit"
            class="save-button"
            :disabled="!isEditing"
        >
          Сохранить изменения
        </button>
        <button
            type="button"
            class="cancel-button"
            @click="resetForm"
            :disabled="!isEditing"
        >
          Отмена
        </button>
      </div>
    </form>

    <button
        class="edit-toggle-button"
        @click="toggleEditMode"
    >
      {{ isEditing ? "Завершить редактирование" : "Редактировать профиль" }}
    </button>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
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
    };
  },
  methods: {
    async fetchProfile() {
      try {
        const token = localStorage.getItem("token");
        console.log("📡 Отправка запроса на профиль с токеном:", token);
        try {
          const response = await axios.get("/auth/profile", {
            headers: { Authorization: `Bearer ${token}` }
          });
          this.profileData = response.data;
        } catch (error) {
          console.error("❌ Ошибка загрузки профиля", error);
        }

        if (!token) {
          console.error("Токен отсутствует!");
          return;
        }

        const response = await axios.get("http://localhost:8081/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Полученные данные профиля:", response.data);

        this.formData = {
          name: response.data.name || "",
          nickname: response.data.nickname || "",
          login: response.data.username || "",
          password: "",
          birthdate: response.data.birthdate || "",
          city: response.data.city || "",
          photo: response.data.photo || null,
        };
        this.originalData = { ...this.formData };
        this.role = response.data.role || "";

        if (response.data.photo) {
          this.photoPreview = `http://localhost:8081${response.data.photo}`;
          console.log("Фото профиля:", response.data.photo);
        }
      } catch (error) {
        console.error("Ошибка загрузки профиля", error);
      }
    },
    handlePhotoUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.formData.photo = file;
        this.photoPreview = URL.createObjectURL(file);
      }
    },
    async updateProfile() {
      try {
        const changedData = {};
        for (const key in this.formData) {
          if (this.formData[key] !== this.originalData[key]) {
            changedData[key] = this.formData[key];
          }
        }

        if (Object.keys(changedData).length > 0) {
          const formData = new FormData();
          formData.append("login", this.originalData.login);

          for (const key in changedData) {
            if (key === "photo" && this.formData.photo instanceof File) {
              formData.append("photo", this.formData.photo);
            } else {
              formData.append(key, changedData[key]);
            }
          }

          const response = await axios.put("/auth/profile/update", formData, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "multipart/form-data",
            },
          });

          console.log("Данные профиля обновлены:", response.data);
          alert("Профиль успешно обновлен");
          this.isEditing = false;
          this.originalData = { ...this.formData };

          this.fetchProfile();
        }
      } catch (error) {
        console.error("Ошибка обновления профиля", error);

        if (error.response) {
          alert("Ошибка обновления профиля: " + (error.response.data || "Неизвестная ошибка"));
        }
      }
    },
    toggleEditMode() {
      this.isEditing = !this.isEditing;
    },
  },
  async mounted() {
    await this.fetchProfile();
  },
};
</script>

<style scoped>
.icon-link {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 24px;
  color: #333;
  text-decoration: none;
}

.icon-link:hover {
  color: #007bff;
}

.profile-container {
  color: black;
  font-family: Arial, sans-serif;
}

.profile-info {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.photo-section {
  margin-right: 20px;
  position: relative;
}

.profile-photo {
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid #ddd;
  cursor: pointer;
}

.photo-upload-label {
  cursor: pointer;
  display: block;
}

.form-grid {
  display: flex;
  flex-direction: column;
}

.form-row {
  display: flex;
  justify-content: space-between;
}

.form-group {
  flex: 1;
  margin: 10px;
}

.role-display {
  color: #4e42d8;
  padding: 10px;
}

.edit-toggle-button {
  display: block;
  margin: 20px auto;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.edit-toggle-button:hover {
  background-color: #0056b3;
}

input[type="text"],
input[type="password"],
input[type="date"] {
  width: 100%;
  padding: 12px 15px;
  margin: 8px 0;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-sizing: border-box;
  background-color: #f9f9f9;
  transition: all 0.3s ease;
  font-size: 16px;
}

input[type="text"]:focus,
input[type="password"]:focus,
input[type="date"]:focus {
  border-color: #4e42d8;
  background-color: #fff;
  outline: none;
  box-shadow: 0 0 8px rgba(78, 66, 216, 0.5);
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.form-group {
  margin-bottom: 15px;
}

.save-button, .cancel-button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.save-button {
  background-color: #4e42d8;
  color: white;
}

.save-button:hover {
  background-color: #372ea3;
}

.cancel-button {
  background-color: #ccc;
  color: black;
  margin-left: 10px;
}

.cancel-button:hover {
  background-color: #999;
}

.text-display {
  background-color: #f9f9f9;
  color: #333;
  font-size: 16px;
}

</style>