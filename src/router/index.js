import { createRouter, createWebHistory } from "vue-router";
import Login from "@/views/Login.vue";
import Register from "@/views/Register.vue";
import Chat from "@/components/Chat.vue";
import Profile from "@/components/Profile.vue";
import KanbanBoard from "@/components/KanbanBoard.vue";
import TaskForm from "@/components/TaskForm.vue";
import Planer from "@/views/Planer.vue";

const routes = [
    { path: "/", component: Login },
    { path: "/register", component: Register },
    { path: "/messenger", component: Chat },
    { path: "/profile", component: Profile},
    { path: "/kanbanBoard", component: KanbanBoard},
    { path: "/taskForm", component: TaskForm},
    { path: "/planer", component: Planer}
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;


