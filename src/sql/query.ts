export class MisingPlaceholders extends Error {}

/**
 * Creates a parameterized SQL query builder with named placeholders.
 *
 * Named placeholders (e.g., $userId, $table) are converted to positional
 * placeholders (e.g., $1, $2) for use with PostgreSQL prepared statements.
 *
 * @template T - Schema defining placeholder names and their types
 *
 * @example
 * const sql = query<{ table: string; userId: number }>(
 *   'SELECT * FROM $table WHERE userId = $userId'
 * );
 * const { query, params } = sql.prepare({ table: 'users', userId: 123 });
 * // Returns: { query: 'SELECT * FROM $1 WHERE userId = $2', params: ['users', 123] }
 */
export function statement<T extends Record<string, any>>(sql: string) {
  return {
    /**
     * Prepares the query by replacing named placeholders with positional ones.
     *
     * @param values - Object mapping placeholder names to their values (type-checked against T)
     * @returns Object containing the prepared query string and parameter array
     * @throws Error if a placeholder in the SQL is missing from values
     */
    prepare(values: T) {
      const params: any[] = []
      const placeholderMap = new Map<string, number>()
      const missingPlaceholders: string[] = []

      const preparedQuery = sql.replace(/\$(\w+)/g, (match, varName) => {
        // Check if value exists (including null/undefined as valid values)
        if (!(varName in values)) {
          missingPlaceholders.push(varName)
          return match
        }

        // Reuse existing index for duplicate placeholders
        if (!placeholderMap.has(varName)) {
          params.push(values[varName as keyof T])
          placeholderMap.set(varName, params.length)
        }

        return `$${placeholderMap.get(varName)}`
      })

      if (missingPlaceholders.length > 0) {
        throw new Error(
          `Missing values for placeholders: ${missingPlaceholders.join(', ')}`
        )
      }

      return { query: preparedQuery, params }
    },
  }
}
