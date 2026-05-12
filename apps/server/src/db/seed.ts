import { db, schema } from "./index.js";

async function seed() {
  console.log("Seeding database...");

  const [sucursal] = await db
    .insert(schema.sucursales)
    .values({
      nombre: "Sucursal Principal",
      direccion: "Dirección del negocio",
    })
    .returning();

  console.log(`Created sucursal: ${sucursal.nombre} (id: ${sucursal.id})`);

  const [terminal] = await db
    .insert(schema.terminales)
    .values({
      nombre: "Caja 1",
      sucursalId: sucursal.id,
    })
    .returning();

  console.log(`Created terminal: ${terminal.nombre} (id: ${terminal.id})`);

  const [admin] = await db
    .insert(schema.usuarios)
    .values({
      nombre: "Administrador",
      username: "admin",
      passwordHash: "$2b$10$placeholder_hash_change_on_first_login",
      rol: "admin",
      sucursalId: sucursal.id,
    })
    .returning();

  console.log(`Created admin user: ${admin.username} (id: ${admin.id})`);

  const [catBebidas] = await db
    .insert(schema.categorias)
    .values({ nombre: "Bebidas" })
    .returning();

  const [catAlimentos] = await db
    .insert(schema.categorias)
    .values({ nombre: "Alimentos" })
    .returning();

  const [catLimpieza] = await db
    .insert(schema.categorias)
    .values({ nombre: "Limpieza" })
    .returning();

  console.log("Created categories: Bebidas, Alimentos, Limpieza");

  const productosData = [
    {
      nombre: "Coca-Cola 600ml",
      sku: "CC600",
      codigoBarras: "7501055300120",
      precioVenta: 18.5,
      costo: 12.0,
      categoriaId: catBebidas.id,
      claveSat: "50202301",
      unidadSat: "H87",
    },
    {
      nombre: "Sabritas Original 45g",
      sku: "SAB45",
      codigoBarras: "7501011115309",
      precioVenta: 22.0,
      costo: 15.0,
      categoriaId: catAlimentos.id,
      claveSat: "50181900",
      unidadSat: "H87",
    },
    {
      nombre: "Fabuloso Lavanda 1L",
      sku: "FAB1L",
      codigoBarras: "7501025403102",
      precioVenta: 35.0,
      costo: 22.0,
      categoriaId: catLimpieza.id,
      claveSat: "47131700",
      unidadSat: "H87",
    },
  ];

  for (const prod of productosData) {
    const [producto] = await db
      .insert(schema.productos)
      .values(prod)
      .returning();

    await db.insert(schema.stockSucursal).values({
      productoId: producto.id,
      sucursalId: sucursal.id,
      cantidad: 100,
    });

    console.log(`Created product: ${producto.nombre} (stock: 100)`);
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
