import { useState } from 'react';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { deleteApiCampaign, type ApiCampaign } from '../services/ticketCreationApi';

export default function DeleteCampaign({ campaign, onDeleted }: { campaign: ApiCampaign; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await deleteApiCampaign(campaign.id);
      onDeleted();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível excluir a campanha.');
      setBusy(false);
    }
  }

  return <div className="campaign-delete">
    {!confirming ? <button type="button" className="btn danger-outline" aria-label={`Excluir campanha ${campaign.name}`} onClick={() => setConfirming(true)}><Trash2 size={17}/> Excluir campanha</button> : <div className="campaign-delete-confirm" role="group" aria-label={`Confirmar exclusão de ${campaign.name}`}>
      <strong>Excluir “{campaign.name}”?</strong>
      <p>A campanha sairá das listas e não aceitará novos pedidos. Pedidos, pagamentos e bilhetes já registrados serão preservados no histórico.</p>
      <div className="creation-actions">
        <button type="button" className="btn danger" disabled={busy} onClick={remove}>{busy ? <><LoaderCircle size={17} className="spin"/> Excluindo...</> : <><Trash2 size={17}/> Confirmar exclusão</>}</button>
        <button type="button" className="btn outline" disabled={busy} onClick={() => { setConfirming(false); setError(''); }}>Cancelar</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>}
  </div>;
}
