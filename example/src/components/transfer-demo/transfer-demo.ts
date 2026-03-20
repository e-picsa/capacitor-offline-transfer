import { Camera, CameraResultType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import type { EndpointFoundEvent } from '@picsa/capacitor-offline-transfer';
import { OfflineTransfer } from '@picsa/capacitor-offline-transfer';

import './transfer-demo.css';
import template from './transfer-demo.html?raw';

window.customElements.define(
  'transfer-demo',
  class extends HTMLElement {
    constructor() {
      super();

      SplashScreen.hide();

      this.innerHTML = template;
    }

    connectedCallback() {
      const self = this;
      const shadow = self;
      if (!shadow) return;

      // Selectors
      const initBtn = shadow.querySelector('#init-btn') as HTMLButtonElement;
      const checkPermsBtn = shadow.querySelector('#check-perms') as HTMLButtonElement;
      const requestPermsBtn = shadow.querySelector('#request-perms') as HTMLButtonElement;
      const strategySelect = shadow.querySelector('#strategy-select') as HTMLSelectElement;
      const logLevelSelect = shadow.querySelector('#log-level-select') as HTMLSelectElement;

      const advertiseBtn = shadow.querySelector('#advertise-btn') as HTMLButtonElement;
      const discoveryBtn = shadow.querySelector('#discovery-btn') as HTMLButtonElement;
      const stopBtn = shadow.querySelector('#stop-btn') as HTMLButtonElement;

      const messageInput = shadow.querySelector('#message-input') as HTMLInputElement;
      const sendBtn = shadow.querySelector('#send-btn') as HTMLButtonElement;
      const sendFileBtn = shadow.querySelector('#send-file-btn') as HTMLButtonElement;

      const hotspotBtn = shadow.querySelector('#hotspot-btn') as HTMLButtonElement;
      const serverBtn = shadow.querySelector('#server-btn') as HTMLButtonElement;
      const stopT3Btn = shadow.querySelector('#stop-t3-btn') as HTMLButtonElement;

      const nearbyControls = shadow.querySelector('#nearby-controls') as HTMLDivElement;
      const emulatorControls = shadow.querySelector('#emulator-controls') as HTMLDivElement;

      const devicesList = shadow.querySelector('#devices-list') as HTMLDivElement;
      const messagesBox = shadow.querySelector('#messages') as HTMLDivElement;

      const manualUrlInput = shadow.querySelector('#manual-url-input') as HTMLInputElement;
      const manualConnectBtn = shadow.querySelector('#manual-connect-btn') as HTMLButtonElement;
      const manualConnectArea = shadow.querySelector('#manual-connect-area') as HTMLDivElement;

      const progressContainer = shadow.querySelector('#progress-container') as HTMLDivElement;
      const progressBar = shadow.querySelector('#progress-bar') as HTMLDivElement;
      const progressText = shadow.querySelector('#progress-text') as HTMLSpanElement;
      const progressFilename = shadow.querySelector('#progress-filename') as HTMLSpanElement;
      const tier3Section = shadow.querySelector('#android-tier3') as HTMLElement;

      const errorBanner = shadow.querySelector('#error-banner') as HTMLDivElement;
      const initStatus = shadow.querySelector('#init-status') as HTMLSpanElement;
      const advertiseStatus = shadow.querySelector('#advertise-status') as HTMLSpanElement;
      const discoveryStatus = shadow.querySelector('#discovery-status') as HTMLSpanElement;
      const serverStatus = shadow.querySelector('#server-status') as HTMLSpanElement;
      const manualConnectStatus = shadow.querySelector('#manual-connect-status') as HTMLSpanElement;

      const mainControls = shadow.querySelector('#main-controls') as HTMLDivElement;
      const notificationArea = shadow.querySelector('#notification-area') as HTMLDivElement;

      if (Capacitor.getPlatform() !== 'android') {
        tier3Section.style.display = 'none';
      }

      // State
      let endpoints: Record<string, EndpointFoundEvent> = {};
      let connectedEndpointId: string | null = null;

      const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        messagesBox.innerHTML += `<div style="margin-bottom:4px"><span style="color:#8e8e93">[${time}]</span> ${msg}</div>`;
        messagesBox.scrollTop = messagesBox.scrollHeight;
      };

      const showError = (msg: string) => {
        errorBanner.textContent = msg;
        errorBanner.style.display = 'block';
        addLog(`ERROR: ${msg}`);
        setTimeout(() => {
          errorBanner.style.display = 'none';
        }, 5000);
      };

      const updateStatus = (el: HTMLSpanElement, text: string, type: 'active' | 'loading' | 'stopped' | '') => {
        el.textContent = text;
        el.className = 'status-badge ' + type;
      };

      const showNotification = (msg: string, type: 'info' | 'success' = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = msg;
        notificationArea.appendChild(toast);
        addLog(`NOTIFICATION: ${msg}`);

        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(20px)';
          toast.style.transition = 'opacity 0.3s, transform 0.3s';
          setTimeout(() => toast.remove(), 300);
        }, 4000);
      };

      // UI Toggling based on Strategy
      strategySelect.addEventListener('change', () => {
        const strategy = strategySelect.value;
        if (strategy === 'HTTP_SERVER') {
          nearbyControls.style.display = 'none';
          emulatorControls.style.display = 'block';
          addLog('Switched to Emulator mode (HTTP Server Bridge)');
        } else {
          nearbyControls.style.display = 'block';
          emulatorControls.style.display = 'none';
          addLog(`Switched to Nearby mode (${strategy})`);
        }
      });

      // Permissions
      const checkPermissions = async () => {
        const status = await OfflineTransfer.checkPermissions();
        addLog(`Permissions: nearby=${status.nearby}`);
        return status;
      };

      checkPermsBtn.addEventListener('click', checkPermissions);
      requestPermsBtn.addEventListener('click', async () => {
        const status = await OfflineTransfer.requestPermissions();
        addLog(`Request result: nearby=${status.nearby}`);
      });

      if (logLevelSelect) {
        logLevelSelect.addEventListener('change', async () => {
          const level = parseInt(logLevelSelect.value);
          await OfflineTransfer.setLogLevel({ logLevel: level });
          addLog(`Log Level set to ${level}`);
        });
      }

      // Plugin Init
      initBtn.addEventListener('click', async () => {
        try {
          initBtn.disabled = true;
          updateStatus(initStatus, 'Initializing...', 'loading');
          const strategy = strategySelect.value;

          if (strategy !== 'HTTP_SERVER') {
            await OfflineTransfer.setStrategy({ strategy: strategy as any });
            [advertiseBtn, discoveryBtn].forEach((b) => (b.disabled = false));
          } else {
            [serverBtn, manualConnectBtn].forEach((b) => (b.disabled = false));
          }

          await OfflineTransfer.initialize({ serviceId: 'picsa-offline' });
          setupListeners();

          stopBtn.disabled = false;
          mainControls.style.display = 'block';
          updateStatus(initStatus, 'Ready', 'active');
          addLog(`Initialized with ${strategy}`);
          showNotification('System Initialized', 'success');
        } catch (e: any) {
          initBtn.disabled = false;
          updateStatus(initStatus, 'Failed', 'stopped');
          showError(`Init Error: ${e.message}`);
        }
      });

      // Discovery & Advertising
      advertiseBtn.addEventListener('click', async () => {
        try {
          advertiseBtn.disabled = true;
          updateStatus(advertiseStatus, 'Starting...', 'loading');
          await OfflineTransfer.startAdvertising({ displayName: 'Device_' + Math.floor(Math.random() * 100) });
          updateStatus(advertiseStatus, 'Advertising', 'active');
          addLog('Advertising started...');
        } catch (e: any) {
          advertiseBtn.disabled = false;
          updateStatus(advertiseStatus, 'Failed', 'stopped');
          showError(`Advertising Error: ${e.message}`);
        }
      });

      discoveryBtn.addEventListener('click', async () => {
        try {
          discoveryBtn.disabled = true;
          updateStatus(discoveryStatus, 'Starting...', 'loading');
          await OfflineTransfer.startDiscovery();
          updateStatus(discoveryStatus, 'Discovering', 'active');
          addLog('Discovery started...');
        } catch (e: any) {
          discoveryBtn.disabled = false;
          updateStatus(discoveryStatus, 'Failed', 'stopped');
          showError(`Discovery Error: ${e.message}`);
        }
      });

      manualConnectBtn.addEventListener('click', async () => {
        try {
          const url = manualUrlInput.value.trim();
          if (!url) return;
          manualConnectBtn.disabled = true;
          updateStatus(manualConnectStatus, 'Connecting...', 'loading');
          addLog(`Manually connecting to ${url}...`);
          await OfflineTransfer.connectByAddress({ url });
          updateStatus(manualConnectStatus, 'Connected', 'active');
        } catch (e: any) {
          manualConnectBtn.disabled = false;
          updateStatus(manualConnectStatus, 'Failed', 'stopped');
          showError(`Manual Connect Error: ${e.message}`);
        }
      });

      stopBtn.addEventListener('click', async () => {
        updateStatus(initStatus, 'Stopping...', 'loading');
        await OfflineTransfer.stopAdvertising();
        await OfflineTransfer.stopDiscovery();
        await OfflineTransfer.stopServer();
        await OfflineTransfer.disconnect();
        endpoints = {};
        connectedEndpointId = null;
        updateDevicesUI();
        initBtn.disabled = false;
        mainControls.style.display = 'none';
        [advertiseBtn, discoveryBtn, serverBtn, manualConnectBtn, sendBtn, sendFileBtn].forEach(
          (b) => (b.disabled = true),
        );
        [advertiseStatus, discoveryStatus, serverStatus, manualConnectStatus].forEach((el) => updateStatus(el, '', ''));
        if (manualConnectArea) manualConnectArea.style.display = 'block';
        updateStatus(initStatus, 'Ready', 'active');
        addLog('Stopped all P2P and Server activities');
      });

      // Transfer
      sendBtn.addEventListener('click', async () => {
        const val = messageInput.value.trim();
        if (!val || !connectedEndpointId) return;
        try {
          await OfflineTransfer.sendMessage({ endpointId: connectedEndpointId, data: val });
          addLog(`SENT: ${val}`);
          messageInput.value = '';
        } catch (e: any) {
          addLog(`Send Error: ${e.message}`);
        }
      });

      sendFileBtn.addEventListener('click', async () => {
        if (!connectedEndpointId) return;
        try {
          const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Uri,
          });

          if (image.path) {
            addLog(`Sending file: ${image.path}`);
            progressContainer.style.display = 'block';
            progressFilename.textContent = 'Preparing image...';

            await OfflineTransfer.sendFile({
              endpointId: connectedEndpointId,
              filePath: image.path,
              fileName: `photo_${Date.now()}.jpg`,
            });
          }
        } catch (e: any) {
          addLog(`Camera/File Error: ${e.message}`);
        }
      });

      // Tier 3
      hotspotBtn.addEventListener('click', async () => {
        try {
          const info = await OfflineTransfer.startLocalHotspot();
          addLog(`HOTSPOT: SSID=${info.ssid}, PWD=${info.password}`);
        } catch (e: any) {
          addLog(`Hotspot Error: ${e.message}`);
        }
      });

      serverBtn.addEventListener('click', async () => {
        try {
          serverBtn.disabled = true;
          updateStatus(serverStatus, 'Starting...', 'loading');
          const info = await OfflineTransfer.startServer({ port: 8080 });
          updateStatus(serverStatus, `Running: ${info.url}`, 'active');
          addLog(`SERVER: ${info.url}`);
        } catch (e: any) {
          serverBtn.disabled = false;
          updateStatus(serverStatus, 'Failed', 'stopped');
          showError(`Server Error: ${e.message}`);
        }
      });

      stopT3Btn.addEventListener('click', async () => {
        await OfflineTransfer.stopLocalHotspot();
        await OfflineTransfer.stopServer();
        addLog('Stopped Tier 3 services');
      });

      // Listeners
      const setupListeners = () => {
        OfflineTransfer.addListener('endpointFound', (ev) => {
          endpoints[ev.endpointId] = ev;
          updateDevicesUI();
          addLog(`Found: ${ev.endpointName}`);
        });

        OfflineTransfer.addListener('endpointLost', (ev) => {
          addLog(`Lost: ${endpoints[ev.endpointId]?.endpointName || ev.endpointId}`);
          delete endpoints[ev.endpointId];
          if (connectedEndpointId === ev.endpointId) {
            connectedEndpointId = null;
            [sendBtn, sendFileBtn].forEach((b) => (b.disabled = true));
            if (manualConnectArea) manualConnectArea.style.display = 'block';
          }
          updateDevicesUI();
        });

        OfflineTransfer.addListener('connectionRequested', (ev) => {
          addLog(`Conn Request: ${ev.endpointName}. Accepting...`);
          showNotification(`Connection requested from ${ev.endpointName}`);
          OfflineTransfer.acceptConnection({ endpointId: ev.endpointId });
        });

        OfflineTransfer.addListener('connectionResult', (ev) => {
          if (ev.status === 'SUCCESS') {
            connectedEndpointId = ev.endpointId;
            [sendBtn, sendFileBtn].forEach((b) => (b.disabled = false));
            if (manualConnectArea) manualConnectArea.style.display = 'none';
            updateDevicesUI();
            addLog(`Connected to ${ev.endpointId}`);
            showNotification(`Connected to ${ev.endpointId}`, 'success');
          } else {
            addLog(`Connection failed/rejected: ${ev.status}`);
            showError(`Connection failed: ${ev.status}`);
          }
        });

        OfflineTransfer.addListener('messageReceived', (ev) => {
          addLog(`MSG: ${ev.data}`);
        });

        OfflineTransfer.addListener('fileReceived', (ev) => {
          addLog(`FILE RECEIVED: ${ev.fileName} at ${ev.path}`);
          progressContainer.style.display = 'none';
        });

        OfflineTransfer.addListener('transferProgress', (ev) => {
          const pc = Math.round((ev.bytesTransferred / ev.totalBytes) * 100);
          progressBar.style.width = `${pc}%`;
          progressText.textContent = `${pc}%`;
          progressFilename.textContent = ev.status === 'IN_PROGRESS' ? 'Transferring...' : ev.status;

          if (ev.status === 'SUCCESS' || ev.status === 'FAILURE' || ev.status === 'CANCELLED') {
            setTimeout(() => {
              progressContainer.style.display = 'none';
            }, 2000);
          }
        });
      };

      const updateDevicesUI = () => {
        if (Object.keys(endpoints).length === 0) {
          devicesList.innerHTML =
            '<div style="color: #8e8e93; font-size: 0.9em; padding: 10px;">No devices found yet...</div>';
          return;
        }
        devicesList.innerHTML = '';
        Object.values(endpoints).forEach((ep) => {
          const el = document.createElement('div');
          el.className = 'device-item';
          const isConn = connectedEndpointId === ep.endpointId;
          el.innerHTML = `
            <span><strong>${ep.endpointName}</strong></span>
            <button class="button ${isConn ? 'danger' : ''}" style="margin:0; padding: 4px 8px; font-size: 0.7em;">
              ${isConn ? 'Disconnect' : 'Connect'}
            </button>
          `;
          const btn = el.querySelector('button');
          if (btn) {
            btn.onclick = async () => {
              if (isConn) {
                await OfflineTransfer.disconnectFromEndpoint({ endpointId: ep.endpointId });
              } else {
                addLog(`Connecting to ${ep.endpointName}...`);
                await OfflineTransfer.connect({ endpointId: ep.endpointId, displayName: 'DemoUser' });
              }
            };
          }
          devicesList.appendChild(el);
        });
      };
    }
  },
);
