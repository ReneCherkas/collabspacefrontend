import { createRouter, createWebHistory } from "vue-router";
import Login from "@/views/Auth/Login.vue";
import Register from "@/views/Auth/Register.vue";
import Chat from "@/views/Chat.vue";
import Profile from "@/views/Home/Profile.vue";
import KanbanBoard from "@/views/Kanban/KanbanBoard.vue";
import Home from "@/views/Home/Home.vue";
import Project from "@/views/Project.vue";
import CalendarMonth from "@/views/Planer/Planer.vue";
import Analytics from "@/views/Analytics.vue";

const routes = [
    { path: "/", component: Login },
    { path: "/register", component: Register },
    { path: "/messenger", component: Chat },
    { path: "/profile", component: Profile},
    { path: "/kanbanBoard", component: KanbanBoard},
    { path: "/planer", component: CalendarMonth},
    { path: "/home", component: Home},
    { path: "/project", component: Project},
    { path: "/analytics", component: Analytics}
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;


