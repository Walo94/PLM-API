import { connectDB } from "../../config/db.js";
import sql from "mssql";

const _getDbConfig = () => {
  return { pool: connectDB };
};

const _crearFechaLocal = (fechaString) => {
  if (!fechaString) return null;
  // Aseguramos que sea string, si ya es Date, lo clonamos
  if (fechaString instanceof Date) {
    const d = new Date(fechaString);
    d.setHours(12, 0, 0, 0);
    return d;
  }

  // Si viene como "2025-12-04T00:00:00.000Z" nos quedamos solo con la parte de la fecha
  const fechaParte = fechaString.toString().split("T")[0];
  const [anio, mes, dia] = fechaParte.split("-");

  // Creamos la fecha: Año, Mes (index 0), Día, 12 horas.
  return new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia), 12, 0, 0);
};

/**
 * Sumar días hábiles respetando fines de semana y festivos.
 * Lógica: Avanzar día por día y contar solo si es lunes-viernes.
 */
const agregarDiasHabiles = async (fechaInicio, diasAAgregar, connection) => {
  const request = connection.request();

  const result = await request.query(
    `SELECT Fecha FROM dbo.DiasNoLaborables WHERE Estatus = 1`
  );

  const diasNoLaborables = new Set(
    result.recordset.map((r) => r.Fecha.toISOString().split("T")[0])
  );

  // Usamos una copia de la fecha garantizada a mediodía
  let fecha = new Date(fechaInicio);
  fecha.setHours(12, 0, 0, 0);

  // CASO 1: diasAAgregar es 0 (La tarea empieza y termina el mismo día)
  // Solo validamos que HOY no sea sábado/domingo. Si es, pasamos al lunes.
  if (diasAAgregar === 0) {
    while (true) {
      const diaSemana = fecha.getDay(); // 0=Domingo, 6=Sábado
      const fechaStr = fecha.toISOString().split("T")[0]; // YYYY-MM-DD

      // Es inhábil si es Domingo, Sábado o Festivo
      const esInhabil =
        diaSemana === 0 || diaSemana === 6 || diasNoLaborables.has(fechaStr);

      if (!esInhabil) break; // Es válido (Lun-Vie), salimos.

      // Si es inhábil, corremos la fecha un día natural
      fecha.setDate(fecha.getDate() + 1);
    }
    return fecha;
  }

  // CASO 2: diasAAgregar > 0
  let diasSumados = 0;

  while (diasSumados < diasAAgregar) {
    // 1. Avanzamos un día natural
    fecha.setDate(fecha.getDate() + 1);

    const diaSemana = fecha.getDay();
    const fechaStr = fecha.toISOString().split("T")[0];

    // 2. Verificamos si es inhábil
    const esInhabil =
      diaSemana === 0 || diaSemana === 6 || diasNoLaborables.has(fechaStr);

    // 3. Solo contamos si es día hábil
    if (!esInhabil) {
      diasSumados++;
    }
    // Si es inhábil (ej. Sábado), el bucle sigue, la fecha avanza al Domingo,
    // diasSumados NO aumenta, y seguimos hasta encontrar lunes.
  }

  return fecha;
};

// Calcular atraso en días hábiles
const calcularDiasAtraso = async (fechaEsperada, fechaActual, connection) => {
  if (!fechaEsperada || fechaActual <= fechaEsperada) return 0;

  const request = connection.request();
  const result = await request.query(
    `SELECT Fecha FROM dbo.DiasNoLaborables WHERE Estatus = 1`
  );

  const diasNoLaborables = new Set(
    result.recordset.map((r) => r.Fecha.toISOString().split("T")[0])
  );

  let fecha = new Date(fechaEsperada);
  let diasAtraso = 0;
  const fechaLimite = new Date(fechaActual);

  while (fecha < fechaLimite) {
    fecha.setDate(fecha.getDate() + 1);
    const diaSemana = fecha.getDay();
    const fechaStr = fecha.toISOString().split("T")[0];

    if (diaSemana !== 0 && diaSemana !== 6 && !diasNoLaborables.has(fechaStr)) {
      diasAtraso++;
    }
  }

  return diasAtraso;
};

const _mapProyectoData = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.Id,
    rutaId: dbRecord.RutaId,
    rutaNombre: dbRecord.RutaNombre,
    marcaNombre: dbRecord.MarcaNombre,
    coleccionNombre: dbRecord.ColeccionNombre,
    imagen: dbRecord.Imagen,
    inicioDesarrollo: dbRecord.InicioDesarrollo,
    fechaCompromiso: dbRecord.FechaCompromiso,
    fechaCalculadaFin: dbRecord.FechaCalculadaFin,
    fechaRealFin: dbRecord.FechaRealFin,
    codigoDDI: dbRecord.CodigoDDI,
    modelo: dbRecord.Modelo,
    marcaId: dbRecord.MarcaId,
    coleccionId: dbRecord.ColeccionId,
    tallaCentral: dbRecord.TallaCentral,
    corridaId: dbRecord.CorridaId,
    formatoProyecto: dbRecord.FormatoProyecto,
    segmentoId: dbRecord.SegmentoId,
    hormaId: dbRecord.HormaId,
    suelaId: dbRecord.SuelaId,
    costoMeta: dbRecord.CostoMeta,
    precosteo: dbRecord.Precosteo,
    diferencia: dbRecord.Diferencia,
    diasAtraso: dbRecord.DiasAtraso,
    porcentajeAvance: dbRecord.PorcentajeAvance,
    estatus: dbRecord.Estatus,
    fechaCreacion: dbRecord.FechaCreacion,
    usuarioCreacion: dbRecord.UsuarioCreacion,
  };
};

