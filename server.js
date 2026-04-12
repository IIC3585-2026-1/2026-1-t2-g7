const http = require("http");
const fs = require("fs");
const path = require("path");

const puerto = 5500;
const carpetaBase = __dirname;

const tipos = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const obtenerRutaArchivo = (url) => {
  const rutaSolicitada = url === "/" ? "/index.html" : url;
  return path.join(carpetaBase, rutaSolicitada);
};

const servidor = http.createServer((req, res) => {
  const rutaArchivo = obtenerRutaArchivo(req.url);
  const extension = path.extname(rutaArchivo);
  const tipo = tipos[extension] || "text/plain; charset=utf-8";

  fs.readFile(rutaArchivo, (error, contenido) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Archivo no encontrado");
      return;
    }

    res.writeHead(200, { "Content-Type": tipo });
    res.end(contenido);
  });
});

servidor.listen(puerto, () => {
  console.log(`Servidor corriendo en http://localhost:${puerto}`);
});
