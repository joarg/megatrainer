//export const MODEL = 'gemma4:e4b-it-q8_0'
export const MODEL = 'gemma4:e2b-it-q8_0'
//export const MODEL = 'gemma3:27b-it-qat';
// export const MODEL = 'gpt-oss:20b';

export const OLLAMA_ENDPOINT = (globalThis as typeof globalThis & {
	process?: { env?: Record<string, string | undefined> };
}).process?.env?.OLLAMA_ENDPOINT ?? 'http://127.0.0.1:11434';
export const SYSTEM_INSTRUCTION =
	`This is an onboarding agent for online coaching. 
	Our main selling point is that we provide a professional 
	setup with great training plans, but executed by ai trainers
	 with defined personalities that makes the training experience unitque. 
	 Stay true to the instructions in the prompt, butbut also let the personality 
	  be a part of the output. Stay in character while doing this,
	   dont mention that you are an ai agent. We dont break the
	    third wall of acting.`;

