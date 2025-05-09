<template>
  <div class="login-page">
    <div class="login-container">
      <h2>Вход</h2>
      <form @submit.prevent="loginin" class="login-form">
        <input v-model="login" type="text" placeholder="Имя пользователя" required class="input-field"/>
        <input v-model="password" type="password" placeholder="Пароль" required class="input-field"/>
        <button type="submit" class="submit-btn">Войти</button>
        <p v-if="error" class="error-message">{{ error }}</p>
      </form>
      <router-link to="/register" class="register-link">Зарегистрироваться</router-link>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      login: "",
      password: "",
      error: ""
    };
  },
  methods: {
    async loginin() {
      this.error = "";

      if (!this.login || !this.password) {
        this.error = "Пожалуйста, заполните все поля.";
        return;
      }

      if (this.password.length < 8) {
        this.error = "Пароль должен быть не менее 8 символов.";
        return;
      }

      try {

        const response = await axios.post("https://auth-service-gkie.onrender.com/api/auth/login", {
          login: this.login,
          password: this.password
        });

        if (response.data.token && response.data.user) {
          localStorage.setItem("authToken", response.data.token);
          localStorage.setItem("userId", response.data.user.id);
          localStorage.setItem("userLogin", response.data.user.login);
          localStorage.setItem("userData", JSON.stringify(response.data.user));

          this.$root.username = response.data.user.login || response.data.user.name || "User";

          this.$router.push("/home");
        } else {
          throw new Error("Неполные данные пользователя в ответе сервера");
        }
      } catch (err) {
        console.error("Ошибка входа:", err);
        this.error = err.response?.data?.message || "Ошибка авторизации";
      }
    },
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');

.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  background-size: cover;
  padding: 20px;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  font-family: 'Montserrat', sans-serif;
}

.login-container {
  max-width: 360px;
  width: 100%;
  padding: 30px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

h2 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: 700;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.input-field {
  padding: 12px;
  margin-bottom: 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.3s;
  font-family: 'Montserrat', sans-serif;
}

.input-field:focus {
  border-color: #6a11cb;
  outline: none;
}

.submit-btn {
  background-color: #6a11cb;
  color: white;
  padding: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
  font-family: 'Montserrat', sans-serif;
}

.submit-btn:hover {
  background-color: #2575fc;
}

.error-message {
  color: #ff3860;
  text-align: center;
  margin-top: 10px;
  font-family: 'Montserrat', sans-serif;
}

.register-link {
  display: block;
  text-align: center;
  margin-top: 20px;
  color: #6a11cb;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
  font-family: 'Montserrat', sans-serif;
}

.register-link:hover {
  color: #2575fc;
  background: none;
}
</style>