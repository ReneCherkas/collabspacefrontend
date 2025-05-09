<template>
  <div class="container">
    <div class="header">
      <button @click="openModal" class="add-button">Добавить проект</button>

      <select v-model="selectedProject" @change="fetchProjectDetails" class="project-select">
        <option disabled value="">Выберите проект</option>
        <option v-for="project in projects" :key="project.id" :value="project.id">
          {{ project.title }}
        </option>
      </select>
    </div>

    <div v-if="selectedProjectData">
      <div class="project-banner">
        <div v-if="!isEditing">
          <h2>{{ selectedProjectData.title }}</h2>
          <button
              v-if="isAdmin"
              @click="startEditing"
              class="edit-icon-button"
              title="Редактировать проект">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
        <div v-else class="edit-form">
          <input v-model="editProjectData.title" class="edit-input" />
          <button @click="deleteProject" class="delete-button">Удалить проект</button>
          <button @click="saveProjectChanges" class="save-button">Сохранить</button>
          <button @click="isEditing = false" class="cancel-button">Отмена</button>
        </div>
      </div>

      <div class="project-description">
        <p class="description-label">Описание:</p>
        <span v-if="!isEditing" class="description-text">{{ selectedProjectData.description }}</span>
        <textarea v-else v-model="editProjectData.description" class="edit-textarea"></textarea>
      </div>

      <div class="team-section">
        <div class="team-block">
          <h3>Админы:</h3>
          <ul>
            <li v-for="admin in selectedProjectData.admins" :key="admin.id">
              <div class="user-card">
                <img :src="admin.avatar || getDefaultAvatar(admin.name)"
                     class="user-avatar"
                     :alt="admin.name" />
                <div class="user-info">
                  <span class="user-name">{{ admin.name }}</span>
                </div>
                <button v-if="isEditing && isAdmin && admin.id !== currentUser.id"
                        @click="removeUserFromProject(admin.id)"
                        class="remove-user-button">
                  ×
                </button>
              </div>
            </li>
            <li v-if="isEditing">
              <div class="add-user-container">
                <input type="text"
                       v-model="adminSearchQuery"
                       @input="searchUsers('admins')"
                       placeholder="Поиск администраторов"
                       class="add-user-input" />
                <ul v-if="adminSearchResults.length > 0" class="user-search-results">
                  <li v-for="user in adminSearchResults"
                      :key="user.id"
                      @click="addUserToProject(user, 'admins')">
                    <img :src="user.avatar || getDefaultAvatar(user.name)" class="user-avatar-small" />
                    {{ user.name }}
                  </li>
                </ul>
              </div>
            </li>
          </ul>
        </div>
        <div class="team-block">
          <h3>Участники:</h3>
          <ul>
            <li v-for="member in selectedProjectData.teamMembers" :key="member.id">
              <div class="user-card">
                <img :src="member.avatar || getDefaultAvatar(member.name)"
                     class="user-avatar"
                     :alt="member.name" />
                <div class="user-info">
                  <span class="user-name">{{ member.name }}</span>
                </div>
                <button v-if="isEditing && isAdmin"
                        @click="removeUserFromProject(member.id)"
                        class="remove-user-button">
                  ×
                </button>
              </div>
            </li>
            <li v-if="isEditing">
              <div class="add-user-container">
                <input type="text"
                       v-model="memberSearchQuery"
                       @input="searchUsers('teamMembers')"
                       placeholder="Поиск участников"
                       class="add-user-input" />
                <ul v-if="memberSearchResults.length > 0" class="user-search-results">
                  <li v-for="user in memberSearchResults"
                      :key="user.id"
                      @click="addUserToProject(user, 'teamMembers')">
                    <img :src="user.avatar || getDefaultAvatar(user.name)" class="user-avatar-small" />
                    {{ user.name }}
                  </li>
                </ul>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal-overlay">
      <div class="modal-content">
        <h2>Создать проект</h2>

        <div class="input-field">
          <label>Название проекта</label>
          <input v-model="newProject.title" placeholder="Введите название" />
        </div>

        <div class="input-field">
          <label>Описание проекта</label>
          <textarea v-model="newProject.description" placeholder="Введите описание"></textarea>
        </div>

        <div class="input-field">
          <label>Добавить администраторов</label>
          <div class="user-search-container">
            <input
                type="text"
                v-model="adminSearchQuery"
                placeholder="Введите имя или ник"
                @input="searchUsers('admins')"
                class="search-input"
            />
            <div class="selected-users">
              <div v-for="user in newProject.admins" :key="user.id" class="selected-user">
                <img :src="user.avatar || getDefaultAvatar(user.name)" class="user-avatar-small" />
                <span>{{ user.name }}</span>
                <button @click="removeUser(user, 'admins')" class="remove-user-btn">×</button>
              </div>
            </div>
            <ul v-if="adminSearchResults.length > 0" class="user-search-results">
              <li v-for="user in adminSearchResults" :key="user.id" @click="addUser(user, 'admins')">
                <img :src="user.avatar || getDefaultAvatar(user.name)" class="user-avatar-small" />
                {{ user.name }}
              </li>
            </ul>
          </div>
        </div>

        <div class="input-field">
          <label>Добавить участников</label>
          <div class="user-search-container">
            <input
                type="text"
                v-model="memberSearchQuery"
                placeholder="Введите имя или ник"
                @input="searchUsers('teamMembers')"
                class="search-input"
            />
            <div class="selected-users">
              <div v-for="user in newProject.teamMembers" :key="user.id" class="selected-user">
                <img :src="user.avatar || getDefaultAvatar(user.name)" class="user-avatar-small" />
                <span>{{ user.name }}</span>
                <button @click="removeUser(user, 'teamMembers')" class="remove-user-btn">×</button>
              </div>
            </div>
            <ul v-if="memberSearchResults.length > 0" class="user-search-results">
              <li v-for="user in memberSearchResults" :key="user.id" @click="addUser(user, 'teamMembers')">
                <img :src="user.avatar || getDefaultAvatar(user.name)" class="user-avatar-small" />
                {{ user.name }}
              </li>
            </ul>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeModal" class="cancel-button">Отмена</button>
          <button @click="addProject" class="save-button">Создать</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from "vue";
