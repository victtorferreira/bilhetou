import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useParticipantSession } from '../hooks/useParticipantSession';
import { participantServices } from '../services/session';

export default function BackendState() {
  const { loading, error } = useParticipantSession();
  return <div className="flow-card" role="status">{loading ? <p className="loading-message"><LoaderCircle className="spin" size={20}/> Conectando ao Bilhetou...</p> : <><p className="form-error">{error || 'Não foi possível carregar os dados.'}</p><button className="btn outline" onClick={() => { void participantServices.refresh(); }}><RefreshCw size={17}/> Tentar novamente</button></>}</div>;
}
