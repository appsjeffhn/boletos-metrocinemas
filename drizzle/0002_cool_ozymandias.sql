CREATE TABLE "lote_productos" (
	"id" serial PRIMARY KEY NOT NULL,
	"lote_id" integer NOT NULL,
	"producto_id" integer,
	"nombre" text NOT NULL,
	"detalle" text,
	"precio_unitario" numeric(10, 2),
	"cantidad_por_boleto" integer DEFAULT 1 NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"detalle" text,
	"precio" numeric(10, 2),
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "productos_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
ALTER TABLE "lote_productos" ADD CONSTRAINT "lote_productos_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_productos" ADD CONSTRAINT "lote_productos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lote_productos_lote_idx" ON "lote_productos" USING btree ("lote_id");--> statement-breakpoint
CREATE INDEX "lote_productos_producto_idx" ON "lote_productos" USING btree ("producto_id");