const _mapActividadData = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.Id,
    proyectoId: dbRecord.ProyectoId,
    rutaDetalleId: dbRecord.RutaDetalleId,
    orden: dbRecord.Orden,
    procesoId: dbRecord.ProcesoId,
    actividadId: dbRecord.ActividadId,
    entregable: dbRecord.Entregable,
    responsableId: dbRecord.ResponsableId,
    responsableNombre: dbRecord.ResponsableNombre || "Sin asignar",
    autorizaNombre: dbRecord.AutorizaNombre || "Sin asignar",
    procesoNombre: dbRecord.ProcesoNombre,
    actividadNombre: dbRecord.ActividadNombre,
    autorizaId: dbRecord.AutorizaId,
    diasHabiles: dbRecord.DiasHabiles,
    dependeDeActividadId: dbRecord.DependeDeActividadId,
    fechaInicioCalculada: dbRecord.FechaInicioCalculada,
    fechaFinCalculada: dbRecord.FechaFinCalculada,
    fechaInicioReal: dbRecord.FechaInicioReal,
    fechaFinReal: dbRecord.FechaFinReal,
    diasAtraso: dbRecord.DiasAtraso,
    estatus: dbRecord.Estatus,
    observaciones: dbRecord.Observaciones,
    fechaCreacion: dbRecord.FechaCreacion,
    fechaActualizacion: dbRecord.FechaActualizacion,
  };
};

const _mapTimelineData = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.Id,
    orden: dbRecord.Orden,
    actividadId: dbRecord.ActividadId,
    entregable: dbRecord.Entregable,
    actividadNombre: dbRecord.ActividadNombre,
    responsable: dbRecord.Responsable,
    autoriza: dbRecord.Autoriza,
    fechaInicioCalculada: dbRecord.FechaInicioCalculada,
    fechaFinCalculada: dbRecord.FechaFinCalculada,
    fechaInicioReal: dbRecord.FechaInicioReal,
    fechaFinReal: dbRecord.FechaFinReal,
    estatus: dbRecord.Estatus,
    diasAtraso: dbRecord.DiasAtraso,
    bloqueoActivo: dbRecord.BloqueoActivo,
  };
};

/**
 * Método interno para actualizar avance y atraso del proyecto
 */
const _actualizarProyectoAvance = async (proyectoId, transaction) => {
  const request = transaction.request();
  request.input("proyectoId", sql.Int, proyectoId);

  await request.query(
    `UPDATE p
       SET p.PorcentajeAvance = (
         SELECT CAST(COUNT(CASE WHEN pa.Estatus = 3 THEN 1 END) AS DECIMAL) * 100 / COUNT(*)
         FROM dbo.ProyectosActividades pa
         WHERE pa.ProyectoId = @proyectoId
       ),
       p.DiasAtraso = (
         SELECT ISNULL(SUM(pa.DiasAtraso), 0)
         FROM dbo.ProyectosActividades pa
         WHERE pa.ProyectoId = @proyectoId
       )
       FROM dbo.Proyectos p
       WHERE p.Id = @proyectoId`
  );
};

