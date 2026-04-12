const http = require("http");
const fs = require("fs");
const path = require("path");

const puerto = 5500;
const carpetaBase = __dirname;

const cargarEnv = () => {
  const rutaEnv = path.join(carpetaBase, ".env");

  if (!fs.existsSync(rutaEnv)) {
    return;
  }

  const contenido = fs.readFileSync(rutaEnv, "utf8");

  contenido.split(/\r?\n/).forEach((linea) => {
    const texto = linea.trim();

    if (!texto || texto.startsWith("#")) {
      return;
    }

    const separador = texto.indexOf("=");

    if (separador === -1) {
      return;
    }

    const clave = texto.slice(0, separador).trim();
    const valor = texto.slice(separador + 1).trim();

    if (!process.env[clave]) {
      process.env[clave] = valor;
    }
  });
};

cargarEnv();

const apiKey = process.env.OPENAI_API_KEY;

const tipos = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const enviarJson = (res, codigo, contenido) => {
  res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(contenido));
};

const leerCuerpo = (req) =>
  new Promise((resolve, reject) => {
    let datos = "";

    req.on("data", (chunk) => {
      datos += chunk;
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(datos || "{}"));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });

const interpretarConsulta = async (consulta, campos, camposNumericos) => {
  if (!apiKey) {
    throw new Error("Falta la variable de entorno OPENAI_API_KEY.");
  }

  const respuesta = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      store: false,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Convierte la consulta del usuario a una configuracion JSON para filtros y agrupaciones. " +
                "Usa solo los campos permitidos. " +
                "Si el usuario pide agrupar, usa mode='group'. Si no, usa mode='filter'. " +
                "Los operadores validos son: contiene, igual, mayor, mayor_o_igual, menor, menor_o_igual. " +
                "Si no se menciona un filtro, deja field y value vacios y operator='contiene'. " +
                "Si no se menciona orderBy, usa el mismo campo del filtro o el primer campo disponible. " +
                "Si no se menciona averageField, dejalo vacio. " +
                "Responde solo con JSON valido.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                consulta,
                campos,
                camposNumericos,
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "configuracion_consulta",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              mode: {
                type: "string",
                enum: ["filter", "group"],
              },
              select: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              filter: {
                type: "object",
                additionalProperties: false,
                properties: {
                  field: { type: "string" },
                  operator: {
                    type: "string",
                    enum: [
                      "contiene",
                      "igual",
                      "mayor",
                      "mayor_o_igual",
                      "menor",
                      "menor_o_igual"
                    ],
                  },
                  value: { type: "string" },
                },
                required: ["field", "operator", "value"],
              },
              orderBy: {
                type: "object",
                additionalProperties: false,
                properties: {
                  field: { type: "string" },
                  direction: {
                    type: "string",
                    enum: ["asc", "desc"],
                  },
                },
                required: ["field", "direction"],
              },
              groupBy: {
                type: "object",
                additionalProperties: false,
                properties: {
                  field: { type: "string" },
                  averageField: { type: "string" },
                },
                required: ["field", "averageField"],
              },
              message: {
                type: "string",
              },
            },
            required: ["mode", "select", "filter", "orderBy", "groupBy", "message"],
          },
        },
      },
    }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error?.message || "Error al consultar OpenAI.");
  }

  const textoRespuesta =
    datos.output?.[0]?.content?.find((item) => item.type === "output_text")
      ?.text || "";

  return JSON.parse(textoRespuesta);
};

const servirArchivo = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const rutaSolicitada = url.pathname === "/" ? "/index.html" : url.pathname;
  const rutaArchivo = path.normalize(path.join(carpetaBase, rutaSolicitada));

  if (!rutaArchivo.startsWith(carpetaBase)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Acceso no permitido");
    return;
  }

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
};

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "POST" && url.pathname === "/api/interpretar-consulta") {
    try {
      const cuerpo = await leerCuerpo(req);
      const resultado = await interpretarConsulta(
        cuerpo.consulta,
        cuerpo.campos,
        cuerpo.camposNumericos
      );

      enviarJson(res, 200, resultado);
    } catch (error) {
      enviarJson(res, 500, { error: error.message });
    }

    return;
  }

  servirArchivo(req, res);
});

servidor.listen(puerto, () => {
  console.log(`Servidor corriendo en http://localhost:${puerto}`);
});
