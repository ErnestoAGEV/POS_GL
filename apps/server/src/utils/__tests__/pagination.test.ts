import { describe, it, expect } from "vitest";
import { parsePagination, buildPaginatedResponse } from "../pagination.js";

describe("parsePagination", () => {
  it("returns defaults for empty query", () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it("parses page and limit", () => {
    const result = parsePagination({ page: "3", limit: "25" });
    expect(result).toEqual({ page: 3, limit: 25, offset: 50 });
  });

  it("clamps page to minimum 1", () => {
    const result = parsePagination({ page: "-5", limit: "10" });
    expect(result.page).toBe(1);
    expect(result.offset).toBe(0);
  });

  it("clamps limit to maximum 100", () => {
    const result = parsePagination({ limit: "500" });
    expect(result.limit).toBe(100);
  });

  it("falls back to default when limit is 0", () => {
    const result = parsePagination({ limit: "0" });
    expect(result.limit).toBe(20); // 0 is falsy, defaults to 20
  });
});

describe("buildPaginatedResponse", () => {
  it("builds response with correct pagination metadata", () => {
    const data = [{ id: 1 }, { id: 2 }];
    const result = buildPaginatedResponse(data, 50, 1, 20);

    expect(result.data).toEqual(data);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 50,
      totalPages: 3,
    });
  });

  it("calculates totalPages correctly for exact division", () => {
    const result = buildPaginatedResponse([], 100, 1, 25);
    expect(result.pagination.totalPages).toBe(4);
  });

  it("calculates totalPages with remainder", () => {
    const result = buildPaginatedResponse([], 101, 1, 25);
    expect(result.pagination.totalPages).toBe(5);
  });

  it("handles zero total", () => {
    const result = buildPaginatedResponse([], 0, 1, 20);
    expect(result.pagination.totalPages).toBe(0);
  });
});
