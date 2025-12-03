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

export const MarcaModel = {

    /**
     * Crea una nueva marca.
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

            await request.query(`INSERT INTO dbo.Marcas (Descripcion, Estatus) VALUES (@descripcion, @estatus)`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacciÃ³n de CREAR Marca, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * Actualiza una marca por su ID.
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

            await request.query(`UPDATE dbo.Marcas SET Descripcion = @descripcion WHERE Id = @id`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacciÃ³n de ACTUALIZAR Marca, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * 
     * Actualiza el estatus de una marca
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

            await request.query(`UPDATE dbo.Marcas SET Estatus = @estatus WHERE Id = @id`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacciÃ³n de ACTUALIZAR Estatus Marca, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * Obtiene todas las marcas.
     */
    getAll: async () => {
        const { pool } = _getDbConfig();
        const connection = await pool();
        const result = await connection.request().query(`SELECT * FROM dbo.Marcas ORDER BY Descripcion`);
        return result.recordset.map(_mapData);
    },
}