export const num=v=>{const n=parseFloat(String(v??'').replace(',','.'));return Number.isFinite(n)?n:NaN};
export const finite=v=>Number.isFinite(v);
export const round=(v,d=6)=>finite(v)?Number(v.toFixed(d)):null;
export function mean(a=[]){const x=a.map(num).filter(finite);return x.length?x.reduce((s,v)=>s+v,0)/x.length:NaN}
export function stdevSample(a=[]){const x=a.map(num).filter(finite);if(x.length<2)return 0;const m=mean(x);return Math.sqrt(x.reduce((s,v)=>s+(v-m)**2,0)/(x.length-1))}
export function tCritical95(df){const t={1:12.706,2:4.303,3:3.182,4:2.776,5:2.571,6:2.447,7:2.365,8:2.306,9:2.262,10:2.228,11:2.201,12:2.179,13:2.160,14:2.145,15:2.131,16:2.120,17:2.110,18:2.101,19:2.093,20:2.086,21:2.080,22:2.074,23:2.069,24:2.064,25:2.060,26:2.056,27:2.052,28:2.048,29:2.045,30:2.042};return df<=30?(t[Math.max(1,Math.round(df))]||2.042):1.96}
export function regressionFromLevels(levels=[]){
 const pairs=[];levels.forEach(l=>{const x=num(l.level);[l.r1,l.r2,l.r3].forEach(y=>{y=num(y);if(finite(x)&&finite(y))pairs.push({x,y})})});
 const n=pairs.length;if(n<3)return {n,pairs,valid:false};
 const sx=pairs.reduce((s,p)=>s+p.x,0),sy=pairs.reduce((s,p)=>s+p.y,0),xbar=sx/n,ybar=sy/n;
 const sxx=pairs.reduce((s,p)=>s+(p.x-xbar)**2,0),sxy=pairs.reduce((s,p)=>s+(p.x-xbar)*(p.y-ybar),0),syy=pairs.reduce((s,p)=>s+(p.y-ybar)**2,0);
 if(!sxx)return {n,pairs,valid:false};
 const m=sxy/sxx,b=ybar-m*xbar;
 const residuals=pairs.map(p=>({...p,yhat:m*p.x+b,res:p.y-(m*p.x+b)}));
 const sse=residuals.reduce((s,p)=>s+p.res**2,0),syx=n>2?Math.sqrt(sse/(n-2)):NaN,r2=syy?sxy*sxy/(sxx*syy):NaN,syxPct=ybar?Math.abs(syx/ybar*100):NaN;
 const sm=finite(syx)?syx/Math.sqrt(sxx):NaN;
 const sb=finite(syx)?syx*Math.sqrt(1/n+(xbar*xbar/sxx)):NaN;
 const df=n-2,t=tCritical95(df),ciSlope=[m-t*sm,m+t*sm],ciIntercept=[b-t*sb,b+t*sb];
 return {valid:true,n,pairs,residuals,sx,sy,xbar,ybar,sxx,sxy,syy,m,b,sse,syx,r2,syxPct,sm,sb,df,t,ciSlope,ciIntercept};
}
export function regressionFromLevelMeans(levels=[]){
 const pairs=levels.map(l=>{const x=num(l.level),reads=[l.r1,l.r2,l.r3].map(num).filter(finite);return {x,y:mean(reads)}}).filter(p=>finite(p.x)&&finite(p.y));
 const n=pairs.length;if(n<3)return {n,pairs,valid:false};
 const sx=pairs.reduce((s,p)=>s+p.x,0),sy=pairs.reduce((s,p)=>s+p.y,0),xbar=sx/n,ybar=sy/n;
 const sxx=pairs.reduce((s,p)=>s+(p.x-xbar)**2,0),sxy=pairs.reduce((s,p)=>s+(p.x-xbar)*(p.y-ybar),0),syy=pairs.reduce((s,p)=>s+(p.y-ybar)**2,0);
 if(!sxx)return {n,pairs,valid:false};
 const m=sxy/sxx,b=ybar-m*xbar,residuals=pairs.map(p=>({...p,yhat:m*p.x+b,res:p.y-(m*p.x+b)}));
 const sse=residuals.reduce((s,p)=>s+p.res**2,0),syx=Math.sqrt(sse/(n-2)),r2=syy?sxy*sxy/(sxx*syy):NaN,syxPct=ybar?Math.abs(syx/ybar*100):NaN;
 return {valid:true,n,pairs,residuals,xbar,ybar,sxx,sxy,syy,m,b,sse,syx,r2,syxPct};
}
export function evaluateUvCalibration(levels=[],criteria={}){
 const reg=regressionFromLevels(levels),linearityReg=regressionFromLevelMeans(levels),r2Min=num(criteria.r2Min),syxMax=num(criteria.syxPctMax),errMax=num(criteria.errorPctMax),cvMax=num(criteria.cvPctMax);
 const details=levels.map(l=>{const x=num(l.level),reads=[l.r1,l.r2,l.r3].map(num).filter(finite),avg=mean(reads),sd=stdevSample(reads),cv=avg?Math.abs(sd/avg*100):NaN,recovered=reg.valid&&reg.m?((avg-reg.b)/reg.m):NaN,error=finite(recovered)&&finite(x)?recovered-x:NaN,errorPct=finite(error)&&x?Math.abs(error/x*100):NaN;return {...l,x,reads,avg,sd,cv,recovered,error,errorPct,cvPass:finite(cvMax)&&finite(cv)?cv<=cvMax:null,errorPass:finite(errMax)&&finite(errorPct)?errorPct<=errMax:null}});
 const maxCv=Math.max(...details.map(d=>finite(d.cv)?d.cv:-Infinity)),maxErr=Math.max(...details.map(d=>finite(d.errorPct)?d.errorPct:-Infinity));
 const slopeExcludesZero=reg.valid?(reg.ciSlope[0]>0||reg.ciSlope[1]<0):false;
 const checks={r2:{value:linearityReg.r2,limit:r2Min,pass:linearityReg.valid&&finite(r2Min)?linearityReg.r2>=r2Min:null},syx:{value:linearityReg.syxPct,limit:syxMax,pass:linearityReg.valid&&finite(syxMax)?linearityReg.syxPct<=syxMax:null},error:{value:maxErr,limit:errMax,pass:finite(errMax)&&maxErr>-Infinity?maxErr<=errMax:null},cv:{value:maxCv,limit:cvMax,pass:finite(cvMax)&&maxCv>-Infinity?maxCv<=cvMax:null},slope:{value:slopeExcludesZero,pass:reg.valid?slopeExcludesZero:null}};
 const known=Object.values(checks).filter(c=>c.pass!==null),pass=known.length>0&&known.every(c=>c.pass===true);
 return {reg,linearityReg,details,checks,pass,suggestedDecision:known.length?(pass?'CONFORME':'NO CONFORME'):'REVISIÓN MANUAL'};
}
export function volumetricUncertaintyDetails(tolerance,distribution='RECTANGULAR',expandedCalibrationU=0,calibrationK=2,volume=NaN){
 const tol=num(tolerance),Ucal=num(expandedCalibrationU),kcal=num(calibrationK),V=num(volume);
 if(!finite(tol))return {uTolerance:NaN,uCalibration:NaN,uV:NaN,uVRelative:NaN,uVRelativePct:NaN};
 const raw=String(distribution??'').toUpperCase();let dist=num(distribution);
 if(!finite(dist)||!dist){dist=raw.includes('TRI')?Math.sqrt(6):raw.includes('NORMAL')?2:Math.sqrt(3)}
 const uTolerance=tol/dist;
 const uCalibration=finite(Ucal)&&finite(kcal)&&kcal?Ucal/kcal:0;
 const uV=Math.sqrt(uTolerance*uTolerance+uCalibration*uCalibration);
 const uVRelative=finite(V)&&V?uV/V:NaN;
 return {uTolerance,uCalibration,uV,uVRelative,uVRelativePct:finite(uVRelative)?uVRelative*100:NaN};
}
export function volumetricUncertainty(tolerance,distribution='RECTANGULAR',expandedCalibrationU=0,calibrationK=2){return volumetricUncertaintyDetails(tolerance,distribution,expandedCalibrationU,calibrationK).uV}
export function uncertaintyByLevel({level,standardConc,standardU,standardK,flaskVolume,flaskU,aliquotVolume,pipetteU,resolution,resolutionAbs,slope,resolutionMode='ABSORBANCE',uFR,sr,uVeracity,bias,dilution}){
 const L=num(level),C=num(standardConc),Ustd=num(standardU),k=num(standardK),uC=finite(Ustd)&&finite(k)&&k?Ustd/k:NaN;
 const vf=num(flaskVolume),uvf=num(flaskU),va=num(aliquotVolume),uva=num(pipetteU);
 let relStd=finite(uC)&&finite(C)&&C?uC/C:0,relSq=relStd**2;
 if(finite(va)&&va>0){if(finite(uvf)&&finite(vf)&&vf)relSq+=(uvf/vf)**2;if(finite(uva))relSq+=(uva/va)**2}
 const uPP=finite(L)?Math.abs(L)*Math.sqrt(relSq):NaN;
 const resAbs=num(resolutionAbs ?? resolution),m=Math.abs(num(slope)),directResolution=String(resolutionMode||'').toUpperCase()==='DIRECT_CONCENTRATION';
 // Dos modelos trazables de resolución:
 // 1) ABSORBANCE: resolución de respuesta óptica convertida a concentración mediante la pendiente.
 // 2) DIRECT_CONCENTRATION: resolución ya expresada en mg/L, distribución rectangular: uRes=res/√3.
 const uRes=directResolution?(finite(resAbs)?resAbs/Math.sqrt(3):0):(finite(resAbs)&&finite(m)&&m>0?resAbs/(2*Math.sqrt(3)*m):0),uf=num(uFR)||0,uSr=num(sr)||0,uVer=finite(num(uVeracity))?Math.abs(num(uVeracity)):(Math.abs(num(bias)||0)/Math.sqrt(3)),uDil=num(dilution)||0;
 // Todos los aportes anteriores son incertidumbres estándar u (minúscula).
 // La combinación cuadrática produce uc; solo después se expande con k=2 para obtener U.
 const uc=Math.sqrt((num(uPP)||0)**2+uf**2+uRes**2+uSr**2+uVer**2+uDil**2),expanded=2*uc,uPct=finite(L)&&L?Math.abs(expanded/L*100):NaN;
 return {uC,uPP,uRes,uFR:uf,uPrecision:uSr,uVeracity:uVer,uDilution:uDil,uc,U:expanded,uPct};
}
export function functionResponseUncertaintyDetails(reg,level){
 if(!reg?.valid||!reg.m)return {uFR:NaN,syx:NaN,m:NaN,n:0,x:NaN,xbar:NaN,sxx:NaN,term:NaN};
 const x=num(level);if(!finite(x))return {uFR:NaN,syx:reg.syx,m:reg.m,n:reg.n,x:NaN,xbar:reg.xbar,sxx:reg.sxx,term:NaN};
 // Fórmula validada contra la hoja de cálculo del laboratorio:
 // uFR = (Sy/x / |m|) * sqrt( 1 + 1/n + ((Xi - X̄)^2 / Sxx) )
 // Para el ejemplo DQO 50 mg/L produce ~2.666876 mg/L.
 const term=1+(1/reg.n)+(((x-reg.xbar)**2)/reg.sxx);
 const uFR=Math.abs(reg.syx/reg.m)*Math.sqrt(term);
 return {uFR,syx:reg.syx,m:reg.m,n:reg.n,x,xbar:reg.xbar,sxx:reg.sxx,term};
}
export function functionResponseUncertainty(reg,level){return functionResponseUncertaintyDetails(reg,level).uFR}
