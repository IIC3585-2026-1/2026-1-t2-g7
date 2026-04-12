(() => {
  const promedio = (numeros) =>
    numeros.length === 0
      ? 0
      : numeros.reduce((total, numero) => total + numero, 0) / numeros.length;

  const average = promedio;

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
        "No puedes usar select, where u orderBy despues de groupBy y antes de aggregate."
      );
    }

    return estado;
  };

  const construirConsulta = (datosOriginales, pasos = []) => {
    const select = (campos) =>
      construirConsulta(datosOriginales, [
        ...pasos,
        (estado) => ({
          ...asegurarFilas(estado),
          filas: estado.filas.map((elemento) =>
            seleccionarCampos(elemento, campos)
          ),
        }),
      ]);

    const where = (funcionCondicion) =>
      construirConsulta(datosOriginales, [
        ...pasos,
        (estado) => ({
          ...asegurarFilas(estado),
          filas: estado.filas.filter(funcionCondicion),
        }),
      ]);

    const orderBy = (campo, direccion = "asc") =>
      construirConsulta(datosOriginales, [
        ...pasos,
        (estado) => ({
          ...asegurarFilas(estado),
          filas: ordenarFilas(estado.filas, campo, direccion),
        }),
      ]);

    const groupBy = (campo) =>
      construirConsulta(datosOriginales, [
        ...pasos,
        (estado) => ({
          ...asegurarFilas(estado),
          campoAgrupado: campo,
          grupos: agruparFilasPorCampo(estado.filas, campo),
        }),
      ]);

    const aggregate = (agregaciones) =>
      construirConsulta(datosOriginales, [
        ...pasos,
        (estado) => {
          if (!estado.campoAgrupado) {
            throw new Error("Debes usar groupBy antes de aggregate.");
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
      ]);

    const execute = () =>
      pasos.reduce(
        (estado, paso) => paso(estado),
        {
          filas: [...datosOriginales],
          campoAgrupado: null,
          grupos: [],
        }
      ).filas;

    return {
      select,
      where,
      orderBy,
      groupBy,
      aggregate,
      execute,
      seleccionar: select,
      donde: where,
      ordenarPor: orderBy,
      agruparPor: groupBy,
      agregar: aggregate,
      ejecutar: execute,
    };
  };

  const query = (lista) => construirConsulta([...lista]);
  const consulta = query;

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

  const parsearCamposSeleccionados = (texto) =>
    texto
      .split(",")
      .map((campo) => campo.trim())
      .filter(Boolean);

  const crearCondicionFiltro = (campo, valor) => {
    const valorNormalizado = valor.trim().toLowerCase();

    if (!campo || valorNormalizado === "") {
      return () => true;
    }

    return (elemento) =>
      String(elemento[campo] ?? "").toLowerCase().includes(valorNormalizado);
  };

  const aplicarFiltros = (
    datos,
    campoFiltro,
    valorFiltro,
    campoOrden,
    direccionOrden,
    camposSeleccionados
  ) => {
    const campos = parsearCamposSeleccionados(camposSeleccionados);
    const consultaBase = query(datos)
      .where(crearCondicionFiltro(campoFiltro, valorFiltro))
      .orderBy(campoOrden, direccionOrden);

    return (campos.length === 0
      ? consultaBase
      : consultaBase.select(campos)
    ).execute();
  };

  const iniciarAplicacion = () => {
    const salidaDatos = document.getElementById("salida-datos");
    const salidaResultado = document.getElementById("salida-resultado");
    const tituloResultado = document.getElementById("titulo-resultado");
    const camposSeleccionados = document.getElementById("campos-seleccionados");
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
          direccionOrden.value,
          camposSeleccionados.value
        );

        mostrarResultado("Resultado", resultado);
      };

      botonAplicarFiltros.addEventListener("click", actualizarResultado);

      botonLimpiarFiltros.addEventListener("click", () => {
        camposSeleccionados.value = "";
        valorFiltro.value = "";
        campoFiltro.value = campos[0] ?? "";
        campoOrden.value = campos[0] ?? "";
        direccionOrden.value = "asc";
        actualizarResultado();
      });

      actualizarResultado();
    } catch (error) {
      salidaDatos.textContent = "Error al leer los datos del HTML";
      salidaResultado.textContent =
        "Revisa el bloque JSON que esta dentro de index.html.";
      console.error(error);
    }
  };

  if (typeof document !== "undefined") {
    iniciarAplicacion();
  }

  if (typeof module !== "undefined") {
    module.exports = {
      average,
      promedio,
      query,
      consulta,
      aplicarFiltros,
      crearCondicionFiltro,
      parsearCamposSeleccionados,
    };
  }
})();
