import { Elysia } from "elysia";
import { startRoute } from "./start.js";
import { initialQuestionRoute } from "./initial-question.js";
import { messageRoute } from "./message";

export const onboardingModule = new Elysia({ prefix: "/onboarding" })
    .use(startRoute)
    .use(initialQuestionRoute)
    .use(messageRoute);