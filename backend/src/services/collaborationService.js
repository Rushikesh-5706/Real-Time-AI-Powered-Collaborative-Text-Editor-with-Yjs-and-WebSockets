import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';

// In-memory stores: one Y.Doc and one Awareness per documentId
const docs = new Map();
const awarenesses = new Map();

// Map socket.id → { docId, yjsClientId } for proper awareness cleanup on disconnect
const socketMeta = new Map();

function getOrCreateDoc(docId) {
  if (!docs.has(docId)) {
    const ydoc = new Y.Doc();
    docs.set(docId, ydoc);
    const awareness = new awarenessProtocol.Awareness(ydoc);
    awarenesses.set(docId, awareness);
  }
  return { ydoc: docs.get(docId), awareness: awarenesses.get(docId) };
}

export function registerCollaborationHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('join', ({ docId, clientId }) => {
      try {
        const { ydoc, awareness } = getOrCreateDoc(docId);
        socket.join(docId);

        // Store meta so we can clean up on disconnect
        socketMeta.set(socket.id, { docId, yjsClientId: clientId });

        // Send current document state to the newly joined client
        const stateUpdate = Y.encodeStateAsUpdate(ydoc);
        const encoded = Buffer.from(stateUpdate).toString('base64');
        socket.emit('doc:sync', { update: encoded });

        console.log(`socket ${socket.id} joined doc ${docId} yjsClientId=${clientId}`);
      } catch (err) {
        console.error(`join error docId=${docId} socketId=${socket.id}`, err.message);
      }
    });

    socket.on('doc:update', ({ docId, update }) => {
      try {
        const { ydoc } = getOrCreateDoc(docId);
        const decoded = Buffer.from(update, 'base64');
        Y.applyUpdate(ydoc, decoded);
        // Relay the same encoded payload — pure CRDT relay, not a re-derivation
        socket.to(docId).emit('doc:update', { update });
      } catch (err) {
        console.error(`doc:update error docId=${docId} socketId=${socket.id}`, err.message);
      }
    });

    socket.on('awareness:update', ({ docId, update }) => {
      try {
        const { awareness } = getOrCreateDoc(docId);
        const decoded = Buffer.from(update, 'base64');
        awarenessProtocol.applyAwarenessUpdate(awareness, decoded, socket.id);
        // Relay the same encoded payload to the rest of the room
        socket.to(docId).emit('awareness:update', { update });
      } catch (err) {
        console.error(`awareness:update error docId=${docId} socketId=${socket.id}`, err.message);
      }
    });

    socket.on('disconnect', () => {
      try {
        const meta = socketMeta.get(socket.id);
        if (meta) {
          const { docId, yjsClientId } = meta;
          socketMeta.delete(socket.id);

          if (yjsClientId && docs.has(docId)) {
            const { awareness } = getOrCreateDoc(docId);

            // Build a null-state update for this client before removing
            const removalUpdate = awarenessProtocol.encodeAwarenessUpdate(
              awareness,
              [yjsClientId]
            );
            // Remove from server-side awareness
            awarenessProtocol.removeAwarenessStates(awareness, [yjsClientId], 'disconnect');

            // Broadcast the removal to the rest of the room
            const encoded = Buffer.from(removalUpdate).toString('base64');
            socket.to(docId).emit('awareness:update', { update: encoded });
          }

          console.log(`socket ${socket.id} disconnected from doc ${meta.docId}`);
        }
      } catch (err) {
        console.error(`disconnect error socketId=${socket.id}`, err.message);
      }
    });
  });
}

export { docs, awarenesses };
