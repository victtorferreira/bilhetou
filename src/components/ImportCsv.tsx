import { useState, type ChangeEvent } from 'react';
import { FileSpreadsheet, Upload, Download } from 'lucide-react';
import type { ImportReport } from '../services/ticketCreationApi';
export interface CsvTicket { serial: string; numbers: string[]; line: number }
export default function ImportCsv({ onImport }: { onImport: (rows: CsvTicket[]) => Promise<ImportReport> }) {
  const [rows, setRows] = useState<CsvTicket[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function read(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setRows([]); setReport(null); setError('');
    if (file.size > 1024 * 1024) { setError('O CSV deve ter no máximo 1 MB.'); return; }
    setBusy(true);
    try {
      const lines = (await file.text()).replace(/^\uFEFF/, '').trimEnd().split(/\r?\n/);
      if (!/^serial[,;]number1[,;]number2[,;]number3[,;]number4$/i.test(lines[0].trim())) throw new Error('Cabeçalho esperado: serial,number1,number2,number3,number4');
      if (lines.length - 1 > 2500) throw new Error('Importe no máximo 2.500 linhas por arquivo.');
      if (lines.length < 2) throw new Error('Nenhum registro encontrado.');
      setRows(lines.slice(1).map((line, i) => {
        const [serial, ...numbers] = line.split(/[,;]/).map(s => s.trim().replace(/^"|"$/g, ''));
        return { serial, numbers, line: i + 2 };
      }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.'); }
    finally { setBusy(false); event.target.value = ''; }
  }
  async function submit() {
    if (busy) return; setBusy(true); setError('');
    try { setReport(await onImport(rows)); setRows([]); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao importar.'); }
    finally { setBusy(false); }
  }
  function download() {
    if (!report) return;
    const csv = ['linha,serial,motivos', ...report.errors.map(e => [String(e.line), e.serial, e.reasons.join(' | ')].map(v => `"'${v.replace(/"/g, '""')}"`).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'bilhetou-erros-importacao.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="csv-area"><div className="upload-box"><FileSpreadsheet size={30}/><h2>Importar bilhetes predefinidos</h2><p>CSV: serial,number1,number2,number3,number4</p><p>Até 1 MB e 2.500 linhas. Os zeros à esquerda são preservados.</p><label className="btn primary" htmlFor="csv">Selecionar arquivo CSV <Upload size={16}/></label><input type="file" id="csv" accept=".csv,text/csv" onChange={read} disabled={busy}/></div>{error && <p className="form-error" role="alert">{error}</p>}{!!rows.length && <><p>{rows.length} linha(s) para validação no servidor.</p><button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Importando...' : 'Validar e importar para o banco'}</button></>}{report && <div role="status"><h3>Resumo da importação</h3><p>Total de linhas: {report.total} · Válidos e cadastrados: {report.created} · Rejeitados: {report.rejected}</p><p>Números duplicados: {report.duplicateNumbers.join(', ') || 'Nenhum'}</p>{!!report.errors.length && <><button className="btn outline" onClick={download}><Download size={16}/> Baixar relatório de erros</button><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Linha</th><th>Serial</th><th>Motivos</th></tr></thead><tbody>{report.errors.map(e => <tr key={e.line}><td>{e.line}</td><td>{e.serial}</td><td>{e.reasons.join(' · ')}</td></tr>)}</tbody></table></div></>}</div>}<p className="table-caption">Cada número só pode pertencer a um bilhete por campanha. Linhas inválidas são rejeitadas.</p></div>;
}
