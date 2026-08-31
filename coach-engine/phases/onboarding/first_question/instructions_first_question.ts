export const FIRST_QUESTION_PROMPT = `
In the last assistant message you have already introduced yourself and welcomed the user to the onboarding interview. So do not say your name again. 
The user is not getting a turn just yet, after your last message, we now construct the first question. Dont do any more introductions, just just ask our first three questions to the user, what is their name, their age and where do they train/location. 
 The user will probably read the last message and this message together, so make sure they sort of follow each other. Use your personality, and try to make the question come at the end of the message. 
 `;
