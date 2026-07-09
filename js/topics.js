// A shelf of topics spanning many disciplines, for the "Surprise me" picker.
// Each entry: { topic, field }
const TOPIC_SHELF = [
  // Law
  { topic: "maritime law", field: "law" },
  { topic: "antitrust law", field: "law" },
  { topic: "international arbitration", field: "law" },
  { topic: "constitutional originalism", field: "law" },
  { topic: "intellectual property law", field: "law" },
  { topic: "space law", field: "law" },
  { topic: "administrative law", field: "law" },
  { topic: "conflict of laws", field: "law" },
  { topic: "data protection law", field: "law" },
  { topic: "criminal sentencing theory", field: "law" },

  // Economics
  { topic: "behavioral economics", field: "economics" },
  { topic: "monetary policy", field: "economics" },
  { topic: "game theory", field: "economics" },
  { topic: "development economics", field: "economics" },
  { topic: "mechanism design", field: "economics" },
  { topic: "labor economics", field: "economics" },
  { topic: "auction theory", field: "economics" },
  { topic: "public choice theory", field: "economics" },
  { topic: "trade economics", field: "economics" },
  { topic: "financial market microstructure", field: "economics" },

  // Physics
  { topic: "quantum entanglement", field: "physics" },
  { topic: "thermodynamics", field: "physics" },
  { topic: "condensed matter physics", field: "physics" },
  { topic: "general relativity", field: "physics" },
  { topic: "plasma physics", field: "physics" },
  { topic: "particle physics", field: "physics" },
  { topic: "fluid dynamics", field: "physics" },
  { topic: "quantum computing", field: "physics" },
  { topic: "astrophysics of black holes", field: "physics" },
  { topic: "statistical mechanics", field: "physics" },

  // Biology
  { topic: "CRISPR gene editing", field: "biology" },
  { topic: "synthetic biology", field: "biology" },
  { topic: "evolutionary developmental biology", field: "biology" },
  { topic: "microbiome science", field: "biology" },
  { topic: "epigenetics", field: "biology" },
  { topic: "neurobiology of sleep", field: "biology" },
  { topic: "cancer immunotherapy", field: "biology" },
  { topic: "protein folding", field: "biology" },
  { topic: "conservation genetics", field: "biology" },
  { topic: "virology", field: "biology" },

  // Philosophy
  { topic: "philosophy of mind", field: "philosophy" },
  { topic: "epistemology", field: "philosophy" },
  { topic: "moral relativism", field: "philosophy" },
  { topic: "philosophy of science", field: "philosophy" },
  { topic: "existentialism", field: "philosophy" },
  { topic: "philosophy of language", field: "philosophy" },
  { topic: "ethics of artificial intelligence", field: "philosophy" },
  { topic: "free will and determinism", field: "philosophy" },
  { topic: "political philosophy of justice", field: "philosophy" },
  { topic: "phenomenology", field: "philosophy" },

  // Engineering
  { topic: "digital twin technology", field: "engineering" },
  { topic: "control systems theory", field: "engineering" },
  { topic: "additive manufacturing", field: "engineering" },
  { topic: "structural fatigue analysis", field: "engineering" },
  { topic: "robotics kinematics", field: "engineering" },
  { topic: "battery electrochemistry", field: "engineering" },
  { topic: "computational fluid dynamics", field: "engineering" },
  { topic: "systems engineering", field: "engineering" },
  { topic: "industrial automation", field: "engineering" },
  { topic: "materials science of composites", field: "engineering" },

  // Computer Science
  { topic: "distributed systems", field: "computer science" },
  { topic: "cryptography", field: "computer science" },
  { topic: "large language models", field: "computer science" },
  { topic: "computer vision", field: "computer science" },
  { topic: "compiler design", field: "computer science" },
  { topic: "database internals", field: "computer science" },
  { topic: "reinforcement learning", field: "computer science" },
  { topic: "computational complexity theory", field: "computer science" },
  { topic: "network security", field: "computer science" },
  { topic: "formal verification", field: "computer science" },

  // History
  { topic: "the Byzantine Empire", field: "history" },
  { topic: "the Mongol conquests", field: "history" },
  { topic: "the Cold War", field: "history" },
  { topic: "the Industrial Revolution", field: "history" },
  { topic: "the Silk Road", field: "history" },
  { topic: "the fall of the Roman Republic", field: "history" },
  { topic: "the Indian independence movement", field: "history" },
  { topic: "the history of navigation", field: "history" },
  { topic: "the Ottoman Empire", field: "history" },
  { topic: "the history of cartography", field: "history" },

  // Psychology
  { topic: "cognitive biases", field: "psychology" },
  { topic: "attachment theory", field: "psychology" },
  { topic: "the psychology of habit formation", field: "psychology" },
  { topic: "personality psychology", field: "psychology" },
  { topic: "decision fatigue", field: "psychology" },
  { topic: "the psychology of motivation", field: "psychology" },
  { topic: "cognitive load theory", field: "psychology" },
  { topic: "the psychology of persuasion", field: "psychology" },
  { topic: "developmental psychology", field: "psychology" },
  { topic: "the psychology of flow states", field: "psychology" },

  // Linguistics
  { topic: "historical linguistics", field: "linguistics" },
  { topic: "computational linguistics", field: "linguistics" },
  { topic: "language acquisition", field: "linguistics" },
  { topic: "sociolinguistics", field: "linguistics" },
  { topic: "phonetics and phonology", field: "linguistics" },
  { topic: "semantics and pragmatics", field: "linguistics" },
  { topic: "language death and revitalization", field: "linguistics" },
  { topic: "syntax theory", field: "linguistics" },

  // Medicine
  { topic: "immunology", field: "medicine" },
  { topic: "epidemiology", field: "medicine" },
  { topic: "pharmacokinetics", field: "medicine" },
  { topic: "neurodegenerative disease", field: "medicine" },
  { topic: "regenerative medicine", field: "medicine" },
  { topic: "medical imaging", field: "medicine" },
  { topic: "endocrinology", field: "medicine" },
  { topic: "public health policy", field: "medicine" },

  // Chemistry
  { topic: "catalysis", field: "chemistry" },
  { topic: "organic synthesis", field: "chemistry" },
  { topic: "electrochemistry", field: "chemistry" },
  { topic: "polymer chemistry", field: "chemistry" },
  { topic: "photochemistry", field: "chemistry" },
  { topic: "green chemistry", field: "chemistry" },

  // Mathematics
  { topic: "number theory", field: "mathematics" },
  { topic: "topology", field: "mathematics" },
  { topic: "graph theory", field: "mathematics" },
  { topic: "probability theory", field: "mathematics" },
  { topic: "differential geometry", field: "mathematics" },
  { topic: "chaos theory", field: "mathematics" },
  { topic: "optimization theory", field: "mathematics" },

  // Political Science
  { topic: "geopolitics of energy", field: "political science" },
  { topic: "electoral systems design", field: "political science" },
  { topic: "international relations realism", field: "political science" },
  { topic: "authoritarian regime survival", field: "political science" },
  { topic: "nuclear deterrence theory", field: "political science" },
  { topic: "the politics of trade sanctions", field: "political science" },

  // Art & Design
  { topic: "the history of typography", field: "art and design" },
  { topic: "Bauhaus design principles", field: "art and design" },
  { topic: "color theory", field: "art and design" },
  { topic: "architectural structural design", field: "art and design" },
  { topic: "industrial design history", field: "art and design" },

  // Anthropology / Sociology
  { topic: "cultural anthropology", field: "anthropology" },
  { topic: "the sociology of networks", field: "sociology" },
  { topic: "urban sociology", field: "sociology" },
  { topic: "kinship systems", field: "anthropology" },

  // Environmental Science / Astronomy
  { topic: "climate feedback loops", field: "environmental science" },
  { topic: "ocean acidification", field: "environmental science" },
  { topic: "exoplanet detection", field: "astronomy" },
  { topic: "stellar nucleosynthesis", field: "astronomy" },
  { topic: "biodiversity loss", field: "environmental science" },

  // Neuroscience
  { topic: "the neuroscience of memory", field: "neuroscience" },
  { topic: "computational neuroscience", field: "neuroscience" },
  { topic: "the neuroscience of decision-making", field: "neuroscience" },
  { topic: "neuroplasticity", field: "neuroscience" },
];

function pickRandomTopic() {
  const i = Math.floor(Math.random() * TOPIC_SHELF.length);
  return TOPIC_SHELF[i];
}

function fieldForTopic(topicText) {
  const hit = TOPIC_SHELF.find(
    (t) => t.topic.toLowerCase() === topicText.trim().toLowerCase()
  );
  return hit ? hit.field : "general";
}
