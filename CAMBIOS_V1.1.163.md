# V1.1.163 · Correcciones 2/3 puntos

- 6.4.11 muestra la fórmula de interpolación lineal: C(x) = C1 + [(C2-C1)/(X2-X1)](x-X1).
- Se aclara que el valor corregido es Xcorr = x + C(x).
- Dos puntos: admite correcciones positivas, negativas y cambio de signo; no usa promedio ni punto más cercano.
- Tres puntos: interpolación por tramos P1-P2 / P2-P3; no promedia los tres puntos.
- No se extrapola fuera del intervalo certificado.
- Temperatura y humedad relativa permanecen separadas por magnitud para termohigrómetros y futura conexión con ERP SGC.
- Ejemplo visible: 10 °C / +0,5 y 20 °C / -1,0 => a 15 °C, C=-0,25 °C; corregido=14,75 °C.
