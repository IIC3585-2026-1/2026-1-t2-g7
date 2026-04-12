# 2026-1-t2-g7

Base minima para una tarea de motor de consultas en memoria usando programacion funcional.

Archivos principales:

- `index.html`: estructura basica
- `styles.css`: estilos minimos
- `datos.json`: dataset de ejemplo
- `script.js`: motor de consultas, filtros y conexion con la interfaz
- `server.js`: servidor local con Node y endpoint para OpenAI

Para probarlo:

1. Abre una terminal en la carpeta del proyecto.
2. Abre el archivo `.env` y reemplaza `pon_aqui_tu_clave` por tu clave de OpenAI.
3. Ejecuta `node server.js`.
4. Abre [http://localhost:5500/index.html](http://localhost:5500/index.html) en el navegador.
5. Cambia `datos.json` por cualquier lista de objetos JSON.
6. Usa los filtros, la agrupacion y la caja "Consulta con IA" de la pagina.

Nota:

- Los datos ahora se leen desde `datos.json`.
- Si abres `index.html` con doble clic, el navegador puede bloquear la lectura del JSON.
- El archivo `server.js` levanta un servidor local simple usando solo Node.
- `server.js` carga la variable `OPENAI_API_KEY` desde `.env`.
- `.env` esta en `.gitignore` para no subir la clave.
- La caja "Consulta con IA" envia el texto al servidor local, y el servidor consulta la API de OpenAI.
- Ejemplo de texto: `quiero todas las personas que tengan mas de 15 años`.
- La libreria cumple con `query(data).select().where().orderBy().groupBy().aggregate().execute()`.
