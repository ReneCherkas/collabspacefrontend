import './assets/main.css'

import axios from "axios";
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

createApp(App)
    .use(router)
    .mount("#app");

axios.defaults.baseURL = "https://auth-service-gkie.onrender.com/api";