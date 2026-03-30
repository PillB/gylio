// Research basis:
// - Arthur Aron (1997): Graduated self-disclosure doubles intimacy
// - Dunbar (1992): Social brain - different relationship tiers need different interaction types
// - Stafford & Canary (1991): Relationship maintenance via positivity, openness, assurances
// - Gottman (1994): Positive interaction ratio; bids for connection
// - BJ Fogg (2019): Reduce friction to near zero for social initiation
// - The Skin Deep methodology: structured prompts remove the "what do I even say" barrier

export type RelationshipType =
  | 'friend'
  | 'romantic'
  | 'family'
  | 'acquaintance'
  | 'coworker'
  | 'boss'
  | 'neighbor'
  | 'online_friend';

export type DepthLevel = 'light' | 'medium' | 'deep';

export type InteractionGoal =
  | 'maintain'
  | 'reconnect'
  | 'deepen'
  | 'support'
  | 'celebrate'
  | 'appreciate'
  | 'plan'
  | 'check_in';

export type SocialTemplate = {
  id: string;
  planType: 'CALL' | 'MEETUP' | 'MESSAGE' | 'EVENT';
  relationshipTypes: RelationshipType[];
  depthLevel: DepthLevel;
  goal: InteractionGoal;
  energyLevel: 'LOW' | 'MED' | 'HIGH';
  estimatedMinutes: number;
  titleKey: string;
  descriptionKey: string;
  notesKey: string;
  stepKeys: string[];
  // Pre-written messages they can copy directly — removes "what do I say" friction
  conversationStarters: string[];
};

export const RELATIONSHIP_META: Record<RelationshipType, { emoji: string; labelKey: string; dunbarFrequencyDays: number }> = {
  friend:        { emoji: '🤝', labelKey: 'social.relationship.friend',       dunbarFrequencyDays: 14  },
  romantic:      { emoji: '💕', labelKey: 'social.relationship.romantic',     dunbarFrequencyDays: 2   },
  family:        { emoji: '👨‍👩‍👧', labelKey: 'social.relationship.family',       dunbarFrequencyDays: 10  },
  acquaintance:  { emoji: '🙂', labelKey: 'social.relationship.acquaintance', dunbarFrequencyDays: 60  },
  coworker:      { emoji: '💼', labelKey: 'social.relationship.coworker',     dunbarFrequencyDays: 7   },
  boss:          { emoji: '📊', labelKey: 'social.relationship.boss',         dunbarFrequencyDays: 7   },
  neighbor:      { emoji: '🏠', labelKey: 'social.relationship.neighbor',     dunbarFrequencyDays: 30  },
  online_friend: { emoji: '💻', labelKey: 'social.relationship.online_friend',dunbarFrequencyDays: 21  },
};

export const DEPTH_META: Record<DepthLevel, { emoji: string; labelKey: string; color: string }> = {
  light:  { emoji: '☀️', labelKey: 'social.depth.light',  color: '#22C55E' },
  medium: { emoji: '🌤️', labelKey: 'social.depth.medium', color: '#F59E0B' },
  deep:   { emoji: '🌊', labelKey: 'social.depth.deep',   color: '#5B5CF6' },
};

