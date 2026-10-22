import { useState } from 'react';
import { Check, Clover, Copy, Plus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { TicketEntry } from '../types';

interface Props {
  ticket: TicketEntry;
  selected?: boolean;
  onToggle?: () => void;
  assigned?: boolean;
  issuedAt?: string;
}

export default function TicketCard({ ticket, selected = false, onToggle, assigned = false, issuedAt }: Props) {
  const [copyStatus, setCopyStatus] = useState('');
  // The QR is a demo reference only. Never put participant, phone or authentication data here.
  const qrValue = `bilhetou:demo:v1:${ticket.campaignId}:${ticket.serial}`;
  async function copySerial() {
    try { await navigator.clipboard.writeText(ticket.serial); setCopyStatus('Copiado!'); }
    catch { setCopyStatus('Não foi possível copiar. Use o serial exibido.'); }
  }
  return <article className={`ticket-card ${selected ? 'is-selected' : ''}`} aria-label={`Bilhete ${ticket.serial}`}>
    <div className="ticket-top"><div><span className="ticket-brand"><Clover size={15}/> BILHETOU</span><span className="ticket-note">BILHETE DEMONSTRATIVO</span></div>
      <span className={`ticket-seal ${selected ? 'selected-seal' : ''}`}>{assigned ? 'Atribuído · demo' : selected ? 'Selecionado' : 'Disponível'}</span>
    </div>
    <div className="ticket-numbers">{ticket.numbers.map((number, i) => <div key={i}>{number}</div>)}</div>
    <div className="ticket-perf"/>
    <div className="ticket-bottom"><div><small>Nº DO BILHETE</small><strong>{ticket.serial}</strong></div><div><small>APURAÇÃO FICTÍCIA</small><strong>{ticket.date}</strong></div>
      {assigned && <button type="button" aria-label={`Copiar serial ${ticket.serial}`} onClick={copySerial}><Copy size={17}/></button>}
    </div>
    {copyStatus && <p className="copy-feedback" role="status">{copyStatus}</p>}
    {assigned && <div className="ticket-validation"><QRCodeSVG value={qrValue} size={88} level="M" marginSize={2} title={`QR Code demonstrativo do bilhete ${ticket.serial}`}/><div><strong>Validação demonstrativa</strong><p>{ticket.campaignName}</p>{issuedAt && <p>Emitido em {new Date(issuedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>}<small>Sem validade em sorteio real.</small></div></div>}
    {onToggle && <div className="ticket-select"><button className={`btn wide ${selected ? 'outline' : 'primary'}`} type="button" aria-pressed={selected} aria-label={`${selected ? 'Remover' : 'Selecionar'} ${ticket.serial}`} onClick={onToggle}>{selected ? <Check size={17}/> : <Plus size={17}/>} {selected ? 'Remover seleção' : 'Selecionar'}</button></div>}
  </article>;
}
