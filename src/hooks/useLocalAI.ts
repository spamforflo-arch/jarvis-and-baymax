/**
 * Offline Local AI - ZERO data leaves your device
 * All processing happens locally with pattern matching and stored responses
 * Expanded knowledge base with math, science, history, and common questions
 */

import { useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  response: string;
  confidence: number;
}

// Expanded Knowledge base for common responses
const KNOWLEDGE_BASE: Record<string, string[]> = {
  // Greetings & Social
  greeting: [
    "Hey! Good to hear from you! How can I help?",
    "Hi there! What's on your mind?",
    "Hello! I'm here and ready to help!",
    "Hey! What can I do for you today?",
  ],
  farewell: [
    "Take care! I'll be here whenever you need me.",
    "Goodbye! Have a great day!",
    "See you later! Stay awesome!",
    "Bye! Don't hesitate to come back anytime.",
  ],
  thanks: [
    "You're welcome! Happy to help!",
    "No problem at all!",
    "Anytime! That's what I'm here for.",
    "Glad I could help!",
  ],
  howAreYou: [
    "I'm doing great, thanks for asking! How about you?",
    "All systems running smoothly! How are you doing?",
    "I'm here and ready to help! What's up with you?",
  ],
  whoAreYou: [
    "I'm Jarvis, your personal AI assistant. I run completely offline on your device for maximum privacy - no data ever leaves your phone!",
    "I'm Jarvis! I'm an offline AI companion designed to help you while keeping all your data completely private on your device.",
  ],

  // Time & Date
  weather: [
    "I can't check the weather since I'm completely offline to protect your privacy. But you could check a weather app or look outside!",
    "Since I work offline for your privacy, I don't have access to weather data. Try checking your weather app!",
  ],
  time: [
    `It's currently ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
  ],
  date: [
    `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
  ],

  // Capabilities & Privacy
  capabilities: [
    "I can help with math calculations, science facts, history, general knowledge, jokes, motivation, and have friendly conversations - all completely offline! Your privacy is my top priority.",
    "I'm your offline assistant! I can help with math, answer science and history questions, tell you facts, and chat. Everything stays on your device.",
  ],
  privacy: [
    "I take your privacy very seriously! I run 100% offline - no data is ever sent to any server, cloud, or third party. Everything stays on your device.",
    "Your privacy is absolute with me. I don't use the internet, I don't send data anywhere, and I don't track anything. Everything is local on your phone.",
  ],

  // Emotions & Wellbeing
  joke: [
    "Why don't scientists trust atoms? Because they make up everything! 😄",
    "What do you call a fake noodle? An impasta! 🍝",
    "Why did the scarecrow win an award? He was outstanding in his field! 🌾",
    "I told my wife she was drawing her eyebrows too high. She looked surprised! 😮",
    "Why don't eggs tell jokes? They'd crack each other up! 🥚",
    "What do you call a bear with no teeth? A gummy bear! 🐻",
    "Why did the math book look so sad? Because it had too many problems!",
    "What do you call a fish without eyes? A fsh!",
    "Why don't skeletons fight each other? They don't have the guts!",
    "What's orange and sounds like a parrot? A carrot!",
  ],
  motivation: [
    "You've got this! Every step forward is progress, no matter how small.",
    "Remember: the only bad workout is the one that didn't happen. Same goes for any effort you make!",
    "You're stronger than you think. Keep pushing forward!",
    "Today's a new opportunity. Make it count!",
    "Believe in yourself. You have survived 100% of your worst days so far!",
    "Success is not final, failure is not fatal. It's the courage to continue that counts.",
  ],
  tired: [
    "It sounds like you could use some rest. Taking breaks is important for your well-being!",
    "Listen to your body - if you're tired, rest is productive too. Take care of yourself!",
    "Being tired is your body's way of asking for rest. Maybe take a short break?",
  ],
  stressed: [
    "I'm sorry you're feeling stressed. Try taking a few deep breaths - it really helps! Would you like to talk about what's bothering you?",
    "Stress can be tough. Remember to take things one step at a time. Is there anything specific I can help you think through?",
    "When stressed, try the 4-7-8 breathing technique: breathe in for 4 seconds, hold for 7, exhale for 8. It helps calm the nervous system.",
  ],
  bored: [
    "Bored? How about learning something new, going for a walk, or calling a friend? Sometimes the best cure for boredom is doing something different!",
    "Boredom can be an opportunity! You could try reading, exercise, a hobby, or just relaxing guilt-free.",
    "When bored, try learning a new skill, organizing something, or reaching out to someone you haven't talked to in a while!",
  ],
  sad: [
    "I'm sorry you're feeling down. It's okay to feel sad sometimes - emotions are part of being human. Would you like to talk about it?",
    "Feeling sad is natural. Be kind to yourself. Sometimes doing something small like going for a walk or listening to music can help.",
    "I hear you. Remember that tough times don't last forever. Is there something specific on your mind?",
  ],
  happy: [
    "That's wonderful to hear! I'm so glad you're feeling happy! 😊",
    "Awesome! Happiness is contagious - spread that good energy around!",
    "That's great! Enjoy the moment!",
  ],
  angry: [
    "I understand feeling angry can be intense. Try taking some deep breaths before reacting. Would you like to vent?",
    "Anger is a valid emotion. Sometimes it helps to step away for a moment, take a walk, or write down what's bothering you.",
  ],
  lonely: [
    "I'm sorry you're feeling lonely. Remember, you're not alone - I'm here to chat whenever you want. Connection can be found in small moments.",
    "Feeling lonely is tough. Consider reaching out to someone, even just a quick message. And I'm always here to talk!",
  ],

  // MATH - Basic Operations
  mathAdd: [
    "For addition, just add the numbers together! For example: 5 + 3 = 8. What numbers would you like to add?",
  ],
  mathSubtract: [
    "For subtraction, take away the second number from the first. For example: 10 - 4 = 6. What would you like to subtract?",
  ],
  mathMultiply: [
    "For multiplication, multiply the numbers together. For example: 7 × 6 = 42. What numbers should I multiply?",
  ],
  mathDivide: [
    "For division, divide the first number by the second. For example: 24 ÷ 4 = 6. What would you like to divide?",
  ],
  mathSquareRoot: [
    "The square root of a number is what number times itself equals that number. √9 = 3, √16 = 4, √25 = 5, √36 = 6, √49 = 7, √64 = 8, √81 = 9, √100 = 10.",
  ],
  mathPercentage: [
    "To calculate a percentage, divide by 100 and multiply. For example, 20% of 150 = 150 × 0.20 = 30. What percentage do you need?",
  ],
  mathPi: [
    "Pi (π) is approximately 3.14159265359. It's the ratio of a circle's circumference to its diameter. It's an irrational number that goes on forever!",
  ],
  mathPythagorean: [
    "The Pythagorean theorem states: a² + b² = c², where c is the hypotenuse of a right triangle. For example, if a=3 and b=4, then c=5.",
  ],
  mathQuadratic: [
    "The quadratic formula is x = (-b ± √(b²-4ac)) / 2a. It solves equations in the form ax² + bx + c = 0.",
  ],
  mathArea: [
    "Area formulas: Rectangle = length × width, Circle = πr², Triangle = ½ × base × height, Square = side². What shape do you need?",
  ],
  mathVolume: [
    "Volume formulas: Cube = s³, Sphere = (4/3)πr³, Cylinder = πr²h, Cone = (1/3)πr²h. Which shape are you calculating?",
  ],
  mathPrime: [
    "Prime numbers are only divisible by 1 and themselves. The first 20 primes are: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71.",
  ],
  mathFibonacci: [
    "The Fibonacci sequence starts with 0, 1, then each number is the sum of the two before it: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...",
  ],

  // SCIENCE - Physics
  scienceGravity: [
    "Gravity is the force that attracts objects with mass toward each other. On Earth, it accelerates objects at about 9.8 m/s². It's why things fall down and keeps us on the ground!",
  ],
  scienceSpeed: [
    "The speed of light is approximately 299,792,458 meters per second (about 186,282 miles per second). Nothing can travel faster than light!",
  ],
  scienceAtom: [
    "Atoms are the building blocks of matter. They consist of protons and neutrons in the nucleus, with electrons orbiting around it. Protons are positive, electrons are negative, neutrons are neutral.",
  ],
  scienceEnergy: [
    "Energy cannot be created or destroyed, only transformed (First Law of Thermodynamics). Types include kinetic, potential, thermal, chemical, nuclear, and electromagnetic energy.",
  ],
  scienceNewton: [
    "Newton's Laws: 1) Objects stay at rest or in motion unless acted on by a force. 2) F = ma (force equals mass times acceleration). 3) Every action has an equal and opposite reaction.",
  ],
  scienceEinstein: [
    "Einstein's E=mc² shows that mass and energy are equivalent. It means a small amount of mass contains enormous energy. This principle powers nuclear reactions!",
  ],

  // SCIENCE - Chemistry
  scienceElements: [
    "The periodic table has 118 elements. Common ones: Hydrogen (H), Oxygen (O), Carbon (C), Nitrogen (N), Iron (Fe), Gold (Au), Silver (Ag), Sodium (Na), Chlorine (Cl).",
  ],
  scienceWater: [
    "Water (H₂O) is made of 2 hydrogen atoms and 1 oxygen atom. It's essential for life, covers about 71% of Earth's surface, and is the only substance naturally found in all three states: solid, liquid, and gas.",
  ],
  sciencePH: [
    "The pH scale measures acidity/alkalinity from 0-14. pH 7 is neutral (water). Below 7 is acidic (lemon juice ~2), above 7 is basic/alkaline (baking soda ~9).",
  ],

  // SCIENCE - Biology
  scienceDNA: [
    "DNA (deoxyribonucleic acid) is the molecule that carries genetic instructions. It's a double helix made of four bases: Adenine, Thymine, Guanine, and Cytosine (A, T, G, C).",
  ],
  scienceCell: [
    "Cells are the basic units of life. Plant cells have cell walls and chloroplasts; animal cells don't. Both have a nucleus, mitochondria (powerhouse), and cell membrane.",
  ],
  scienceHeart: [
    "The human heart beats about 100,000 times per day, pumping about 2,000 gallons of blood. It has 4 chambers: 2 atria and 2 ventricles.",
  ],
  scienceBrain: [
    "The human brain has about 86 billion neurons and uses about 20% of the body's energy. It controls all body functions, thoughts, memories, and emotions.",
  ],
  scienceEvolution: [
    "Evolution is the process of change in living organisms over generations through natural selection. Species that are better adapted to their environment are more likely to survive and reproduce.",
  ],

  // SCIENCE - Space
  sciencePlanets: [
    "The 8 planets in order from the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune. Pluto was reclassified as a dwarf planet in 2006.",
  ],
  scienceSun: [
    "The Sun is a star about 4.6 billion years old. It's 93 million miles from Earth and so large that 1.3 million Earths could fit inside it!",
  ],
  scienceMoon: [
    "The Moon is Earth's only natural satellite, about 238,855 miles away. It takes 27.3 days to orbit Earth and has no atmosphere. Its gravity causes Earth's tides.",
  ],
  scienceBlackHole: [
    "Black holes are regions where gravity is so strong that nothing, not even light, can escape. They form when massive stars collapse. The nearest known black hole is about 1,000 light-years away.",
  ],
  scienceGalaxy: [
    "Our galaxy, the Milky Way, contains 100-400 billion stars and is about 100,000 light-years across. There are an estimated 2 trillion galaxies in the observable universe!",
  ],

  // HISTORY - Ancient
  historyEgypt: [
    "Ancient Egypt lasted from around 3100 BCE to 30 BCE. They built the pyramids, developed hieroglyphics, mummified their dead, and were ruled by pharaohs. The Great Pyramid of Giza is one of the Seven Wonders.",
  ],
  historyGreece: [
    "Ancient Greece (800-31 BCE) gave us democracy, philosophy (Socrates, Plato, Aristotle), the Olympic Games, theater, and major advances in math and science.",
  ],
  historyRome: [
    "The Roman Empire (27 BCE - 476 CE) was one of history's largest empires. They built roads, aqueducts, the Colosseum, developed Roman law, and Latin became the basis for Romance languages.",
  ],
  historyChina: [
    "Ancient China gave us paper, gunpowder, compass, printing, and the Great Wall. The first emperor, Qin Shi Huang, unified China in 221 BCE and created the Terracotta Army.",
  ],

  // HISTORY - Modern
  historyWW1: [
    "World War I (1914-1918) was triggered by the assassination of Archduke Franz Ferdinand. It introduced trench warfare, tanks, and chemical weapons. About 17 million people died.",
  ],
  historyWW2: [
    "World War II (1939-1945) was the deadliest conflict in history with 70-85 million deaths. It ended with the atomic bombings of Hiroshima and Nagasaki and led to the United Nations' creation.",
  ],
  historyMoonLanding: [
    "On July 20, 1969, Apollo 11 landed on the Moon. Neil Armstrong became the first human to walk on the Moon, saying 'That's one small step for man, one giant leap for mankind.'",
  ],
  historyRevolution: [
    "The American Revolution (1775-1783) led to US independence from Britain. Key figures: George Washington, Thomas Jefferson, Benjamin Franklin. The Declaration of Independence was signed July 4, 1776.",
  ],
  historyInternet: [
    "The internet began as ARPANET in 1969. The World Wide Web was invented by Tim Berners-Lee in 1989. Today, over 5 billion people use the internet worldwide.",
  ],

  // GEOGRAPHY
  geoCountries: [
    "There are 195 countries in the world (193 UN members + 2 observers). The largest by area is Russia, by population is China/India, and the smallest is Vatican City.",
  ],
  geoOceans: [
    "The 5 oceans are: Pacific (largest), Atlantic, Indian, Southern (Antarctic), and Arctic (smallest). Oceans cover about 71% of Earth's surface.",
  ],
  geoContinents: [
    "The 7 continents are: Asia (largest), Africa, North America, South America, Antarctica, Europe, and Australia (smallest). Some models combine Europe and Asia as Eurasia.",
  ],
  geoMountain: [
    "Mount Everest is the tallest mountain at 29,032 feet (8,849 meters). It's in the Himalayas on the Nepal-Tibet border. K2 is the second tallest at 28,251 feet.",
  ],
  geoRiver: [
    "The Nile is traditionally considered the longest river at about 4,132 miles. The Amazon carries the most water and is slightly shorter at around 4,000 miles.",
  ],

  // LANGUAGE & VOCABULARY
  langWord: [
    "The longest English word in a major dictionary is 'pneumonoultramicroscopicsilicovolcanoconiosis' (45 letters) - a lung disease caused by inhaling silica dust.",
  ],
  langOrigin: [
    "English has roots in Germanic languages, with heavy influence from Latin (through French after 1066) and Greek. About 60% of English words have Latin or Greek origins.",
  ],
  langLetters: [
    "The English alphabet has 26 letters. 'E' is the most common letter. The least common letters are 'Z', 'Q', 'X', and 'J'.",
  ],

  // TECHNOLOGY
  techComputer: [
    "The first general-purpose computer was ENIAC (1945), which weighed 30 tons. Today's smartphones are millions of times more powerful than early computers!",
  ],
  techAI: [
    "Artificial Intelligence is the simulation of human intelligence by machines. Types include machine learning, deep learning, and natural language processing. AI is used in voice assistants, recommendations, and autonomous vehicles.",
  ],
  techInternet: [
    "The internet connects billions of devices worldwide. Data travels through fiber optic cables, satellites, and radio waves. The average internet speed globally is about 42 Mbps.",
  ],

  // HEALTH & BODY
  healthSleep: [
    "Adults need 7-9 hours of sleep per night. Sleep is crucial for memory, immune function, and physical repair. Lack of sleep can affect mood, concentration, and health.",
  ],
  healthWater: [
    "The body is about 60% water. Most adults should drink about 8 glasses (64 oz) of water daily, though needs vary based on activity, climate, and individual factors.",
  ],
  healthExercise: [
    "Adults should get at least 150 minutes of moderate aerobic activity or 75 minutes of vigorous activity per week, plus muscle-strengthening exercises twice a week.",
  ],
  healthVitamins: [
    "Essential vitamins include: A (vision), B vitamins (energy), C (immunity), D (bones), E (antioxidant), and K (blood clotting). A balanced diet usually provides enough.",
  ],

  // FOOD & COOKING
  foodTemps: [
    "Safe cooking temperatures: Chicken 165°F, Ground beef 160°F, Steaks 145°F, Pork 145°F, Fish 145°F. Always use a food thermometer!",
  ],
  foodConvert: [
    "Common conversions: 1 cup = 16 tablespoons = 48 teaspoons. 1 tablespoon = 3 teaspoons. 1 cup = 8 fluid ounces. 1 pound = 16 ounces.",
  ],
  foodSubstitute: [
    "Common substitutes: 1 egg = ¼ cup applesauce, 1 cup butter = 1 cup coconut oil, 1 cup milk = 1 cup non-dairy alternative, 1 cup flour = ¾ cup whole wheat flour.",
  ],

  // MONEY & FINANCE
  moneyBudget: [
    "A common budget rule is 50/30/20: 50% for needs (housing, food), 30% for wants (entertainment), and 20% for savings and debt repayment.",
  ],
  moneySaving: [
    "Tips for saving: Pay yourself first (automate savings), track expenses, cut unnecessary subscriptions, cook at home, and look for discounts. Even small amounts add up!",
  ],
  moneyInterest: [
    "Compound interest grows your money exponentially. The formula is A = P(1 + r/n)^(nt). Starting to invest early, even small amounts, makes a big difference over time!",
  ],

  // PRODUCTIVITY
  prodTips: [
    "Productivity tips: Break tasks into smaller pieces, use the Pomodoro Technique (25 min work, 5 min break), eliminate distractions, and prioritize your most important tasks first.",
  ],
  prodPomodoro: [
    "The Pomodoro Technique: Work for 25 minutes, then take a 5-minute break. After 4 pomodoros, take a longer 15-30 minute break. It helps maintain focus and prevents burnout.",
  ],

  // RANDOM FACTS
  randomFact: [
    "Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible!",
    "Octopuses have three hearts and blue blood!",
    "A day on Venus is longer than a year on Venus - it takes 243 Earth days to rotate but only 225 days to orbit the Sun.",
    "Bananas are berries, but strawberries aren't!",
    "The shortest war in history lasted 38-45 minutes between Britain and Zanzibar in 1896.",
    "Cows have best friends and get stressed when separated!",
    "The inventor of the Pringles can is buried in one.",
    "There are more possible iterations of a game of chess than there are atoms in the observable universe.",
    "A group of flamingos is called a 'flamboyance'.",
    "Hot water freezes faster than cold water - this is called the Mpemba effect!",
  ],

  // Unknown/Default
  unknown: [
    "I'm not sure about that specific topic, but my offline knowledge base covers math, science, history, and many common questions. Try asking about one of those!",
    "That's outside my current knowledge base. I keep everything local for your privacy. Would you like to know about math, science, history, or general facts?",
    "I don't have information about that since I work completely offline. But I can help with math calculations, science facts, history, jokes, and more!",
  ],
};

