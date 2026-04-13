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
            filas: estado.grupos.map((grupo) => {
              let resultado = { [estado.campoAgrupado]: grupo.clave };
              for (const nombre in agregaciones) {
                resultado = {
                  ...resultado,
                  [nombre]: agregaciones[nombre](grupo.elementos),
                };
              }
              return resultado;
            }),
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

  const obtenerCampos = (datos) => {
    if (datos.length === 0) return [];
    const campos = [];
    for (const campo in datos[0]) campos.push(campo);
    return campos;
  };

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

  const esCampoNumerico = (datos, campo) =>
    datos.some(
      (elemento) =>
        typeof elemento[campo] === "number" && !Number.isNaN(elemento[campo])
    );

  const crearCondicionFiltro = (datos, campo, operador, valor) => {
    const valorTexto = String(valor ?? "").trim();
    const valorNormalizado = valorTexto.toLowerCase();

    if (!campo || valorNormalizado === "") {
      return () => true;
    }

    const campoNumerico = esCampoNumerico(datos, campo);
    const valorNumero = Number(valorTexto);

    return (elemento) => {
      const valorElemento = elemento[campo];
      const textoElemento = String(valorElemento ?? "").toLowerCase();
      const numeroElemento = Number(valorElemento);

      switch (operador) {
        case "igual":
          return campoNumerico
            ? numeroElemento === valorNumero
            : textoElemento === valorNormalizado;
        case "mayor":
          return numeroElemento > valorNumero;
        case "mayor_o_igual":
          return numeroElemento >= valorNumero;
        case "menor":
          return numeroElemento < valorNumero;
        case "menor_o_igual":
          return numeroElemento <= valorNumero;
        default:
          return textoElemento.includes(valorNormalizado);
      }
    };
  };

  const filtrarDatos = (datos, campoFiltro, operadorFiltro, valorFiltro) =>
    query(datos)
      .where(crearCondicionFiltro(datos, campoFiltro, operadorFiltro, valorFiltro))
      .execute();

  const aplicarFiltros = (
    datos,
    campoFiltro,
    operadorFiltro,
    valorFiltro,
    campoOrden,
    direccionOrden,
    camposSeleccionados
  ) => {
    const campos = parsearCamposSeleccionados(camposSeleccionados);
    const datosFiltrados = filtrarDatos(
      datos,
      campoFiltro,
      operadorFiltro,
      valorFiltro
    );
    const consultaBase = query(datosFiltrados).orderBy(campoOrden, direccionOrden);

    return (campos.length === 0
      ? consultaBase
      : consultaBase.select(campos)
    ).execute();
  };

  const agruparDatos = (
    datos,
    campoFiltro,
    operadorFiltro,
    valorFiltro,
    campoGrupo,
    campoPromedio
  ) => {
    const datosFiltrados = filtrarDatos(
      datos,
      campoFiltro,
      operadorFiltro,
      valorFiltro
    );
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

  const interpretarConsultaConIA = async (
    texto,
    campos,
    camposNumericos
  ) => {
    const respuesta = await fetch("/api/interpretar-consulta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        consulta: texto,
        campos,
        camposNumericos,
      }),
    });

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(resultado.error || "No se pudo interpretar la consulta.");
    }

    return resultado;
  };

  const iniciarAplicacion = async () => {
    const salidaDatos = document.getElementById("salida-datos");
    const salidaResultado = document.getElementById("salida-resultado");
    const tituloResultado = document.getElementById("titulo-resultado");
    const consultaIa = document.getElementById("consulta-ia");
    const estadoIa = document.getElementById("estado-ia");
    const botonInterpretarConsulta =
      document.getElementById("interpretar-consulta");
    const camposSeleccionados = document.getElementById("campos-seleccionados");
    const campoFiltro = document.getElementById("campo-filtro");
    const operadorFiltro = document.getElementById("operador-filtro");
    const valorFiltro = document.getElementById("valor-filtro");
    const campoOrden = document.getElementById("campo-orden");
    const direccionOrden = document.getElementById("direccion-orden");
    const campoGrupo = document.getElementById("campo-grupo");
    const campoPromedio = document.getElementById("campo-promedio");
    const botonAplicarFiltros = document.getElementById("aplicar-filtros");
    const botonLimpiarFiltros = document.getElementById("limpiar-filtros");
    const botonVerAgrupacion = document.getElementById("ver-agrupacion");

    const mostrarResultado = (titulo, resultado) => {
      if (!Array.isArray(resultado) || resultado.length === 0) {
        salidaResultado.textContent = "Sin resultados.";
        return;
      }

      const columnas = [];
      for (const col in resultado[0]) columnas.push(col);
      const encabezados = columnas.map((col) => `<th>${col}</th>`).join("");
      const filas = resultado
        .map(
          (fila) =>
            "<tr>" +
            columnas.map((col) => `<td>${fila[col] ?? ""}</td>`).join("") +
            "</tr>"
        )
        .join("");

      salidaResultado.innerHTML =
        `<table class="tabla-resultado"><thead><tr>${encabezados}</tr></thead><tbody>${filas}</tbody></table>`;
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
          operadorFiltro.value,
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
        operadorFiltro.value = "contiene";
        campoOrden.value = campos[0] ?? "";
        direccionOrden.value = "asc";
        estadoIa.textContent = "";
        actualizarResultado();
      });

      botonVerAgrupacion.addEventListener("click", () => {
        const resultado = agruparDatos(
          datos,
          campoFiltro.value,
          operadorFiltro.value,
          valorFiltro.value,
          campoGrupo.value,
          campoPromedio.value
        );

        mostrarResultado("Resultado agrupado con filtro", resultado);
      });

      botonInterpretarConsulta.addEventListener("click", async () => {
        if (!consultaIa.value.trim()) {
          estadoIa.textContent = "Escribe una consulta para interpretar.";
          return;
        }

        estadoIa.textContent = "Interpretando consulta...";

        try {
          const configuracion = await interpretarConsultaConIA(
            consultaIa.value,
            campos,
            camposNumericos
          );

          camposSeleccionados.value = configuracion.select.join(", ");
          campoFiltro.value = configuracion.filter.field || campos[0] || "";
          operadorFiltro.value = configuracion.filter.operator || "contiene";
          valorFiltro.value = configuracion.filter.value || "";
          campoOrden.value = configuracion.orderBy.field || campos[0] || "";
          direccionOrden.value = configuracion.orderBy.direction || "asc";
          campoGrupo.value = configuracion.groupBy.field || campos[0] || "";
          campoPromedio.value = configuracion.groupBy.averageField || "";
          estadoIa.textContent = configuracion.message;

          if (configuracion.mode === "group") {
            const resultado = agruparDatos(
              datos,
              campoFiltro.value,
              operadorFiltro.value,
              valorFiltro.value,
              campoGrupo.value,
              campoPromedio.value
            );

            mostrarResultado("Resultado agrupado con IA", resultado);
            return;
          }

          actualizarResultado();
        } catch (error) {
          estadoIa.textContent = error.message;
        }
      });

      actualizarResultado();
    } catch (error) {
      salidaDatos.textContent = "Error al cargar datos.json";
      salidaResultado.textContent =
        "Error al cargar datos.json. Si abriste index.html con doble clic, prueba con un servidor local simple.";
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
      interpretarConsultaConIA,
      crearCondicionFiltro,
      parsearCamposSeleccionados,
    };
  }
})();

function mostrar(id, tab_id) {
  const tabs = document.querySelectorAll('.filtros');
  const tabss = document.querySelectorAll('.tabs');

  tabs.forEach(tab => tab.classList.remove('activo'));
  tabss.forEach(tabs => tabs.classList.remove('tab_activo'));

  document.getElementById(id).classList.add('activo');
  document.getElementById(tab_id).classList.add('tab_activo');

}

mostrar('tab1', 'tabs1');