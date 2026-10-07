import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import { P12Signer } from '@signpdf/signer-p12';
import signpdfImport from '@signpdf/signpdf';
import crypto from 'node:crypto';
import http from 'node:http';

const signpdf = (signpdfImport && typeof signpdfImport.sign === 'function')
  ? signpdfImport
  : (signpdfImport?.default && typeof signpdfImport.default.sign === 'function')
    ? signpdfImport.default
    : null;

const app=express();
app.use(cors({origin:true}));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024}});
app.get('/api/sign/health',(_,res)=>res.json({ok:true,service:'P12 signer',version:'0.3.7',mode:'local-agent'}));
app.post('/api/sign/pdf',upload.fields([{name:'pdf',maxCount:1},{name:'p12',maxCount:1}]),async(req,res)=>{
  try{
    const pdf=req.files?.pdf?.[0]?.buffer, p12=req.files?.p12?.[0]?.buffer;
    const password=String(req.body?.password||'');
    if(!pdf||!p12) return res.status(400).json({error:'Debe seleccionar el PDF y el certificado .p12/.pfx.'});
    const pdfDoc=await PDFDocument.load(pdf);
    pdflibAddPlaceholder({pdfDoc,reason:String(req.body?.reason||'Aprobación de ficha de equipo'),contactInfo:String(req.body?.contact||''),name:String(req.body?.name||'Aprobador LAB-PSI'),location:String(req.body?.location||'LAB-PSI, Ecuador'),signatureLength:16384});
    const withPlaceholder=Buffer.from(await pdfDoc.save({useObjectStreams:false}));
    const signer=new P12Signer(p12,{passphrase:password});
    if (!signpdf) throw new Error('Motor @signpdf/signpdf cargado sin método sign().');
    const signed=await signpdf.sign(withPlaceholder,signer);
    const hash=crypto.createHash('sha256').update(signed).digest('hex');
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename="ficha-firmada.pdf"');
    res.setHeader('X-Document-SHA256',hash);
    res.send(signed);
  }catch(err){
    console.error(err);
    const detail=String(err?.message||err);
    const passwordHint=/password|passphrase|mac verify|pkcs12|p12/i.test(detail);
    res.status(400).json({error: passwordHint ? 'No fue posible abrir o firmar con el certificado P12/PFX. Verifique la contraseña y el archivo.' : 'No fue posible completar la firma digital.',detail});
  }
});
const HOST = process.env.P12_HOST || '127.0.0.1';
const PORT = Number(process.env.P12_PORT || 8787);

// Servidor HTTP explícito: una sola llamada listen().
// Si 8787 ya está ocupado por OTRO agente P12 válido, no tumbamos Vite:
// este proceso queda como supervisor para permitir seguir trabajando.
const server = http.createServer(app);
let supervisingExistingAgent = false;

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 120_000;

server.once('error', async (err) => {
  if (err?.code === 'EADDRINUSE') {
    try {
      const response = await fetch(`http://${HOST}:${PORT}/api/sign/health`, { signal: AbortSignal.timeout(1500) });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.ok === true) {
        supervisingExistingAgent = true;
        console.log(`[P12] El puerto ${PORT} ya tiene un agente P12 válido activo.`);
        console.log('[P12] Se reutilizará ese agente. WEB puede continuar normalmente.');
        // Mantiene vivo este proceso de concurrently sin abrir un segundo puerto.
        setInterval(() => {}, 60_000);
        return;
      }
    } catch {}
    console.error(`[P12] El puerto ${PORT} está ocupado por otro proceso que NO es el agente P12.`);
    console.error(`[P12] Revise con: lsof -nP -iTCP:${PORT} -sTCP:LISTEN`);
  } else {
    console.error('[P12] Error del servidor:', err?.code || '', err?.message || err);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Motor de firma P12 LAB-PSI listo en http://${HOST}:${PORT}`);
  console.log('Agente P12 activo. Mantenga esta Terminal abierta mientras firma.');
});

const shutdown = (signal) => {
  console.log(`[P12] ${signal}: cerrando agente de firma...`);
  if (supervisingExistingAgent || !server.listening) process.exit(0);
  server.close((err) => process.exit(err ? 1 : 0));
  setTimeout(() => process.exit(1), 5_000).unref();
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

