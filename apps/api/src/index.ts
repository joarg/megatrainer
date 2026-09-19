import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { trainerModule } from "./modules/trainer";
import { openapi } from '@elysiajs/openapi'
import { onboardingModule } from "./modules/onboarding";
import { mediaModule } from "./modules/media";
import { worldModule } from "./modules/world";

const app = new Elysia()
  .use(cors())
  .use(openapi())
  .get("/", () => "Hello Elysia!")
  .get("/health", () => ({ status: "ok" }))
  .use(trainerModule)
  .use(onboardingModule)
  .use(mediaModule)
  .use(worldModule)
  .listen(3000);
  
  export type App = typeof app; 

console.log("Elysia is ronning at " + app.server?.hostname + ":" + app.server?.port);