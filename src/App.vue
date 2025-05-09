<template>
  <div id="app">
    <div v-if="showLayout" class="layout">
      <nav v-if="showSidebar" class="sidebar">
        <!-- Главный интерфейс -> Геймификация и Профиль -->
        <router-link to="/home" class="icon-link" title="Главный интерфейс" v-html="icons.home"></router-link>

        <!-- Мессенджер -->
        <router-link to="/messenger" class="icon-link" title="Мессенджер" v-html="icons.messenger"></router-link>

        <!-- Календарь -->
        <router-link to="/planer" class="icon-link" title="Календарь" v-html="icons.calendar"></router-link>

        <!-- Kanban-доска -->
        <router-link to="/kanbanBoard" class="icon-link" title="Kanban-доска" v-html="icons.kanban"></router-link>

        <!-- Проект -->
        <router-link to="/project" class="icon-link" title="Интерфейс для проекта" v-html="icons.admin"></router-link>

        <!-- Аналитика -->
        <router-link to="/analytics" class="icon-link" title="Геймификация и аналитика" v-html="icons.analytics"></router-link>

        <!-- Выход из аккаунта -->
        <a href="#" class="icon-link" title="Выход из аккаунта" @click.prevent="logout" v-html="icons.exit"></a>
      </nav>
      <main class="content">
        <router-view></router-view>
      </main>
    </div>
    <router-view v-else></router-view>
  </div>
</template>

<script>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { icons } from "./components/icons/icons.js";

export default {
  name: "App",
  setup() {
    const route = useRoute();
    const router = useRouter();

    const logout = () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userChats');
      localStorage.clear();
      sessionStorage.clear();

      router.push('/');
    };

    const showLayout = computed(() => {
      const hiddenRoutes = ["/", "/login", "/register"];
      return !hiddenRoutes.includes(route.path);
    });

    return {
      showLayout,
      showSidebar: true,
      icons,
      logout
    };
  },
};
</script>

<style>
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
}

.layout {
  display: flex;
  flex: 1;
  height: 100vh;
}

.sidebar {
  width: 100px;
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
}

.icon-link {
  color: white;
  font-size: 24px;
  margin: 20px 10px 20px 30px;
  text-decoration: none;
  display: flex;
  align-items: center;
  width: 100%;
  height: 50px;
}

.icon-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.content {
  flex: 1;
  padding: 20px;
  overflow: auto;
  background-color: #F1F1F1;
  border-radius: 30px 0 0 30px;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 60px;
}

.icon-link svg {
  width: 36px;
  height: 36px;
}
</style>