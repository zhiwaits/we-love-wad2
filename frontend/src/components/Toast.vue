<template>
    <transition name="toast-fade">
        <div
            v-if="toast.visible"
            class="toast"
            role="status"
            aria-live="polite"
            :data-variant="toast.type"
        >
            <span class="toast-message">{{ toast.message }}</span>
            <button class="toast-close" type="button" @click="dismiss" aria-label="Dismiss notification">×</button>
        </div>
    </transition>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

const toast = computed(() => store.getters.toast);

const dismiss = () => {
    store.dispatch('hideToast');
};
</script>

<style scoped>
.toast {
    position: fixed;
    bottom: clamp(16px, 4vw, 32px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(17, 24, 39, 0.92);
    color: var(--color-background, #fff);
    padding: 10px 14px;
    border-radius: 999px;
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.25);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 1100;
    font-weight: 600;
    backdrop-filter: blur(6px);
}

.toast-message {
    flex: 1;
    text-align: left;
}

.toast[data-variant='success'] {
    background: rgba(var(--color-success-rgb, 33, 128, 141), 0.95);
    color: var(--color-background, #fff);
}

.toast[data-variant='error'] {
    background: rgba(var(--color-error-rgb, 192, 21, 47), 0.9);
}

.toast[data-variant='info'] {
    background: rgba(17, 24, 39, 0.92);
}

.toast-close {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 16px;
    cursor: pointer;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    line-height: 1;
    padding: 0;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
    opacity: 0;
    transform: translate(-50%, 10px);
}
</style>
