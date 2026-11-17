import "server-only";
import sql from "mssql";

/**
 * Conexión a SQL Server (AÚN NO USADA: la app corre con datos ficticios, ver store.ts).
 * Cuando se active:
 *  - Reimplementar src/server/inventory.ts con estas consultas.
 *  - Usar SIEMPRE parámetros (request.input) — nunca concatenar texto del usuario en el SQL.
 *  - Las operaciones que tocan stock + movimiento van dentro de una transacción
 *    (pool.transaction()) con aislamiento SERIALIZABLE o UPDLOCK sobre la fila de stock,
 *    para que dos despachos simultáneos no dejen el saldo negativo.
 */

function config(): sql.config {
  const server = process.env.MSSQL_SERVER;
  const user = process.env.MSSQL_USER;
  const password = process.env.MSSQL_PASSWORD;
  if (!server || !user || !password) throw new Error("Faltan variables MSSQL_SERVER / MSSQL_USER / MSSQL_PASSWORD.");
  return {
    server,
    user,
    password,
    database: process.env.MSSQL_DATABASE ?? "DMC_Bodega",
    options: {
      encrypt: process.env.MSSQL_ENCRYPT !== "false",
      trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERT === "true",
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
    requestTimeout: 15_000,
  };
}

const g = globalThis as unknown as { __dmcPool?: Promise<sql.ConnectionPool> };

export function getPool(): Promise<sql.ConnectionPool> {
  g.__dmcPool ??= new sql.ConnectionPool(config())
    .connect()
    .catch((e) => {
      g.__dmcPool = undefined; // permite reintentar
      throw e;
    });
  return g.__dmcPool;
}

export { sql };
