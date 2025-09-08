/**
 * ASH AI PWA Service Worker Registration
 * Handles service worker registration and PWA install prompts
 */

class ASHPWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.init();
  }

  async init() {
    console.log('[PWA] Initializing ASH AI PWA Manager...');
    
    // Register service worker
    await this.registerServiceWorker();
    
    // Setup install prompt handling
    this.setupInstallPrompt();
    
    // Check if already installed
    this.checkInstallStatus();
    
    // Setup notification permission
    this.setupNotifications();
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        console.log('[PWA] Registering service worker...');
        
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('[PWA] Service worker registered successfully:', registration.scope);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          console.log('[PWA] New service worker version found');
          
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available - showing update prompt');
                this.showUpdatePrompt();
              }
            });
          }
        });
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('[PWA] Message from service worker:', event.data);
          
          if (event.data.type === 'CACHE_UPDATED') {
            this.showCacheUpdateNotification();
          }
        });
        
        return registration;
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    } else {
      console.log('[PWA] Service workers not supported');
    }
  }

  setupInstallPrompt() {
    console.log('[PWA] Setting up install prompt...');
    
    // Capture beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('[PWA] Install prompt available');
      
      // Prevent default mini-infobar
      event.preventDefault();
      
      // Store event for later use
      this.deferredPrompt = event;
      
      // Show custom install button
      this.showInstallButton();
    });
    
    // Handle app installation
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.isInstalled = true;
      this.hideInstallButton();
      this.showInstallSuccessMessage();
    });
  }

  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return;
    }
    
    console.log('[PWA] Showing install prompt...');
    
    try {
      // Show the prompt
      this.deferredPrompt.prompt();
      
      // Wait for user response
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log('[PWA] Install prompt result:', outcome);
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install');
      } else {
        console.log('[PWA] User dismissed install');
      }
      
      // Clear the prompt
      this.deferredPrompt = null;
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
    }
  }

  showInstallButton() {
    console.log('[PWA] Showing install button...');
    
    // Create install button if it doesn't exist
    let installButton = document.getElementById('pwa-install-button');
    
    if (!installButton) {
      installButton = document.createElement('button');
      installButton.id = 'pwa-install-button';
      installButton.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18l9-5-9-5-9 5 9 5z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12l0 6"></path>
        </svg>
        Install ASH AI
      `;
      installButton.className = 'fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 flex items-center z-50 transform translate-y-0 opacity-100';
      installButton.style.cssText = `
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        border: none;
        border-radius: 0.5rem;
        padding: 0.75rem 1rem;
        font-weight: bold;
        box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 9999;
        transition: all 0.3s ease;
        font-size: 0.875rem;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(59, 130, 246, 0.2);
      `;
      
      installButton.addEventListener('click', () => {
        this.showInstallPrompt();
      });
      
      installButton.addEventListener('mouseenter', () => {
        installButton.style.transform = 'translateY(-2px)';
        installButton.style.boxShadow = '0 15px 35px rgba(59, 130, 246, 0.4)';
      });
      
      installButton.addEventListener('mouseleave', () => {
        installButton.style.transform = 'translateY(0)';
        installButton.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.3)';
      });
      
      document.body.appendChild(installButton);
    }
    
    installButton.style.display = 'flex';
  }

  hideInstallButton() {
    console.log('[PWA] Hiding install button...');
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  showInstallSuccessMessage() {
    console.log('[PWA] Showing install success message...');
    
    // Create success notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>ASH AI installed successfully!</span>
      </div>
    `;
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50';
    notification.style.cssText = `
      position: fixed;
      top: 1rem;
      right: 1rem;
      background: linear-gradient(135deg, #059669, #047857);
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px rgba(5, 150, 105, 0.3);
      z-index: 9999;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(5, 150, 105, 0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  showUpdatePrompt() {
    console.log('[PWA] Showing update prompt...');
    
    const updatePrompt = document.createElement('div');
    updatePrompt.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <span>New version available!</span>
        </div>
        <button id="update-app-button" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm ml-4">
          Update
        </button>
      </div>
    `;
    updatePrompt.className = 'fixed top-4 left-4 bg-slate-800 text-white p-4 rounded-lg shadow-lg z-50';
    updatePrompt.style.cssText = `
      position: fixed;
      top: 1rem;
      left: 1rem;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(59, 130, 246, 0.2);
    `;
    
    document.body.appendChild(updatePrompt);
    
    // Handle update button click
    document.getElementById('update-app-button').addEventListener('click', () => {
      window.location.reload();
    });
    
    // Remove after 10 seconds
    setTimeout(() => {
      if (updatePrompt.parentNode) {
        updatePrompt.parentNode.removeChild(updatePrompt);
      }
    }, 10000);
  }

  showCacheUpdateNotification() {
    console.log('[PWA] Showing cache update notification...');
    // Implementation for cache update notification
  }

  checkInstallStatus() {
    // Check if app is running in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      console.log('[PWA] App is running in standalone mode');
      this.isInstalled = true;
      this.hideInstallButton();
    }
  }

  async setupNotifications() {
    console.log('[PWA] Setting up notifications...');
    
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('[PWA] Notification permission:', permission);
      
      if (permission === 'granted') {
        console.log('[PWA] Notification permission granted');
      } else {
        console.log('[PWA] Notification permission denied');
      }
    } else {
      console.log('[PWA] Notifications not supported');
    }
  }

  // Public API methods
  async requestInstall() {
    return this.showInstallPrompt();
  }

  isAppInstalled() {
    return this.isInstalled;
  }
}

// Initialize PWA Manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.ashPWA = new ASHPWAManager();
  });
} else {
  window.ashPWA = new ASHPWAManager();
}

console.log('[PWA] ASH AI PWA registration script loaded');