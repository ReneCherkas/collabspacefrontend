<template>
  <transition name="fade">
    <div v-if="isVisible" class="notification">
      {{ message }}
    </div>
  </transition>
</template>

<script>
export default {
  data() {
    return {
      isVisible: false,
      message: '',
      timeout: null
    }
  },
  methods: {
    show(message, duration = 5000) {
      this.message = message
      this.isVisible = true

      if (this.timeout) clearTimeout(this.timeout)

      this.timeout = setTimeout(() => {
        this.isVisible = false
      }, duration)
    }
  }
}
</script>

<style scoped>
.notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  min-height: 50px;
  padding: 15px;
  background-color: #3307a3;
  color: white;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  z-index: 1000;
}
</style>