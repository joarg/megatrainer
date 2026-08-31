import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
//import { trainerModule } from "./modules/trainer";
import { trainerModule } from "./modules/trainer2";
//import { debugModule, onboardingModule } from "./modules/trainer/onboarding";
import { openapi } from '@elysiajs/openapi'
import { onboardingModule } from "./modules/onboarding";

const app = new Elysia()
  .use(cors())
  .use(openapi())
  .get("/", () => "Hello Elysia!")
  .get("/health", () => ({ status: "ok" }))
  //.use(trainerModule)
  .use(trainerModule)
  //.use(debugModule)
  .use(onboardingModule)
  .listen(3000);
  
  export type App = typeof app; 

console.log("Elysia is ronning at " + app.server?.hostname + ":" + app.server?.port);