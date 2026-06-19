import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const NETWORK_ORIGIN = Symbol('network');

export class YjsSocketProvider {
  constructor(docId, username, userColor) {
    this.docId = docId;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this._destroyed = false;

    // Set local awareness state
    this.awareness.setLocalStateField('user', {
      name: username,
      color: userColor,
    });

    this._socket = io(BACKEND_URL, {
      transports: ['websocket'],
    });

    this._setupSocketListeners();
    this._setupDocListeners();
    this._setupAwarenessListeners();
  }

  _setupSocketListeners() {
    this._socket.on('connect', () => {
      // Send clientID so server can clean up awareness on disconnect
      this._socket.emit('join', {
        docId: this.docId,
        clientId: this.doc.clientID,
      });
    });

    // Initial full state sync from server
    this._socket.on('doc:sync', ({ update }) => {
      try {
        const decoded = Uint8Array.from(atob(update), (c) => c.charCodeAt(0));
        Y.applyUpdate(this.doc, decoded, NETWORK_ORIGIN);
      } catch (err) {
        console.error('doc:sync apply error', err.message);
      }
    });

    // Incremental updates relayed from other clients
    this._socket.on('doc:update', ({ update }) => {
      try {
        const decoded = Uint8Array.from(atob(update), (c) => c.charCodeAt(0));
        Y.applyUpdate(this.doc, decoded, NETWORK_ORIGIN);
      } catch (err) {
        console.error('doc:update apply error', err.message);
      }
    });

    // Awareness updates from other clients
    this._socket.on('awareness:update', ({ update }) => {
      try {
        const decoded = Uint8Array.from(atob(update), (c) => c.charCodeAt(0));
        awarenessProtocol.applyAwarenessUpdate(this.awareness, decoded, NETWORK_ORIGIN);
      } catch (err) {
        console.error('awareness:update apply error', err.message);
      }
    });
  }

  _setupDocListeners() {
    this.doc.on('update', (update, origin) => {
      // Skip re-emitting updates that came from the network (echo loop prevention)
      if (origin === NETWORK_ORIGIN) return;
      const encoded = btoa(String.fromCharCode(...update));
      this._socket.emit('doc:update', { docId: this.docId, update: encoded });
    });
  }

  _setupAwarenessListeners() {
    this.awareness.on('update', ({ added, updated, removed }, origin) => {
      if (origin === NETWORK_ORIGIN) return;
      const changedClients = [...added, ...updated, ...removed];
      if (changedClients.length === 0) return;
      const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients);
      const encoded = btoa(String.fromCharCode(...update));
      this._socket.emit('awareness:update', { docId: this.docId, update: encoded });
    });
  }

  destroy() {
    this._destroyed = true;
    this.awareness.destroy();
    this.doc.destroy();
    this._socket.disconnect();
  }
}
