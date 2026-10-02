## V1.1.118 · TERMOHIGRÓMETRO EMP SIMPLE
- Temperatura: conformidad por `|Error| ≤ 1 °C`.
- Humedad relativa: conformidad por `|Error| ≤ 5 %HR`.
- Para esta familia no se usa error residual, corrección ni U como criterio de aceptación.
- U puede leerse del PDF como dato del certificado, pero no condiciona la decisión simple solicitada.
- Deriva: diferencia del error entre certificado actual y anterior, separada por magnitud.
- Service Worker y paquete actualizados a 1.1.118 para forzar renovación de caché/PWA.

## V1.1.115 · Evaluación universal de certificados con corrección

- Estados trazables: CONFORME, REQUIERE CORRECCIÓN, CONFORME CON CORRECCIÓN OBLIGATORIA, NO CONFORME y NO EVALUABLE.
- Guarda error, U, EMP, corrección, confirmación, error residual, índices antes/después y decisión por punto.
- La corrección no reduce ni sustituye la incertidumbre del certificado.

## V1.1.112 · Termohigrómetro universal · ficha mínima inteligente

- Nueva familia universal `TERMOHIGROMETRO`, válida para cualquier marca, modelo o código interno.
- Reconocimiento automático de termohigrómetro, termo-higrómetro, higrómetro digital, higrotermómetro y nombres equivalentes en inglés.
- Ficha técnica mínima: sensor, indicación, funciones, memoria/registro, instalación representativa y uso previsto.
- Metrología separada por magnitud: Temperatura (°C) y Humedad relativa (%HR).
- Rango, resolución, exactitud, EMP e incertidumbre permanecen vacíos hasta disponer de ficha técnica, certificado o criterio interno controlado.
- Regla de aceptación sugerida para ambas magnitudes: `|Error| + U ≤ EMP`.
- No contiene valores particulares de AcuRite, EI-194 ni de ningún equipo específico.

## V1.1.97 — Programa de Mantenimiento Inteligente IA

- Nuevo Programa de Mantenimiento separado en Interno preventivo y Externo/Correctivo.
- Interno: calendario anual, programado vs ejecutado, cumplimiento, frecuencia IA PG0416 y trazabilidad.
- Externo/correctivo: flujo solicitud-cotización-aprobación-programación-servicio-evidencia, causa/falla/impacto, proveedor, OC, orden de servicio, costo, indisponibilidad y retorno al servicio.
- Realtime Firebase y auditoría de cada planificación/reprogramación.

## V1.1.96 — Programa de Calibración Individual IA

- Nuevo Programa de Calibración individual derivado del Inventario y los módulos de calibración ya existentes.
- Replica y mejora la estructura del Programa de Calibración 2026: código, equipo, puntos/métodos, modalidad, frecuencia, última/próxima fecha, días, estado y avance.
- Tiempo real vía Firebase, intervalos IA aprobados, calendario anual, prioridad inteligente y trazabilidad de reprogramaciones/evidencias.
- Todas las calibraciones internas por método y externas multipunto configuradas aparecen automáticamente, sin doble digitación.

## V1.1.95 — Curva pH · Ishikawa + EURACHEM + Welch + Deriva IA

- Presupuesto completo por nivel pH 4/7/10: u_rep, u_buf, u_res, u_T, u_der y u_T_campo.
- u_der se obtiene automáticamente del historial comparable; si no existe, se muestra N/A y no se inventa.
- u_T_campo es configurable y por defecto NO APLICA.
- Welch–Satterthwaite para grados de libertad efectivos y k95 dinámico (t-Student cuando νeff < 30).
- Contribución porcentual por fuente y diagnóstico IA de la fuente dominante.
- Regla de decisión conservadora |Error| + U ≤ EMP y motor de intervalo separado.
- PDF ampliado con presupuesto metrológico completo.

## V1.1.93 — Curva pH · Calibración Interna IA

Base: V1.1.92.

### Implementado
- Nuevo perfil `PH_CURVE` en Calibración Interna.
- Detección automática de pHmetro / pH-metro / EI-188.
- Formato basado en `Informe 1 de calibracion EI-188 Abril 2026.xlsx`: trazabilidad de buffers pH 4/7/10, 10 lecturas por nivel, condiciones ambientales y efecto opcional de temperatura.
- Cálculo automático: promedio, s, u repetibilidad, u buffer, u resolución, u temperatura, uc, U(k), error y regla conservadora `|Error| + U ≤ EMP`.
- EMP editable (0.10 pH por defecto según el formato aportado).
- Intervalo IA por histórico de calibraciones del mismo método: compara error por nivel, deriva/mes, consumo del EMP, margen preventivo al 80% y meses seguros; propone 3/6/12 meses cuando existe histórico, y conserva el intervalo vigente como provisional cuando aún no hay histórico.
- Decisión final del laboratorio, justificación cuando difiere de IA, actualización de próxima fecha y frecuencia del método.
- PDF de calibración, preliminar Firebase, firma P12/PFX y bloqueo tras firma.

La IA no inventa valores de buffers, certificados ni lecturas.

