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
        departamento:dbRecord.Departamento,
        estatus: dbRecord.Estatus,
    };
}

export const PuestoModel = {

    /**
     * Crea un nuevo Puesto.
     */
    create: async (data) => {
        const { pool } = _getDbConfig();
        const connection = await pool();
        const transaction = connection.transaction();
        try {
            await transaction.begin();
            const request = transaction.request();

            request.input('descripcion', sql.VarChar(150), data.descripcion);
            request.input('departamento', sql.SmallInt, data.departamento);
            request.input('estatus', sql.TinyInt, 1);

            await request.query(`INSERT INTO dbo.Puestos (Descripcion, Departamento, Estatus) VALUES (@descripcion, @departamento, @estatus)`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacción de CREAR Puesto, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * Actualiza un Puesto por su ID.
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
            request.input('departamento', sql.SmallInt, data.departamento);

            await request.query(`UPDATE dbo.Puestos SET Descripcion = @descripcion, Departamento = @departamento WHERE Id = @id`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacción de ACTUALIZAR Puestos, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * 
     * Actualiza el estatus de un Puesto por su ID.
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
            
            await request.query(`UPDATE dbo.Puestos SET Estatus = @estatus WHERE Id = @id`);
            await transaction.commit();
            return data;
        } catch (err) {
            console.error('Error en la transacción de ACTUALIZAR Estatus Puesto, haciendo rollback...', err);
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * Obtiene todas las Puestos.
     */
    getAll: async () => {
        const { pool } = _getDbConfig();
        const connection = await pool();
        const result = await connection.request().query(`SELECT * FROM dbo.Puestos ORDER BY Descripcion`);
        return result.recordset.map(_mapData);
    },
}