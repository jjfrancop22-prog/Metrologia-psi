# V1.1.165 — Sincronización QR multiparámetro

- Corrige la discrepancia entre la etiqueta multiparámetro y la vista pública QR.
- Al abrir **Ver etiqueta / imprimir etiqueta**, el ERP republica el estado público usando el mismo motor de métodos/parámetros.
- EI-95 y cualquier equipo con más de un método muestra en QR el detalle por parámetro: última, próxima, frecuencia/perfil y estado.
- Si existe un parámetro vencido, el QR muestra **USO RESTRINGIDO** y deja de declarar erróneamente “activo y sin vencimiento”.
- En equipos multiparámetro se elimina la interpretación visual de una única fecha general; se muestra **MULTIPARÁMETRO · VER DETALLE**.
- Los equipos de calibración única conservan la vista anterior.
- No modifica registros técnicos, firmas P12 ni históricos.
