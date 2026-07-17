CREATE TABLE "lote_sedes" (
	"lote_id" integer NOT NULL,
	"sede_id" integer NOT NULL,
	CONSTRAINT "lote_sedes_lote_id_sede_id_pk" PRIMARY KEY("lote_id","sede_id")
);
--> statement-breakpoint
CREATE TABLE "usuario_sedes" (
	"usuario_id" integer NOT NULL,
	"sede_id" integer NOT NULL,
	CONSTRAINT "usuario_sedes_usuario_id_sede_id_pk" PRIMARY KEY("usuario_id","sede_id")
);
--> statement-breakpoint
ALTER TABLE "usuarios" ALTER COLUMN "rol" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "telefono" text;--> statement-breakpoint
ALTER TABLE "lotes" ADD COLUMN "anulado_en" timestamp;--> statement-breakpoint
ALTER TABLE "lotes" ADD COLUMN "anulado_motivo" text;--> statement-breakpoint
ALTER TABLE "lotes" ADD COLUMN "anulado_por" integer;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "puede_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "puede_taquilla" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lote_sedes" ADD CONSTRAINT "lote_sedes_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_sedes" ADD CONSTRAINT "lote_sedes_sede_id_sedes_id_fk" FOREIGN KEY ("sede_id") REFERENCES "public"."sedes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_sedes" ADD CONSTRAINT "usuario_sedes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_sedes" ADD CONSTRAINT "usuario_sedes_sede_id_sedes_id_fk" FOREIGN KEY ("sede_id") REFERENCES "public"."sedes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;