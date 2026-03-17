import { Camera, CameraResultType } from '@capacitor/camera';
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
      :host {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        display: block;
        width: 100%;
        height: 100%;
        background: #f4f7f9;
        color: #333;
      }
      h1, h2, h3, h4, h5 {
        text-transform: uppercase;
        margin: 0 0 10px 0;
      }
      .button {
        display: inline-block;
        padding: 10px 15px;
        background-color: #007aff;
        color: #fff;
        font-size: 0.85em;
        font-weight: 600;
        border: 0;
        border-radius: 8px;
        text-decoration: none;
        cursor: pointer;
        margin: 4px;
        transition: opacity 0.2s;
      }
      .button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }
      .button.secondary {
        background-color: #5856d6;
      }
      .button.danger {
        background-color: #ff3b30;
      }
      .message-box {
        background: #fff;
        border: 1px solid #d1d1d6;
        border-radius: 8px;
        padding: 12px;
        margin-top: 10px;
        height: 250px;
        overflow-y: auto;
        font-family: monospace;
        font-size: 0.8em;
      }
      .device-list {
        background: #fff;
        border: 1px solid #d1d1d6;
        border-radius: 8px;
        padding: 8px;
        margin-top: 10px;
        max-height: 120px;
        overflow-y: auto;
      }
      .device-item {
        padding: 10px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .device-item:last-child { border-bottom: 0; }
      .device-item:hover { background-color: #f9f9f9; }
      
      main {
        padding: 20px;
        max-width: 600px;
        margin: 0 auto;
      }
      section {
        background: #fff;
        padding: 15px;
        border-radius: 12px;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .field { margin-bottom: 12px; }
      label {
        display: block;
        font-size: 0.75em;
        font-weight: 700;
        color: #8e8e93;
        margin-bottom: 4px;
        text-transform: uppercase;
      }
      input, select {
        width: 100%;
        padding: 10px;
        border: 1px solid #d1d1d6;
        border-radius: 8px;
        box-sizing: border-box;
        font-size: 1em;
      }
      .progress-container {
        margin-top: 15px;
        padding: 10px;
        background: #f0f0f5;
        border-radius: 8px;
      }
      .progress-bg {
        width: 100%;
        height: 8px;
        background: #e5e5ea;
        border-radius: 4px;
        overflow: hidden;
      }
      .progress-fill {
        width: 0%;
        height: 100%;
        background: #34c759;
        transition: width 0.1s;
      }
    </style>
    <div>
      <capacitor-welcome-titlebar>
        <h1>Offline Transfer</h1>
      </capacitor-welcome-titlebar>
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

      // Selectors
      const initBtn = shadow.querySelector('#init-btn');
      const checkPermsBtn = shadow.querySelector('#check-perms');
      const requestPermsBtn = shadow.querySelector('#request-perms');
      const strategySelect = shadow.querySelector('#strategy-select');
      const logLevelSelect = shadow.querySelector('#log-level-select');
      
      const advertiseBtn = shadow.querySelector('#advertise-btn');
      const discoveryBtn = shadow.querySelector('#discovery-btn');
      const stopBtn = shadow.querySelector('#stop-btn');
      
      const messageInput = shadow.querySelector('#message-input');
      const sendBtn = shadow.querySelector('#send-btn');
      const sendFileBtn = shadow.querySelector('#send-file-btn');
      
      const hotspotBtn = shadow.querySelector('#hotspot-btn');
      const serverBtn = shadow.querySelector('#server-btn');
      const stopT3Btn = shadow.querySelector('#stop-t3-btn');

      const devicesList = shadow.querySelector('#devices-list');
      const messagesBox = shadow.querySelector('#messages');
      
      const progressContainer = shadow.querySelector('#progress-container');
      const progressBar = shadow.querySelector('#progress-bar');
      const progressText = shadow.querySelector('#progress-text');
      const progressFilename = shadow.querySelector('#progress-filename');

      // State
      let endpoints = {};
      let connectedEndpointId = null;
      
      const addLog = (msg) => {
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
          const strategy = strategySelect.value;
          await OfflineTransfer.setStrategy({ strategy });
          await OfflineTransfer.initialize({ serviceId: 'com.picsa.offlinetransfer' });
          
          setupListeners();
          
          [advertiseBtn, discoveryBtn, stopBtn].forEach(b => b.disabled = false);
          addLog(`Initialized with ${strategy}`);
        } catch (e) {
          addLog(`Init Error: ${e.message}`);
        }
      });

      // Discovery & Advertising
      advertiseBtn.addEventListener('click', async () => {
        try {
          await OfflineTransfer.startAdvertising({ displayName: 'Device_' + Math.floor(Math.random()*100) });
          addLog('Advertising started...');
        } catch (e) { addLog(`Error: ${e.message}`); }
      });

      discoveryBtn.addEventListener('click', async () => {
        try {
          await OfflineTransfer.startDiscovery();
          addLog('Discovery started...');
        } catch (e) { addLog(`Error: ${e.message}`); }
      });

      stopBtn.addEventListener('click', async () => {
        await OfflineTransfer.stopAdvertising();
        await OfflineTransfer.stopDiscovery();
        await OfflineTransfer.disconnect();
        endpoints = {};
        connectedEndpointId = null;
        updateDevicesUI();
        [sendBtn, sendFileBtn].forEach(b => b.disabled = true);
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
        } catch (e) { addLog(`Send Error: ${e.message}`); }
      });

      sendFileBtn.addEventListener('click', async () => {
        if (!connectedEndpointId) return;
        try {
          const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Uri
          });
          
          if (image.path) {
            addLog(`Sending file: ${image.path}`);
            progressContainer.style.display = 'block';
            progressFilename.textContent = 'Preparing image...';
            
            await OfflineTransfer.sendFile({
              endpointId: connectedEndpointId,
              filePath: image.path,
              fileName: `photo_${Date.now()}.jpg`
            });
          }
        } catch (e) { addLog(`Camera/File Error: ${e.message}`); }
      });

      // Tier 3
      hotspotBtn.addEventListener('click', async () => {
        try {
          const info = await OfflineTransfer.startLocalHotspot();
          addLog(`HOTSPOT: SSID=${info.ssid}, PWD=${info.password}`);
        } catch (e) { addLog(`Hotspot Error: ${e.message}`); }
      });

      serverBtn.addEventListener('click', async () => {
        try {
          const info = await OfflineTransfer.startServer({ port: 8080 });
          addLog(`SERVER: ${info.url}`);
        } catch (e) { addLog(`Server Error: ${e.message}`); }
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
            [sendBtn, sendFileBtn].forEach(b => b.disabled = true);
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
            [sendBtn, sendFileBtn].forEach(b => b.disabled = false);
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
            setTimeout(() => { progressContainer.style.display = 'none'; }, 2000);
          }
        });
      };

      const updateDevicesUI = () => {
        if (Object.keys(endpoints).length === 0) {
          devicesList.innerHTML = '<div style="color: #8e8e93; font-size: 0.9em; padding: 10px;">No devices found yet...</div>';
          return;
        }
        devicesList.innerHTML = '';
        Object.values(endpoints).forEach(ep => {
          const el = document.createElement('div');
          el.className = 'device-item';
          const isConn = connectedEndpointId === ep.endpointId;
          el.innerHTML = `
            <span><strong>${ep.endpointName}</strong></span>
            <button class="button ${isConn ? 'danger' : ''}" style="margin:0; padding: 4px 8px; font-size: 0.7em;">
              ${isConn ? 'Disconnect' : 'Connect'}
            </button>
          `;
          el.querySelector('button').onclick = async () => {
            if (isConn) {
              await OfflineTransfer.disconnectFromEndpoint({ endpointId: ep.endpointId });
            } else {
              addLog(`Connecting to ${ep.endpointName}...`);
              await OfflineTransfer.connect({ endpointId: ep.endpointId, displayName: 'DemoUser' });
            }
          };
          devicesList.appendChild(el);
        });
      };
    }
  }
);

window.customElements.define(
  'capacitor-welcome-titlebar',
  class extends HTMLElement {
    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
    <style>
      :host {
        position: relative;
        display: block;
        padding: 15px 15px 15px 15px;
        text-align: center;
        background-color: #73B5F6;
      }
      ::slotted(h1) {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        font-size: 0.9em;
        font-weight: 600;
        color: #fff;
      }
    </style>
    <slot></slot>
    `;
    }
  }
);
