import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clover, LoaderCircle, MessageCircle, ShieldCheck, UserRound } from 'lucide-react';
import { participantServices } from '../services/session';
import { useParticipantSession } from '../hooks/useParticipantSession';
import { maskPhone, normalizeName, validateName, validatePhone } from '../lib/format';

export default function Register() {
  const { participant } = useParticipantSession();
  const [name, setName] = useState(participant?.name ?? '');
  const [phone, setPhone] = useState(maskPhone(participant?.phone ?? ''));
  const [errors, setErrors] = useState<{ name?: string; phone?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { if (participant) { setName(participant.name); setPhone(maskPhone(participant.phone)); } }, [participant?.id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const normalized = normalizeName(name);
    setName(normalized);
    const validation = {
      name: validateName(normalized) ? undefined : 'Informe seu nome completo, com pelo menos dois nomes.',
      phone: validatePhone(phone) ? undefined : 'Informe um WhatsApp válido com DDD e 11 dígitos. Ex.: (98) 99999-9999.',
    };
    setErrors(validation);
    if (validation.name || validation.phone) return;
    setBusy(true);
    try { await participantServices.participants.register(normalized, phone); navigate('/bilhetes'); }
    catch (error) { setErrors({ form: error instanceof Error ? error.message : 'Não foi possível continuar. Tente novamente.' }); }
    finally { setBusy(false); }
  }

  return <section className="register-section"><div className="register-intro"><span className="eyebrow">SIMPLES. DIGITAL. DO SEU JEITO.</span><h1>Seus bilhetes,<br/>a poucos <em>cliques.</em></h1><p>Cadastre-se, escolha seus bilhetes e conheça a experiência Bilhetou.</p><div className="register-perks"><span><Clover size={18}/> Quatro números por bilhete</span><span><ShieldCheck size={18}/> Seus bilhetes em um só lugar</span></div></div>
    <div className="flow-card register-card"><div className="auth-mark"><Clover size={30}/></div><span className="eyebrow">VAMOS COMEÇAR</span><h1>Bem-vindo ao<br/>Bilhetou!</h1><p className="muted">Faça seu cadastro para visualizar os bilhetes disponíveis.</p>
      <form onSubmit={submit} noValidate aria-busy={busy}>
        <label htmlFor="full-name">Nome completo</label><div className={`field ${errors.name ? 'invalid-field' : ''}`}><UserRound size={19}/><input id="full-name" name="name" required autoComplete="name" maxLength={120} value={name} onChange={event => { setName(event.target.value); setErrors(current => ({ ...current, name: undefined })); }} onBlur={() => setName(normalizeName(name))} placeholder="Digite seu nome completo" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined}/></div>
        {errors.name && <p id="name-error" className="input-error" role="alert">{errors.name}</p>}
        <label htmlFor="whatsapp">WhatsApp</label><div className={`field ${errors.phone ? 'invalid-field' : ''}`}><MessageCircle size={19}/><input id="whatsapp" name="tel" type="tel" required autoComplete="tel-national" inputMode="tel" value={phone} onChange={event => { setPhone(maskPhone(event.target.value)); setErrors(current => ({ ...current, phone: undefined })); }} placeholder="(98) 99999-9999" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'phone-error' : undefined}/></div>
        {errors.phone && <p id="phone-error" className="input-error" role="alert">{errors.phone}</p>}
        {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
        {participant && <p className="session-hint">Você pode continuar com seu cadastro atual. Alterar os dados cria outro cadastro.</p>}
        <button className="btn primary wide register-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={18}/> Continuando...</> : <>CONTINUAR <ArrowRight size={19}/></>}</button>
      </form>
      <p className="privacy"><ShieldCheck size={18}/><span>Seus dados são usados para identificar seu cadastro e vincular seus bilhetes.</span></p>
    </div>
  </section>;
}
