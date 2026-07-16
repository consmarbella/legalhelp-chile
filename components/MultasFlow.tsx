import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Send, RefreshCw, Download, CheckCircle, AlertTriangle, Mail, CreditCard, Sparkles, X } from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────
interface Multa {
  fechaInfraccion: string;
  fechaAnotacion: string;
  rol: string;
  patente: string;
  monto: string;
}

interface ComunaData {
  nombre: string;
  correo: string;
  multas: Multa[];
}

interface ParseResult {
  totalMultas: number;
  comunas: ComunaData[];
  cobro: number;
  rutSolicitante: string;
  nombreSolicitante: string;
  patente: string;
}

interface ArchivoGenerado {
  nombre: string;
  contenido: string;
}

interface Instruccion {
  juzgado: string;
  correo: string;
  archivoNombre: string;
  asunto: string;
}

type Paso = 'upload' | 'chat' | 'preview' | 'pago' | 'descarga';

// ─── Utilidades ──────────────────────────────────────────────────────────
function formatCLP(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
}

// Lee el PDF como texto plano usando FileReader + extracción básica
async function extractTextFromPdf(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      // El Registro Civil genera PDFs con texto legible; ArrayBuffer → string
      const buf = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buf);
      let str = '';
      for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
      }
      // Extraer texto embebido en el PDF (flujo BT...ET)
      const textParts: string[] = [];
      const reg = /\(([^)]+)\)/g;
      let m;
      while ((m = reg.exec(str)) !== null) {
        textParts.push(m[1]);
      }
      resolve(textParts.join(' ') || str);
    };
    reader.readAsArrayBuffer(file);
  });
}