import axios from "axios";

export default {
  setup() {
    const projects = ref([]);
    const selectedProject = ref(null);
    const selectedProjectData = ref(null);
    const isModalOpen = ref(false);
    const currentUser = ref({
      id: localStorage.getItem("userId"),
      name: localStorage.getItem("userName"),
      avatar: localStorage.getItem("userAvatar")
    });
    const isEditing = ref(false);
    const editProjectData = ref({
      title: "",
      description: ""
    });

    const newProject = ref({
      title: "",
      description: "",
      admins: [],
      teamMembers: []
    });

    const adminSearchQuery = ref("");
    const memberSearchQuery = ref("");
    const adminSearchResults = ref([]);
    const memberSearchResults = ref([]);

    const searchUsers = async (type) => {
      const query = type === 'admins' ? adminSearchQuery.value : memberSearchQuery.value;

      if (query.trim().length < 2) {
        if (type === 'admins') adminSearchResults.value = [];
        else memberSearchResults.value = [];
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(
            `http://localhost:8086/api/chat/search-users?query=${encodeURIComponent(query)}`,
            {headers: {'Authorization': `Bearer ${token}`}}
        );

        const users = response.data.map(user => ({
          id: user.id,
          name: user.displayName || user.login,
          avatar: user.photoPath ? `http://localhost:8081${user.photoPath}` : null
        }));

        const filteredUsers = users.filter(user => {
          if (type === 'admins') {
            return !newProject.value.admins.some(u => u.id === user.id);
          } else {
            return !newProject.value.teamMembers.some(u => u.id === user.id) &&
                !newProject.value.admins.some(u => u.id === user.id);
          }
        });

        if (type === 'admins') {
          adminSearchResults.value = filteredUsers;
        } else {
          memberSearchResults.value = filteredUsers;
        }
      } catch (error) {
        console.error("Ошибка при поиске пользователей:", error);
        if (type === 'admins') {
          adminSearchResults.value = [];
        } else {
          memberSearchResults.value = [];
        }
      }
    };

    const addUser = (user, type) => {
      if (type === 'admins') {
        if (!newProject.value.admins.some(u => u.id === user.id)) {
          newProject.value.admins.push(user);
        }
        adminSearchQuery.value = "";
        adminSearchResults.value = [];
      } else {
        if (!newProject.value.teamMembers.some(u => u.id === user.id) &&
            !newProject.value.admins.some(u => u.id === user.id)) {
          newProject.value.teamMembers.push(user);
        }
        memberSearchQuery.value = "";
        memberSearchResults.value = [];
      }
    };

    const removeUser = (user, type) => {
      if (type === 'admins') {
        if (user.id === currentUser.value.id) return;
        newProject.value.admins = newProject.value.admins.filter(u => u.id !== user.id);
      } else {
        newProject.value.teamMembers = newProject.value.teamMembers.filter(u => u.id !== user.id);
      }
    };

    const getDefaultAvatar = (name) => {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=random`;
    };

    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');

        const response = await axios.get("http://localhost:8084/api/projects/user", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-User-Id': userId
          }
        });
        projects.value = response.data;
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    const fetchProjectDetails = async () => {
      if (!selectedProject.value) return;

      try {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        const response = await axios.get(
            `http://localhost:8084/api/projects/${selectedProject.value}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-User-Id': userId
              }
            }
        );

        selectedProjectData.value = {
          title: response.data.title,
          description: response.data.description,
          admins: response.data.admins,
          teamMembers: response.data.teamMembers
        };
      } catch (error) {
        console.error("Error fetching project details:", error);
      }
    };

    const openModal = async () => {
      isModalOpen.value = true;
    };

    const closeModal = () => {
      isModalOpen.value = false;
      resetNewProject();
    };

    const resetNewProject = () => {
      newProject.value = {
        title: "",
        description: "",
        admins: [],
        teamMembers: []
      };
      adminSearchQuery.value = "";
      memberSearchQuery.value = "";
      adminSearchResults.value = [];
      memberSearchResults.value = [];
    };

    const addProject = async () => {
      try {
        if (!newProject.value.title.trim()) {
          throw new Error("Название проекта не может быть пустым");
        }

        const projectData = {
          title: newProject.value.title,
          description: newProject.value.description,
          adminIds: [
            currentUser.value.id,
            ...newProject.value.admins.map(user => user.id)
          ],
          teamMemberIds: newProject.value.teamMembers.map(user => user.id),
          creatorId: currentUser.value.id,
          login: localStorage.getItem("userLogin")
        };

        const token = localStorage.getItem('authToken');
        const response = await axios.post(
            "http://localhost:8084/api/projects",
            projectData,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (response.data) {
          closeModal();
          fetchProjects();
        }
      } catch (error) {
        console.error("Ошибка при добавлении проекта:", error);
        alert("Ошибка при создании проекта: " + (error.response?.data?.message || error.message));
      }
    };

    const startEditing = () => {
      if (!selectedProjectData.value) return;

      editProjectData.value = {
        title: selectedProjectData.value.title,
        description: selectedProjectData.value.description
      };
      isEditing.value = true;
    };

    const saveProjectChanges = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');

        const response = await axios.put(
            `http://localhost:8084/api/projects/${selectedProject.value}`,
            {
              title: editProjectData.value.title,
              description: editProjectData.value.description,
              adminIds: selectedProjectData.value.admins.map(admin => admin.id),
              teamMemberIds: selectedProjectData.value.teamMembers.map(member => member.id)
            },
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-User-Id': userId
              }
            }
        );

        if (response.data) {
          isEditing.value = false;
          fetchProjectDetails();
        }
      } catch (error) {
        console.error("Ошибка при обновлении проекта:", error);
        alert("Ошибка при обновлении проекта: " + (error.response?.data?.message || error.message));
      }
    };

    const removeUserFromProject = async (userId) => {
      const isSelf = userId.toString() === currentUser.value.id.toString();

      if (isSelf && !confirm("Вы уверены, что хотите покинуть этот проект? Вы больше не будете его видеть.")) {
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        await axios.delete(
            `http://localhost:8084/api/projects/${selectedProject.value}/users/${userId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-User-Id': currentUser.value.id
              }
            }
        );

        if (isSelf) {
          selectedProject.value = null;
          selectedProjectData.value = null;
        }

        fetchProjects();
      } catch (error) {
        console.error("Ошибка при удалении участника:", error);
        alert(error.response?.data?.message || error.message);
      }
    };

    const deleteProject = async () => {
      if (!confirm("Вы уверены, что хотите удалить этот проект?")) return;

      try {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');

        await axios.delete(
            `http://localhost:8084/api/projects/${selectedProject.value}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-User-Id': userId
              }
            }
        );

        selectedProject.value = null;
        selectedProjectData.value = null;
        fetchProjects();
      } catch (error) {
        console.error("Ошибка при удалении проекта:", error);
        alert("Ошибка при удалении проекта: " + (error.response?.data?.message || error.message));
      }
    };

    onMounted(() => {
      fetchProjects();
    });

    const addUserToProject = async (user, type) => {
      try {
        const token = localStorage.getItem('authToken');
        const currentUserId = localStorage.getItem('userId');

        if (!isAdmin.value) {
          throw new Error("Только администраторы могут добавлять пользователей");
        }

        await axios.post(
            `http://localhost:8084/api/projects/${selectedProject.value}/users/${user.id}`,
            { role: type },
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-User-Id': currentUserId
              }
            }
        );

        if (type === 'admins') {
          if (!selectedProjectData.value.admins.some(u => u.id === user.id)) {
            selectedProjectData.value.admins.push(user);
          }
          selectedProjectData.value.teamMembers = selectedProjectData.value.teamMembers
              .filter(member => member.id !== user.id);
        } else {
          if (!selectedProjectData.value.teamMembers.some(u => u.id === user.id) &&
              !selectedProjectData.value.admins.some(u => u.id === user.id)) {
            selectedProjectData.value.teamMembers.push(user);
          }
        }

        adminSearchQuery.value = "";
        memberSearchQuery.value = "";
        adminSearchResults.value = [];
        memberSearchResults.value = [];

      } catch (error) {
        console.error("Ошибка при добавлении пользователя:", error);
        alert("Ошибка при добавлении пользователя: " +
            (error.response?.data?.message || error.message || "Недостаточно прав"));
      }
    };

    const isMember = computed(() => {
      if (!selectedProjectData.value || !currentUser.value.id) return false;
      return selectedProjectData.value.teamMembers.some(member =>
          member.id.toString() === currentUser.value.id.toString()
      );
    });

    const isCreator = computed(() => {
      return selectedProjectData.value?.creatorId?.toString() === currentUser.value.id?.toString();
    });

    const isAdmin = computed(() => {
      return selectedProjectData.value?.admins?.some(admin =>
          admin.id.toString() === currentUser.value.id.toString()
      );
    });

    return {
      projects,
      selectedProject,
      selectedProjectData,
      isModalOpen,
      newProject,
      currentUser,
      adminSearchQuery,
      memberSearchQuery,
      adminSearchResults,
      memberSearchResults,
      isEditing,
      editProjectData,
      isAdmin,
      fetchProjectDetails,
      openModal,
      closeModal,
      addProject,
      searchUsers,
      addUser,
      removeUser,
      getDefaultAvatar,
      startEditing,
      saveProjectChanges,
      removeUserFromProject,
      deleteProject,
      addUserToProject
    };
  },
};
</script>

