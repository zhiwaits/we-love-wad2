<template>
  <div v-if="visible" class="image-modal-overlay" @click="handleOverlayClick">
    <div class="image-modal-content">
      <button class="image-modal-close" @click="handleClose">
        ×
      </button>
      <img :src="imageSrc" :alt="altText" class="image-modal-image" @error="handleImageError" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'FullImageModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    imageSrc: {
      type: String,
      default: ''
    },
    altText: {
      type: String,
      default: 'Full size image'
    }
  },
  methods: {
    handleOverlayClick(event) {
      if (event.target === event.currentTarget) {
        this.handleClose();
      }
    },
    handleClose() {
      this.$emit('close');
    },
    handleImageError() {
      // Optionally handle image load error
      console.warn('Failed to load image:', this.imageSrc);
    }
  }
};
</script>

<style scoped>
.image-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
}

.image-modal-content {
  position: relative;
  max-width: min(90vw, 1200px);
  max-height: min(90vh, 800px);
  cursor: default;
}

.image-modal-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  font-weight: bold;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.image-modal-close:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.image-modal-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-base);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}
</style>