<template>
  <div id="app">
    <div v-if="showLayout" class="layout">
      <nav v-if="showSidebar" class="sidebar">
        <router-link to="/messenger" class="icon-link" title="Чат">
          <img src="https://icons8.ru/icon/Z8pPm6xPETVy/чат" alt="Chat" width="24" height="24">
        </router-link>
        <router-link to="/profile" class="icon-link" title="Профиль">
          <img src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/svgs/solid/user.svg" alt="Profile" width="24" height="24">
        </router-link>
        <router-link to="/planer" class="icon-link" title="Планер">
          <img src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/svgs/solid/user.svg" alt="Profile" width="24" height="24">
        </router-link>
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
import { useRoute } from "vue-router";

export default {
  name: "App",
  setup() {
    const route = useRoute();

    const showLayout = computed(() => {
      const hiddenRoutes = ["/", "/login", "/register"];
      return !hiddenRoutes.includes(route.path);
    });

    const showSidebar = computed(() => {
      const hiddenRoutes = ["/", "/login", "/register"];
      return !hiddenRoutes.includes(route.path);
    });

    return {
      showLayout,
      showSidebar,
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
  margin: 20px 10px;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: left;
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
  background-color: #f9f9f9;
  border-radius: 30px;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 60px;
}
</style>