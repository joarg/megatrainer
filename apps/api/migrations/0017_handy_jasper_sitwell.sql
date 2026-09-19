ALTER TABLE "worldMedia" DROP CONSTRAINT "worldMedia_worldId_worlds_id_fk";
--> statement-breakpoint
ALTER TABLE "worldMedia" ADD CONSTRAINT "worldMedia_worldId_worlds_id_fk" FOREIGN KEY ("worldId") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;