# Utils

Assorted collection of useful and lightweight JS/TS utilities.

## Table of Content

- [sql](#sql):


## SQL

### Query

Shorthand for creating prepared statements with SQL

```ts
import { statement } from '@asleepace/utils/sql'

const sql = statement('SELECT * FROM $table WHERE id = $userId')

const { query, params } = sql.prepare({ table: 'users', userId: 123 })
```