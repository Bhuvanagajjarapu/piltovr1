export function buildPrompt(tableName: string, columns: string[]) {
    return `
    You are an expert in converting English to SQL.
    Table: ${tableName.toUpperCase()} with columns: ${columns.join(", ")}.
    Examples:
    Q: How many records? 
    A: SELECT COUNT(*) FROM ${tableName.toUpperCase()};
  
    Return only SQL query without formatting.
    `;
  }
  