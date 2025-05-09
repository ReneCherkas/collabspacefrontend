<template>
  <div class="login-page">
    <div class="login-container">
      <h2>Регистрация</h2>
      <form @submit.prevent="register" class="login-form">
        <input v-model="name" type="text" placeholder="Имя" required class="input-field"/>
        <input v-model="login" type="text" placeholder="Логин" required class="input-field"/>
        <input v-model="password" type="password" placeholder="Пароль" required class="input-field"/>
        <button type="submit" class="submit-btn">Зарегистрироваться</button>
        <p v-if="error" class="error-message">{{ error }}</p>
      </form>
      <router-link to="/" class="register-link">Обратно</router-link>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      name: "",
      login: "",
      password: "",
      error: ""
    };
  },
  methods: {
    async register() {
      this.error = "";

      if (!this.login || !this.password) {
        this.error = "Пожалуйста, заполните все поля.";
        return;
      }

      if (!/^[А-Яа-яA-Za-z\s-]{2,50}$/.test(this.name)) {
        this.error = "Имя должно содержать только буквы, пробелы и дефисы, от 2 до 50 символов";
        return;
      }

      if (this.password.length < 8) {
        this.error = "Пароль должен быть не менее 8 символов.";
        return;
      }

      const loginRegex = /^[a-zA-Z0-9_@.]+$/;
      if (!loginRegex.test(this.login)) {
        this.error = "Логин может содержать только буквы, цифры и символы _ @ .";
        return;
      }

      const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+]+$/;
      if (!passwordRegex.test(this.password)) {
        this.error = "Пароль может содержать только буквы, цифры и символы !@#$%^&*()_+.";
        return;
      }

      try {
        const response = await axios.post("http://localhost:8081/api/auth/register", {
          name: this.name,
          login: this.login,
          password: this.password,
        });
        this.$router.push("/");
      } catch (err) {
        if (err.response && err.response.data && err.response.data.error) {
          this.error = err.response.data.error;
        } else {
          this.error = "Произошла ошибка при регистрации. Пожалуйста, попробуйте снова.";
        }
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