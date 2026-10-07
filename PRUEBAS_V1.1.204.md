# Prueba local V1.1.204 COV/PID

Esta distribución de prueba conserva el `.env` **original aportado por el usuario**. Es privada: NO compartir ni publicar el ZIP. Vite lee `.env` en la raíz junto a package.json.

1. Descomprimir en una carpeta nueva. Ejecutar `npm install` y `npm run dev`.
2. Confirmar que Firebase conecta. Si no, verificar `ls -la .env` sin mostrar su contenido.
3. Calibración Interna > EI-203: en una calibración COV/PID **ya archivada en V1.1.203** aparecen Ver registro, Ver PDF, Descargar, Nueva calibración, Expediente.
4. Ver registro muestra los datos sin pedir nuevo archivo; Ver PDF y Descargar usan el documento almacenado.
5. Nueva calibración abre formulario nuevo; NO registrar una calibración ficticia en datos de producción.
6. Comprobar que los demás equipos mantienen sus botones y firma P12.

El estado PDF ORIGINAL ARCHIVADO no equivale a aprobación técnica. La conformidad es la decisión documentada del laboratorio.

Si Vite estaba abierto, detenerlo con Ctrl+C antes de iniciar. No copiar `.env` al repositorio ni exponerlo en capturas.
