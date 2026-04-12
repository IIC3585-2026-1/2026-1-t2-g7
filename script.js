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

  const cargarDatosDesdeJson = async () => {
    const respuesta = await fetch("./datos.json");

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el archivo datos.json.");
    }

    return respuesta.json();
  };

  const obtenerCampos = (datos) =>
    datos.length === 0 ? [] : Object.keys(datos[0]);

  const obtenerCamposNumericos = (datos) =>
    obtenerCampos(datos).filter((campo) =>
      datos.every(
        (elemento) =>
          typeof elemento[campo] === "number" && !Number.isNaN(elemento[campo])
      )
    );

  const crearOpciones = (elementoSelect, campos) => {
    elementoSelect.innerHTML = campos
      .map((campo) => `<option value="${campo}">${campo}</option>`)
      .join("");
  };

  const crearOpcionesPromedio = (elementoSelect, campos) => {
    elementoSelect.innerHTML = [
      '<option value="">Sin promedio</option>',
      ...campos.map((campo) => `<option value="${campo}">${campo}</option>`),
    ].join("");
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

  const filtrarDatos = (datos, campoFiltro, valorFiltro) =>
    query(datos).where(crearCondicionFiltro(campoFiltro, valorFiltro)).execute();

  const aplicarFiltros = (
    datos,
    campoFiltro,
    valorFiltro,
    campoOrden,
    direccionOrden,
    camposSeleccionados
  ) => {
    const campos = parsearCamposSeleccionados(camposSeleccionados);
    const datosFiltrados = filtrarDatos(datos, campoFiltro, valorFiltro);
    const consultaBase = query(datosFiltrados).orderBy(campoOrden, direccionOrden);

    return (campos.length === 0
      ? consultaBase
      : consultaBase.select(campos)
    ).execute();
  };

  const agruparDatos = (
    datos,
    campoFiltro,
    valorFiltro,
    campoGrupo,
    campoPromedio
  ) => {
    const datosFiltrados = filtrarDatos(datos, campoFiltro, valorFiltro);
    const agregaciones = {
      count: (items) => items.length,
    };

    if (campoPromedio) {
      agregaciones.average = (items) =>
        average(items.map((elemento) => elemento[campoPromedio]));
    }

    return query(datosFiltrados)
      .groupBy(campoGrupo)
      .aggregate(agregaciones)
      .orderBy("count", "desc")
      .execute();
  };

  const iniciarAplicacion = async () => {
    const salidaDatos = document.getElementById("salida-datos");
    const salidaResultado = document.getElementById("salida-resultado");
    const tituloResultado = document.getElementById("titulo-resultado");
    const camposSeleccionados = document.getElementById("campos-seleccionados");
    const campoFiltro = document.getElementById("campo-filtro");
    const valorFiltro = document.getElementById("valor-filtro");
    const campoOrden = document.getElementById("campo-orden");
    const direccionOrden = document.getElementById("direccion-orden");
    const campoGrupo = document.getElementById("campo-grupo");
    const campoPromedio = document.getElementById("campo-promedio");
    const botonAplicarFiltros = document.getElementById("aplicar-filtros");
    const botonLimpiarFiltros = document.getElementById("limpiar-filtros");
    const botonVerAgrupacion = document.getElementById("ver-agrupacion");

    const mostrarResultado = (titulo, resultado) => {
      tituloResultado.textContent = titulo;
      salidaResultado.textContent = formatearJson(resultado);
    };

    try {
      const datos = await cargarDatosDesdeJson();
      const campos = obtenerCampos(datos);
      const camposNumericos = obtenerCamposNumericos(datos);

      salidaDatos.textContent = formatearJson(datos);
      crearOpciones(campoFiltro, campos);
      crearOpciones(campoOrden, campos);
      crearOpciones(campoGrupo, campos);
      crearOpcionesPromedio(campoPromedio, camposNumericos);

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

      botonVerAgrupacion.addEventListener("click", () => {
        const resultado = agruparDatos(
          datos,
          campoFiltro.value,
          valorFiltro.value,
          campoGrupo.value,
          campoPromedio.value
        );

        mostrarResultado("Resultado agrupado con filtro", resultado);
      });

      actualizarResultado();
    } catch (error) {
      salidaDatos.textContent = "Error al cargar datos.json";
      salidaResultado.textContent =
        "Si abriste index.html con doble clic, prueba con un servidor local simple.";
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
      cargarDatosDesdeJson,
      aplicarFiltros,
      filtrarDatos,
      agruparDatos,
      crearCondicionFiltro,
      parsearCamposSeleccionados,
    };
  }
})();
