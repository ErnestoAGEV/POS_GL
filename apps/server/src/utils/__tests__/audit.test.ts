import { describe, it, expect, vi } from "vitest";

// Mock the database
vi.mock("../../db/index.js", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
  schema: {
    bitacora: "bitacora_table",
  },
}));

import { logAudit } from "../audit.js";
import { db } from "../../db/index.js";

describe("logAudit", () => {
  it("inserts a bitacora entry with all fields", async () => {
    await logAudit({
      usuarioId: 1,
      accion: "crear",
      entidad: "venta",
      entidadId: 42,
      descripcion: "Venta V-001 por $116",
    });

    expect(db.insert).toHaveBeenCalledWith("bitacora_table");
    const insertResult = (db.insert as any).mock.results[0].value;
    expect(insertResult.values).toHaveBeenCalledWith({
      usuarioId: 1,
      accion: "crear",
      entidad: "venta",
      entidadId: 42,
      descripcion: "Venta V-001 por $116",
    });
  });

  it("inserts without optional fields", async () => {
    await logAudit({
      usuarioId: 2,
      accion: "login",
      entidad: "sesion",
    });

    const insertResult = (db.insert as any).mock.results[1].value;
    expect(insertResult.values).toHaveBeenCalledWith({
      usuarioId: 2,
      accion: "login",
      entidad: "sesion",
      entidadId: undefined,
      descripcion: undefined,
    });
  });
});
