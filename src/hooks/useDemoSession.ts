import { useSyncExternalStore } from 'react';
import { demoServices } from '../services/session';

export const useDemoSession = () => useSyncExternalStore(demoServices.subscribe, demoServices.getSnapshot);
