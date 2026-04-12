# 2026-1-t2-g7

Base minima para una tarea de motor de consultas en memoria usando programacion funcional.

Archivos principales:

- `index.html`: estructura basica
- `styles.css`: estilos minimos
- `script.js`: motor de consultas y filtros simples

Para probarlo:

1. Abre `index.html` en el navegador.
2. Cambia el bloque JSON dentro de `index.html` por cualquier lista de objetos JSON.
3. Usa los filtros simples y la agrupacion simple de la pagina para probar consultas.

Nota:

- Los datos se leen desde un bloque JSON dentro del mismo HTML.
- Esto permite que funcione con doble clic, sin servidor local.
- La libreria cumple con `query(data).select().where().orderBy().groupBy().aggregate().execute()`.
