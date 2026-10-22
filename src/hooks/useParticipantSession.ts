import { useSyncExternalStore } from 'react';
import { participantServices } from '../services/session';

export const useParticipantSession = () => useSyncExternalStore(participantServices.subscribe, participantServices.getSnapshot);
