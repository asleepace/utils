import { describe, test, expect } from "bun:test";
import { statement } from '@/sql/query'

describe("query", () => {
  test("basic placeholder replacement", () => {
    const sql = statement<{ table: string; userId: number }>(
      "SELECT * FROM $table WHERE userId = $userId"
    );
    const result = sql.prepare({ table: "users", userId: 123 });

    expect(result.query).toBe("SELECT * FROM $1 WHERE userId = $2");
    expect(result.params).toEqual(["users", 123]);
  });

  test("duplicate placeholders use same index", () => {
    const sql = statement<{ userId: number }>(
      "SELECT * FROM users WHERE userId = $userId OR createdBy = $userId"
    );
    const result = sql.prepare({ userId: 123 });

    expect(result.query).toBe(
      "SELECT * FROM users WHERE userId = $1 OR createdBy = $1"
    );
    expect(result.params).toEqual([123]);
  });

  test("multiple unique placeholders", () => {
    const sql = statement<{ table: string; status: string; limit: number }>(
      "SELECT * FROM $table WHERE status = $status LIMIT $limit"
    );
    const result = sql.prepare({ table: "orders", status: "pending", limit: 10 });

    expect(result.query).toBe("SELECT * FROM $1 WHERE status = $2 LIMIT $3");
    expect(result.params).toEqual(["orders", "pending", 10]);
  });

  test("handles null values", () => {
    const sql = statement<{ name: string | null }>(
      "UPDATE users SET name = $name"
    );
    const result = sql.prepare({ name: null });

    expect(result.query).toBe("UPDATE users SET name = $1");
    expect(result.params).toEqual([null]);
  });

  test("handles undefined values", () => {
    const sql = statement<{ name: string | undefined }>(
      "UPDATE users SET name = $name"
    );
    const result = sql.prepare({ name: undefined });

    expect(result.query).toBe("UPDATE users SET name = $1");
    expect(result.params).toEqual([undefined]);
  });

  test("throws error for missing placeholders", () => {
    const sql = statement<{ table: string; userId: number }>(
      "SELECT * FROM $table WHERE userId = $userId"
    );

    expect(() => {
      sql.prepare({ table: "users" } as any);
    }).toThrow("Missing values for placeholders: userId");
  });

  test("throws error for multiple missing placeholders", () => {
    const sql = statement<{ table: string; userId: number; status: string }>(
      "SELECT * FROM $table WHERE userId = $userId AND status = $status"
    );

    expect(() => {
      sql.prepare({ table: "users" } as any);
    }).toThrow("Missing values for placeholders: userId, status");
  });

  test("handles query with no placeholders", () => {
    const sql = statement<{}>("SELECT * FROM users");
    const result = sql.prepare({});

    expect(result.query).toBe("SELECT * FROM users");
    expect(result.params).toEqual([]);
  });

  test("handles various data types", () => {
    const sql = statement<{
      str: string;
      num: number;
      bool: boolean;
      date: Date;
    }>("INSERT INTO test VALUES ($str, $num, $bool, $date)");
    
    const testDate = new Date("2024-01-01");
    const result = sql.prepare({
      str: "hello",
      num: 42,
      bool: true,
      date: testDate,
    });

    expect(result.query).toBe("INSERT INTO test VALUES ($1, $2, $3, $4)");
    expect(result.params).toEqual(["hello", 42, true, testDate]);
  });

  test("preserves parameter order", () => {
    const sql = statement<{ a: number; b: number; c: number }>(
      "SELECT $c, $a, $b"
    );
    const result = sql.prepare({ a: 1, b: 2, c: 3 });

    expect(result.query).toBe("SELECT $1, $2, $3");
    expect(result.params).toEqual([3, 1, 2]);
  });
});