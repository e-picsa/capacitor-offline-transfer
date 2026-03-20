import { Camera, CameraResultType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { OfflineTransfer } from '@picsa/capacitor-offline-transfer';

window.customElements.define(
  'capacitor-welcome',
  class extends HTMLElement {
    constructor() {
      super();

      SplashScreen.hide();

      const root = this.attachShadow({ mode: 'open' });

      root.innerHTML = `
    <style>
      @import url('./css/style.css');
    </style>
    <div>
      <div class="titlebar">
        <h1>Offline Transfer</h1>
      </div>
      <main>
        <section>
          <h3>1. Setup</h3>
          <div class="field">
            <label>P2P Strategy</label>
            <select id="strategy-select">
              <option value="P2P_STAR">P2P Star (1-to-many)</option>
              <option value="P2P_CLUSTER" selected>P2P Cluster (Mesh)</option>
              <option value="P2P_POINT_TO_POINT">P2P Point-to-Point (Direct)</option>
            </select>
          </div>
          <div class="field">
            <label>Log Level</label>
            <select id="log-level-select">
              <option value="0">None</option>
              <option value="1">Error</option>
              <option value="2">Warn</option>
              <option value="3" selected>Info (Default)</option>
              <option value="4">Debug</option>
              <option value="5">Verbose</option>
            </select>
          </div>
          <div style="display: flex; flex-wrap: wrap;">
            <button class="button" id="init-btn">Initialize</button>
            <button class="button secondary" id="check-perms">Check Perms</button>
            <button class="button secondary" id="request-perms">Request Perms</button>
          </div>
        </section>

        <section>
          <h3>2. Connections</h3>
          <div style="display: flex; flex-wrap: wrap;">
            <button class="button" id="advertise-btn" disabled>Advertise</button>
            <button class="button" id="discovery-btn" disabled>Discover</button>
            <button class="button danger" id="stop-btn" disabled>Stop All</button>
          </div>
          <div class="field" style="margin-top: 10px;">
            <label>Manual Server URL (for Emulators)</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="manual-url-input" placeholder="http://10.0.2.2:8080" value="http://10.0.2.2:8080">
              <button class="button secondary" id="manual-connect-btn" style="margin:0">Manual Connect</button>
            </div>
          </div>
          <div class="device-list" id="devices-list">
            <div style="color: #8e8e93; font-size: 0.9em; padding: 10px;">No devices found yet...</div>
          </div>
        </section>

        <section>
          <h3>3. Transfer</h3>
          <div class="field">
            <label>Text Message</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="message-input" placeholder="Type here...">
              <button class="button" id="send-btn" disabled style="margin:0">Send</button>
            </div>
          </div>
          <div class="field">
            <label>File Transfer</label>
            <button class="button secondary" id="send-file-btn" disabled style="margin-left:0">Pick & Send Image</button>
          </div>
          <div id="progress-container" class="progress-container" style="display: none;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75em; margin-bottom: 4px;">
              <span id="progress-filename">Sending...</span>
              <span id="progress-text">0%</span>
            </div>
            <div class="progress-bg">
              <div id="progress-bar" class="progress-fill"></div>
            </div>
          </div>
        </section>

        <section id="android-tier3">
          <h3>Tier 3 (Android)</h3>
          <div style="display: flex; flex-wrap: wrap;">
            <button class="button secondary" id="hotspot-btn">Start Hotspot</button>
            <button class="button secondary" id="server-btn">Start Server</button>
            <button class="button danger" id="stop-t3-btn">Stop Tier 3</button>
          </div>
        </section>

        <label>Log Console</label>
        <div class="message-box" id="messages">
          Ready.
        </div>
      </main>
    </div>
    `;
    }

    connectedCallback() {
      const self = this;
      const shadow = self.shadowRoot;
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

      const devicesList = shadow.querySelector('#devices-list') as HTMLDivElement;
      const messagesBox = shadow.querySelector('#messages') as HTMLDivElement;

      const manualUrlInput = shadow.querySelector('#manual-url-input') as HTMLInputElement;
      const manualConnectBtn = shadow.querySelector('#manual-connect-btn') as HTMLButtonElement;

      const progressContainer = shadow.querySelector('#progress-container') as HTMLDivElement;
      const progressBar = shadow.querySelector('#progress-bar') as HTMLDivElement;
      const progressText = shadow.querySelector('#progress-text') as HTMLSpanElement;
      const progressFilename = shadow.querySelector('#progress-filename') as HTMLSpanElement;
      const tier3Section = shadow.querySelector('#android-tier3') as HTMLElement;

      if (Capacitor.getPlatform() !== 'android') {
        tier3Section.style.display = 'none';
      }

      // State
      let endpoints: Record<string, any> = {};
      let connectedEndpointId: string | null = null;

      const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        messagesBox.innerHTML += `<div style="margin-bottom:4px"><span style="color:#8e8e93">[${time}]</span> ${msg}</div>`;
        messagesBox.scrollTop = messagesBox.scrollHeight;
      };

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
          const strategy = strategySelect.value as any;
          await OfflineTransfer.setStrategy({ strategy });
          await OfflineTransfer.initialize({ serviceId: 'picsa-offline' });

          setupListeners();

          [advertiseBtn, discoveryBtn, stopBtn].forEach((b) => (b.disabled = false));
          addLog(`Initialized with ${strategy}`);
        } catch (e: any) {
          addLog(`Init Error: ${e.message}`);
        }
      });

      // Discovery & Advertising
      advertiseBtn.addEventListener('click', async () => {
        try {
          await OfflineTransfer.startAdvertising({ displayName: 'Device_' + Math.floor(Math.random() * 100) });
          addLog('Advertising started...');
        } catch (e: any) {
          addLog(`Error: ${e.message}`);
        }
      });

      discoveryBtn.addEventListener('click', async () => {
        try {
          await OfflineTransfer.startDiscovery();
          addLog('Discovery started...');
        } catch (e: any) {
          addLog(`Error: ${e.message}`);
        }
      });

      manualConnectBtn.addEventListener('click', async () => {
        try {
          const url = manualUrlInput.value.trim();
          if (!url) return;
          addLog(`Manually connecting to ${url}...`);
          await OfflineTransfer.connectByAddress({ url });
        } catch (e: any) {
          addLog(`Manual Connect Error: ${e.message}`);
        }
      });

      stopBtn.addEventListener('click', async () => {
        await OfflineTransfer.stopAdvertising();
        await OfflineTransfer.stopDiscovery();
        await OfflineTransfer.disconnect();
        endpoints = {};
        connectedEndpointId = null;
        updateDevicesUI();
        [sendBtn, sendFileBtn].forEach((b) => (b.disabled = true));
        addLog('Stopped all P2P activities');
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
          const info = await OfflineTransfer.startServer({ port: 8080 });
          addLog(`SERVER: ${info.url}`);
        } catch (e: any) {
          addLog(`Server Error: ${e.message}`);
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
          }
          updateDevicesUI();
        });

        OfflineTransfer.addListener('connectionRequested', (ev) => {
          addLog(`Conn Request: ${ev.endpointName}. Accepting...`);
          OfflineTransfer.acceptConnection({ endpointId: ev.endpointId });
        });

        OfflineTransfer.addListener('connectionResult', (ev) => {
          if (ev.status === 'SUCCESS') {
            connectedEndpointId = ev.endpointId;
            [sendBtn, sendFileBtn].forEach((b) => (b.disabled = false));
            addLog(`Connected to ${ev.endpointId}`);
          } else {
            addLog(`Connection failed/rejected: ${ev.status}`);
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
