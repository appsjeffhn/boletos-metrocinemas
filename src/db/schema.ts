import {
  pgTable, pgEnum, serial, text, integer, timestamp, date, boolean, uniqueIndex, index, primaryKey,
} from "drizzle-orm/pg-core";

export const rolEnum = pgEnum("rol", ["admin", "taquilla"]);
export const estadoBoletoEnum = pgEnum("estado_boleto", ["activo", "canjeado", "anulado"]);

export const sedes = pgTable("sedes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
});

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  usuario: text("usuario").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  rol: rolEnum("rol"), // legado; ya no es requerido, ver puedeAdmin/puedeTaquilla
  sedeId: integer("sede_id").references(() => sedes.id), // legado; ver usuarioSedes
  puedeAdmin: boolean("puede_admin").notNull().default(false),
  puedeTaquilla: boolean("puede_taquilla").notNull().default(false),
  activo: boolean("activo").notNull().default(true),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const empresas = pgTable("empresas", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  prefijo: text("prefijo").notNull(), // iniciales, ej. "MOK"; el código será M + prefijo + "-XXXXXX"
  contacto: text("contacto"),
  telefono: text("telefono"),
  notas: text("notas"),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const lotes = pgTable("lotes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresa_id").notNull().references(() => empresas.id),
  descripcion: text("descripcion").notNull(),
  cantidad: integer("cantidad").notNull(),
  fechaVencimiento: date("fecha_vencimiento").notNull(),
  creadoPor: integer("creado_por").references(() => usuarios.id),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
  anuladoEn: timestamp("anulado_en"),
  anuladoMotivo: text("anulado_motivo"),
  anuladoPor: integer("anulado_por").references(() => usuarios.id),
});

export const usuarioSedes = pgTable("usuario_sedes", {
  usuarioId: integer("usuario_id").notNull().references(() => usuarios.id),
  sedeId: integer("sede_id").notNull().references(() => sedes.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.usuarioId, t.sedeId] }),
}));

export const loteSedes = pgTable("lote_sedes", {
  loteId: integer("lote_id").notNull().references(() => lotes.id),
  sedeId: integer("sede_id").notNull().references(() => sedes.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.loteId, t.sedeId] }),
}));

export const boletos = pgTable("boletos", {
  id: serial("id").primaryKey(),
  loteId: integer("lote_id").notNull().references(() => lotes.id),
  codigo: text("codigo").notNull(),
  token: text("token").notNull(),
  estado: estadoBoletoEnum("estado").notNull().default("activo"),
  canjeSedeId: integer("canje_sede_id").references(() => sedes.id),
  canjePortadorNombre: text("canje_portador_nombre"),
  canjePortadorDni: text("canje_portador_dni"),
  canjeFecha: timestamp("canje_fecha"),
  canjeUsuarioId: integer("canje_usuario_id").references(() => usuarios.id),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
}, (t) => ({
  codigoIdx: uniqueIndex("boletos_codigo_idx").on(t.codigo),
  tokenIdx: uniqueIndex("boletos_token_idx").on(t.token),
  loteIdx: index("boletos_lote_idx").on(t.loteId),
  estadoIdx: index("boletos_estado_idx").on(t.estado),
}));