## V1.1.98 — Centro de Alertas Inteligente IA
- Activa el Centro de Alertas en tiempo real.
- Prioriza vencimientos, no conformidades, equipos fuera de servicio, correctivos abiertos, firmas pendientes y decisiones de intervalo sin justificar.
- Las alertas se derivan de las fuentes originales y desaparecen al resolver la causa; no crea una base paralela.
- Acciones directas llevan a Programa, Mantenimiento, Calibración, Verificación o Expediente.
- Semáforo CRÍTICA / ALTA / MEDIA con resumen IA trazable.

## V1.1.101 — Asistente IA Metrológico
- Asistente IA habilitado como copiloto trazable sobre datos existentes del ERP.
- Consultas por lenguaje natural y código de equipo.
- Acciones rápidas: resumen de hoy, próximos 30 días, riesgos, auditoría, intervalos, mantenimientos y firmas.
- Respuestas basadas en Inventario, Expediente, Programa Metrológico, Programa de Calibración, Programa de Mantenimiento, Centro de Alertas e Historial.
- Fuentes navegables desde cada respuesta; el asistente no modifica registros directamente.
- Análisis específico por equipo: estado, alertas, próximas obligaciones, últimas evidencias e intervalos/deriva archivados.


## V1.1.101 · PWA actualización segura
- Service Worker network-first para navegación.
- `updateViaCache: none`, comprobación al abrir, volver a foco y cada 30 minutos.
- Activación inmediata de nueva versión y recarga única al tomar control.
- Limpieza automática de cachés ERP anteriores.
- Cabeceras Netlify no-cache para `sw.js`, `index.html` y manifiesto.


## V1.1.102 · GitHub / Netlify Production Safe
- Firebase Web config moved from source code to `VITE_FIREBASE_*` environment variables.
- `.env.example` documents the required variables without values.
- `.gitignore` excludes `.env`, `node_modules`, `dist`, `.netlify` and macOS metadata.
- Netlify secret scanning is configured to allow the intentionally public Firebase Web config keys in the browser bundle.
- Removed temporary development extracts (`phblock.txt`, `calib_excerpt.txt`).
- Keeps V1.1.101 30-minute idle session, initial Firebase synchronization and multi-PC realtime behavior.


## V1.1.103 · Sidebar Responsive / Crecimiento Seguro
- Corrige la superposición del pie ISO/IEC 17025 y el botón Asistente IA en pantallas de escritorio.
- Sidebar convertido a layout flex vertical: marca fija arriba, navegación central desplazable y pie documental fijo dentro del flujo.
- La navegación dispone de scroll independiente y queda preparada para agregar nuevos módulos sin montar elementos.
- No modifica Firebase, autenticación, Firestore, trazabilidad, PWA ni lógica metrológica.
- Sirve además como prueba de actualización automática PWA desde V1.1.102 a V1.1.103.


## V1.1.104 · Balanza IA / Mantenimiento PG0416
- Ficha técnica IA ampliada para BALANZA y perfil específico EI-189 KERN ABT 220-5DM.
- Nuevo formato inteligente de mantenimiento interno para balanzas, basado en PSI-PG0416 y datos esenciales de EI-189 / EI-196.
- IA mantiene decisión post-mantenimiento e intervalo dinámico; el control con pesa patrón no sustituye calibración/verificación formal.


## V1.1.111 · Balanza · Control Externo IA de intervalo
- Controles Externos detecta automáticamente la familia BALANZA.
- Lector PDF especializado para certificados ELICROM: identificación, fecha/certificado, d/e/capacidad, cargas, indicación, error, U, EMP y cumplimiento.
- Verifica trazabilidad esencial de masas patrón: identificación, clase, certificado/vigencia, laboratorio acreditado y declaración de cadena al SI.
- Aplica regla conservadora |e| + U <= EMP por carga.
- Certificado anterior solo se acepta como histórico si corresponde al mismo equipo; evita usar otra balanza para calcular deriva.
- Compara cargas equivalentes, calcula delta de error, deriva/mes, uso del EMP, margen y meses seguros.
- Un único certificado queda como LINEA BASE y no habilita ampliación automática.
- Conserva excentricidad/repetibilidad como evidencia resumida y el PDF completo en Expediente.
- Guarda trazabilidad de la decisión IA y la decisión final del laboratorio.


## V1.1.111 · Balanza · lector especializado por niveles
- El lector de certificados de balanza reconstruye directamente la tabla **Ensayo de Errores de Indicación** usando coordenadas PDF y fallback por líneas.
- Extrae por nivel: Valor patrón, Indicación, Error, U, k, EMP y Cumplimiento.
- Compara certificado anterior y actual solo para el mismo equipo y la misma carga; calcula deriva/mes, consumo del EMP, margen y recomendación de intervalo.
- El cero se conserva como evidencia del certificado pero no se usa como punto limitante de deriva.
- Motor de lectura: `BALANCE_INDICATION_TABLE_XY_V2`.


## V1.1.111 · Criterio metrológico base universal
- Deriva calculada únicamente con cambio de error y tiempo entre ciclos.
- U expandida separada de la deriva y usada con EMP para consumo y margen cuando aplica.
- Tabla auditable: Error previo/actual, delta, meses, deriva/mes, U, EMP, consumo, margen, meses seguros y estado.
- No se inventa U/EMP para familias sin magnitudes comparables; se conserva el criterio técnico específico.
- Factor conservador 0,80 identificado explícitamente como política interna.