// Intent patterns for matching user input
const INTENT_PATTERNS: Array<{ patterns: RegExp[]; intent: string }> = [
  // Greetings & Social
  { patterns: [/^(hi|hello|hey|good morning|good afternoon|good evening|howdy|yo)\b/i], intent: 'greeting' },
  { patterns: [/^(bye|goodbye|see you|later|farewell|take care)\b/i, /\b(gotta go|talk later)\b/i], intent: 'farewell' },
  { patterns: [/\b(thank|thanks|thx|appreciate)\b/i], intent: 'thanks' },
  { patterns: [/\b(how are you|how('| a)re you doing|how('| a)re things|what's up|wassup)\b/i], intent: 'howAreYou' },
  { patterns: [/\b(who are you|what are you|your name|about you)\b/i], intent: 'whoAreYou' },
  { patterns: [/\b(weather|temperature|rain|sunny|cloudy|forecast)\b/i], intent: 'weather' },
  { patterns: [/\b(what time|current time|time is it)\b/i], intent: 'time' },
  { patterns: [/\b(what date|today's date|what day|current date)\b/i], intent: 'date' },
  { patterns: [/\b(what can you do|capabilities|help me with|your features)\b/i], intent: 'capabilities' },
  { patterns: [/\b(privacy|data|secure|safe|track|spy|send data)\b/i], intent: 'privacy' },

  // Emotions
  { patterns: [/\b(joke|funny|make me laugh|humor|tell me a joke)\b/i], intent: 'joke' },
  { patterns: [/\b(motivat|inspire|encourage|cheer me up|feeling down|pump me up)\b/i], intent: 'motivation' },
  { patterns: [/\b(tired|exhausted|sleepy|no energy|fatigued)\b/i], intent: 'tired' },
  { patterns: [/\b(stressed|anxious|overwhelmed|worried|nervous|panic)\b/i], intent: 'stressed' },
  { patterns: [/\b(bored|boring|nothing to do)\b/i], intent: 'bored' },
  { patterns: [/\b(sad|depressed|unhappy|feeling blue|down)\b/i], intent: 'sad' },
  { patterns: [/\b(happy|great|wonderful|amazing|awesome|fantastic|excited)\b/i], intent: 'happy' },
  { patterns: [/\b(angry|mad|furious|pissed|annoyed|frustrated)\b/i], intent: 'angry' },
  { patterns: [/\b(lonely|alone|isolated|no friends)\b/i], intent: 'lonely' },
  { patterns: [/\b(random fact|tell me something|fun fact|interesting fact|did you know)\b/i], intent: 'randomFact' },

  // Math
  { patterns: [/\b(add|addition|plus|sum|adding)\b/i], intent: 'mathAdd' },
  { patterns: [/\b(subtract|subtraction|minus|difference|take away)\b/i], intent: 'mathSubtract' },
  { patterns: [/\b(multiply|multiplication|times|product)\b/i], intent: 'mathMultiply' },
  { patterns: [/\b(divide|division|divided by|quotient)\b/i], intent: 'mathDivide' },
  { patterns: [/\b(square root|sqrt|√)\b/i], intent: 'mathSquareRoot' },
  { patterns: [/\b(percent|percentage|%)\b/i], intent: 'mathPercentage' },
  { patterns: [/\b(what is pi|value of pi|pi number|π)\b/i], intent: 'mathPi' },
  { patterns: [/\b(pythagorean|pythagoras|right triangle)\b/i], intent: 'mathPythagorean' },
  { patterns: [/\b(quadratic formula|quadratic equation)\b/i], intent: 'mathQuadratic' },
  { patterns: [/\b(area of|calculate area|area formula)\b/i], intent: 'mathArea' },
  { patterns: [/\b(volume of|calculate volume|volume formula)\b/i], intent: 'mathVolume' },
  { patterns: [/\b(prime number|prime numbers|is it prime)\b/i], intent: 'mathPrime' },
  { patterns: [/\b(fibonacci|fibonacci sequence|fibonacci number)\b/i], intent: 'mathFibonacci' },

  // Science - Physics
  { patterns: [/\b(gravity|gravitational|falling objects|what is gravity)\b/i], intent: 'scienceGravity' },
  { patterns: [/\b(speed of light|light speed|how fast is light)\b/i], intent: 'scienceSpeed' },
  { patterns: [/\b(atom|atoms|atomic|proton|neutron|electron)\b/i], intent: 'scienceAtom' },
  { patterns: [/\b(energy|thermodynamics|kinetic energy|potential energy)\b/i], intent: 'scienceEnergy' },
  { patterns: [/\b(newton's law|newton laws|laws of motion)\b/i], intent: 'scienceNewton' },
  { patterns: [/\b(e=mc|einstein|relativity|mass energy)\b/i], intent: 'scienceEinstein' },

  // Science - Chemistry
  { patterns: [/\b(periodic table|chemical element|elements)\b/i], intent: 'scienceElements' },
  { patterns: [/\b(water molecule|h2o|water formula|composition of water)\b/i], intent: 'scienceWater' },
  { patterns: [/\b(ph scale|acidity|alkaline|ph level)\b/i], intent: 'sciencePH' },

  // Science - Biology
  { patterns: [/\b(dna|genetics|gene|chromosome|double helix)\b/i], intent: 'scienceDNA' },
  { patterns: [/\b(cell|cells|mitochondria|nucleus|cell membrane)\b/i], intent: 'scienceCell' },
  { patterns: [/\b(heart|cardiac|heartbeat|blood pump)\b/i], intent: 'scienceHeart' },
  { patterns: [/\b(brain|neuron|nervous system|cerebral)\b/i], intent: 'scienceBrain' },
  { patterns: [/\b(evolution|natural selection|darwin|species adapt)\b/i], intent: 'scienceEvolution' },

  // Science - Space
  { patterns: [/\b(planet|planets|solar system|mercury|venus|mars|jupiter|saturn|uranus|neptune)\b/i], intent: 'sciencePlanets' },
  { patterns: [/\b(sun|solar|star|our sun)\b/i], intent: 'scienceSun' },
  { patterns: [/\b(moon|lunar|tide|earth's moon)\b/i], intent: 'scienceMoon' },
  { patterns: [/\b(black hole|blackhole|event horizon)\b/i], intent: 'scienceBlackHole' },
  { patterns: [/\b(galaxy|milky way|galaxies|universe)\b/i], intent: 'scienceGalaxy' },

  // History
  { patterns: [/\b(ancient egypt|egyptian|pharaoh|pyramid|hieroglyph)\b/i], intent: 'historyEgypt' },
  { patterns: [/\b(ancient greece|greek|sparta|athens|socrates|plato|aristotle)\b/i], intent: 'historyGreece' },
  { patterns: [/\b(roman empire|ancient rome|caesar|gladiator|colosseum)\b/i], intent: 'historyRome' },
  { patterns: [/\b(ancient china|chinese history|great wall|dynasty)\b/i], intent: 'historyChina' },
  { patterns: [/\b(world war 1|ww1|first world war|great war)\b/i], intent: 'historyWW1' },
  { patterns: [/\b(world war 2|ww2|second world war|wwii)\b/i], intent: 'historyWW2' },
  { patterns: [/\b(moon landing|apollo 11|neil armstrong|first man on moon)\b/i], intent: 'historyMoonLanding' },
  { patterns: [/\b(american revolution|independence|1776|founding fathers)\b/i], intent: 'historyRevolution' },
  { patterns: [/\b(internet history|arpanet|world wide web|tim berners)\b/i], intent: 'historyInternet' },

  // Geography
  { patterns: [/\b(how many countries|number of countries|countries in the world)\b/i], intent: 'geoCountries' },
  { patterns: [/\b(ocean|oceans|pacific|atlantic|indian ocean)\b/i], intent: 'geoOceans' },
  { patterns: [/\b(continent|continents|asia|africa|europe|australia|antarctica)\b/i], intent: 'geoContinents' },
  { patterns: [/\b(tallest mountain|highest mountain|mount everest|k2)\b/i], intent: 'geoMountain' },
  { patterns: [/\b(longest river|nile|amazon river|river)\b/i], intent: 'geoRiver' },

  // Language
  { patterns: [/\b(longest word|long word|biggest word)\b/i], intent: 'langWord' },
  { patterns: [/\b(english origin|where does english come from|english language history)\b/i], intent: 'langOrigin' },
  { patterns: [/\b(alphabet|letters|how many letters)\b/i], intent: 'langLetters' },

  // Technology
  { patterns: [/\b(first computer|computer history|eniac|turing)\b/i], intent: 'techComputer' },
  { patterns: [/\b(artificial intelligence|what is ai|machine learning|deep learning)\b/i], intent: 'techAI' },
  { patterns: [/\b(how does internet work|internet work|internet connection)\b/i], intent: 'techInternet' },

  // Health
  { patterns: [/\b(how much sleep|sleep need|hours of sleep|sleep important)\b/i], intent: 'healthSleep' },
  { patterns: [/\b(how much water|water drink|hydration|drink water)\b/i], intent: 'healthWater' },
  { patterns: [/\b(exercise|workout|how much exercise|stay fit)\b/i], intent: 'healthExercise' },
  { patterns: [/\b(vitamin|vitamins|what vitamins|essential nutrients)\b/i], intent: 'healthVitamins' },

  // Food
  { patterns: [/\b(cooking temperature|safe temperature|meat temperature|food temp)\b/i], intent: 'foodTemps' },
  { patterns: [/\b(cup to tablespoon|tablespoon|teaspoon|conversion|cups)\b/i], intent: 'foodConvert' },
  { patterns: [/\b(substitute|substitution|replacement|instead of)\b/i], intent: 'foodSubstitute' },

  // Money
  { patterns: [/\b(budget|budgeting|50.?30.?20|how to budget)\b/i], intent: 'moneyBudget' },
  { patterns: [/\b(save money|saving|how to save|cut expenses)\b/i], intent: 'moneySaving' },
  { patterns: [/\b(compound interest|interest rate|investing|grow money)\b/i], intent: 'moneyInterest' },

  // Productivity
  { patterns: [/\b(productive|productivity|get more done|time management)\b/i], intent: 'prodTips' },
  { patterns: [/\b(pomodoro|pomodoro technique|focus technique)\b/i], intent: 'prodPomodoro' },
];

// Math calculation parser
const calculateMath = (input: string): string | null => {
  // Clean the input
  const cleaned = input.toLowerCase()
    .replace(/what('s| is|s)/gi, '')
    .replace(/calculate/gi, '')
    .replace(/equals/gi, '')
    .replace(/times/gi, '*')
    .replace(/multiplied by/gi, '*')
    .replace(/divided by/gi, '/')
    .replace(/plus/gi, '+')
    .replace(/minus/gi, '-')
    .replace(/x/gi, '*')
    .trim();

  // Simple math expression pattern
  const mathPattern = /^[\d\s+\-*/().]+$/;
  
  // Extract just the math part
  const mathMatch = cleaned.match(/[\d\s+\-*/().]+/);
  if (mathMatch && mathMatch[0]) {
    const expression = mathMatch[0].trim();
    if (mathPattern.test(expression) && expression.match(/\d/)) {
      try {
        // Safe eval using Function constructor (still processes only numbers and operators)
        const safeExpression = expression.replace(/[^0-9+\-*/().]/g, '');
        if (safeExpression) {
          const result = new Function(`return ${safeExpression}`)();
          if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
            return `${safeExpression} = ${result}`;
          }
        }
      } catch (e) {
        return null;
      }
    }
  }
  
  return null;
};

// Get random response from array
const getRandomResponse = (responses: string[]): string => {
  return responses[Math.floor(Math.random() * responses.length)];
};

// Detect intent from user message
const detectIntent = (message: string): string => {
  const lowerMessage = message.toLowerCase().trim();
  
  for (const { patterns, intent } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return intent;
      }
    }
  }
  
  return 'unknown';
};

// Generate contextual response based on conversation history
const generateContextualResponse = (
  message: string,
  history: Message[]
): AIResponse => {
  // First try to calculate math
  const mathResult = calculateMath(message);
  if (mathResult) {
    return { response: mathResult, confidence: 1.0 };
  }
  
  const intent = detectIntent(message);
  const responses = KNOWLEDGE_BASE[intent] || KNOWLEDGE_BASE.unknown;
  
  let response = getRandomResponse(responses);
  let confidence = intent === 'unknown' ? 0.3 : 0.8;
  
  // Add context awareness
  if (history.length > 0) {
    const lastUserMessage = history
      .filter(m => m.role === 'user')
      .slice(-1)[0];
    
    // If user is continuing a topic, acknowledge it
    if (lastUserMessage && intent === 'unknown') {
      const previousIntent = detectIntent(lastUserMessage.content);
      if (previousIntent !== 'unknown') {
        response = "I understand you're still thinking about that. " + response;
      }
    }
  }
  
  // Dynamic time/date responses
  if (intent === 'time') {
    response = `It's currently ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    confidence = 1.0;
  }
  
  if (intent === 'date') {
    response = `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    confidence = 1.0;
  }
  
  return { response, confidence };
};

export const useLocalAI = () => {
  const processMessage = useCallback(async (
    message: string,
    conversationHistory: Message[] = []
  ): Promise<string> => {
    // Simulate slight processing delay for natural feel
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    const { response } = generateContextualResponse(message, conversationHistory);
    return response;
  }, []);
  
  // Stream-like response for UI consistency
  const streamResponse = useCallback(async (
    message: string,
    conversationHistory: Message[],
    onChunk: (chunk: string) => void,
    onComplete: () => void
  ): Promise<void> => {
    const fullResponse = await processMessage(message, conversationHistory);
    
    // Simulate streaming by sending words one at a time
    const words = fullResponse.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
      onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
    }
    
    onComplete();
  }, [processMessage]);
  
  return {
    processMessage,
    streamResponse,
  };
};
