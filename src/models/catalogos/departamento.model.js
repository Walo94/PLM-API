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

export const DepartamentoModel = {

    /**
     * Crea un nuevo Departamento.
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

            await request.query(`INSERT INTO dbo.Departamentos (Descripcion, Estatus) VALUES (@descripcion, @estatus)`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacción de CREAR Departamento, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * Actualiza un Departamento por su ID.
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

            await request.query(`UPDATE dbo.Departamentos SET Descripcion = @descripcion WHERE Id = @id`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacción de ACTUALIZAR Departamento, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * 
     * Actualiza el estatus de un Departamento por su ID.
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
            
            await request.query(`UPDATE dbo.Departamentos SET Estatus = @estatus WHERE Id = @id`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacción de ACTUALIZAR Estatus Departamento, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * Obtiene todas las Departamentos.
     */
    getAll: async () => {
        const { pool } = _getDbConfig();
        const connection = await pool();
        const result = await connection.request().query(`SELECT * FROM dbo.Departamentos ORDER BY Descripcion`);
        return result.recordset.map(_mapData);
    },
}