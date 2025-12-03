import sql from "mssql";

const databaseConfig = {
  user: "sa",
  password: "Prok2001",
  server: "192.168.6.8\\DATOS65",
};

const configDB = {
  user: databaseConfig.user,
  password: databaseConfig.password,
  server: databaseConfig.server,
  database: "CMP",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const pool = new sql.ConnectionPool(configDB);

const connectDB = async () => {
  try {
    if (!pool.connected) {
      await pool.connect();
    }
    return pool;
  } catch (err) {
    console.error("Error al conectar a DB:", err);
    throw err;
  }
};

export { connectDB };
