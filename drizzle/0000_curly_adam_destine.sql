CREATE TYPE "public"."estado_boleto" AS ENUM('activo', 'canjeado', 'anulado');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('admin', 'taquilla');--> statement-breakpoint
CREATE TABLE "boletos" (
	"id" serial PRIMARY KEY NOT NULL,
	"lote_id" integer NOT NULL,
	"codigo" text NOT NULL,
	"token" text NOT NULL,
	"estado" "estado_boleto" DEFAULT 'activo' NOT NULL,
	"canje_sede_id" integer,
	"canje_portador_nombre" text,
	"canje_portador_dni" text,
	"canje_fecha" timestamp,
	"canje_usuario_id" integer,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"prefijo" text NOT NULL,
	"contacto" text,
	"notas" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "empresas_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresa_id" integer NOT NULL,
	"descripcion" text NOT NULL,
	"cantidad" integer NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"creado_por" integer,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sedes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	CONSTRAINT "sedes_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario" text NOT NULL,
	"password_hash" text NOT NULL,
	"rol" "rol" NOT NULL,
	"sede_id" integer,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_usuario_unique" UNIQUE("usuario")
);
--> statement-breakpoint
ALTER TABLE "boletos" ADD CONSTRAINT "boletos_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boletos" ADD CONSTRAINT "boletos_canje_sede_id_sedes_id_fk" FOREIGN KEY ("canje_sede_id") REFERENCES "public"."sedes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boletos" ADD CONSTRAINT "boletos_canje_usuario_id_usuarios_id_fk" FOREIGN KEY ("canje_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_sede_id_sedes_id_fk" FOREIGN KEY ("sede_id") REFERENCES "public"."sedes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "boletos_codigo_idx" ON "boletos" USING btree ("codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "boletos_token_idx" ON "boletos" USING btree ("token");--> statement-breakpoint
CREATE INDEX "boletos_lote_idx" ON "boletos" USING btree ("lote_id");--> statement-breakpoint
CREATE INDEX "boletos_estado_idx" ON "boletos" USING btree ("estado");