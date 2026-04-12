import { defineStore } from 'pinia';
import { ref, computed, readonly } from 'vue';
import { useRouter } from 'vue-router';
import apiClient, { setAuthToken } from '../api/client';

export interface BrowserUser {
  id: number;
  login: string;
  name: string;
}

/**
 * Browser authentication store for JWT-based auth
 * Used when the app is accessed from a regular browser
 */
export const useBrowserAuthStore = defineStore('browserAuth', () => {
  const router = useRouter();
  
  const token = ref<string | null>(localStorage.getItem('auth_token'));
  const user = ref<BrowserUser | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  /**
   * Login with credentials
   */
  async function login(login: string, password: string): Promise<boolean> {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await apiClient.post('/auth/login', { login, password });
      
      if (response.data.success) {
        token.value = response.data.token;
        user.value = response.data.user;
        setAuthToken(response.data.token);
        return true;
      }
      
      return false;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Ошибка входа';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Logout and clear session
   */
  async function logout(): Promise<void> {
    try {
      // Optionally notify backend about logout
      if (token.value) {
        await apiClient.post('/auth/logout').catch(() => {
          // Ignore errors during logout
        });
      }
    } finally {
      token.value = null;
      user.value = null;
      setAuthToken(null);
      await router.push('/login');
    }
  }

  /**
   * Fetch current user data
   */
  async function fetchCurrentUser(): Promise<boolean> {
    try {
      const response = await apiClient.get('/user/me');
      
      if (response.data) {
        // Map user data to BrowserUser format
        user.value = {
          id: response.data.id,
          login: response.data.login || response.data.username || '',
          name: response.data.name,
        };
        return true;
      }
      
      return false;
    } catch (err) {
      token.value = null;
      user.value = null;
      setAuthToken(null);
      return false;
    }
  }

  /**
   * Initialize auth state from stored token
   */
  async function initAuth(): Promise<boolean> {
    if (!token.value) return false;
    
    const isValid = await fetchCurrentUser();
    
    if (!isValid) {
      await router.push('/login');
    }
    
    return isValid;
  }

  /**
   * Refresh JWT token
   */
  async function refreshToken(): Promise<boolean> {
    try {
      const response = await apiClient.post('/auth/refresh');
      
      if (response.data.success) {
        token.value = response.data.token;
        setAuthToken(response.data.token);
        return true;
      }
      
      return false;
    } catch (err) {
      return false;
    }
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null;
  }

  return {
    // State (readonly)
    token: readonly(token),
    user: readonly(user),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Getters
    isAuthenticated,
    
    // Actions
    login,
    logout,
    fetchCurrentUser,
    initAuth,
    refreshToken,
    clearError,
  };
});
