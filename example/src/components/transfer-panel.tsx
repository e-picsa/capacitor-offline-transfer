import { Camera, CameraResultType } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { OfflineTransfer } from '@picsa/capacitor-offline-transfer';
import { useSignal, signal } from '@preact/signals';
import { html } from 'htm/preact';
import type { FunctionComponent } from 'preact';

import { connectedEndpointId, activeTransfers } from '../state';
import { logService, errMsg } from '../state/log.service';

import { ProgressBar } from './ui/progress-bar';

export const TransferPanel: FunctionComponent = () => {
  const message = useSignal('');
  const progressState = signal({ visible: false, percent: 0, filename: '', status: '' });
  const isAndroid = signal(typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent));

  const handleSendMessage = async () => {
    if (!message.value.trim() || !connectedEndpointId.value) return;
    try {
      await OfflineTransfer.sendMessage({ endpointId: connectedEndpointId.value, data: message.value });
      logService.info(`SENT: ${message.value}`);
      message.value = '';
    } catch (e: unknown) {
      logService.error(`Send Error: ${errMsg(e)}`);
    }
  };

  const handleSendFile = async () => {
    if (!connectedEndpointId.value) {
      logService.warn('No connected device');
      return;
    }
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
      });
      if (image.path) {
        progressState.value = { visible: true, percent: 0, filename: 'Preparing...', status: '' };
        logService.info(`Sending: ${image.path}`);
        await OfflineTransfer.sendFile({
          endpointId: connectedEndpointId.value,
          filePath: image.path,
          fileName: `photo_${Date.now()}.jpg`,
        });
      }
    } catch (e: unknown) {
      progressState.value = { ...progressState.value, visible: false };
      logService.error(`Camera/File Error: ${errMsg(e)}`);
    }
  };

  const handleShare = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
      });
      if (image.path) {
        const canShare = await Share.canShare();
        if (!canShare.value) {
          logService.error('Sharing not available on this device');
          return;
        }
        await Share.share({ title: 'Share via Bluetooth/Nearby Share', files: [image.path] });
        logService.success('Shared via system share sheet');
      }
    } catch (e: unknown) {
      logService.error(`Share Error: ${errMsg(e)}`);
    }
  };

  const ts = activeTransfers.value;
  const firstT = ts ? Object.values(ts)[0] : null;
  const pct = firstT ? Math.round((firstT.bytesTransferred / firstT.totalBytes) * 100) : 0;
  const showProgress = !!firstT && firstT.status === 'IN_PROGRESS';

  return html`
    <section>
      <h2 class="text-lg font-semibold mb-3">3. Transfer</h2>

      <div class="mb-4">
        <label class="block text-sm text-gray-600 mb-1">Text Message</label>
        <div class="flex gap-2">
          <input
            type="text"
            class="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="Type here..."
            value=${message.value}
            onInput=${(e: Event) => {
              message.value = (e.target as HTMLInputElement).value;
            }}
            onKeyDown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            disabled=${!connectedEndpointId.value}
          />
          <button
            class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-sm disabled:opacity-50"
            onClick=${handleSendMessage}
            disabled=${!connectedEndpointId.value || !message.value.trim()}
          >
            Send
          </button>
        </div>
      </div>

      <div class="mb-4">
        <label class="block text-sm text-gray-600 mb-1">File Transfer</label>
        <button
          class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded text-sm border border-gray-300 disabled:opacity-50"
          onClick=${handleSendFile}
          disabled=${!connectedEndpointId.value}
        >
          Pick &amp; Send Image
        </button>
      </div>

      <${ProgressBar}
        percent=${pct}
        filename=${showProgress ? 'Transferring...' : firstT?.status}
        status=${showProgress ? `${pct}%` : ''}
        visible=${showProgress}
      />

      ${isAndroid.value
        ? html`
            <div class="mt-4">
              <button
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded text-sm border border-gray-300"
                onClick=${handleShare}
              >
                Share via System
              </button>
            </div>
          `
        : ''}
    </section>
  `;
};
