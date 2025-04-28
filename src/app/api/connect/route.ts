import mysql from "mysql2/promise";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { host, user, password, database } = await req.json();
    const connection = await mysql.createConnection({ host, user, password, database });

    const [tables]: any = await connection.query(`SHOW TABLES`);
    const tableKey = `Tables_in_${database}`;
    const tableNames = tables.map((t: any) => t[tableKey]);

    let schema = "";

    for (const table of tableNames) {
      const [columns]: any = await connection.query(`SHOW COLUMNS FROM ${table}`);
      const colNames = columns.map((col: any) => col.Field).join(", ");
      schema += `TABLE ${table}(${colNames})\n`;

      const [foreignKeys]: any = await connection.query(`
        SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_COLUMN_NAME IS NOT NULL
      `, [database, table]);

      for (const fk of foreignKeys) {
        schema += `Foreign Key: ${table}.${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}\n`;
      }
    }

    await connection.end();

    return NextResponse.json({ tables: tableNames, schema });
  } catch (error) {
    console.error("Connect Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