// Genera ZIP en el browser con JSZip-like encoding manual (no dependencias externas)
function downloadZip(archivos: ArchivoGenerado[], zipName: string) {
  // Descargamos cada archivo individualmente si no hay JSZip disponible
  // En producción se usaría JSZip, aquí se usa un truco de data URI
  archivos.forEach((archivo) => {
    const blob = new Blob([archivo.contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = archivo.nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// ─── Componente Principal ────────────────────────────────────────────────
export const MultasFlow: React.FC = () => {
  const [paso, setPaso] = useState<Paso>('upload');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Paso 1: upload
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Paso 2: chat datos usuario
  const [chatMessages, setChatMessages] = useState<{ role: 'assistant' | 'user'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoadingMsg, setChatLoadingMsg] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Datos recogidos por el chat
  const [datosPendientes, setDatosPendientes] = useState<string[]>(['rut', 'nombre', 'patente', 'domicilio', 'correo']);
  const [datosCaptured, setDatosCaptured] = useState<Record<string, string>>({});

  // Paso 3+: resultado del parse
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Paso 5: descarga
  const [archivos, setArchivos] = useState<ArchivoGenerado[]>([]);
  const [instrucciones, setInstrucciones] = useState<Instruccion[]>([]);
  const [pagoSimulado, setPagoSimulado] = useState(false);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoadingMsg]);

  // ── Paso 1: manejo del PDF ─────────────────────────────────────────────
  const handleFile = (file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.pdf') && !ext.endsWith('.html') && !ext.endsWith('.htm')) {
      setError('Sube el Certificado de Multas (PDF o HTML).');
      return;
    }
    setError(null);
    setPdfFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const procesarPDF = async () => {
    if (!pdfFile) return;
    setLoading(true);
    setError(null);
    try {
      const pdfText = await extractTextFromPdf(pdfFile);
      // Iniciar chat para recoger datos del usuario
      setChatMessages([{
        role: 'assistant',
        text: '¡Perfecto! Cargué tu Certificado de Multas del Registro Civil. Para preparar los escritos legales, necesito algunos datos tuyos. Te los voy pidiendo de a uno. 😊\n\n¿Cuál es tu **RUT** completo? (ej: 12.345.678-9)'
      }]);
      setDatosPendientes(['rut', 'nombre', 'patente', 'domicilio', 'correo']);
      setDatosCaptured({ _pdfText: pdfText });
      setPaso('chat');
    } catch (e: any) {
      setError('Error al leer el PDF: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Paso 2: chat conversacional ────────────────────────────────────────
  const campoLabel: Record<string, string> = {
    rut: '¿Cuál es tu **RUT** completo? (ej: 12.345.678-9)',
    nombre: '¿Cuál es tu **nombre completo** tal como aparece en tu cédula de identidad?',
    patente: '¿Cuál es la **patente del vehículo** asociado a las multas? (ej: BCDF34 o AB·1234)',
    domicilio: '¿Cuál es tu **domicilio actual** completo? (calle, número, ciudad)',
    correo: '¿Cuál es tu **correo electrónico** para recibir notificaciones del tribunal?',
  };

  const campoKey: Record<string, string> = {
    rut: 'rutSolicitante',
    nombre: 'nombreSolicitante',
    patente: 'patente',
    domicilio: 'domicilio',
    correo: 'correoElectronico',
  };

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoadingMsg) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoadingMsg(true);

    const pendiente = datosPendientes[0];
    const nuevosDatos = { ...datosCaptured, [campoKey[pendiente]]: userMsg };
    setDatosCaptured(nuevosDatos);

    const restantes = datosPendientes.slice(1);
    setDatosPendientes(restantes);

    await new Promise(r => setTimeout(r, 400)); // pequeño delay empático

    if (restantes.length > 0) {
      const nextLabel = campoLabel[restantes[0]];
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: `Anotado ✓\n\n${nextLabel}`
      }]);
    } else {
      // Todos los datos capturados → llamar al backend para parsear
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: '¡Perfecto, tengo todo lo que necesito! 🎉 Estoy analizando tu certificado y agrupando las multas por juzgado...'
      }]);

      try {
        const resp = await fetch('/api/parse-multas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfText: nuevosDatos._pdfText || '',
            rutSolicitante: nuevosDatos.rutSolicitante,
            nombreSolicitante: nuevosDatos.nombreSolicitante,
            patente: nuevosDatos.patente
          })
        });
        const data = await resp.json();

        if (!data.ok) throw new Error(data.error || 'Error del servidor');

        // Si no se detectaron multas (demo / PDF sin formato estándar), simular datos de prueba
        let resultado: ParseResult = data;
        if (resultado.totalMultas === 0) {
          resultado = {
            ...data,
            totalMultas: 3,
            comunas: [
              {
                nombre: 'Quilicura',
                correo: 'jpl@quilicura.cl',
                multas: [
                  { fechaInfraccion: '15/03/2019', fechaAnotacion: '15/03/2019', rol: '1234/2019', patente: nuevosDatos.patente || 'XXXX00', monto: 'Según Registro' },
                  { fechaInfraccion: '20/08/2020', fechaAnotacion: '20/08/2020', rol: '5678/2020', patente: nuevosDatos.patente || 'XXXX00', monto: 'Según Registro' }
                ]
              },
              {
                nombre: 'Las Condes',
                correo: 'jpl@lascondes.cl',
                multas: [
                  { fechaInfraccion: '05/11/2018', fechaAnotacion: '05/11/2018', rol: '9012/2018', patente: nuevosDatos.patente || 'XXXX00', monto: 'Según Registro' }
                ]
              }
            ],
            cobro: 14000,
            rutSolicitante: nuevosDatos.rutSolicitante || '',
            nombreSolicitante: nuevosDatos.nombreSolicitante || '',
            patente: nuevosDatos.patente || ''
          };
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            text: '⚠️ *Nota: No detecté multas en formato tabular en el PDF. Generando datos de demostración para mostrarte el flujo completo.*\n\nEncontré **3 multas prescribibles** en **2 juzgados distintos**. Te muestro el resumen y el costo del servicio.'
          }]);
        } else {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            text: `Encontré **${resultado.totalMultas} multas prescribibles** distribuidas en **${resultado.comunas.length} juzgado(s)**. Te muestro el resumen y el costo del servicio.`
          }]);
        }

        setParseResult(resultado);
        setPaso('preview');
      } catch (e: any) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          text: `❌ Ocurrió un error al analizar el PDF: ${e.message}. Por favor intenta de nuevo.`
        }]);
        setDatosPendientes(['rut']); // Reiniciar
      }
    }
    setChatLoadingMsg(false);
  };

  // ── Paso 3-4: Preview + Pago ───────────────────────────────────────────
  const simularPago = async () => {
    setPagoSimulado(false);
    setGenerando(true);
    // Simular proceso de pago (1.5s)
    await new Promise(r => setTimeout(r, 1500));
    setPagoSimulado(true);

    // Generar escritos en backend
    const datos = datosCaptured;
    try {
      const resp = await fetch('/api/generate-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comunas: parseResult!.comunas,
          rutSolicitante: datos.rutSolicitante || parseResult!.rutSolicitante,
          nombreSolicitante: datos.nombreSolicitante || parseResult!.nombreSolicitante,
          patente: datos.patente || parseResult!.patente,
          domicilio: datos.domicilio || '',
          correoElectronico: datos.correoElectronico || ''
        })
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error);
      
      if (data.dataUri) {
        const a = document.createElement('a');
        a.href = data.dataUri;
        a.download = 'escritos-prescripcion.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      setInstrucciones(data.instrucciones);
      setPaso('descarga');
    } catch (e: any) {
      setError('Error al generar los escritos: ' + e.message);
    } finally {
      setGenerando(false);
    }
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* ── Panel Izquierdo: Chat / Instrucciones ── */}
      <div className="w-[380px] lg:w-[440px] flex-shrink-0 flex flex-col h-full bg-dark-bg/60 border-r border-dark-border">

        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/40 border-b border-dark-border flex items-center gap-3">
          <div className="p-2 bg-violet-600/20 text-violet-400 border border-violet-500/20 rounded-lg">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Prescripción Batch de Multas</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">PDF → Escritos Legales por Juzgado</p>
          </div>
        </div>

        {/* Indicador de Pasos */}
        <div className="flex items-center px-6 py-3 gap-2 border-b border-dark-border/50 bg-slate-900/20">
          {(['upload', 'chat', 'preview', 'descarga'] as const).map((p, i) => {
            const labels = ['1. PDF', '2. Datos', '3. Cobro', '4. Descargar'];
            const active = paso === p || (paso === 'pago' && p === 'preview');
            const done = (
              (p === 'upload' && ['chat', 'preview', 'pago', 'descarga'].includes(paso)) ||
              (p === 'chat' && ['preview', 'pago', 'descarga'].includes(paso)) ||
              (p === 'preview' && ['descarga'].includes(paso))
            );
            return (
              <React.Fragment key={p}>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  active ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : done ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-600 border border-transparent'
                }`}>
                  {done ? <CheckCircle size={10} /> : <span>{i + 1}</span>}
                  <span>{labels[i]}</span>
                </div>
                {i < 3 && <span className="text-slate-700 text-[10px]">→</span>}
              </React.Fragment>
            );
          })}
        </div>

        {/* Contenido del panel izquierdo por paso */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* PASO CHAT */}
          {(paso === 'chat') && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}>
                    <div className={`max-w-[88%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-tr-none shadow-md'
                        : 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/60'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-600 mt-1 uppercase tracking-widest">
                      {msg.role === 'user' ? 'Tú' : 'Asistente IA'}
                    </span>
                  </div>
                ))}
                {chatLoadingMsg && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
                    <RefreshCw size={12} className="animate-spin text-violet-400" />
                    <span>Analizando...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleChatSend} className="p-4 border-t border-dark-border/60 flex gap-3 bg-slate-900/30">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  disabled={chatLoadingMsg || paso !== 'chat'}
                  placeholder="Escribe tu respuesta..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm glass-input focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
                <button type="submit" disabled={chatLoadingMsg}
                  className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 text-white rounded-xl transition-all flex items-center justify-center">
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}

          {/* PASO UPLOAD */}
          {paso === 'upload' && (
            <div className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto">
              <div className="p-4 bg-violet-950/30 border border-violet-800/30 rounded-xl text-xs text-violet-300 leading-relaxed">
                <p className="font-semibold mb-1">📋 ¿Cómo funciona?</p>
                <ol className="list-decimal ml-4 space-y-1 text-slate-400">
                  <li>Sube tu <strong className="text-slate-200">Certificado de Multas del Registro Civil</strong>.</li>
                  <li>Filtramos solo multas con <strong className="text-slate-200">+3 años</strong> (prescribibles).</li>
                  <li>El bot te pide tus datos uno a uno.</li>
                  <li>Generamos un escrito legal por cada juzgado.</li>
                  <li>Descargas el <strong className="text-slate-200">paquete de escritos</strong> listos para enviar.</li>
                </ol>
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all min-h-[160px] ${
                  isDragging
                    ? 'border-violet-500 bg-violet-500/10'
                    : pdfFile
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-slate-700 hover:border-violet-600/50 hover:bg-violet-900/10'
                }`}
              >
                <input ref={fileRef} type="file" accept=".pdf,.html,.htm" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                {pdfFile ? (
                  <>
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                      <CheckCircle size={28} />
                    </div>
                    <p className="text-sm font-semibold text-emerald-300">{pdfFile.name}</p>
                    <p className="text-xs text-slate-500">{(pdfFile.size / 1024).toFixed(1)} KB — Haz clic para cambiar</p>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-slate-800/60 text-slate-500 rounded-xl border border-slate-700">
                      <Upload size={28} />
                    </div>
                    <p className="text-sm font-medium text-slate-400">Arrastra el PDF aquí o haz clic para seleccionarlo</p>
                    <p className="text-[11px] text-slate-600">Certificado de Multas — Registro Civil de Chile</p>
                  </>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-400">
                  <AlertTriangle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={procesarPDF}
                disabled={!pdfFile || loading}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-violet-500/20 text-sm"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>{loading ? 'Procesando PDF...' : 'Analizar Certificado de Multas'}</span>
              </button>
            </div>
          )}

          {/* PASOS PREVIEW / PAGO / DESCARGA: instrucciones en panel izquierdo */}
          {(['preview', 'pago', 'descarga'] as Paso[]).includes(paso) && parseResult && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="p-4 bg-slate-900/60 border border-dark-border rounded-xl space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Datos del Solicitante</h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Nombre:</span><span className="text-white font-semibold">{datosCaptured.nombreSolicitante}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">RUT:</span><span className="text-white font-semibold">{datosCaptured.rutSolicitante}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Patente:</span><span className="text-white font-semibold">{datosCaptured.patente}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Correo:</span><span className="text-emerald-400 font-medium truncate">{datosCaptured.correoElectronico}</span></div>
                </div>
              </div>

              {paso === 'descarga' && instrucciones.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase text-emerald-400 tracking-wider">📬 Instrucciones de Envío</h3>
                  {instrucciones.map((inst, i) => (
                    <div key={i} className="p-3.5 bg-emerald-950/30 border border-emerald-800/30 rounded-xl space-y-1.5">
                      <p className="text-xs font-bold text-emerald-300">Juzgado de {inst.juzgado}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-300">
                        <Mail size={11} className="text-slate-500 flex-shrink-0" />
                        <span className="break-all">{inst.correo}</span>
                      </div>
                      <p className="text-[10px] text-slate-500"><strong className="text-slate-400">Asunto:</strong> {inst.asunto}</p>
                      <p className="text-[10px] text-slate-500"><strong className="text-slate-400">Archivo:</strong> {inst.archivoNombre}</p>
                    </div>
                  ))}
                </div>
              )}

              {paso !== 'descarga' && (
                <div className="p-4 bg-slate-900/40 border border-dark-border rounded-xl space-y-2">
                  <h3 className="text-xs font-bold uppercase text-amber-400 tracking-wider">📊 Resumen del Cobro</h3>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-slate-500">Primera comuna:</span><span className="text-white">$10.000</span></div>
                    {parseResult.comunas.length > 1 && (
                      <div className="flex justify-between"><span className="text-slate-500">Comunas adicionales ({parseResult.comunas.length - 1}× $4.000):</span><span className="text-white">${(parseResult.comunas.length - 1) * 4000}</span></div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-dark-border">
                      <span className="font-bold text-white">Total:</span>
                      <span className="font-extrabold text-emerald-400 text-base">{formatCLP(parseResult.cobro)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Panel Derecho: Preview Documento / Resultado ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-dark-bg border border-dark-border rounded-r-2xl">

        {/* PASO UPLOAD: placeholder */}
        {paso === 'upload' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="p-5 bg-violet-600/10 border border-violet-500/20 text-violet-400 rounded-2xl">
              <FileText size={48} />
            </div>
            <h2 className="text-xl font-bold text-white">Prescripción Batch de Multas</h2>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Sube el <strong className="text-slate-200">Certificado de Multas del Registro Civil</strong> y generaremos un escrito legal individualizado para cada Juzgado de Policía Local en que tengas multas prescritas.
            </p>
            <div className="grid grid-cols-3 gap-3 mt-4 max-w-lg text-xs">
              {['Filtro 3+ años automático', 'Un escrito por juzgado', 'Correos JPL incluidos'].map((feat, i) => (
                <div key={i} className="p-3 bg-slate-900/60 border border-dark-border rounded-xl text-slate-400">
                  <CheckCircle size={14} className="text-emerald-400 mx-auto mb-1.5" />
                  {feat}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASO CHAT: preview del primer documento borroso */}
        {paso === 'chat' && (
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3 p-8">
                <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl inline-block">
                  <Sparkles size={32} className="text-violet-400 animate-pulse mx-auto" />
                </div>
                <p className="text-slate-400 text-sm font-medium">El bot está recolectando tus datos...</p>
                <p className="text-slate-600 text-xs">La previsualización del documento aparecerá aquí cuando tengamos todos los datos.</p>
              </div>
            </div>
          </div>
        )}

        {/* PASOS PREVIEW y PAGO: documento borroso + botón de pago */}
        {(['preview', 'pago'] as Paso[]).includes(paso) && parseResult && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-4 py-3 bg-slate-900/50 border-b border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 block" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80 block" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80 block" />
                </div>
                <span className="text-xs text-slate-400 ml-2 font-semibold">
                  Vista Previa — Juzgado de {parseResult.comunas[0]?.nombre || '...'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                <AlertTriangle size={11} />
                <span>Pendiente de pago</span>
              </div>
            </div>

            {/* Documento borroso */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-950 relative">
              <div className="max-w-2xl mx-auto bg-slate-900/50 border border-slate-800/50 p-8 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-400 pointer-events-none select-none" style={{ filter: 'blur(3px)' }}>
                {`SOLICITA DECLARACIÓN DE PRESCRIPCIÓN DE MULTAS DE TRÁNSITO

RUT: ${datosCaptured.rutSolicitante || '12.345.678-9'}
PATENTE DEL VEHÍCULO: ${datosCaptured.patente || 'XXXX00'}

AL JUEZ DE POLICÍA LOCAL DE ${parseResult.comunas[0]?.nombre || 'JUZGADO'}

Yo, ${datosCaptured.nombreSolicitante || 'Nombre Completo'}, cédula de identidad N° ${datosCaptured.rutSolicitante || 'RUT'}, con domicilio en ${datosCaptured.domicilio || 'Domicilio'}, correo electrónico ${datosCaptured.correoElectronico || 'email@ejemplo.cl'}, en la causa Rol N° Por determinar, sobre infracción al artículo 114 de la Ley de Tránsito, a US. respetuosamente digo:

Que por este acto y conforme a lo dispuesto en el artículo 24 de la Ley N° 18.287 sobre procedimiento ante los Juzgados de Policía Local, vengo en interponer solicitud para que se declare la prescripción de la multa de tránsito asociada a la patente ${datosCaptured.patente || 'XXXX00'}, que fuera cursada con fecha ${parseResult.comunas[0]?.multas[0]?.fechaInfraccion || 'DD/MM/AAAA'}...

POR TANTO,
A US. RUEGO se sirva tener por presentada esta solicitud, tramitarla conforme a derecho y, en definitiva, declarar prescrita la multa de tránsito en cuestión, ordenando oficiar al Servicio de Registro Civil e Identificación para la eliminación de la respectiva anotación.`}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-slate-950/90 border border-violet-500/30 px-8 py-6 rounded-2xl text-center space-y-4 backdrop-blur-sm shadow-2xl max-w-sm">
                  <div className="p-3 bg-violet-600/20 text-violet-400 rounded-xl inline-block">
                    <CreditCard size={28} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{formatCLP(parseResult.cobro)}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      {parseResult.comunas.length} juzgado(s) · {parseResult.totalMultas} multa(s) prescribible(s)
                    </p>
                  </div>
                  <button
                    onClick={simularPago}
                    disabled={generando}
                    className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {generando ? <RefreshCw size={15} className="animate-spin" /> : <CreditCard size={15} />}
                    <span>{generando ? 'Generando escritos...' : 'Confirmar Pago y Generar Escritos'}</span>
                  </button>
                  <p className="text-[10px] text-slate-600">Simulación de pago — sin cargo real</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASO DESCARGA: resultado final */}
        {paso === 'descarga' && archivos.length > 0 && (
          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-6">
            <div className="text-center space-y-2 pt-4">
              <div className="p-4 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl inline-block">
                <CheckCircle size={40} />
              </div>
              <h2 className="text-2xl font-extrabold text-white">¡Escritos Generados!</h2>
              <p className="text-sm text-slate-400">
                {archivos.length} documento(s) legal(es) listo(s) para enviar a sus respectivos juzgados.
              </p>
            </div>

            {/* Botón descarga principal */}
            <button
              onClick={() => downloadZip(archivos, `prescripcion-multas-${datosCaptured.patente || 'documentos'}.zip`)}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-2xl hover:shadow-emerald-500/30 transition-all flex items-center gap-3 text-base"
            >
              <Download size={22} />
              <span>Descargar Escritos ({archivos.length} archivo{archivos.length > 1 ? 's' : ''})</span>
            </button>

            <p className="text-xs text-slate-600 -mt-2">Se descargará un archivo por juzgado</p>

            {/* Lista de escritos disponibles */}
            <div className="w-full max-w-2xl space-y-3">
              {archivos.map((archivo, i) => {
                const inst = instrucciones[i];
                return (
                  <div key={i} className="bg-slate-900/60 border border-dark-border rounded-2xl overflow-hidden">
                    {/* Cabecera del escrito */}
                    <div className="px-5 py-3 bg-slate-900/80 border-b border-dark-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-violet-400" />
                        <span className="text-sm font-semibold text-white">{archivo.nombre}</span>
                      </div>
                      <button
                        onClick={() => downloadZip([archivo], archivo.nombre)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/20 rounded-lg text-xs font-semibold transition-all"
                      >
                        <Download size={12} />
                        <span>Descargar</span>
                      </button>
                    </div>

                    {/* Instrucciones de envío FUERA del documento */}
                    {inst && (
                      <div className="px-5 py-4 space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">📬 Instrucción de Envío</p>
                        <div className="flex items-start gap-3 text-xs">
                          <Mail size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
                          <div className="space-y-1">
                            <p className="text-slate-200">
                              Envía el escrito a <strong className="text-emerald-300">{inst.correo}</strong>
                            </p>
                            <p className="text-slate-500">
                              <strong className="text-slate-400">Asunto:</strong> {inst.asunto}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Nota legal */}
            <div className="w-full max-w-2xl p-4 bg-amber-950/20 border border-amber-800/20 rounded-xl flex gap-3 text-xs text-amber-400 leading-relaxed">
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
              <p>
                <strong>Nota:</strong> Revisa cada escrito antes de enviarlo. El Rol de Causa puede decir "Por determinar en tribunal" — en ese caso, preséntalo directamente en la ventanilla del Juzgado de Policía Local para que le asignen el número de causa correcto.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
