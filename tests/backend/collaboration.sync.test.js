// TEST-ONLY FILE — never imported by /backend/src or /frontend/src

import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import * as Y from 'yjs';

// Inline collaboration handler to avoid ES module import issues in Jest
import { registerCollaborationHandlers } from '../../backend/src/services/collaborationService.js';

let httpServer;
let io;
let serverUrl;

function waitForEvent(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), 5000);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

beforeAll((done) => {
  httpServer = createServer();
  io = new Server(httpServer, { cors: { origin: '*' } });
  registerCollaborationHandlers(io);
  httpServer.listen(0, () => {
    serverUrl = `http://localhost:${httpServer.address().port}`;
    done();
  });
});

afterAll((done) => {
  io.close();
  httpServer.close(done);
});

test('two clients can sync a Yjs document update', async () => {
  const clientA = ioClient(serverUrl, { transports: ['websocket'] });
  const clientB = ioClient(serverUrl, { transports: ['websocket'] });

  // Connect both clients
  await Promise.all([
    waitForEvent(clientA, 'connect'),
    waitForEvent(clientB, 'connect'),
  ]);

  // Both join the same doc
  clientA.emit('join', { docId: 'test-sync-doc' });
  clientB.emit('join', { docId: 'test-sync-doc' });

  // Wait for initial sync on both
  const [syncA, syncB] = await Promise.all([
    waitForEvent(clientA, 'doc:sync'),
    waitForEvent(clientB, 'doc:sync'),
  ]);

  expect(syncA.update).toBeDefined();
  expect(syncB.update).toBeDefined();

  // Client A creates a Yjs doc and inserts text
  const ydocA = new Y.Doc();
  const textA = ydocA.getText('content');

  let updatePayload;
  ydocA.on('update', (update) => {
    updatePayload = Buffer.from(update).toString('base64');
  });

  // Listen on B for the relayed update before A sends
  const updateBPromise = waitForEvent(clientB, 'doc:update');

  textA.insert(0, 'hello from A');

  clientA.emit('doc:update', { docId: 'test-sync-doc', update: updatePayload });

  const receivedByB = await updateBPromise;
  expect(receivedByB.update).toBe(updatePayload);

  // Apply to B's local doc and verify text
  const ydocB = new Y.Doc();
  const decoded = Buffer.from(receivedByB.update, 'base64');
  Y.applyUpdate(ydocB, decoded);
  expect(ydocB.getText('content').toString()).toBe('hello from A');

  clientA.disconnect();
  clientB.disconnect();
}, 10000);

test('awareness update is broadcast to other clients', async () => {
  const clientA = ioClient(serverUrl, { transports: ['websocket'] });
  const clientB = ioClient(serverUrl, { transports: ['websocket'] });

  await Promise.all([
    waitForEvent(clientA, 'connect'),
    waitForEvent(clientB, 'connect'),
  ]);

  clientA.emit('join', { docId: 'test-awareness-doc' });
  clientB.emit('join', { docId: 'test-awareness-doc' });

  await Promise.all([
    waitForEvent(clientA, 'doc:sync'),
    waitForEvent(clientB, 'doc:sync'),
  ]);

  const { Awareness, encodeAwarenessUpdate } = await import('y-protocols/awareness');
  const ydoc = new Y.Doc();
  const awareness = new Awareness(ydoc);
  awareness.setLocalStateField('user', { name: 'User1', color: '#3b82f6' });

  const update = encodeAwarenessUpdate(awareness, [awareness.clientID]);
  const encoded = Buffer.from(update).toString('base64');

  const updateBPromise = waitForEvent(clientB, 'awareness:update');

  clientA.emit('awareness:update', { docId: 'test-awareness-doc', update: encoded });

  const receivedByB = await updateBPromise;
  expect(receivedByB.update).toBe(encoded);

  clientA.disconnect();
  clientB.disconnect();
}, 10000);
