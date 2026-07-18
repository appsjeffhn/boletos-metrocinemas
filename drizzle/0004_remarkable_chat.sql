CREATE TABLE "configuracion" (
	"id" integer PRIMARY KEY NOT NULL,
	"zona_horaria" text DEFAULT 'America/Tegucigalpa' NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
