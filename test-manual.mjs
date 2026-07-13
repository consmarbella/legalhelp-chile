import fetch from 'node-fetch';

async function test() {
  let caseHistory = [];
  let currentCaseData = {};
  
  for(let i=0; i<5; i++) {
    const userMsg = i === 0 ? 'Hola, necesito hacer una denuncia por despido injustificado' 
                            : 'Carlos Andrés Muñoz Riquelme 15.432.876-5 Av. Los Pajaritos 4520 email@email.com +56987654321 Distribuidora San Cristóbal 76.543.210-8 jefe bodega 1.200.000 necesidades de empresa 2021 a 2026';
    
    console.log(`[Round ${i+1}] User:`, userMsg);
    
    const res = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg, caseHistory, currentCaseData })
    });
    const data = await res.json();
    console.log(`[Round ${i+1}] Bot:`, data.response_message || data.reply || data.responseMessage);
    console.log(`[Round ${i+1}] Missing:`, data.state?.datosFaltantes);
    
    caseHistory.push({ role: 'user', content: userMsg });
    caseHistory.push({ role: 'assistant', content: data.response_message || data.reply || data.responseMessage });
    currentCaseData = data.state;
  }
}
test();
