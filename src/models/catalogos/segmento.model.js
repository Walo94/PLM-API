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

export const SegmentoModel = {

    /**
     * Crea un nuevo segmento.
     */
    create: async (data) => {
        const { pool } = _getDbConfig();
        const connection = await pool();
        const transaction = connection.transaction();
        try {
            await transaction.begin();
            const request = transaction.request();

            request.input('descripcion', sql.VarChar(30), data.descripcion);
            request.input('estatus', sql.TinyInt, 1);

            await request.query(`INSERT INTO dbo.Segmentos (Descripcion, Estatus) VALUES (@descripcion, @estatus)`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacción de CREAR Segmento, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * Actualiza un segmento por su ID.
     */
    update: async (id, data) => {
        const { pool } = _getDbConfig();
        const connection = await pool();
        const transaction = connection.transaction();
        try {
            await transaction.begin();
            const request = transaction.request();

            request.input('id', sql.SmallInt, id);
            request.input('descripcion', sql.VarChar(30), data.descripcion);

            await request.query(`UPDATE dbo.Segmentos SET Descripcion = @descripcion WHERE Id = @id`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacción de ACTUALIZAR Segmento, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * 
     * Actualiza el estatus de un segmento
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

            await request.query(`UPDATE dbo.Segmentos SET Estatus = @estatus WHERE Id = @id`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacción de ACTUALIZAR Estatus Segmento, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * Obtiene todos los segmentos.
     */
    getAll: async () => {
        const { pool } = _getDbConfig();
        const connection = await pool();
        const result = await connection.request().query(`SELECT * FROM dbo.Segmentos ORDER BY Descripcion`);
        return result.recordset.map(_mapData);
    },
}