export const SOCIAL_TEMPLATE_LIBRARY: SocialTemplate[] = [
  // ─── FRIEND ────────────────────────────────────────────────────────────────
  {
    id: 'friend-meme-share',
    planType: 'MESSAGE',
    relationshipTypes: ['friend', 'online_friend'],
    depthLevel: 'light',
    goal: 'maintain',
    energyLevel: 'LOW',
    estimatedMinutes: 2,
    titleKey: 'social.tpl.friendMemeShare.title',
    descriptionKey: 'social.tpl.friendMemeShare.desc',
    notesKey: 'social.tpl.friendMemeShare.notes',
    stepKeys: ['social.tpl.friendMemeShare.step1', 'social.tpl.friendMemeShare.step2'],
    conversationStarters: [
      "This made me immediately think of you 😄",
      "Okay I had to send you this, it's too relevant to us",
      "No context needed, just thought you'd appreciate this 😂",
    ],
  },
  {
    id: 'friend-voice-note',
    planType: 'CALL',
    relationshipTypes: ['friend'],
    depthLevel: 'light',
    goal: 'check_in',
    energyLevel: 'LOW',
    estimatedMinutes: 5,
    titleKey: 'social.tpl.friendVoiceNote.title',
    descriptionKey: 'social.tpl.friendVoiceNote.desc',
    notesKey: 'social.tpl.friendVoiceNote.notes',
    stepKeys: ['social.tpl.friendVoiceNote.step1', 'social.tpl.friendVoiceNote.step2', 'social.tpl.friendVoiceNote.step3'],
    conversationStarters: [
      "Hey! Sending a quick voice note because I was thinking about you. Hope you're doing well ✨",
      "Just a 30-second hello — no need to reply, just wanted you to know I'm thinking of you 🤍",
    ],
  },
  {
    id: 'friend-coffee-catchup',
    planType: 'MEETUP',
    relationshipTypes: ['friend'],
    depthLevel: 'medium',
    goal: 'maintain',
    energyLevel: 'MED',
    estimatedMinutes: 60,
    titleKey: 'social.tpl.friendCoffee.title',
    descriptionKey: 'social.tpl.friendCoffee.desc',
    notesKey: 'social.tpl.friendCoffee.notes',
    stepKeys: ['social.tpl.friendCoffee.step1', 'social.tpl.friendCoffee.step2', 'social.tpl.friendCoffee.step3'],
    conversationStarters: [
      "Hey, I've been meaning to properly catch up. Coffee or tea sometime this week or next?",
      "Miss your face! Want to grab coffee with zero agenda — just catch up?",
      "Are you free for a low-key coffee? I have maybe an hour and I want to hear what's going on with you.",
    ],
  },
  {
    id: 'friend-how-are-you-really',
    planType: 'MESSAGE',
    relationshipTypes: ['friend'],
    depthLevel: 'medium',
    goal: 'check_in',
    energyLevel: 'MED',
    estimatedMinutes: 15,
    titleKey: 'social.tpl.friendRealCheckin.title',
    descriptionKey: 'social.tpl.friendRealCheckin.desc',
    notesKey: 'social.tpl.friendRealCheckin.notes',
    stepKeys: ['social.tpl.friendRealCheckin.step1', 'social.tpl.friendRealCheckin.step2', 'social.tpl.friendRealCheckin.step3'],
    conversationStarters: [
      "Hey, I want to ask properly — how are you actually doing lately? Not the surface answer 💙",
      "I realized I haven't asked you how you're *really* doing in a while. What's going on with you?",
      "Checking in on you properly. You've seemed [tired/busy/quiet] lately and I wanted to make space if you need it.",
    ],
  },
  {
    id: 'friend-celebrate-win',
    planType: 'MESSAGE',
    relationshipTypes: ['friend', 'family', 'coworker'],
    depthLevel: 'light',
    goal: 'celebrate',
    energyLevel: 'LOW',
    estimatedMinutes: 5,
    titleKey: 'social.tpl.celebrateWin.title',
    descriptionKey: 'social.tpl.celebrateWin.desc',
    notesKey: 'social.tpl.celebrateWin.notes',
    stepKeys: ['social.tpl.celebrateWin.step1', 'social.tpl.celebrateWin.step2'],
    conversationStarters: [
      "I just heard about [thing] and I needed to say — that is a huge deal and I'm so proud of you 🎉",
      "Can we take a moment to celebrate you?? [specific achievement] is amazing!",
      "I don't think you're giving yourself enough credit for [thing]. That was genuinely impressive.",
    ],
  },
  {
    id: 'friend-gratitude',
    planType: 'MESSAGE',
    relationshipTypes: ['friend', 'family', 'romantic'],
    depthLevel: 'light',
    goal: 'appreciate',
    energyLevel: 'LOW',
    estimatedMinutes: 5,
    titleKey: 'social.tpl.gratitude.title',
    descriptionKey: 'social.tpl.gratitude.desc',
    notesKey: 'social.tpl.gratitude.notes',
    stepKeys: ['social.tpl.gratitude.step1', 'social.tpl.gratitude.step2', 'social.tpl.gratitude.step3'],
    conversationStarters: [
      "I was thinking about you and I just want to say thank you for [specific thing]. It meant more than I said at the time.",
      "Random appreciation post: you are [specific quality] and I'm really grateful you're in my life.",
      "I don't say this enough, but [specific thing you did] genuinely helped me and I want you to know that.",
    ],
  },
  {
    id: 'friend-reconnect',
    planType: 'MESSAGE',
    relationshipTypes: ['friend', 'acquaintance', 'online_friend'],
    depthLevel: 'medium',
    goal: 'reconnect',
    energyLevel: 'LOW',
    estimatedMinutes: 10,
    titleKey: 'social.tpl.friendReconnect.title',
    descriptionKey: 'social.tpl.friendReconnect.desc',
    notesKey: 'social.tpl.friendReconnect.notes',
    stepKeys: ['social.tpl.friendReconnect.step1', 'social.tpl.friendReconnect.step2', 'social.tpl.friendReconnect.step3'],
    conversationStarters: [
      "Hey stranger! Life has been a lot lately. I miss you and wanted to reach out — how have you been?",
      "I've been thinking about you. I know it's been a while — no pressure at all, just wanted to say hi.",
      "Okay I know it's been ages, but I saw [something] and thought of you. How's life?",
    ],
  },
  {
    id: 'friend-36q',
    planType: 'MEETUP',
    relationshipTypes: ['friend', 'romantic'],
    depthLevel: 'deep',
    goal: 'deepen',
    energyLevel: 'HIGH',
    estimatedMinutes: 90,
    titleKey: 'social.tpl.friend36q.title',
    descriptionKey: 'social.tpl.friend36q.desc',
    notesKey: 'social.tpl.friend36q.notes',
    stepKeys: ['social.tpl.friend36q.step1', 'social.tpl.friend36q.step2', 'social.tpl.friend36q.step3', 'social.tpl.friend36q.step4'],
    conversationStarters: [
      "I came across this thing called the '36 questions that build closeness' and it looked really interesting. Want to try it together?",
      "I want to do something different when we hang out — there's this research-backed conversation format I'm curious about. Game?",
    ],
  },
  {
    id: 'friend-support',
    planType: 'CALL',
    relationshipTypes: ['friend', 'family'],
    depthLevel: 'medium',
    goal: 'support',
    energyLevel: 'MED',
    estimatedMinutes: 30,
    titleKey: 'social.tpl.friendSupport.title',
    descriptionKey: 'social.tpl.friendSupport.desc',
    notesKey: 'social.tpl.friendSupport.notes',
    stepKeys: ['social.tpl.friendSupport.step1', 'social.tpl.friendSupport.step2', 'social.tpl.friendSupport.step3', 'social.tpl.friendSupport.step4'],
    conversationStarters: [
      "Hey, I've noticed you seem to be going through a hard time. I'm here if you want to talk — no pressure, but I'm available.",
      "I don't need you to be okay. I just want to be with you in whatever you're going through. Call when you want?",
      "I'm making space for you. What do you need right now — to vent, to problem-solve, or just to not be alone?",
    ],
  },
  // ─── ROMANTIC ──────────────────────────────────────────────────────────────
  {
    id: 'romantic-appreciation',
    planType: 'MESSAGE',
    relationshipTypes: ['romantic'],
    depthLevel: 'light',
    goal: 'appreciate',
    energyLevel: 'LOW',
    estimatedMinutes: 5,
    titleKey: 'social.tpl.romanticAppreciation.title',
    descriptionKey: 'social.tpl.romanticAppreciation.desc',
    notesKey: 'social.tpl.romanticAppreciation.notes',
    stepKeys: ['social.tpl.romanticAppreciation.step1', 'social.tpl.romanticAppreciation.step2'],
    conversationStarters: [
      "I just want to say — I notice [specific thing you do] and I appreciate it more than I show.",
      "Random mid-day appreciation: you are [specific quality] and I'm lucky.",
      "I was thinking about [specific memory or thing] and it made me smile. Thank you for being you.",
    ],
  },
  {
    id: 'romantic-date-idea',
    planType: 'MESSAGE',
    relationshipTypes: ['romantic'],
    depthLevel: 'light',
    goal: 'plan',
    energyLevel: 'LOW',
    estimatedMinutes: 10,
    titleKey: 'social.tpl.romanticDateIdea.title',
    descriptionKey: 'social.tpl.romanticDateIdea.desc',
    notesKey: 'social.tpl.romanticDateIdea.notes',
    stepKeys: ['social.tpl.romanticDateIdea.step1', 'social.tpl.romanticDateIdea.step2', 'social.tpl.romanticDateIdea.step3'],
    conversationStarters: [
      "Random idea: [simple date idea]. Want to? We can keep it super low-key.",
      "I want to spend some intentional time with you. What if we did [idea] this weekend?",
      "What if we had a no-phones night this week and just [activity]?",
    ],
  },
  {
    id: 'romantic-quality-time',
    planType: 'MEETUP',
    relationshipTypes: ['romantic'],
    depthLevel: 'medium',
    goal: 'deepen',
    energyLevel: 'MED',
    estimatedMinutes: 120,
    titleKey: 'social.tpl.romanticQuality.title',
    descriptionKey: 'social.tpl.romanticQuality.desc',
    notesKey: 'social.tpl.romanticQuality.notes',
    stepKeys: ['social.tpl.romanticQuality.step1', 'social.tpl.romanticQuality.step2', 'social.tpl.romanticQuality.step3'],
    conversationStarters: [
      "I want to plan something that's just about us — no errands, no screens, just time together.",
    ],
  },
  {
    id: 'romantic-relationship-checkin',
    planType: 'MEETUP',
    relationshipTypes: ['romantic'],
    depthLevel: 'deep',
    goal: 'deepen',
    energyLevel: 'HIGH',
    estimatedMinutes: 60,
    titleKey: 'social.tpl.romanticCheckin.title',
    descriptionKey: 'social.tpl.romanticCheckin.desc',
    notesKey: 'social.tpl.romanticCheckin.notes',
    stepKeys: ['social.tpl.romanticCheckin.step1', 'social.tpl.romanticCheckin.step2', 'social.tpl.romanticCheckin.step3', 'social.tpl.romanticCheckin.step4'],
    conversationStarters: [
      "I want to have one of those 'how are we doing?' conversations — no urgency or conflict, just checking in together.",
      "Can we do a relationship check-in soon? I want to make sure we're both feeling good and connected.",
    ],
  },
  {
    id: 'romantic-dreams',
    planType: 'MEETUP',
    relationshipTypes: ['romantic'],
    depthLevel: 'deep',
    goal: 'deepen',
    energyLevel: 'MED',
    estimatedMinutes: 60,
    titleKey: 'social.tpl.romanticDreams.title',
    descriptionKey: 'social.tpl.romanticDreams.desc',
    notesKey: 'social.tpl.romanticDreams.notes',
    stepKeys: ['social.tpl.romanticDreams.step1', 'social.tpl.romanticDreams.step2', 'social.tpl.romanticDreams.step3'],
    conversationStarters: [
      "I want to talk about our dreams sometime — not logistics, just what we're each hoping for in life. Up for it?",
    ],
  },
  // ─── FAMILY ────────────────────────────────────────────────────────────────
  {
    id: 'family-quick-update',
    planType: 'MESSAGE',
    relationshipTypes: ['family'],
    depthLevel: 'light',
    goal: 'maintain',
    energyLevel: 'LOW',
    estimatedMinutes: 5,
    titleKey: 'social.tpl.familyUpdate.title',
    descriptionKey: 'social.tpl.familyUpdate.desc',
    notesKey: 'social.tpl.familyUpdate.notes',
    stepKeys: ['social.tpl.familyUpdate.step1', 'social.tpl.familyUpdate.step2'],
    conversationStarters: [
      "Hey! Quick update from my end: [one thing that happened]. How are you doing?",
      "Thinking of you. Here's a photo from [thing]. Miss you!",
      "Just wanted to check in. How's everything going on your end?",
    ],
  },
  {
    id: 'family-photo-memory',
    planType: 'MESSAGE',
    relationshipTypes: ['family'],
    depthLevel: 'light',
    goal: 'celebrate',
    energyLevel: 'LOW',
    estimatedMinutes: 5,
    titleKey: 'social.tpl.familyPhoto.title',
    descriptionKey: 'social.tpl.familyPhoto.desc',
    notesKey: 'social.tpl.familyPhoto.notes',
    stepKeys: ['social.tpl.familyPhoto.step1', 'social.tpl.familyPhoto.step2'],
    conversationStarters: [
      "Found this old photo of us! 😄 Remember [thing]? This made my day.",
      "Sharing a memory that made me smile today — and made me think of you.",
    ],
  },
  {
    id: 'family-call',
    planType: 'CALL',
    relationshipTypes: ['family'],
    depthLevel: 'medium',
    goal: 'maintain',
    energyLevel: 'MED',
    estimatedMinutes: 30,
    titleKey: 'social.tpl.familyCall.title',
    descriptionKey: 'social.tpl.familyCall.desc',
    notesKey: 'social.tpl.familyCall.notes',
    stepKeys: ['social.tpl.familyCall.step1', 'social.tpl.familyCall.step2', 'social.tpl.familyCall.step3'],
    conversationStarters: [
      "Hey, are you free for a call sometime this week? No agenda, I just want to catch up properly.",
      "Miss your voice. Can we schedule a call? Even 20 minutes would be great.",
    ],
  },
  {
    id: 'family-offer-help',
    planType: 'MESSAGE',
    relationshipTypes: ['family'],
    depthLevel: 'light',
    goal: 'support',
    energyLevel: 'LOW',
    estimatedMinutes: 5,
    titleKey: 'social.tpl.familyHelp.title',
    descriptionKey: 'social.tpl.familyHelp.desc',
    notesKey: 'social.tpl.familyHelp.notes',
    stepKeys: ['social.tpl.familyHelp.step1', 'social.tpl.familyHelp.step2'],
    conversationStarters: [
      "I want to help with [specific thing]. Can I [specific offer]? No need to have it all figured out.",
      "I know you have a lot on right now. I'd like to [specific thing] if that would help at all.",
    ],
  },
  // ─── ACQUAINTANCE ──────────────────────────────────────────────────────────
  {
    id: 'acquaintance-congrats',
    planType: 'MESSAGE',
    relationshipTypes: ['acquaintance', 'coworker'],
    depthLevel: 'light',
    goal: 'celebrate',
    energyLevel: 'LOW',
    estimatedMinutes: 3,
    titleKey: 'social.tpl.acquaintanceCongrats.title',
    descriptionKey: 'social.tpl.acquaintanceCongrats.desc',
    notesKey: 'social.tpl.acquaintanceCongrats.notes',
    stepKeys: ['social.tpl.acquaintanceCongrats.step1', 'social.tpl.acquaintanceCongrats.step2'],
    conversationStarters: [
      "Congratulations on [milestone]! That's a big deal and you should be proud.",
      "I saw your news about [thing] — that's really exciting. Congratulations!",
    ],
  },
  {
    id: 'acquaintance-reconnect',
    planType: 'MESSAGE',
    relationshipTypes: ['acquaintance'],
    depthLevel: 'light',
    goal: 'reconnect',
    energyLevel: 'LOW',
    estimatedMinutes: 5,
    titleKey: 'social.tpl.acquaintanceReconnect.title',
    descriptionKey: 'social.tpl.acquaintanceReconnect.desc',
    notesKey: 'social.tpl.acquaintanceReconnect.notes',
    stepKeys: ['social.tpl.acquaintanceReconnect.step1', 'social.tpl.acquaintanceReconnect.step2'],
    conversationStarters: [
      "Hey! It's been a while. I was thinking about [shared thing] and thought I'd reach out. How have you been?",
      "Hi! Random but I was reminded of you recently. Hope you're doing well — how are things?",
    ],
  },
  {
    id: 'acquaintance-coffee',
    planType: 'MEETUP',
    relationshipTypes: ['acquaintance'],
    depthLevel: 'medium',
    goal: 'reconnect',
    energyLevel: 'MED',
    estimatedMinutes: 45,
    titleKey: 'social.tpl.acquaintanceCoffee.title',
    descriptionKey: 'social.tpl.acquaintanceCoffee.desc',
    notesKey: 'social.tpl.acquaintanceCoffee.notes',
    stepKeys: ['social.tpl.acquaintanceCoffee.step1', 'social.tpl.acquaintanceCoffee.step2', 'social.tpl.acquaintanceCoffee.step3'],
    conversationStarters: [
      "I'd love to actually catch up properly sometime — would you be up for a coffee? Totally low-key.",
    ],
  },
  // ─── COWORKER ──────────────────────────────────────────────────────────────
  {
    id: 'coworker-recognition',
    planType: 'MESSAGE',
    relationshipTypes: ['coworker'],
    depthLevel: 'light',
    goal: 'appreciate',
    energyLevel: 'LOW',
    estimatedMinutes: 5,
    titleKey: 'social.tpl.coworkerRecognition.title',
    descriptionKey: 'social.tpl.coworkerRecognition.desc',
    notesKey: 'social.tpl.coworkerRecognition.notes',
    stepKeys: ['social.tpl.coworkerRecognition.step1', 'social.tpl.coworkerRecognition.step2'],
    conversationStarters: [
      "I just wanted to say — the way you handled [specific thing] was genuinely impressive. Nice work.",
      "I don't think you got enough credit for [thing]. I noticed and wanted to say something.",
    ],
  },
  {
    id: 'coworker-casual',
    planType: 'MESSAGE',
    relationshipTypes: ['coworker'],
    depthLevel: 'light',
    goal: 'maintain',
    energyLevel: 'LOW',
    estimatedMinutes: 5,
    titleKey: 'social.tpl.coworkerCasual.title',
    descriptionKey: 'social.tpl.coworkerCasual.desc',
    notesKey: 'social.tpl.coworkerCasual.notes',
    stepKeys: ['social.tpl.coworkerCasual.step1', 'social.tpl.coworkerCasual.step2'],
    conversationStarters: [
      "Non-work question: how was your weekend / how are you doing beyond the tasks?",
      "Hey, stepping outside work stuff for a sec — how are things with you generally?",
    ],
  },
  {
    id: 'coworker-lunch',
    planType: 'MEETUP',
    relationshipTypes: ['coworker'],
    depthLevel: 'medium',
    goal: 'maintain',
    energyLevel: 'MED',
    estimatedMinutes: 45,
    titleKey: 'social.tpl.coworkerLunch.title',
    descriptionKey: 'social.tpl.coworkerLunch.desc',
    notesKey: 'social.tpl.coworkerLunch.notes',
    stepKeys: ['social.tpl.coworkerLunch.step1', 'social.tpl.coworkerLunch.step2'],
    conversationStarters: [
      "Want to grab lunch or coffee sometime this week? No work agenda — just actually talk.",
    ],
  },
  {
    id: 'coworker-feedback',
    planType: 'MESSAGE',
    relationshipTypes: ['coworker', 'boss'],
    depthLevel: 'medium',
    goal: 'deepen',
    energyLevel: 'MED',
    estimatedMinutes: 20,
    titleKey: 'social.tpl.coworkerFeedback.title',
    descriptionKey: 'social.tpl.coworkerFeedback.desc',
    notesKey: 'social.tpl.coworkerFeedback.notes',
    stepKeys: ['social.tpl.coworkerFeedback.step1', 'social.tpl.coworkerFeedback.step2', 'social.tpl.coworkerFeedback.step3'],
    conversationStarters: [
      "I'm trying to grow and I really respect your perspective. Would you be open to giving me some honest feedback on [area]?",
    ],
  },
  // ─── BOSS / MANAGER ────────────────────────────────────────────────────────
  {
    id: 'boss-proactive-update',
    planType: 'MESSAGE',
    relationshipTypes: ['boss'],
    depthLevel: 'light',
    goal: 'maintain',
    energyLevel: 'LOW',
    estimatedMinutes: 10,
    titleKey: 'social.tpl.bossUpdate.title',
    descriptionKey: 'social.tpl.bossUpdate.desc',
    notesKey: 'social.tpl.bossUpdate.notes',
    stepKeys: ['social.tpl.bossUpdate.step1', 'social.tpl.bossUpdate.step2', 'social.tpl.bossUpdate.step3'],
    conversationStarters: [
      "Quick update on [project]: [status]. Anything I should prioritize differently?",
      "Wanted to proactively share where things stand with [thing] before our next sync.",
    ],
  },
  {
    id: 'boss-1on1-prep',
    planType: 'MEETUP',
    relationshipTypes: ['boss'],
    depthLevel: 'medium',
    goal: 'plan',
    energyLevel: 'MED',
    estimatedMinutes: 30,
    titleKey: 'social.tpl.boss1on1.title',
    descriptionKey: 'social.tpl.boss1on1.desc',
    notesKey: 'social.tpl.boss1on1.notes',
    stepKeys: ['social.tpl.boss1on1.step1', 'social.tpl.boss1on1.step2', 'social.tpl.boss1on1.step3', 'social.tpl.boss1on1.step4'],
    conversationStarters: [],
  },
  {
    id: 'boss-growth-ask',
    planType: 'MESSAGE',
    relationshipTypes: ['boss'],
    depthLevel: 'medium',
    goal: 'deepen',
    energyLevel: 'MED',
    estimatedMinutes: 20,
    titleKey: 'social.tpl.bossGrowth.title',
    descriptionKey: 'social.tpl.bossGrowth.desc',
    notesKey: 'social.tpl.bossGrowth.notes',
    stepKeys: ['social.tpl.bossGrowth.step1', 'social.tpl.bossGrowth.step2', 'social.tpl.bossGrowth.step3'],
    conversationStarters: [
      "I'd love to schedule a quick conversation about my growth path — would you have 20 minutes sometime soon?",
    ],
  },
  // ─── NEIGHBOR ──────────────────────────────────────────────────────────────
  {
    id: 'neighbor-hello',
    planType: 'MESSAGE',
    relationshipTypes: ['neighbor'],
    depthLevel: 'light',
    goal: 'maintain',
    energyLevel: 'LOW',
    estimatedMinutes: 3,
    titleKey: 'social.tpl.neighborHello.title',
    descriptionKey: 'social.tpl.neighborHello.desc',
    notesKey: 'social.tpl.neighborHello.notes',
    stepKeys: ['social.tpl.neighborHello.step1', 'social.tpl.neighborHello.step2'],
    conversationStarters: [
      "Hey neighbor! Just wanted to say hi and check you're doing well.",
      "Hi! I have [extra produce/item] if you'd want it — also just wanted to say hello.",
    ],
  },
  {
    id: 'neighbor-hangout',
    planType: 'MEETUP',
    relationshipTypes: ['neighbor'],
    depthLevel: 'medium',
    goal: 'maintain',
    energyLevel: 'MED',
    estimatedMinutes: 60,
    titleKey: 'social.tpl.neighborHangout.title',
    descriptionKey: 'social.tpl.neighborHangout.desc',
    notesKey: 'social.tpl.neighborHangout.notes',
    stepKeys: ['social.tpl.neighborHangout.step1', 'social.tpl.neighborHangout.step2'],
    conversationStarters: [
      "Would you ever want to grab a drink or coffee sometime? I'd love to actually get to know my neighbors.",
    ],
  },
  // ─── ONLINE FRIEND ─────────────────────────────────────────────────────────
  {
    id: 'online-gaming',
    planType: 'EVENT',
    relationshipTypes: ['online_friend'],
    depthLevel: 'medium',
    goal: 'maintain',
    energyLevel: 'MED',
    estimatedMinutes: 90,
    titleKey: 'social.tpl.onlineGaming.title',
    descriptionKey: 'social.tpl.onlineGaming.desc',
    notesKey: 'social.tpl.onlineGaming.notes',
    stepKeys: ['social.tpl.onlineGaming.step1', 'social.tpl.onlineGaming.step2'],
    conversationStarters: [
      "Want to play [game] sometime this week? Been a while since we've had a session.",
      "Miss our [game/hangout] sessions. Are you free this week to do a proper one?",
    ],
  },
  {
    id: 'online-video-call',
    planType: 'CALL',
    relationshipTypes: ['online_friend', 'friend'],
    depthLevel: 'medium',
    goal: 'maintain',
    energyLevel: 'MED',
    estimatedMinutes: 45,
    titleKey: 'social.tpl.onlineVideo.title',
    descriptionKey: 'social.tpl.onlineVideo.desc',
    notesKey: 'social.tpl.onlineVideo.notes',
    stepKeys: ['social.tpl.onlineVideo.step1', 'social.tpl.onlineVideo.step2', 'social.tpl.onlineVideo.step3'],
    conversationStarters: [
      "Want to do a video call soon? I miss actually seeing your face.",
      "Are you up for a proper video hang? We can just chill and talk.",
    ],
  },
];

// Helper: get templates filtered by relationship type and optional depth
export const getTemplatesFor = (
  relationshipType: RelationshipType | null,
  depthFilter: DepthLevel | null = null
): SocialTemplate[] => {
  let filtered = SOCIAL_TEMPLATE_LIBRARY;
  if (relationshipType) {
    filtered = filtered.filter((t) => t.relationshipTypes.includes(relationshipType));
  }
  if (depthFilter) {
    filtered = filtered.filter((t) => t.depthLevel === depthFilter);
  }
  return filtered;
};

// Dunbar frequency helper: returns days since last contact threshold
export const getDunbarFrequency = (type: RelationshipType): number =>
  RELATIONSHIP_META[type].dunbarFrequencyDays;