<style scoped>
.container {
  color: black;
}

.header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}

.add-button {
  background: #007bff;
  color: white;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: 0.3s;
}

.add-button:hover {
  background: #0056b3;
}

.project-select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
  min-width: 200px;
}

.project-banner {
  position: relative;
  margin-top: 20px;
  background: linear-gradient(45deg, #007bff, #00c6ff);
  color: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-description {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 10px;
  font-size: 1.1rem;
  color: #333;
  padding: 15px;
  background: white;
  border-radius: 6px;
  line-height: 1.5;
}

.description-label {
  margin: 0;
  white-space: nowrap;
}

.description-text {
  flex-grow: 1;
}

.edit-textarea {
  font-family: 'Montserrat', sans-serif;
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  min-height: 100px;
  font-size: 1rem;
  resize: vertical;
}

.team-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 10px;
}

.team-block {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.team-block h3 {
  font-size: 1.1rem;
  margin-bottom: 15px;
  color: #222;
  border-left: 4px solid #007bff;
  padding-left: 10px;
}

.team-block ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.team-block li {
  padding-bottom: 10px;
}

.team-block li:last-child {
  padding-bottom: 0;
}

.user-card {
  display: flex;
  align-items: center;
  border-radius: 10px;
  transition: background 0.2s ease;
  position: relative;
  padding: 8px;
}

.user-card:hover {
  background: #f5f5f5;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar-small {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}

.user-info {
  margin-left: 12px;
  flex-grow: 1;
}

.user-name {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.remove-user-button {
  background: none;
  border: none;
  color: #ff4444;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 5px;
  margin-left: auto;
}

.remove-user-button:hover {
  color: #cc0000;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 25px;
  border-radius: 10px;
  width: 500px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-content h2 {
  margin-bottom: 20px;
  font-size: 1.4rem;
  color: #333;
  text-align: center;
}

.input-field {
  font-family: 'Montserrat', sans-serif;
}

.input-field label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.input-field input,
.input-field textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.input-field textarea {
  min-height: 100px;
  resize: vertical;
}

.user-search-container {
  position: relative;
  margin-top: 10px;
}

.search-input {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 10px;
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

.user-search-results {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  position: absolute;
  width: 100%;
  background: white;
  z-index: 10;
}

.user-search-results li {
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-search-results li:hover {
  background-color: #f5f5f5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-button {
  background: #f44336;
  color: white;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.3s;
  border: none;
}

.cancel-button:hover {
  background: #d32f2f;
}

.save-button {
  background: #4caf50;
  color: white;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.3s;
  border: none;
}

.save-button:hover {
  background: #388e3c;
}

.delete-button {
  margin-left: 10px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: 0.2s;
}

.delete-button {
  background: #f44336;
  color: white;
}

.delete-button:hover {
  background: #d32f2f;
}

.edit-form {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  flex-wrap: wrap;
}

.edit-input {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  min-width: 200px;
}

.delete-button, .save-button, .cancel-button {
  margin-left: 10px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: 0.2s;
  white-space: nowrap;
}

.add-user-container {
  position: relative;
  margin-top: 10px;
}

.add-user-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.user-search-results {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  position: absolute;
  width: 100%;
  background: white;
  z-index: 10;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.user-search-results li {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-search-results li:hover {
  background-color: #f5f5f5;
}

.edit-icon-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.edit-icon-button svg {
  width: 30px;
  height: 30px;
  color: white;
}

</style>