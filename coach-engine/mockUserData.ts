import { OllamaInput, ONBOARDING_PHASES, TurnInput } from './types/types.js';
import type { User } from './types/user.type.js';


const LAST_ASSISTANT_MESSAGES = {
	firstMessage: `Hey there! Welcome! I'm Joey, and I'm super excited you're ready to dive into training.
We're about to get you set up with a custom training program designed just for you. To make sure this plan hits the mark—whether we're focusing on basketball or soccer—I just need to get a little background on you.
Think of this as our initial strategy session. We'll quickly cover some key things: a bit about your basic info, what drives you and what your ultimate goals are, where you're starting out in terms of skill level, and what kind of facilities you have access to.
Once I have this info, our system can start mapping out the perfect personalized path for you. Ready to get started? Tell me a little about yourself!`,

	basicInfoFollowUpLocation: `Got it, Kim! Thanks for sharing your name and age.
Next up: just so I can tailor this running plan perfectly—where are you located? Knowing your general area helps me make sure the training fits your environment! 😊`,

	motivationsAndGoalsFirst: `We've covered the basics—name, age, and where you are. Now we move past the paperwork and get down to the real mission.
Listen up, Kim. Every soldier has a reason for being in the fight. So, tell me this: **What drives you to start running? What is the ultimate goal?** Are you chasing a specific race? Trying to boost your fitness for daily life? Or maybe you just want to feel stronger and more disciplined? ,

	Lay it out for me.I need to know what you're fighting for so we can build a plan that actually gets you across the finish line. Don't hold back.`,

userNailedBasicInfoInOneAnswer: `Joar,44, and Oslo! Awesome! 🇳🇴 That gives us a solid base to start building something incredible.\n\nNow, listen up! We've got the basics down. Time to get into the *fire*! 🔥\n\nWe need to dig deep into *why* you're hitting the pavement. What's the fuel driving you? What are your biggest goals for this running journey? Are you chasing a personal best? Looking for better endurance? Just trying to feel unstoppable?\n\nSeriously, there are zero wrong answers here. We just want to understand your fire so we can build a plan that's 100% tailored to *you*. Let's hear it! What's the motivation, Joar? Let's go! 🚀`,
	userNailedMotivations: `That is a massive goal, Joar! 🤯 Running an ultramarathon and tackling the Badwater 135? That’s serious grit! And using that journey to crush that blister fear? That’s a killer mission! 💪 Now, let's talk experience. Forget perfection! We don't care if you've run a marathon or never finished a 5k. We just need to know what you've already done. Have you run much before? What's your current running history? Tell me everything! 🏃💨`,
}

const TRAINER_PERSONALITY = {
	RacistJoey: {
		personality: "He is a toxic old man, but a good trainer, so the program lets him get away with always doing racist and inapproporiate jokes based on where the user is from.",
		trainerName: "Joey",
		sports: ['running']
	},
	MilitaryMike: {
		personality: "He is former military, tough but fair, and a good trainer, so the program lets him get away with always doing jokes about the military and being tough. He has a gruff exterior but ultimately wants to help you get stronger.",
		trainerName: "Mike",
		sports: ['running']
	},
		Norm: {
		personality: "He is a chill and friendly guy, who is a good trainer, so the program lets him be very laid back and casual in his communication. He is super supportive and encouraging, and always makes the user feel good about themselves.",
		trainerName: "Norm",
		sports: ['running']
	},
}

const USERPROFILES = {
	emptyUserProfile: {
		name: null,
		age: null,
		gender: null,
		genderNotes: null,
		location: null,
		country: null,
		trainingBackground: [],
		performanceMetrics: [],
		injuries: [],
		motivations: [],
		goals: [],
		followUp: null,
	},
	basicInfoFilledOut: {
		name: 'Joar',
		age: 44,
		gender: 'male',
		genderNotes: 'Infered from name',
		location: 'Oslo',
		country: 'Norway',
		trainingBackground: [],
		performanceMetrics: [],
		injuries: [],
		motivations: [],
		goals: [],
		followUp: null,
	},
	basicInfoNeedsFollowUpOnLocation: {
		name: "Kim",
		age: 40,
		gender: "female",
		genderNotes: "Gender guessed based on the name 'Kim' as location information was not provided.",
		location: null,
		country: null,
		trainingBackground: [],
		performanceMetrics: [],
		injuries: [],
		motivations: [],
		goals: [],
		pendingQsAndComments: [],
		followUp: "location",
	},
	motivationsAndGoadlsFilledOut: {
		name: 'Joar',
	}
}


export const mockSession = {
	id: 42,
	trainerId: 1,
	userId: null,
	userprofile: USERPROFILES.emptyUserProfile,
	claimToken: 'mock-claim-token-abc123',
	phase: 'basicInfo' as const,
	phaseAttempts: 1,
	selectedSport: ['running'],
	lastAssistantMessage: LAST_ASSISTANT_MESSAGES.userNailedMotivations,
	createdAt: new Date('2026-05-25T10:00:00Z'),
	updatedAt: new Date('2026-05-25T10:01:00Z'),
	completedAt: null,
};



export const mockTurnInputBasics = {
	userMessage: 'Kim age 40 ',
	personality: TRAINER_PERSONALITY.MilitaryMike.personality,
	trainerName: TRAINER_PERSONALITY.MilitaryMike.trainerName,
	selectedSport: TRAINER_PERSONALITY.MilitaryMike.sports,
	currentUserProfile: USERPROFILES.emptyUserProfile,
	lastAssistantMessage: LAST_ASSISTANT_MESSAGES.firstMessage,
	phase: ONBOARDING_PHASES.basicInfo,
	phaseAttempts: 1
};
export const mockTurnInputBasicsFollowUp1 = {
	userMessage: 'I am from Ghana',
	personality: TRAINER_PERSONALITY.MilitaryMike.personality,
	trainerName: TRAINER_PERSONALITY.MilitaryMike.trainerName,
	selectedSport: TRAINER_PERSONALITY.MilitaryMike.sports,
	currentUserProfile: USERPROFILES.basicInfoNeedsFollowUpOnLocation,
	lastAssistantMessage: LAST_ASSISTANT_MESSAGES.basicInfoFollowUpLocation,
	phase: ONBOARDING_PHASES.basicInfo,
	phaseAttempts: 2,
};
export const mockTurnMotivationsAndGoals = {
	userMessage: 'I just wanna run better, run a marathon barefoot, and I want to feel more confident and disciplined',
	personality: TRAINER_PERSONALITY.Norm.personality,
	trainerName: TRAINER_PERSONALITY.Norm.trainerName,
	selectedSport: TRAINER_PERSONALITY.Norm.sports,
	currentUserProfile: USERPROFILES.basicInfoFilledOut,
	lastAssistantMessage: LAST_ASSISTANT_MESSAGES.motivationsAndGoalsFirst,
	phase: ONBOARDING_PHASES.motivationsAndGoals,
	phaseAttempts: 2,
};


