'use client';
import { useState } from 'react';
import axios from 'axios';

export default function QueryForm() {
  const [question, setQuestion] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [host, setHost] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');
  const [table, setTable] = useState('');
  const [columns, setColumns] = useState<string[]>([]);  // Add columns dynamically if needed

  const handleAsk = async () => {
    // Define the prompt with more specific logic based on the question
    const prompt = `
    You are an expert in converting English questions to SQL queries!

    The database is called ${database} and has the table ${table.toUpperCase()} with these columns: ${columns.join(', ')}.
    Example 1: "How many students?" → SELECT COUNT(*) FROM ${table};
    Example 2: "Show all departments?" → SELECT * FROM ${table};
    Example 3: "What are the scores of Alice?" → 
      SELECT m.subject, m.score FROM students s JOIN marks m ON s.student_id = m.student_id WHERE s.name = 'Alice';
    Example 4: "Tell me about Alice" → 
      Return detailed information like: "The student Alice is in the Computer Science department. Their email is alice@gmail.com. 
      Their scores in DBMS is 85 and OS is 78."

    When the user asks for sensitive data like passwords, **do not include the password in the response**.
    Do not use backticks, the word 'sql', or any extra text in the output — only the SQL query or a structured answer.
    `;

    try {
      // Send question and prompt to Gemini
      const gemini = await axios.post('/api/gemini', { question, prompt, host, user, password, database, table, columns });
      setQuery(gemini.data.sql);

      // Send generated SQL to query API to get the results
      const sqlRes = await axios.post('/api/query', { sql: gemini.data.sql, host, user, password, database });
      setResults(sqlRes.data.results || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="space-y-4">
      <input
        className="border p-2 w-full rounded"
        placeholder="Database Host"
        value={host}
        onChange={(e) => setHost(e.target.value)}
      />
      <input
        className="border p-2 w-full rounded"
        placeholder="Database User"
        value={user}
        onChange={(e) => setUser(e.target.value)}
      />
      <input
        className="border p-2 w-full rounded"
        placeholder="Database Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        className="border p-2 w-full rounded"
        placeholder="Database Name"
        value={database}
        onChange={(e) => setDatabase(e.target.value)}
      />
      <input
        className="border p-2 w-full rounded"
        placeholder="Table Name"
        value={table}
        onChange={(e) => setTable(e.target.value)}
      />
      <input
        className="border p-2 w-full rounded"
        placeholder="Column Names (comma separated)"
        value={columns.join(', ')}
        onChange={(e) => setColumns(e.target.value.split(',').map((col) => col.trim()))}
      />
      <textarea
        className="border p-2 w-full rounded"
        placeholder="Ask your question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleAsk}>
        Ask Gemini
      </button>

      {query && <p><b>Generated SQL:</b> {query}</p>}

      {results.length > 0 && (
        <table className="w-full border mt-4">
          <thead>
            <tr>
              {Object.keys(results[0]).map((key) => (
                <th className="border p-2" key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row, i) => (
              <tr key={i}>
                {Object.values(row).map((val, j) => (
                  <td className="border p-2" key={j}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
