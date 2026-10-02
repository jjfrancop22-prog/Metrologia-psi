# V1.1.141 — Corrección de arranque Firebase

- Elimina el bloqueo global por `Promise.all` y el falso timeout de sincronización.
- El ERP normal abre al confirmar Inventario; Expediente, Programa, Plantillas, Historial, Auditoría, Catálogos y Control de Campo continúan en tiempo real en segundo plano.
- `/campo` abre al confirmar Equipos; Dotaciones y Movimientos se sincronizan en paralelo sin bloquear el acceso.
- Los errores reales de una colección auxiliar se registran sin expulsar al usuario al login.
- No cambia datos, reglas Firestore ni lógica metrológica existente.
