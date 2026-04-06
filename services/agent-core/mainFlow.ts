import {createInitialGreeting} from './initialGreetingPhase'
import { attemptBasicUserInfo } from './getBasicInfoPhase';


export async function mainFlow() {
    //initial greeting
    const initialGreeting = await createInitialGreeting();
    console.log(initialGreeting.content);

    //get basic user info like name, age, gender, and location so we can adapt our program and talking style. 
    const basicUserInfo = await attemptBasicUserInfo();
    console.log('Accumulated user profile:', basicUserInfo);

    
}
    



mainFlow();