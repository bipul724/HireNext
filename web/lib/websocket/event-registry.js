import { useEditorStore } from '../../store/use-editor-store';
import { usePresenceStore } from '../../store/use-presence-store';
import { useRoomStore } from '../../store/use-room-store';
import { useExecutionStore } from '../../store/use-execution-store';

export function handleSocketEvent(message) {
  if (!message || !message.type) return;

  const { type, payload } = message;

  switch (type) {
    case 'editor:init':
      if (payload && typeof payload.code === 'string') {
        useEditorStore.getState().setCode(payload.code);
      }
      if (payload && payload.language) {
        useEditorStore.getState().setLanguage(payload.language);
      }
      break;

    case 'editor:change':
      if (payload && typeof payload.code === 'string') {
        useEditorStore.getState().setCode(payload.code);
      }
      if (payload && payload.language) {
        useEditorStore.getState().setLanguage(payload.language);
      }
      break;

    case 'presence:sync':
      if (payload) {
        usePresenceStore.getState().setAllUsers(payload);
      }
      break;

    case 'presence:join':
      if (payload && payload.email) {
        usePresenceStore.getState().addUser(payload);
      }
      break;

    case 'presence:leave':
      if (payload && payload.email) {
        usePresenceStore.getState().removeUser(payload.email);
      }
      break;

    case 'room:sync':
      if (payload) {
        useRoomStore.getState().syncRoomStatus(payload);
      }
      break;

    case 'code:running':
      useExecutionStore.getState().setRunning(payload);
      break;

    case 'code:result':
      if (payload) {
        useExecutionStore.getState().setResult(payload);
      }
      break;



    default:
      // Ignore unhandled events
      console.warn('[Event Registry] Unhandled event type:', type);
      break;
  }
}
