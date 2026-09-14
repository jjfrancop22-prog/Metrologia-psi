import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import { P12Signer } from '@signpdf/signer-p12';
import signpdfImport from '@signpdf/signpdf';
import crypto from 'node:crypto';

const signpdf = (signpdfImport && typeof signpdfImport.sign === 'function')
  ? signpdfImport
  : (signpdfImport?.default && typeof signpdfImport.default.sign === 'function')
    ? signpdfImport.default
    : null;

const app=express();
app.use(cors({origin:true}));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024}});
app.get('/api/sign/health',(_,res)=>res.json({ok:true,service:'P12 signer',version:'0.3.6'}));
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
app.listen(8787,()=>console.log('Motor de firma P12 listo en http://localhost:8787'));
