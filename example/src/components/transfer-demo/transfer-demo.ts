import { Camera, CameraResultType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
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
      const shadow = this;
      if (!shadow) return;

      const initBtn = shadow.querySelector('#init-btn') as HTMLButtonElement;
      const checkPermsBtn = shadow.querySelector('#check-perms') as HTMLButtonElement;
      const requestPermsBtn = shadow.querySelector('#request-perms') as HTMLButtonElement;
      const logLevelSelect = shadow.querySelector('#log-level-select') as HTMLSelectElement;

      const advertiseBtn = shadow.querySelector('#advertise-btn') as HTMLButtonElement;
      const discoveryBtn = shadow.querySelector('#discovery-btn') as HTMLButtonElement;
      const stopBtn = shadow.querySelector('#stop-btn') as HTMLButtonElement;

      const messageInput = shadow.querySelector('#message-input') as HTMLInputElement;
      const sendBtn = shadow.querySelector('#send-btn') as HTMLButtonElement;
      const sendFileBtn = shadow.querySelector('#send-file-btn') as HTMLButtonElement;

      const shareSystemBtn = shadow.querySelector('#share-system-btn') as HTMLButtonElement;
      const startLanBtn = shadow.querySelector('#start-lan-btn') as HTMLButtonElement;
      const stopLanBtn = shadow.querySelector('#stop-lan-btn') as HTMLButtonElement;
      const lanServerControls = shadow.querySelector('#lan-server-controls') as HTMLDivElement;
      const lanServerUrl = shadow.querySelector('#lan-server-url') as HTMLElement;

      const manualUrlInput = shadow.querySelector('#manual-url-input') as HTMLInputElement;
      const manualConnectBtn = shadow.querySelector('#manual-connect-btn') as HTMLButtonElement;
      const manualConnectArea = shadow.querySelector('#manual-connect-area') as HTMLDivElement;

      const devicesList = shadow.querySelector('#devices-list') as HTMLDivElement;
      const messagesBox = shadow.querySelector('#messages') as HTMLDivElement;

      const progressContainer = shadow.querySelector('#progress-container') as HTMLDivElement;
      const progressBar = shadow.querySelector('#progress-bar') as HTMLDivElement;
      const progressText = shadow.querySelector('#progress-text') as HTMLSpanElement;
      const progressFilename = shadow.querySelector('#progress-filename') as HTMLSpanElement;

      const errorBanner = shadow.querySelector('#error-banner') as HTMLDivElement;
      const initStatus = shadow.querySelector('#init-status') as HTMLSpanElement;
      const advertiseStatus = shadow.querySelector('#advertise-status') as HTMLSpanElement;
      const discoveryStatus = shadow.querySelector('#discovery-status') as HTMLSpanElement;
      const manualConnectStatus = shadow.querySelector('#manual-connect-status') as HTMLSpanElement;

      const mainControls = shadow.querySelector('#main-controls') as HTMLDivElement;
      const notificationArea = shadow.querySelector('#notification-area') as HTMLDivElement;

      const isAndroid = Capacitor.getPlatform() === 'android';
      if (!isAndroid) {
        shareSystemBtn.style.display = 'none';
        startLanBtn.style.display = 'none';
      }

      let endpoints: Record<string, EndpointFoundEvent> = {};
      let connectedEndpointId: string | null = null;
      let lanServerRunning = false;

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

      const setLanServerState = (running: boolean, url?: string) => {
        lanServerRunning = running;
        lanServerControls.style.display = running ? 'block' : 'none';
        startLanBtn.style.display = running ? 'none' : 'inline-block';
        stopLanBtn.style.display = running ? 'inline-block' : 'none';
        if (url) {
          lanServerUrl.textContent = url;
        }
      };

      checkPermsBtn.addEventListener('click', async () => {
        const status = await OfflineTransfer.checkPermissions();
        addLog(`Permissions: nearby=${status.nearby}`);
      });

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

      initBtn.addEventListener('click', async () => {
        try {
          initBtn.disabled = true;
          updateStatus(initStatus, 'Initializing...', 'loading');
          await OfflineTransfer.initialize({ serviceId: 'picsa-offline' });
          setupListeners();
          stopBtn.disabled = false;
          mainControls.style.display = 'block';
          updateStatus(initStatus, 'Ready', 'active');
          addLog('Initialized');
          showNotification('System Initialized', 'success');
        } catch (e: unknown) {
          initBtn.disabled = false;
          updateStatus(initStatus, 'Failed', 'stopped');
          showError(`Init Error: ${(e as Error).message}`);
        }
      });

      advertiseBtn.addEventListener('click', async () => {
        try {
          advertiseBtn.disabled = true;
          updateStatus(advertiseStatus, 'Starting...', 'loading');
          await OfflineTransfer.startAdvertising({ displayName: 'Device_' + Math.floor(Math.random() * 100) });
          updateStatus(advertiseStatus, 'Advertising', 'active');
          addLog('Advertising started...');
        } catch (e: unknown) {
          advertiseBtn.disabled = false;
          updateStatus(advertiseStatus, 'Failed', 'stopped');
          showError(`Advertising Error: ${(e as Error).message}`);
        }
      });

      discoveryBtn.addEventListener('click', async () => {
        try {
          discoveryBtn.disabled = true;
          updateStatus(discoveryStatus, 'Starting...', 'loading');
          await OfflineTransfer.startDiscovery();
          updateStatus(discoveryStatus, 'Discovering', 'active');
          addLog('Discovery started...');
        } catch (e: unknown) {
          discoveryBtn.disabled = false;
          updateStatus(discoveryStatus, 'Failed', 'stopped');
          showError(`Discovery Error: ${(e as Error).message}`);
        }
      });

      manualConnectBtn.addEventListener('click', async () => {
        try {
          const url = manualUrlInput.value.trim();
          if (!url) return;
          manualConnectBtn.disabled = true;
          updateStatus(manualConnectStatus, 'Connecting...', 'loading');
          addLog(`Connecting to ${url}...`);
          await OfflineTransfer.connectByAddress({ url });
        } catch (e: unknown) {
          manualConnectBtn.disabled = false;
          updateStatus(manualConnectStatus, 'Failed', 'stopped');
          showError(`Manual Connect Error: ${(e as Error).message}`);
        }
      });

      stopBtn.addEventListener('click', async () => {
        updateStatus(initStatus, 'Stopping...', 'loading');
        await OfflineTransfer.stopAdvertising();
        await OfflineTransfer.stopDiscovery();
        await OfflineTransfer.stopServer();
        await OfflineTransfer.disconnect();
        if (lanServerRunning) {
          await OfflineTransfer.stopLanServer();
          setLanServerState(false);
        }
        endpoints = {};
        connectedEndpointId = null;
        updateDevicesUI();
        initBtn.disabled = false;
        mainControls.style.display = 'none';
        [advertiseBtn, discoveryBtn, sendBtn, sendFileBtn].forEach((b) => (b.disabled = true));
        [advertiseStatus, discoveryStatus].forEach((el) => updateStatus(el, '', ''));
        updateStatus(initStatus, 'Ready', 'active');
        addLog('Stopped all activities');
      });

      sendBtn.addEventListener('click', async () => {
        const val = messageInput.value.trim();
        if (!val || !connectedEndpointId) return;
        try {
          await OfflineTransfer.sendMessage({ endpointId: connectedEndpointId, data: val });
          addLog(`SENT: ${val}`);
          messageInput.value = '';
        } catch (e: unknown) {
          addLog(`Send Error: ${(e as Error).message}`);
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
        } catch (e: unknown) {
          addLog(`Camera/File Error: ${(e as Error).message}`);
        }
      });

      shareSystemBtn.addEventListener('click', async () => {
        try {
          const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Uri,
          });

          if (image.path) {
            const canShare = await Share.canShare();
            if (!canShare.value) {
              showError('Sharing not available on this device');
              return;
            }

            await Share.share({
              title: 'Share via Bluetooth/Nearby Share',
              files: [image.path],
            });
            addLog('Shared via system share sheet');
          }
        } catch (e: unknown) {
          addLog(`Share Error: ${(e as Error).message}`);
        }
      });

      startLanBtn.addEventListener('click', async () => {
        try {
          startLanBtn.disabled = true;
          updateStatus(manualConnectStatus, 'Starting...', 'loading');
          const info = await OfflineTransfer.startLanServer({ port: 8080 });
          setLanServerState(true, info.url);
          addLog(`LAN Server: ${info.url}`);
          manualConnectArea.style.display = 'block';
          manualConnectBtn.disabled = false;
          manualUrlInput.value = info.url;
        } catch (e: unknown) {
          startLanBtn.disabled = false;
          updateStatus(manualConnectStatus, 'Failed', 'stopped');
          showError(`LAN Server Error: ${(e as Error).message}`);
        }
      });

      stopLanBtn.addEventListener('click', async () => {
        await OfflineTransfer.stopLanServer();
        setLanServerState(false);
        manualConnectArea.style.display = 'none';
        manualConnectBtn.disabled = true;
        addLog('LAN Server stopped');
      });

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
            updateDevicesUI();
            addLog(`Connected to ${ev.endpointId}`);
            showNotification(`Connected to ${ev.endpointId}`, 'success');
          } else {
            addLog(`Connection failed/rejected: ${ev.status}`);
            showError(`Connection failed: ${ev.status}`);
            updateStatus(manualConnectStatus, 'Failed', 'stopped');
            manualConnectBtn.disabled = false;
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

        OfflineTransfer.addListener('emulatorClientConnected', (event) => {
          console.log(`Client connected: ${event.endpointName} (${event.endpointId})`);
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
