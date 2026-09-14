export async function askAI(payload){
  const endpoint = import.meta.env.VITE_AI_ENDPOINT;
  if(!endpoint) throw new Error('Endpoint IA no configurado.');
  const r = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok) throw new Error('Servicio IA no disponible.');
  return r.json();
}
