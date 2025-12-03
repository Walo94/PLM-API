import { connectDB } from '../../config/db.js';
import sql from 'mssql';

const _getDbConfig = () => {
    return { pool: connectDB };
}

const _mapData = (dbRecord) => {
    if (!dbRecord) return null;
    return {
        id: dbRecord.Id,
        descripcion: dbRecord.Descripcion,
        estatus: dbRecord.Estatus,
    };
}

export const ActividadModel = {

    /**
     * Crea una nueva actividad.
     */
    create: async (data) => {
        const { pool } = _getDbConfig();
        const connection = await pool();
        const transaction = connection.transaction();
        try {
            await transaction.begin();
            const request = transaction.request();

            request.input('descripcion', sql.VarChar(150), data.descripcion);
            request.input('estatus', sql.TinyInt, 1);

            await request.query(`INSERT INTO dbo.Actividades (Descripcion, Estatus) VALUES (@descripcion, @estatus)`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacción de CREAR Actividad, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * Actualiza un actividad por su ID.
     */
    update: async (id, data) => {
        const { pool } = _getDbConfig();
        const connection = await pool();
        const transaction = connection.transaction();
        try {
            await transaction.begin();
            const request = transaction.request();

            request.input('id', sql.SmallInt, id);
            request.input('descripcion', sql.VarChar(150), data.descripcion);

            await request.query(`UPDATE dbo.Actividades SET Descripcion = @descripcion WHERE Id = @id`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacción de ACTUALIZAR Actividad, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * 
     * Actualiza el estatus de un actividad por su ID.
     */
    updateStatus: async (id, data) => {
        const { pool } = _getDbConfig();
        const connection = await pool();
        const transaction = connection.transaction();
        try {
            await transaction.begin();
            const request = transaction.request();

            request.input('id', sql.SmallInt, id);
            request.input('estatus', sql.TinyInt, data.estatus);
            
            await request.query(`UPDATE dbo.Actividades SET Estatus = @estatus WHERE Id = @id`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacción de ACTUALIZAR Estatus Actividad, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * Obtiene todas las actividades.
     */
    getAll: async () => {
        const { pool } = _getDbConfig();
        const connection = await pool();
        const result = await connection.request().query(`SELECT * FROM dbo.Actividades ORDER BY Descripcion`);
        return result.recordset.map(_mapData);
    },
}