export const ProyectoModel = {
  /**
   * Crea un nuevo Proyecto y genera automáticamente sus actividades
   */
  create: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();

    try {
      await transaction.begin();

      // 1. Obtener la ruta
      const requestRuta = transaction.request();
      requestRuta.input("rutaId", sql.SmallInt, data.rutaId);

      const resultRuta = await requestRuta.query(
        `SELECT * FROM dbo.Rutas WHERE Id = @rutaId`
      );

      if (resultRuta.recordset.length === 0)
        throw new Error("Ruta no encontrada");
      const ruta = resultRuta.recordset[0];
      const diasTotalesRuta = ruta.DiasTotales;

      // 2. Obtener actividades
      const requestActividades = transaction.request();
      requestActividades.input("rutaId", sql.SmallInt, data.rutaId);

      const resultActividades = await requestActividades.query(
        `SELECT * FROM dbo.RutasDetalle WHERE RutaId = @rutaId ORDER BY Orden`
      );

      // 3. Calcular FECHA FIN DEL PROYECTO
      // IMPORTANTE: Usamos _crearFechaLocal para evitar el error de zona horaria (Dec 3 vs Dec 4)
      const fechaInicio = _crearFechaLocal(data.inicioDesarrollo);

      // Restamos 1 porque el día de inicio cuenta como el día 1 trabajado.
      const diasASumarProyecto = diasTotalesRuta > 0 ? diasTotalesRuta - 1 : 0;

      const fechaFinCalculada = await agregarDiasHabiles(
        fechaInicio,
        diasASumarProyecto,
        transaction
      );

      // 4. Insertar el proyecto
      const requestProyecto = transaction.request();
      requestProyecto.input("rutaId", sql.SmallInt, data.rutaId);
      requestProyecto.input(
        "imagen",
        sql.VarChar(sql.MAX),
        data.imagen || null
      );
      requestProyecto.input("inicioDesarrollo", sql.Date, fechaInicio);
      requestProyecto.input("fechaCompromiso", sql.Date, data.fechaCompromiso);
      requestProyecto.input("fechaCalculadaFin", sql.Date, fechaFinCalculada);
      requestProyecto.input(
        "codigoDDI",
        sql.VarChar(20),
        data.codigoDDI || null
      );
      requestProyecto.input("modelo", sql.VarChar(20), data.modelo);
      requestProyecto.input("marcaId", sql.SmallInt, data.marcaId);
      requestProyecto.input("coleccionId", sql.SmallInt, data.coleccionId);
      requestProyecto.input("tallaCentral", sql.TinyInt, data.tallaCentral);
      requestProyecto.input("corridaId", sql.SmallInt, data.corridaId);
      requestProyecto.input(
        "formatoProyecto",
        sql.DateTime,
        data.formatoProyecto || null
      );
      requestProyecto.input("segmentoId", sql.SmallInt, data.segmentoId);
      requestProyecto.input("hormaId", sql.SmallInt, data.hormaId);
      requestProyecto.input("suelaId", sql.SmallInt, data.suelaId);
      requestProyecto.input("estructuraId", sql.SmallInt, data.estructuraId);
      requestProyecto.input(
        "construccionId",
        sql.SmallInt,
        data.construccionId
      );
      requestProyecto.input("prioridadId", sql.SmallInt, data.prioridadId);
      requestProyecto.input(
        "costoMeta",
        sql.Decimal(18, 2),
        data.costoMeta || null
      );
      requestProyecto.input(
        "precosteo",
        sql.Decimal(18, 2),
        data.precosteo || null
      );
      requestProyecto.input(
        "diferencia",
        sql.Decimal(18, 2),
        data.diferencia || null
      );
      requestProyecto.input(
        "usuarioCreacion",
        sql.SmallInt,
        data.usuarioCreacion
      );

      const resultProyecto = await requestProyecto.query(
        `INSERT INTO dbo.Proyectos 
       (RutaId, Imagen, InicioDesarrollo, FechaCompromiso, FechaCalculadaFin, 
        CodigoDDI, Modelo, MarcaId, ColeccionId, TallaCentral, CorridaId, 
        FormatoProyecto, SegmentoId, HormaId, SuelaId, EstructuraId, ConstruccionId,
        PrioridadId, CostoMeta, Precosteo, Diferencia, UsuarioCreacion, FechaCreacion, Estatus) 
       OUTPUT INSERTED.Id
       VALUES (@rutaId, @imagen, @inicioDesarrollo, @fechaCompromiso, @fechaCalculadaFin,
               @codigoDDI, @modelo, @marcaId, @coleccionId, @tallaCentral, @corridaId,
               @formatoProyecto, @segmentoId, @hormaId, @suelaId, @estructuraId, @construccionId,
               @prioridadId, @costoMeta, @precosteo, @diferencia, @usuarioCreacion, GETDATE(), 1)`
      );

      const proyectoId = resultProyecto.recordset[0].Id;
      const actividadesMap = new Map();

      // 6. Calcular fechas para cada actividad
      for (const actividadRuta of resultActividades.recordset) {
        // CALCULO DE INICIO:
        // Si DiaInicio es 1 (primer día), sumamos 0.
        // Si DiaInicio es 2, sumamos 1 día hábil.
        const offsetInicio =
          actividadRuta.DiaInicio > 0 ? actividadRuta.DiaInicio - 1 : 0;

        // Usamos siempre fechaInicio (que es _crearFechaLocal) como base
        const fechaInicioActividad = await agregarDiasHabiles(
          fechaInicio,
          offsetInicio,
          transaction
        );

        // CALCULO DE FIN:
        // Si dura 1 día (DiasHabiles=1), sumamos 0 días a la fecha inicio (termina el mismo día).
        const duracionReal =
          actividadRuta.DiasHabiles > 0 ? actividadRuta.DiasHabiles - 1 : 0;

        const fechaFinActividad = await agregarDiasHabiles(
          fechaInicioActividad,
          duracionReal,
          transaction
        );

        const requestActividad = transaction.request();
        requestActividad.input("proyectoId", sql.Int, proyectoId);
        requestActividad.input("rutaDetalleId", sql.Int, actividadRuta.Id);
        requestActividad.input("orden", sql.SmallInt, actividadRuta.Orden);
        requestActividad.input(
          "procesoId",
          sql.SmallInt,
          actividadRuta.ProcesoId
        );
        requestActividad.input(
          "actividadId",
          sql.SmallInt,
          actividadRuta.ActividadId
        );
        requestActividad.input(
          "entregable",
          sql.VarChar(500),
          actividadRuta.Entregable
        );
        requestActividad.input(
          "responsableId",
          sql.SmallInt,
          actividadRuta.ResponsableId
        );
        requestActividad.input(
          "autorizaId",
          sql.SmallInt,
          actividadRuta.AutorizaId
        );
        requestActividad.input(
          "diasHabiles",
          sql.SmallInt,
          actividadRuta.DiasHabiles
        );
        requestActividad.input("dependeDeActividadId", sql.Int, null);
        requestActividad.input(
          "fechaInicioCalculada",
          sql.Date,
          fechaInicioActividad
        );
        requestActividad.input(
          "fechaFinCalculada",
          sql.Date,
          fechaFinActividad
        );

        const resultActividad = await requestActividad.query(
          `INSERT INTO dbo.ProyectosActividades 
         (ProyectoId, RutaDetalleId, Orden, ProcesoId, ActividadId, Entregable, 
          ResponsableId, AutorizaId, DiasHabiles, DependeDeActividadId, 
          FechaInicioCalculada, FechaFinCalculada, FechaCreacion, Estatus) 
         OUTPUT INSERTED.Id
         VALUES (@proyectoId, @rutaDetalleId, @orden, @procesoId, @actividadId, @entregable,
                 @responsableId, @autorizaId, @diasHabiles, @dependeDeActividadId,
                 @fechaInicioCalculada, @fechaFinCalculada, GETDATE(), 1)`
        );

        actividadesMap.set(actividadRuta.ActividadId, {
          id: resultActividad.recordset[0].Id,
          actividadId: actividadRuta.ActividadId,
        });
      }

      // 7. Actualizar dependencias
      for (const actividadRuta of resultActividades.recordset) {
        if (actividadRuta.DependeDeActividadId) {
          const actividadActual = actividadesMap.get(actividadRuta.ActividadId);
          const actividadDependencia = actividadesMap.get(
            actividadRuta.DependeDeActividadId
          );

          if (actividadActual && actividadDependencia) {
            const requestUpdate = transaction.request();
            requestUpdate.input("id", sql.Int, actividadActual.id);
            requestUpdate.input(
              "dependeDeActividadId",
              sql.Int,
              actividadDependencia.id
            );

            await requestUpdate.query(
              `UPDATE dbo.ProyectosActividades 
             SET DependeDeActividadId = @dependeDeActividadId 
             WHERE Id = @id`
            );
          }
        }
      }

      await transaction.commit();

      return {
        ...data,
        id: proyectoId,
        fechaCalculadaFin: fechaFinCalculada,
      };
    } catch (err) {
      console.error("Error CREAR Proyecto, rollback...", err);
      try {
        if (transaction) await transaction.rollback();
      } catch (rollbackErr) {
        console.error("Error rollback:", rollbackErr);
      }
      throw err;
    }
  },

  /**
   * Actualiza la ruta de la imagen de un proyecto
   */
  updateImagen: async (id, imagenPath) => {
    const { pool } = _getDbConfig(); //
    const connection = await pool();

    const request = connection.request();
    request.input("id", sql.Int, id);
    request.input("imagen", sql.VarChar(sql.MAX), imagenPath);

    await request.query(`
      UPDATE dbo.Proyectos 
      SET Imagen = @imagen 
      WHERE Id = @id
    `);

    return { success: true };
  },

  updateActividadEstatus: async (actividadId, data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();

    try {
      await transaction.begin();

      // --- 1. OBTENER DATOS ACTUALES ---
      const requestActividad = transaction.request();
      requestActividad.input("id", sql.Int, actividadId);
      const resultActividad = await requestActividad.query(`
        SELECT pa.*, dep.Estatus as EstatusDependencia 
        FROM dbo.ProyectosActividades pa
        LEFT JOIN dbo.ProyectosActividades dep ON pa.DependeDeActividadId = dep.Id
        WHERE pa.Id = @id
      `);

      if (resultActividad.recordset.length === 0) {
        throw new Error("Actividad no encontrada");
      }
      const actividad = resultActividad.recordset[0];
      const estatusAnterior = actividad.Estatus;

      // --- 2. VALIDACIONES DE NEGOCIO (Tus validaciones originales) ---

      // Validación de Dependencias
      if (data.estatus === 2 && actividad.DependeDeActividadId) {
        if (actividad.EstatusDependencia !== 3) {
          // Nota: Ajusta si 3 es el estatus correcto de "terminado" para dependencias
          throw new Error(
            "No puedes iniciar esta actividad porque la anterior no ha sido completada."
          );
        }
      }

      // Validación de Roles
      if (data.estatus === 6 && data.usuarioId !== actividad.ResponsableId) {
        throw new Error("Solo el responsable puede enviar a autorización.");
      }
      if (data.estatus === 3 && data.usuarioId !== actividad.AutorizaId) {
        throw new Error(
          "Solo el usuario asignado puede autorizar esta actividad."
        );
      }

      // --- 3. LÓGICA DE FECHAS Y ATRASOS (AQUÍ ESTÁ EL CAMBIO CLAVE) ---

      let diasAtraso = actividad.DiasAtraso; // Mantener el actual por defecto
      let fechaFinReal = null;

      // SI SE COMPLETA (6) O AUTORIZA (3): EL ATRASO SE RESETEA A 0
      if (data.estatus === 3 || data.estatus === 6) {
        diasAtraso = 0; // <--- RESETEO DEL ATRASO
        fechaFinReal = fechaMexico;
      } else {
        // Si vuelve a proceso o pendiente, podrías querer recalcular o dejarlo como estaba
        // Por ahora mantenemos la lógica de que si no es fin, no hay fecha fin real
        fechaFinReal = null;
      }

      // --- 4. UPDATE DE LA ACTIVIDAD ---
      const requestUpdate = transaction.request();
      requestUpdate.input("id", sql.Int, actividadId);
      requestUpdate.input("estatus", sql.TinyInt, data.estatus);
      requestUpdate.input(
        "fechaInicioReal",
        sql.Date,
        data.fechaInicioReal || actividad.FechaInicioReal
      );
      requestUpdate.input("fechaFinReal", sql.Date, fechaFinReal);
      requestUpdate.input("diasAtraso", sql.SmallInt, diasAtraso); // Guardamos 0 si es 3 o 6
      requestUpdate.input(
        "observaciones",
        sql.VarChar(sql.MAX),
        data.observaciones || actividad.Observaciones
      );

      await requestUpdate.query(`
        UPDATE dbo.ProyectosActividades 
        SET Estatus = @estatus, 
            FechaInicioReal = @fechaInicioReal, 
            FechaFinReal = @fechaFinReal,
            DiasAtraso = @diasAtraso,
            Observaciones = @observaciones,
            FechaActualizacion = GETDATE()
        WHERE Id = @id
      `);

      // --- 5. INSERTAR EN BITÁCORA ---
      const requestBitacora = transaction.request();
      requestBitacora.input("proyectoActividadId", sql.Int, actividadId);
      requestBitacora.input("usuarioId", sql.SmallInt, data.usuarioId);
      requestBitacora.input("estatusAnterior", sql.TinyInt, estatusAnterior);
      requestBitacora.input("estatusNuevo", sql.TinyInt, data.estatus);
      requestBitacora.input(
        "comentario",
        sql.VarChar(sql.MAX),
        data.comentario || null
      );

      await requestBitacora.query(`
        INSERT INTO dbo.ProyectosActividadesBitacora 
        (ProyectoActividadId, UsuarioId, EstatusAnterior, EstatusNuevo, Comentario, FechaRegistro)
        VALUES (@proyectoActividadId, @usuarioId, @estatusAnterior, @estatusNuevo, @comentario, GETDATE())
      `);

      // --- 6. ACTUALIZAR ENCABEZADO DEL PROYECTO (AVANCE Y ATRASO TOTAL) ---

      // A. Calcular nuevo total de atraso del proyecto
      // Sumamos solo las actividades que NO están en 3, 6 (o 7 canceladas)
      const requestUpdateProyecto = transaction.request();
      requestUpdateProyecto.input("proyectoId", sql.Int, actividad.ProyectoId);

      // Actualizamos el proyecto y obtenemos el nuevo total en una sola llamada
      const resultProyecto = await requestUpdateProyecto.query(`
        -- 1. Actualizar DiasAtraso del Proyecto
        UPDATE dbo.Proyectos
        SET DiasAtraso = (
            SELECT ISNULL(SUM(DiasAtraso), 0)
            FROM dbo.ProyectosActividades
            WHERE ProyectoId = @proyectoId
            AND Estatus NOT IN (3, 6, 7) -- Ignorar completas/canceladas
        )
        WHERE Id = @proyectoId;

        -- 2. Seleccionar el nuevo total para retornarlo al front
        SELECT DiasAtraso FROM dbo.Proyectos WHERE Id = @proyectoId;
      `);

      const nuevoDiasAtrasoTotal = resultProyecto.recordset[0].DiasAtraso;

      // B. Tu función existente para el porcentaje de avance (si la tienes separada)
      if (typeof _actualizarProyectoAvance === "function") {
        await _actualizarProyectoAvance(actividad.ProyectoId, transaction);
      }

      await transaction.commit();

      // --- RETORNO DE DATOS ---
      return {
        success: true,
        ProyectoId: actividad.ProyectoId,
        DiasAtrasoActividad: diasAtraso,
        DiasAtrasoProyectoTotal: nuevoDiasAtrasoTotal,
      };
    } catch (err) {
      console.error("Error al actualizar actividad, haciendo rollback...", err);
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Obtiene todos los proyectos
   */
  getAll: async () => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const result = await connection.request().query(
      `SELECT p.*,
              r.Nombre as RutaNombre,
              m.Descripcion as MarcaNombre,
              c.Descripcion as ColeccionNombre
       FROM dbo.Proyectos p
       LEFT JOIN dbo.Rutas r ON p.RutaId = r.Id
       LEFT JOIN dbo.Marcas m ON p.MarcaId = m.Id
       LEFT JOIN dbo.Colecciones c ON p.ColeccionId = c.Id
       ORDER BY p.FechaCreacion DESC`
    );

    return result.recordset.map(_mapProyectoData);
  },

  /**
   * Obtiene un proyecto por ID con sus actividades
   */
  getById: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    // Obtener proyecto
    const requestProyecto = connection.request();
    requestProyecto.input("id", sql.Int, id);

    const resultProyecto = await requestProyecto.query(
      `SELECT p.*,
              r.Nombre as RutaNombre,
              m.Descripcion as MarcaNombre,
              c.Descripcion as ColeccionNombre
       FROM dbo.Proyectos p
       LEFT JOIN dbo.Rutas r ON p.RutaId = r.Id
       LEFT JOIN dbo.Marcas m ON p.MarcaId = m.Id
       LEFT JOIN dbo.Colecciones c ON p.ColeccionId = c.Id
       WHERE p.Id = @id`
    );

    if (resultProyecto.recordset.length === 0) return null;

    const proyecto = _mapProyectoData(resultProyecto.recordset[0]);

    // Obtener actividades
    const requestActividades = connection.request();
    requestActividades.input("proyectoId", sql.Int, id);

    const resultActividades = await requestActividades.query(
      `SELECT pa.*,
              p.Descripcion as ProcesoNombre,
              a.Descripcion as ActividadNombre,
              u1.Usuario as ResponsableNombre,
              u2.Usuario as AutorizaNombre
       FROM dbo.ProyectosActividades pa
       LEFT JOIN dbo.Procesos p ON pa.ProcesoId = p.Id
       LEFT JOIN dbo.Actividades a ON pa.ActividadId = a.Id
       LEFT JOIN dbo.Usuarios u1 ON pa.ResponsableId = u1.Id
       LEFT JOIN dbo.Usuarios u2 ON pa.AutorizaId = u2.Id
       WHERE pa.ProyectoId = @proyectoId
       ORDER BY pa.Orden`
    );

    proyecto.actividades = resultActividades.recordset.map(_mapActividadData);

    return proyecto;
  },

  /**
   * Obtiene actividades pendientes por responsable
   */
  getActividadesPorResponsable: async (responsableId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("responsableId", sql.SmallInt, responsableId);

    const result = await request.query(
      `SELECT pa.*,
              p.CodigoDDI,
              p.Modelo,
              pr.Descripcion as ProcesoNombre,
              a.Descripcion as ActividadNombre,
              u1.Usuario as ResponsableNombre,  -- JOIN Usuario 1
              u2.Usuario as AutorizaNombre      -- JOIN Usuario 2
       FROM dbo.ProyectosActividades pa
       INNER JOIN dbo.Proyectos p ON pa.ProyectoId = p.Id
       LEFT JOIN dbo.Procesos pr ON pa.ProcesoId = pr.Id
       LEFT JOIN dbo.Actividades a ON pa.ActividadId = a.Id
       LEFT JOIN dbo.Usuarios u1 ON pa.ResponsableId = u1.Id -- JOIN
       LEFT JOIN dbo.Usuarios u2 ON pa.AutorizaId = u2.Id    -- JOIN
       WHERE pa.ResponsableId = @responsableId
         AND pa.Estatus IN (1, 2, 4)
       ORDER BY pa.FechaFinCalculada`
    );

    return result.recordset.map(_mapActividadData);
  },

  /**
   * Obtiene información de una actividad por ID
   */
  getActividadById: async (actividadId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("id", sql.Int, actividadId);

    const result = await request.query(
      `SELECT pa.*,
            p.Descripcion as ProcesoNombre,
            a.Descripcion as ActividadNombre,
            u1.Usuario as ResponsableNombre,
            u2.Usuario as AutorizaNombre
     FROM dbo.ProyectosActividades pa
     LEFT JOIN dbo.Procesos p ON pa.ProcesoId = p.Id
     LEFT JOIN dbo.Actividades a ON pa.ActividadId = a.Id
     LEFT JOIN dbo.Usuarios u1 ON pa.ResponsableId = u1.Id
     LEFT JOIN dbo.Usuarios u2 ON pa.AutorizaId = u2.Id
     WHERE pa.Id = @id`
    );

    if (result.recordset.length === 0) return null;
    return _mapActividadData(result.recordset[0]);
  },

  /**
   * Obtiene el detalle completo de proyectos (Dashboard) donde participa el usuario
   * Incluye nombres de Marca, Ruta, Colección y Fechas para las tarjetas.
   */
  getDashboardByUser: async (userId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("userId", sql.SmallInt, userId);

    // Usamos DISTINCT para evitar duplicados si el usuario tiene varias tareas en el mismo proyecto
    const result = await request.query(`
      SELECT DISTINCT 
              p.*,
              r.Nombre as RutaNombre,
              m.Descripcion as MarcaNombre,
              c.Descripcion as ColeccionNombre
       FROM dbo.Proyectos p
       INNER JOIN dbo.ProyectosActividades pa ON p.Id = pa.ProyectoId
       LEFT JOIN dbo.Rutas r ON p.RutaId = r.Id
       LEFT JOIN dbo.Marcas m ON p.MarcaId = m.Id
       LEFT JOIN dbo.Colecciones c ON p.ColeccionId = c.Id
       WHERE (pa.ResponsableId = @userId OR pa.AutorizaId = @userId)
       AND p.Estatus = 1 -- Solo Activos
       ORDER BY p.FechaCreacion DESC
    `);

    // Reutilizamos el mapper existente para formatear fechas y nombres camelCase
    return result.recordset.map(_mapProyectoData);
  },

  /**
   * Obtiene todos los IDs de usuarios únicos (responsables y autorizadores) de un proyecto
   */
  getUsuariosProyecto: async (proyectoId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("proyectoId", sql.Int, proyectoId);

    const result = await request.query(
      `SELECT DISTINCT ResponsableId as UsuarioId
     FROM dbo.ProyectosActividades
     WHERE ProyectoId = @proyectoId AND ResponsableId IS NOT NULL
     UNION
     SELECT DISTINCT AutorizaId as UsuarioId
     FROM dbo.ProyectosActividades
     WHERE ProyectoId = @proyectoId AND AutorizaId IS NOT NULL`
    );

    return result.recordset.map((row) => row.UsuarioId);
  },

  /**
   * Obtiene los proyectos activos donde el usuario participa (Responsable o Autoriza)
   */
  /**
   * Obtiene los proyectos activos donde el usuario participa (Responsable o Autoriza)
   */
  getByUserInvolvement: async (userId) => {
    const { pool } = _getDbConfig(); // Asegúrate de tener acceso a _getDbConfig
    const connection = await pool();

    const request = connection.request();
    request.input("userId", sql.SmallInt, userId);

    // CORRECCIÓN: Se agregó p.FechaCreacion al SELECT para que funcione el ORDER BY
    const result = await request.query(
      `SELECT DISTINCT 
              p.Id, 
              p.Modelo, 
              p.CodigoDDI, 
              p.Estatus,
              p.PorcentajeAvance,
              p.FechaCreacion
       FROM dbo.Proyectos p
       INNER JOIN dbo.ProyectosActividades pa ON p.Id = pa.ProyectoId
       WHERE (pa.ResponsableId = @userId OR pa.AutorizaId = @userId)
       AND p.Estatus = 1
       ORDER BY p.FechaCreacion DESC`
    );

    return result.recordset.map((row) => ({
      id: row.Id,
      modelo: row.Modelo,
      codigoDDI: row.CodigoDDI,
      estatus: row.Estatus,
      porcentajeAvance: row.PorcentajeAvance,
    }));
  },

  /**
   * Obtiene el detalle completo para el Timeline (Plan vs Real + Bloqueos activos)
   */
  getTimeline: async (proyectoId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("proyectoId", sql.Int, proyectoId);

    const result = await request.query(`
      SELECT 
      pa.Id, 
      pa.Orden, 
      pa.ActividadId,
      pa.Entregable,
      a.Descripcion as ActividadNombre,
      uResp.Usuario as Responsable,
      uAuth.Usuario as Autoriza,
      pa.FechaInicioCalculada, 
      pa.FechaFinCalculada,
      pa.FechaInicioReal, 
      pa.FechaFinReal,
      pa.Estatus,
      pa.DiasAtraso,
      (SELECT TOP 1 Descripcion 
       FROM dbo.ProyectosActividadesBloqueos 
       WHERE ProyectoActividadId = pa.Id AND Estatus = 1) as BloqueoActivo
    FROM dbo.ProyectosActividades pa
    LEFT JOIN dbo.Actividades a ON pa.ActividadId = a.Id
    LEFT JOIN dbo.Usuarios uResp ON pa.ResponsableId = uResp.Id
    LEFT JOIN dbo.Usuarios uAuth ON pa.AutorizaId = uAuth.Id
    WHERE pa.ProyectoId = @proyectoId
    ORDER BY pa.Orden ASC
    `);
    return result.recordset.map(_mapTimelineData);
  },

  /**
   * Obtiene un registro de bitácora por ID (Para descargas)
   */
  getBitacoraById: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("id", sql.Int, id);

    const result = await request.query(`
    SELECT 
      b.Id, 
      b.Archivos, 
      b.ProyectoActividadId,
      b.UsuarioId,
      pa.ProyectoId
    FROM dbo.ProyectosActividadesBitacora b
    INNER JOIN dbo.ProyectosActividades pa ON b.ProyectoActividadId = pa.Id
    WHERE b.Id = @id
  `);

    return result.recordset[0] || null;
  },

  /**
   * Agregar Nota/Archivo a Bitácora (Sin cambiar estatus necesariamente)
   */
  /**
   * Agregar Nota/Archivo a Bitácora
   */
  addBitacoraNota: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("proyectoActividadId", sql.Int, data.proyectoActividadId);
    request.input("usuarioId", sql.SmallInt, data.usuarioId);
    // Si solo agregamos nota, el estatus anterior y nuevo son el mismo (el actual)
    request.input("estatusActual", sql.TinyInt, data.estatusActual);
    request.input("comentario", sql.NVarChar(sql.MAX), data.comentario);
    request.input("archivos", sql.VarChar(sql.MAX), data.archivos);

    const result = await request.query(`
        INSERT INTO dbo.ProyectosActividadesBitacora 
        (ProyectoActividadId, UsuarioId, EstatusAnterior, EstatusNuevo, Comentario, Archivos, FechaRegistro)
        OUTPUT INSERTED.Id, INSERTED.FechaRegistro
        VALUES (@proyectoActividadId, @usuarioId, @estatusActual, @estatusActual, @comentario, @archivos, GETDATE())
    `);

    return {
      id: result.recordset[0].Id,
      fechaRegistro: result.recordset[0].FechaRegistro,
      success: true,
    };
  },

  /**
   * Obtiene la bitácora completa de una actividad con información de usuarios
   */
  getBitacoraByActividad: async (actividadId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("actividadId", sql.Int, actividadId);

    const result = await request.query(`
    SELECT 
      b.Id,
      b.ProyectoActividadId,
      b.UsuarioId,
      u.Usuario as UsuarioNombre,
      b.EstatusAnterior,
      b.EstatusNuevo,
      b.Comentario,
      b.Archivos,
      b.FechaRegistro
    FROM dbo.ProyectosActividadesBitacora b
    LEFT JOIN dbo.Usuarios u ON b.UsuarioId = u.Id
    WHERE b.ProyectoActividadId = @actividadId
    ORDER BY b.FechaRegistro DESC
  `);

    return result.recordset.map((row) => ({
      id: row.Id,
      proyectoActividadId: row.ProyectoActividadId,
      usuarioId: row.UsuarioId,
      usuarioNombre: row.UsuarioNombre || "Usuario",
      estatusAnterior: row.EstatusAnterior,
      estatusNuevo: row.EstatusNuevo,
      comentario: row.Comentario,
      archivos: row.Archivos,
      fechaRegistro: row.FechaRegistro,
    }));
  },

  /**
   * Elimina un registro de bitácora
   */
  deleteBitacora: async (id, usuarioId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    // Primero verificar permisos
    const requestCheck = connection.request();
    requestCheck.input("id", sql.Int, id);

    const checkResult = await requestCheck.query(`
    SELECT UsuarioId FROM dbo.ProyectosActividadesBitacora WHERE Id = @id
  `);

    if (checkResult.recordset.length === 0) {
      throw new Error("Registro no encontrado");
    }

    if (checkResult.recordset[0].UsuarioId !== usuarioId) {
      throw new Error("No tienes permiso para eliminar este archivo");
    }

    const request = connection.request();
    request.input("id", sql.Int, id);

    await request.query(`
    DELETE FROM dbo.ProyectosActividadesBitacora 
    WHERE Id = @id
  `);

    return { success: true };
  },

  /**
   * Obtiene todas las actividades de los proyectos donde participa el usuario
   * para mostrar en el calendario
   */
  getActividadesCalendarioByUser: async (userId, proyectoIdFiltro = null) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("userId", sql.SmallInt, userId);

    let query = `
    SELECT 
      pa.Id,
      pa.ProyectoId,
      p.Modelo,
      p.CodigoDDI,
      pa.Orden,
      pa.Entregable,
      a.Descripcion as ActividadNombre,
      pr.Descripcion as ProcesoNombre,
      pa.FechaInicioCalculada,
      pa.FechaFinCalculada,
      pa.FechaInicioReal,
      pa.FechaFinReal,
      pa.Estatus,
      pa.DiasAtraso,
      pa.ResponsableId,
      uResp.Usuario as ResponsableNombre,
      pa.AutorizaId,
      uAuth.Usuario as AutorizaNombre
    FROM dbo.ProyectosActividades pa
    INNER JOIN dbo.Proyectos p ON pa.ProyectoId = p.Id
    LEFT JOIN dbo.Actividades a ON pa.ActividadId = a.Id
    LEFT JOIN dbo.Procesos pr ON pa.ProcesoId = pr.Id
    LEFT JOIN dbo.Usuarios uResp ON pa.ResponsableId = uResp.Id
    LEFT JOIN dbo.Usuarios uAuth ON pa.AutorizaId = uAuth.Id
    WHERE (pa.ResponsableId = @userId OR pa.AutorizaId = @userId)
      AND p.Estatus = 1
  `;

    if (proyectoIdFiltro) {
      request.input("proyectoId", sql.Int, proyectoIdFiltro);
      query += " AND p.Id = @proyectoId";
    }

    query += " ORDER BY pa.FechaInicioCalculada ASC";

    const result = await request.query(query);

    return result.recordset.map((row) => ({
      id: row.Id,
      proyectoId: row.ProyectoId,
      proyectoModelo: row.Modelo,
      proyectoCodigoDDI: row.CodigoDDI,
      orden: row.Orden,
      entregable: row.Entregable,
      actividadNombre: row.ActividadNombre,
      procesoNombre: row.ProcesoNombre,
      fechaInicioCalculada: row.FechaInicioCalculada,
      fechaFinCalculada: row.FechaFinCalculada,
      fechaInicioReal: row.FechaInicioReal,
      fechaFinReal: row.FechaFinReal,
      estatus: row.Estatus,
      diasAtraso: row.DiasAtraso,
      responsableId: row.ResponsableId,
      responsableNombre: row.ResponsableNombre,
      autorizaId: row.AutorizaId,
      autorizaNombre: row.AutorizaNombre,
    }));
  },

  /**
   * Obtiene la información completa para la ficha técnica (con Joins)
   */
  getFichaTecnica: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const request = connection.request();
    request.input("id", sql.Int, id);

    // Nota: Asumimos que las tablas se llaman igual que en tus modelos (Marcas, Colecciones, etc.)
    // y que usan Id como llave primaria. Ajusta si alguna tabla tiene otro nombre de PK.
    const query = `
      SELECT 
        P.*,
        R.Descripcion AS RutaNombre,
        M.Descripcion AS MarcaNombre,
        C.Descripcion AS ColeccionNombre,
        CO.Descripcion AS CorridaNombre,
        H.Descripcion AS HormaNombre,
        S.Descripcion AS SuelaNombre,
        SEG.Descripcion AS SegmentoNombre,
        CONS.Descripcion AS ConstruccionNombre,
        PRI.Descripcion AS PrioridadNombre,
        PRI.Color AS PrioridadColor
      FROM dbo.Proyectos P
      LEFT JOIN dbo.Rutas R ON P.RutaId = R.Id
      LEFT JOIN dbo.Marcas M ON P.MarcaId = M.Id
      LEFT JOIN dbo.Colecciones C ON P.ColeccionId = C.Id
      LEFT JOIN dbo.Corridas CO ON P.CorridaId = CO.Id
      LEFT JOIN dbo.Hormas H ON P.HormaId = H.Id
      -- Ajuste para Suela según tu modelo anterior (si la PK es Id o Suela, ajusta aquí)
      LEFT JOIN SRV6.CMP.dbo.Suelas S ON P.SuelaId = S.Suela 
      LEFT JOIN dbo.Segmentos SEG ON P.SegmentoId = SEG.Id
      LEFT JOIN dbo.Construcciones CONS ON P.ConstruccionId = CONS.Id
      LEFT JOIN dbo.Prioridades PRI ON P.PrioridadId = PRI.Id
      WHERE P.Id = @id
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) return null;

    // Usamos un mapeo enriquecido
    const record = result.recordset[0];
    return {
      ..._mapProyectoData(record),
      rutaNombre: record.RutaNombre,
      marcaNombre: record.MarcaNombre,
      coleccionNombre: record.ColeccionNombre,
      corridaNombre: record.CorridaNombre,
      hormaNombre: record.HormaNombre,
      suelaNombre: record.SuelaNombre,
      segmentoNombre: record.SegmentoNombre,
      construccionNombre: record.ConstruccionNombre,
      prioridadNombre: record.PrioridadNombre,
      prioridadColor: record.PrioridadColor,
    };
  },
};
