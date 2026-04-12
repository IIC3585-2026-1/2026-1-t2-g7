const promedio = (numeros) =>
  numeros.length === 0
    ? 0
    : numeros.reduce((total, numero) => total + numero, 0) / numeros.length;

const seleccionarCampos = (elemento, campos) =>
  campos.reduce(
    (resultado, campo) => ({
      ...resultado,
      [campo]: elemento[campo],
    }),
    {}
  );

const compararValores = (primero, segundo) => {
  if (primero === segundo) {
    return 0;
  }

  return primero > segundo ? 1 : -1;
};

const ordenarFilas = (filas, campo, direccion = "asc") => {
  const multiplicador = direccion === "desc" ? -1 : 1;

  return [...filas].sort(
    (a, b) => compararValores(a[campo], b[campo]) * multiplicador
  );
};

const agruparFilasPorCampo = (filas, campo) =>
  filas.reduce((grupos, elemento) => {
    const clave = elemento[campo];
    const grupoActual = grupos.find((grupo) => grupo.clave === clave);

    if (!grupoActual) {
      return [...grupos, { clave, elementos: [elemento] }];
    }

    return grupos.map((grupo) =>
      grupo.clave === clave
        ? { ...grupo, elementos: [...grupo.elementos, elemento] }
        : grupo
    );
  }, []);

const asegurarFilas = (estado) => {
  if (estado.campoAgrupado) {
    throw new Error(
      "No puedes usar seleccionar, donde u ordenarPor despues de agruparPor y antes de agregar."
    );
  }

  return estado;
};

const construirConsulta = (datosOriginales, pasos = []) => ({
  seleccionar: (campos) =>
    construirConsulta(datosOriginales, [
      ...pasos,
      (estado) => ({
        ...asegurarFilas(estado),
        filas: estado.filas.map((elemento) => seleccionarCampos(elemento, campos)),
      }),
    ]),

  donde: (funcionCondicion) =>
    construirConsulta(datosOriginales, [
      ...pasos,
      (estado) => ({
        ...asegurarFilas(estado),
        filas: estado.filas.filter(funcionCondicion),
      }),
    ]),

  ordenarPor: (campo, direccion = "asc") =>
    construirConsulta(datosOriginales, [
      ...pasos,
      (estado) => ({
        ...asegurarFilas(estado),
        filas: ordenarFilas(estado.filas, campo, direccion),
      }),
    ]),

  agruparPor: (campo) =>
    construirConsulta(datosOriginales, [
      ...pasos,
      (estado) => ({
        ...asegurarFilas(estado),
        campoAgrupado: campo,
        grupos: agruparFilasPorCampo(estado.filas, campo),
      }),
    ]),

  agregar: (agregaciones) =>
    construirConsulta(datosOriginales, [
      ...pasos,
      (estado) => {
        if (!estado.campoAgrupado) {
          throw new Error("Debes usar agruparPor antes de agregar.");
        }

        return {
          filas: estado.grupos.map((grupo) => ({
            [estado.campoAgrupado]: grupo.clave,
            ...Object.entries(agregaciones).reduce(
              (resultado, [nombre, funcion]) => ({
                ...resultado,
                [nombre]: funcion(grupo.elementos),
              }),
              {}
            ),
          })),
          campoAgrupado: null,
          grupos: [],
        };
      },
    ]),

  ejecutar: () =>
    pasos.reduce(
      (estado, paso) => paso(estado),
      {
        filas: [...datosOriginales],
        campoAgrupado: null,
        grupos: [],
      }
    ).filas,
});

const consulta = (lista) => construirConsulta([...lista]);

const formatearJson = (valor) => JSON.stringify(valor, null, 2);

const cargarDatosDesdeHtml = () => {
  const elementoDatos = document.getElementById("datos-json");

  if (!elementoDatos) {
    throw new Error("No se encontro el bloque de datos JSON en el HTML.");
  }

  return JSON.parse(elementoDatos.textContent);
};

const obtenerCampos = (datos) =>
  datos.length === 0 ? [] : Object.keys(datos[0]);

const crearOpciones = (elementoSelect, campos) => {
  elementoSelect.innerHTML = campos
    .map((campo) => `<option value="${campo}">${campo}</option>`)
    .join("");
};

const crearCondicionFiltro = (campo, valor) => {
  const valorNormalizado = valor.trim().toLowerCase();

  if (!campo || valorNormalizado === "") {
    return () => true;
  }

  return (elemento) =>
    String(elemento[campo] ?? "").toLowerCase().includes(valorNormalizado);
};

const aplicarFiltros = (datos, campoFiltro, valorFiltro, campoOrden, direccionOrden) =>
  consulta(datos)
    .donde(crearCondicionFiltro(campoFiltro, valorFiltro))
    .ordenarPor(campoOrden, direccionOrden)
    .ejecutar();

const iniciarAplicacion = () => {
  const salidaDatos = document.getElementById("salida-datos");
  const salidaResultado = document.getElementById("salida-resultado");
  const tituloResultado = document.getElementById("titulo-resultado");
  const campoFiltro = document.getElementById("campo-filtro");
  const valorFiltro = document.getElementById("valor-filtro");
  const campoOrden = document.getElementById("campo-orden");
  const direccionOrden = document.getElementById("direccion-orden");
  const botonAplicarFiltros = document.getElementById("aplicar-filtros");
  const botonLimpiarFiltros = document.getElementById("limpiar-filtros");

  const mostrarResultado = (titulo, resultado) => {
    tituloResultado.textContent = titulo;
    salidaResultado.textContent = formatearJson(resultado);
  };

  try {
    const datos = cargarDatosDesdeHtml();
    const campos = obtenerCampos(datos);

    salidaDatos.textContent = formatearJson(datos);
    crearOpciones(campoFiltro, campos);
    crearOpciones(campoOrden, campos);

    const actualizarResultado = () => {
      const resultado = aplicarFiltros(
        datos,
        campoFiltro.value,
        valorFiltro.value,
        campoOrden.value,
        direccionOrden.value
      );

      mostrarResultado("Resultado filtrado", resultado);
    };

    botonAplicarFiltros.addEventListener("click", actualizarResultado);

    botonLimpiarFiltros.addEventListener("click", () => {
      valorFiltro.value = "";
      campoFiltro.value = campos[0] ?? "";
      campoOrden.value = campos[0] ?? "";
      direccionOrden.value = "asc";
      actualizarResultado();
    });

    actualizarResultado();

    if (typeof window !== "undefined") {
      window.datos = datos;
    }
  } catch (error) {
    salidaDatos.textContent = "Error al leer los datos del HTML";
    salidaResultado.textContent = "Revisa el bloque JSON que esta dentro de index.html.";
    console.error(error);
  }
};

if (typeof document !== "undefined") {
  iniciarAplicacion();
}

if (typeof window !== "undefined") {
  window.consulta = consulta;
  window.promedio = promedio;
}

if (typeof module !== "undefined") {
  module.exports = {
    promedio,
    consulta,
    aplicarFiltros,
    crearCondicionFiltro,
  };
}
