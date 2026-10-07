# V1.1.209 — Corrección permisos QR y resumen compacto

- Se amplía la lista blanca de `publicEquipmentStatus/{equipmentCode}` en `firestore.rules` para aceptar `controlModalities` y `calibrationMethods` (manteniendo autenticación, lectura individual pública y restricción del código).
- Inventario Maestro: se oculta la frase «Evidencia registrada / Sin evidencia registrada» en tarjetas compactas. No se eliminan documentos ni metadatos.
- Sin cambios en `.env`, autenticación, P12, otros módulos ni el contenido de las fichas.

## ACCIÓN OBLIGATORIA EN FIREBASE

Las reglas NO se actualizan al ejecutar `npm run dev` ni al subir a Netlify. Desplegar `firestore.rules` en el mismo proyecto Firebase que usa la app, tras revisar las reglas existentes. Con Firebase CLI y permisos apropiados: `firebase deploy --only firestore:rules --project psi-inventarios2026`. Alternativamente editar solo la regla `publicEquipmentStatus` en Firebase Console y publicarla. Después iniciar sesión y pulsar «Actualizar QR» en EI-203. No publicar el QR con permisos de escritura abiertos.
