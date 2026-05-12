/**
 * Generador de Contenido Unico para LegalHelp.cl PSEO
 * Lee paginas.json y genera contenido enriquecido para 106 paginas
 * Output: C:\Users\matte\OneDrive\Escritorio\legalhelp-pseo-contenido\
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', 'data', 'paginas.json');
const DESKTOP_DIR = 'C:\\Users\\matte\\OneDrive\\Escritorio\\legalhelp-pseo-contenido';
const OUTPUT_PAGINAS = join(DESKTOP_DIR, 'paginas');
const OUTPUT_SOCIALES = join(DESKTOP_DIR, 'sociales');
const OUTPUT_ANALISIS = join(DESKTOP_DIR, 'analisis');

// Ensure dirs
for (const d of [DESKTOP_DIR, OUTPUT_PAGINAS, OUTPUT_SOCIALES, OUTPUT_ANALISIS]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const paginas = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
const hoy = new Date().toISOString().split('T')[0];

// ── Templates de texto por categoria ──

const descripcionesCategoria = {
  "Prescripción de deuda TAG": {
    intro: "La prescripción de deuda TAG es un mecanismo legal que extingue la obligacion de pago cuando han transcurrido los plazos establecidos sin que el acreedor haya iniciado acciones judiciales.",
    como_funciona: "El proceso consiste en presentar un escrito ante el tribunal competente solicitando la prescripcion de la deuda, fundamentado en el articulo correspondiente del Codigo Civil.",
    beneficio: "Si logras la prescripcion, quedas liberado de la deuda sin necesidad de pagar. Es una herramienta legal poderosa para quienes tienen deudas antiguas."
  },
  "Prescripción de deuda bancaria": {
    intro: "La prescripcion de deuda bancaria permite extinguir obligaciones financieras cuando el banco no ha realizado gestiones de cobro judicial dentro del plazo legal establecido.",
    como_funciona: "Se presenta una solicitud formal ante el tribunal civil competente, argumentando que ha transcurrido el plazo de prescripcion sin que el banco haya iniciado acciones legales.",
    beneficio: "Si el tribunal declara la prescripcion, la deuda desaparece. No tendras que pagar ni el capital ni los intereses acumulados."
  },
  "Demanda de alimentos": {
    intro: "La demanda de alimentos es el mecanismo legal para solicitar que un familiar obligado proporcione los recursos necesarios para la subsistencia de quien tiene derecho a recibirlos.",
    como_funciona: "Se presenta una demanda ante el Juzgado de Familia correspondiente, detallando las necesidades del alimentario y la capacidad economica del alimentante.",
    beneficio: "El tribunal fijara un monto de pension proporcional a los ingresos del obligado, asegurando la manutencion del hijo o conyuge necesitado."
  },
  "Denuncia por despido injustificado": {
    intro: "La denuncia por despido injustificado protege tus derechos laborales cuando el empleador termina la relacion laboral sin una causa legal que lo justifique.",
    como_funciona: "Se presenta un reclamo ante la Inspeccion del Trabajo dentro de los 60 dias habiles siguientes al despido, detallando los hechos y las indemnizaciones que corresponden.",
    beneficio: "Puedes recibir indemnizacion por anos de servicio, sustitutiva de aviso previo, y otras prestaciones que la ley contempla para estos casos."
  },
  "Recurso de protección": {
    intro: "El recurso de proteccion es una accion judicial urgente destinada a restablecer el imperio del derecho cuando se han vulnerado derechos fundamentales garantizados por la Constitucion.",
    como_funciona: "Se presenta ante la Corte de Apelaciones correspondiente, describiendo el acto ilegal o arbitrario y la forma en que afecta tus derechos constitucionales.",
    beneficio: "La Corte puede ordenar la cesacion inmediata del acto que afecta tus derechos, con plazos procesales mucho mas breves que los juicios ordinarios."
  },
  "Carta reclamo SERNAC": {
    intro: "La carta reclamo SERNAC es el primer paso formal para exigir tus derechos como consumidor ante un proveedor que no cumplio con lo ofrecido.",
    como_funciona: "Se redacta una carta detallando el problema, la fecha de la compra, el monto pagado y la solucion que esperas, fundamentada en la Ley 19.496.",
    beneficio: "Si el proveedor no responde en 15 dias habiles, puedes llevar el caso al Juzgado de Policía Local para reclamar indemizacion."
  },
  "Demanda de desalojo por no pago": {
    intro: "La demanda de desalojo por no pago permite al arrendador recuperar la propiedad cuando el arrendatario no cumple con el pago de las rentas.",
    como_funciona: "Se presenta ante el Juzgado de Letras en lo Civil correspondiente, acreditando la existencia del contrato de arrendamiento y la mora en el pago.",
    beneficio: "El tribunal ordenara el desalojo del inmueble y el pago de las rentas impagas, mas los intereses y costas procesales."
  },
  "Denuncia por no pago de cotizaciones": {
    intro: "La denuncia por no pago de cotizaciones es el mecanismo para exigir que tu empleador regularice los aportes previsionales impagos.",
    como_funciona: "Se presenta ante la Inspeccion del Trabajo, adjuntando los antecedentes laborales y la documentacion que acredite la relacion laboral.",
    beneficio: "El empleador se expone a multas de hasta 60 UTM y la obligacion de pagar las cotizaciones con intereses y reajustes."
  },
  "Poder simple notarial": {
    intro: "El poder simple notarial es un documento que autoriza a otra persona a realizar tramites o actuar en tu nombre ante terceros.",
    como_funciona: "Se redacta el poder especificando el alcance de la autorizacion y se firma ante notario para darle validez legal.",
    beneficio: "Permite que alguien de confianza gestione tramites por ti sin que tengas que estar presente, ahorrando tiempo y desplazamientos."
  }
};

const faqPorCategoria = {
  "Prescripción de deuda TAG": [
    { p: "Los llamados telefonicos interrumpen la prescripcion?", r: "No. Solo las notificaciones judiciales interrumpen el plazo de prescripcion. Los llamados, cartas o correos electronicos no tienen efecto juridico." },
    { p: "Puedo pagar una parte y despues pedir prescripcion del resto?", r: "Si realizas un pago parcial, estas reconociendo la deuda y el plazo de prescripcion se reinicia desde esa fecha." },
    { p: "Cual es el plazo para pedir la prescripcion?", r: "El plazo es de 3 anos desde la fecha del ultimo cobro judicial. Si han pasado mas de 3 anos sin notificacion judicial, puedes solicitar la prescripcion." }
  ],
  "Prescripción de deuda bancaria": [
    { p: "El banco puede seguir cobrando despues de los 5 anos?", r: "Si no ha iniciado acciones judiciales dentro del plazo de 5 anos, la deuda prescribe y no puede cobrarse legalmente." },
    { p: "Que pasa si cambie de banco?", r: "La prescripcion opera sobre la deuda, no sobre la institucion. Aunque cambies de banco, la deuda original prescribira igual." },
    { p: "Afecta mi historial crediticio?", r: "Mientras la deuda este vigente, aparecera en tu historial. Una vez declarada la prescripcion, debe ser eliminada de los registros." }
  ],
  "Demanda de alimentos": [
    { p: "Puedo pedir aumento de la pension?", r: "Si cambiaron las circunstancias (el hijo tiene mas gastos, el alimentante gana mas, etc.), puedes solicitar un aumento." },
    { p: "Que pasa si el obligado no paga?", r: "El tribunal puede ordenar descuento directo de la remuneracion, retencion de devolucion de impuestos, e incluso arresto nocturno." },
    { p: "Hasta cuando se debe pagar?", r: "Hasta los 21 anos (28 si el hijo estudia una carrera o superior)." }
  ],
  "Denuncia por despido injustificado": [
    { p: "Puedo firmar el finiquito y despues demandar?", r: "Si firmas con reserva de derechos, puedes cobrar lo acordado y demandar por el resto." },
    { p: "Cual es el plazo para reclamar?", r: "Tienes 60 dias habiles desde el despido para presentar la denuncia ante la Inspeccion del Trabajo." },
    { p: "Que indemnizacion me corresponde?", r: "Indemnizacion por anos de servicio (1 sueldo por ano), sustitutiva de aviso previo, y vacaciones proporcionales." }
  ],
  "Recurso de protección": [
    { p: "Que derechos protege el recurso?", r: "Protege derechos fundamentales como la vida, la salud, la libertad personal, el derecho de propiedad, entre otros." },
    { p: "Cual es el plazo para presentarlo?", r: "El plazo es de 30 dias desde que ocurrio el acto u omision que afecta tus derechos." },
    { p: "Necesito un abogado?", r: "LegalHelp genera el recurso listo para presentar, pero es recomendable contar con patrocinio de abogado para la presentacion." }
  ],
  "Carta reclamo SERNAC": [
    { p: "Cuanto tiempo tengo para reclamar?", r: "Tienes 6 meses desde que ocurrio el problema para presentar el reclamo ante SERNAC." },
    { p: "Que pasa si la empresa no responde?", r: "Si no responden en 15 dias habiles, puedes llevar el caso al Juzgado de Policia Local." },
    { p: "Puedo reclamar por cualquier producto?", r: "Si, cualquier producto o servicio esta protegido por la Ley 19.496, excepto servicios profesionales liberales." }
  ],
  "Demanda de desalojo por no pago": [
    { p: "Desde cuando puedo iniciar el desalojo?", r: "Desde el primer mes de impago. No necesitas esperar a que se acumulen varias rentas." },
    { p: "Cuanto tarda el proceso?", r: "Depende del tribunal, pero generalmente entre 2 y 6 meses desde la presentacion de la demanda." },
    { p: "Puedo recuperar mi propiedad si no hay contrato?", r: "Si, pero el proceso es diferente. Necesitas acreditar la calidad de arrendador." }
  ],
  "Denuncia por no pago de cotizaciones": [
    { p: "Puedo denunciar si ya no trabajo en la empresa?", r: "Si. Puedes denunciar aunque hayas terminado la relacion laboral, siempre que las cotizaciones no esten pagadas." },
    { p: "El empleador puede ir a la carcel?", r: "No, pero se expone a multas significativas y la obligacion de pagar las cotizaciones con intereses." },
    { p: "Que documentos necesito?", r: "Contrato de trabajo, liquidaciones de sueldo, y cualquier documento que acredite la relacion laboral." }
  ],
  "Poder simple notarial": [
    { p: "Cuanto dura un poder simple?", r: "La vigencia la defines en el documento. Puede ser por un plazo determinado o para un tramite especifico." },
    { p: "Puedo revocar el poder?", r: "Si, puedes revocarlo en cualquier momento mediante un nuevo documento notarial." },
    { p: "Necesito firma ante notario?", r: "Si, para que tenga validez legal, debe ser firmado ante notario publico." }
  ]
};

function getCategoriaData(categoria) {
  return descripcionesCategoria[categoria] || {
    intro: `La ${categoria.toLowerCase()} es un procedimiento legal contemplado en la legislacion chilena.`,
    como_funcuna: "Se presenta ante el tribunal correspondiente segun tu comuna.",
    beneficio: "Puedes resolver tu situacion legal de forma rapida y sin abogados caros."
  };
}

function getFAQ(categoria) {
  return faqPorCategoria[categoria] || [
    { p: "Como funciona este tramite?", r: "Completas el formulario con tus datos, la IA redacta el documento, y lo recibes listo para presentar." },
    { p: "Cuanto tiempo toma?", r: "El proceso completo toma menos de 15 minutos desde que empiezas a responder las preguntas." },
    { p: "Es valido legalmente?", r: "Si, los documentos generados siguen el formato judicial chileno estandar." }
  ];
}

// ── GENERACION ──

let allTweets = [];
let allIGCaptions = [];
let allFBPosts = [];
let allTikTokScripts = [];

const results = paginas.map((p, i) => {
  const catData = getCategoriaData(p.categoria);
  const faq = getFAQ(p.categoria);
  const slugClean = p.slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const tituloSEO = `${p.categoria} en ${p.variable} | LegalHelp Chile`;
  const metaDesc = `${p.categoria} en ${p.variable}: presenta tu solicitud ante ${p.entidad} ubicado en ${p.direccion}. ${catData.intro.slice(0, 100)}...`;
  const h1 = `${p.categoria} en ${p.variable}: guia completa`;

  const parrafos = [
    `${catData.intro} En ${p.variable}, el tramite se realiza ante ${p.entidad}, ubicado en ${p.direccion}.`,
    `Segun ${p.ley}, el plazo aplicable es de ${p.plazo.toLowerCase()}. Es importante que cumplas con los requisitos procesales para que tu solicitud sea aceptada por el tribunal.`,
    `${catData.como_funciona} Con LegalHelp Chile, solo respondes unas preguntas y obtienes tu escrito listo para presentar.`,
    `${catData.beneficio} Ademas, al generar tu documento con LegalHelp, te aseguras de que cumpla con el formato judicial chileno estandar.`,
    `No importa si es tu primera vez. La IA te guia paso a paso con preguntas simples sobre tu caso y automaticamente redacta el escrito con los fundamentos legales correctos.`
  ];

  const contenido = {
    index: i,
    slug: p.slug,
    categoria: p.categoria,
    variable: p.variable,
    tituloSEO,
    metaDesc,
    h1,
    parrafos,
    faq,
    datos_estructurados: {
      ley: p.ley,
      plazo: p.plazo,
      entidad: p.entidad,
      direccion: p.direccion
    },
    url: `https://legalhelp.cl/p/${p.slug}`
  };

  // ── SOCIAL MEDIA CONTENT ──

  const tweet = `${p.categoria} en ${p.variable}: ${catData.intro.slice(0, 80)}... Presenta ante ${p.entidad}. Genera tu escrito en minutos en legalhelp.cl #LegalHelpChile #Chile`.slice(0, 280);
  allTweets.push({ slug: p.slug, categoria: p.categoria, variable: p.variable, tweet });

  const igCaption = [
    `📌 ${p.categoria} en ${p.variable}`,
    '',
    catData.intro.slice(0, 150),
    '',
    `📍 Donde presentarlo: ${p.entidad}`,
    `📋 ${p.direccion}`,
    `⚖️ Base legal: ${p.ley}`,
    '',
    `👇 Genera tu documento en minutos`,
    `👉 legalhelp.cl/p/${p.slug}`,
    '',
    `#LegalHelpChile #${p.categoria.replace(/ /g, '')} #${p.variable} #DerechoChileno #Chile`
  ].join('\n');
  allIGCaptions.push({ slug: p.slug, categoria: p.categoria, variable: p.variable, caption: igCaption });

  const fbPost = [
    `📌 ${p.categoria} en ${p.variable}`,
    '',
    `¿Sabias que ${catData.intro.slice(0, 120)}?`,
    '',
    `Si estas en ${p.variable}, el tramite se realiza ante ${p.entidad} en ${p.direccion}.`,
    `El plazo legal es de ${p.plazo.toLowerCase()} segun ${p.ley}.`,
    '',
    catData.beneficio,
    '',
    `Con LegalHelp podes generar tu escrito en minutos, sin abogados caros.`,
    'Solo respondes preguntas simples y la IA redacta el documento.',
    '',
    `👉 legalhelp.cl/p/${p.slug}`,
    '',
    '💬 ¿Te quedo alguna duda? Comenta abajo.',
    '👍 Si te sirvio, comparti esta publicacion.',
    '',
    '#LegalHelpChile #DerechoChileno'
  ].join('\n');
  allFBPosts.push({ slug: p.slug, categoria: p.categoria, variable: p.variable, post: fbPost });

  const tikTokScript = [
    `--- TikTok Script: ${p.categoria} en ${p.variable} ---`,
    `Duracion: 45 seg`,
    ``,
    `[0:00 - 0:05] HOOK`,
    `Texto en pantalla: "${p.categoria} en ${p.variable}: ${catData.intro.slice(0, 60)}"`,
    ``,
    `[0:05 - 0:30] DESARROLLO`,
    `"${catData.intro} En ${p.variable}, presentas ante ${p.entidad}. El plazo es de ${p.plazo.toLowerCase()}."`,
    ``,
    `[0:30 - 0:45] CIERRE`,
    `"Genera tu escrito en minutos en legalhelp.cl Sin abogados caros."`,
    ``,
    `Caption: ${p.categoria} en ${p.variable}? Genera tu documento en minutos en legalhelp.cl #LegalHelpChile #Chile`
  ].join('\n');
  allTikTokScripts.push({ slug: p.slug, categoria: p.categoria, variable: p.variable, script: tikTokScript });

  // Save individual page file
  const pageFile = join(OUTPUT_PAGINAS, `${p.slug}.json`);
  writeFileSync(pageFile, JSON.stringify(contenido, null, 2));

  return contenido;
});

// ── GUARDAR ARCHIVOS AGREGADOS ──

// Tweets file
const tweetsFile = join(OUTPUT_SOCIALES, 'tweets.json');
writeFileSync(tweetsFile, JSON.stringify(allTweets, null, 2));

// IG Captions file
const igFile = join(OUTPUT_SOCIALES, 'instagram.json');
writeFileSync(igFile, JSON.stringify(allIGCaptions, null, 2));

// FB Posts file
const fbFile = join(OUTPUT_SOCIALES, 'facebook.json');
writeFileSync(fbFile, JSON.stringify(allFBPosts, null, 2));

// TikTok Scripts file
const ttFile = join(OUTPUT_SOCIALES, 'tiktok.json');
writeFileSync(ttFile, JSON.stringify(allTikTokScripts, null, 2));

// Summary
const resumen = {
  fecha_generacion: hoy,
  total_paginas: paginas.length,
  categorias: [...new Set(paginas.map(p => p.categoria))],
  ciudades: [...new Set(paginas.map(p => p.variable))],
  archivos_generados: {
    paginas_individuales: paginas.length,
    tweets: allTweets.length,
    instagram_captions: allIGCaptions.length,
    facebook_posts: allFBPosts.length,
    tiktok_scripts: allTikTokScripts.length
  },
  carpeta_output: DESKTOP_DIR
};
writeFileSync(join(DESKTOP_DIR, 'resumen.json'), JSON.stringify(resumen, null, 2));

// ── DASHBOARD HTML ──

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let html = `<!DOCTYPE html>
<html lang="es-CL"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>LegalHelp PSEO - Contenido Generado</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#0b1f3a;color:#e8e8e8;padding:20px}
  h1{color:#c9a84c;text-align:center;font-size:28px;margin-bottom:4px}
  .sub{text-align:center;color:#8899aa;margin-bottom:20px;font-size:14px}
  .stats{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:24px}
  .stat{background:#1a3355;padding:10px 18px;border-radius:8px;text-align:center}
  .stat-num{font-size:22px;font-weight:bold;color:#c9a84c}
  .stat-label{font-size:11px;color:#8899aa}
  .nav-cats{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:20px}
  .nav-cats a{background:#1a3355;color:#c9a84c;padding:6px 14px;border-radius:999px;text-decoration:none;font-size:12px}
  .nav-cats a:hover{background:#c9a84c;color:#0b1f3a}
  .page-card{background:#1a3355;border-radius:12px;padding:16px;margin-bottom:12px;border-left:4px solid #c9a84c}
  .page-card h3{color:#c9a84c;font-size:15px;margin-bottom:6px}
  .page-card .meta{color:#8899aa;font-size:12px;margin-bottom:8px}
  .page-card .content{font-size:13px;line-height:1.6;color:#ccc}
  .page-card .faq{margin-top:8px;background:#0f2645;padding:10px;border-radius:8px}
  .page-card .faq p{margin-bottom:4px;font-size:12px}
  .page-card .faq .q{color:#c9a84c}
  .page-card .faq .a{color:#aaa;margin-bottom:6px}
  .social-section{background:#1a3355;border-radius:12px;padding:16px;margin-bottom:12px}
  .social-section h3{color:#c9a84c;font-size:15px;margin-bottom:8px}
  .social-section pre{background:#0f2645;color:#ccc;padding:10px;border-radius:6px;font-size:12px;overflow-x:auto;margin-bottom:8px}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;margin-right:4px}
  .badge-ig{background:#E1306C;color:white}
  .badge-fb{background:#1877F2;color:white}
  .badge-tw{background:#1DA1F2;color:white}
  .badge-tk{background:#000;color:white;border:1px solid #333}
  .toggle-bar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
  .toggle-bar button{background:#1a3355;color:#c9a84c;border:1px solid #c9a84c33;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px}
  .toggle-bar button.active{background:#c9a84c;color:#0b1f3a}
</style>
</head><body>
<h1>⚖️ LegalHelp Chile — PSEO Content Generator</h1>
<p class="sub">${hoy} · ${paginas.length} paginas generadas con contenido unico</p>

<div class="stats">
  <div class="stat"><div class="stat-num">${paginas.length}</div><div class="stat-label">Paginas</div></div>
  <div class="stat"><div class="stat-num">${resumen.categorias.length}</div><div class="stat-label">Categorias Legales</div></div>
  <div class="stat"><div class="stat-num">${resumen.ciudades.length}</div><div class="stat-label">Ciudades</div></div>
  <div class="stat"><div class="stat-num">${allTweets.length}</div><div class="stat-label">Tweets</div></div>
  <div class="stat"><div class="stat-num">${allIGCaptions.length}</div><div class="stat-label">IG Captions</div></div>
</div>

<div class="toggle-bar">
  <button class="active" onclick="showSection('paginas')">📄 Paginas</button>
  <button onclick="showSection('sociales')">📱 Redes Sociales</button>
</div>

<div id="section-paginas">`;

for (const r of results) {
  html += `
<div class="page-card">
  <h3>${escapeHtml(r.tituloSEO)}</h3>
  <div class="meta">${escapeHtml(r.metaDesc.slice(0, 200))}...</div>
  <div class="content">
    <p><strong>H1:</strong> ${escapeHtml(r.h1)}</p>
    ${r.parrafos.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
  </div>
  <div class="faq">
    <p style="color:#c9a84c;font-size:13px;margin-bottom:6px">❓ Preguntas Frecuentes</p>
    ${r.faq.map(f => `<p class="q">Q: ${escapeHtml(f.p)}</p><p class="a">R: ${escapeHtml(f.r)}</p>`).join('')}
  </div>
</div>`;
}

html += `</div><div id="section-sociales" style="display:none">`;

// Social media section
const socialPairs = [
  { label: 'Twitter / X', data: allTweets, key: 'tweet', badge: 'tw' },
  { label: 'Instagram', data: allIGCaptions, key: 'caption', badge: 'ig' },
  { label: 'Facebook', data: allFBPosts, key: 'post', badge: 'fb' },
  { label: 'TikTok', data: allTikTokScripts, key: 'script', badge: 'tk' },
];

for (const s of socialPairs) {
  html += `<div class="social-section"><h3><span class="badge badge-${s.badge}">${s.label}</span> ${s.data.length} piezas</h3>`;
  for (const item of s.data.slice(0, 10)) { // Show first 10
    html += `<p style="font-size:12px;color:#8899aa">${escapeHtml(item.categoria)} en ${escapeHtml(item.variable)}</p>`;
    html += `<pre>${escapeHtml(item[s.key].slice(0, 400))}...</pre>`;
  }
  if (s.data.length > 10) html += `<p style="color:#8899aa;font-size:12px">... y ${s.data.length - 10} mas</p>`;
  html += `</div>`;
}

html += `</div>
<script>
function showSection(s) {
  document.querySelectorAll('.toggle-bar button').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('section-paginas').style.display = s === 'paginas' ? 'block' : 'none';
  document.getElementById('section-sociales').style.display = s === 'sociales' ? 'block' : 'none';
}
</script>
</body></html>`;

writeFileSync(join(DESKTOP_DIR, 'dashboard.html'), html);

// ── REPORTE ──
console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║   LegalHelp PSEO - Contenido Generado ║');
console.log('╚══════════════════════════════════════╝');
console.log('');
console.log(`📄 ${paginas.length} paginas generadas`);
console.log(`📂 Categorias: ${resumen.categorias.join(', ')}`);
console.log(`🏙️  Ciudades: ${resumen.ciudades.length}`);
console.log('');
console.log('📁 Archivos guardados en:');
console.log(`   ${DESKTOP_DIR}`);
console.log(`   ├── paginas/    (${paginas.length} archivos JSON individuales)`);
console.log(`   ├── sociales/   (tweets.json, instagram.json, facebook.json, tiktok.json)`);
console.log(`   ├── dashboard.html (preview en navegador)`);
console.log(`   └── resumen.json`);
console.log('');
console.log('✅ LISTO!');
