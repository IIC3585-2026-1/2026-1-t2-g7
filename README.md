# 2026-1-t2-g7

Base minima para una tarea de motor de consultas en memoria usando programacion funcional.

Archivos principales:

- `index.html`: estructura basica
- `styles.css`: estilos minimos
- `datos.json`: dataset de ejemplo
- `script.js`: motor de consultas y filtros simples
- `server.js`: para iniciar app

Para probarlo:

1. Abre una terminal en la carpeta del proyecto.
2. Ejecuta `node server.js`.
3. Abre [http://localhost:5500/index.html](http://localhost:5500/index.html) en el navegador.
4. Cambia `datos.json` por cualquier lista de objetos JSON.
5. Usa los filtros simples y la agrupacion simple de la pagina para probar consultas.

Nota:

- Los datos ahora se leen desde `datos.json`.
- Si abres `index.html` con doble clic, el navegador puede bloquear la lectura del JSON.
- El archivo `server.js` levanta un servidor local simple usando solo Node.
- La libreria cumple con `query(data).select().where().orderBy().groupBy().aggregate().execute()`.
