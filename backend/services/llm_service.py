"""LLM Service for Nipah Virus Chatbot.

Uses OpenAI-compatible API. Falls back to a comprehensive built-in knowledge
base when no API key is configured, ensuring the chatbot always works.
"""

from openai import AsyncOpenAI
from config import settings

SYSTEM_PROMPT = """You are an expert medical information assistant specialized in Nipah virus (NiV).
Your role is to provide accurate, clear, and helpful information about Nipah virus to the public.

Key areas you cover:
- What Nipah virus is (a zoonotic paramyxovirus, BSL-4 pathogen)
- Transmission: fruit bats (Pteropus genus) are natural hosts; spreads via contaminated fruit/date palm sap, direct contact with infected pigs or humans, respiratory droplets
- Symptoms: fever, headache, drowsiness, disorientation, confusion, coma; encephalitis; respiratory illness; case fatality rate 40-75%
- Incubation period: 4-14 days (up to 60 days reported)
- Prevention: avoid exposure to bats and sick pigs, don't drink raw date palm sap, practice hand hygiene, use PPE in healthcare settings
- Treatment: currently no approved antiviral; supportive care is mainstay; ribavirin and monoclonal antibody m102.4 are under investigation
- Outbreaks: first identified in Malaysia (1998-99), recurring outbreaks in Bangladesh and India (Kerala)
- Diagnosis: RT-PCR, ELISA, virus isolation in BSL-4 labs

IMPORTANT GUIDELINES:
- Always remind users that your information is for educational purposes only
- Always advise consulting healthcare professionals for medical concerns
- Be empathetic and reassuring while being factually accurate
- If a question is outside your Nipah virus expertise, politely redirect
- Keep responses concise but thorough (2-4 paragraphs max)
- Use simple language accessible to non-medical audiences
- Never diagnose or prescribe treatment"""

# Comprehensive fallback knowledge base for when no API key is available
KNOWLEDGE_BASE = {
    "what": """Nipah virus (NiV) is a zoonotic virus belonging to the family Paramyxoviridae, genus Henipavirus. It was first identified in 1999 during an outbreak in Malaysia among pig farmers. The virus is classified as a BSL-4 (Biosafety Level 4) pathogen due to its high mortality rate and lack of approved vaccines or treatments.

Nipah virus can cause severe illness in both animals and humans, ranging from asymptomatic infection to acute respiratory illness and fatal encephalitis (brain inflammation). The case fatality rate ranges from 40% to 75%, making it one of the most dangerous known pathogens.

⚠️ This information is for educational purposes only. Please consult healthcare professionals for medical concerns.""",

    "symptom": """Nipah virus infection can present with a range of symptoms that typically appear 4-14 days after exposure (incubation period can extend up to 60 days):

**Early Symptoms (Days 1-3):**
• Fever and headache
• Muscle pain (myalgia)
• Sore throat
• Fatigue and drowsiness

**Progressive Symptoms (Days 3-7):**
• Dizziness and disorientation
• Nausea and vomiting
• Severe drowsiness
• Respiratory distress (cough, difficulty breathing)

**Severe Symptoms (encephalitic stage):**
• Confusion and altered consciousness
• Seizures
• Encephalitis (brain inflammation)
• Coma (can develop within 24-48 hours)

The disease can progress rapidly. Approximately 20% of survivors experience long-term neurological consequences including personality changes and seizures.

⚠️ This information is for educational purposes only. If you experience these symptoms, especially after potential exposure, seek immediate medical attention.""",

    "transmis": """Nipah virus can spread through several transmission routes:

**Animal-to-Human Transmission:**
• **Fruit bats (Pteropus genus)** are the natural reservoir hosts
• Consuming raw date palm sap contaminated by bat saliva or urine
• Eating fruits partially consumed by infected bats
• Direct contact with infected pigs (as seen in the 1998 Malaysia outbreak)

**Human-to-Human Transmission:**
• Direct contact with body fluids (blood, urine, saliva) of infected persons
• Respiratory droplets during close contact
• Particularly common in hospital settings without proper infection control
• Family members and healthcare workers are at highest risk

**Key Risk Factors:**
• Living near fruit bat habitats
• Working with pigs in endemic areas
• Consuming raw date palm sap
• Caring for Nipah-infected patients without proper PPE

⚠️ This information is for educational purposes only. Please consult healthcare professionals for medical concerns.""",

    "prevent": """Prevention of Nipah virus infection involves multiple strategies:

**Personal Prevention:**
• Avoid contact with sick bats and pigs
• Do NOT drink raw date palm sap — use bamboo skirt barriers on sap collection pots
• Wash and peel all fruits before consumption
• Practice regular hand hygiene with soap and water
• Avoid close unprotected contact with anyone showing Nipah symptoms

**Healthcare Settings:**
• Use full Personal Protective Equipment (PPE): N95 mask, gown, gloves, face shield
• Implement standard infection control precautions
• Isolate suspected/confirmed cases
• Practice proper waste disposal and decontamination

**Community Level:**
• Surveillance of bat populations and pig farms in endemic areas
• Public awareness campaigns during outbreak seasons
• Rapid response teams for outbreak containment
• Avoid slaughtering sick animals

**Vaccines (Under Development):**
• HeV-sG-V vaccine (Hendra virus subunit vaccine) — in clinical trials
• mRNA vaccines — in preclinical development
• No approved vaccine exists yet as of current knowledge

⚠️ This information is for educational purposes only. Please consult healthcare professionals for medical concerns.""",

    "treatment": """Currently, there is NO approved specific treatment or vaccine for Nipah virus infection. Management focuses on:

**Supportive Care (Primary Treatment):**
• Intensive care unit admission for severe cases
• Mechanical ventilation for respiratory failure
• Management of seizures with anticonvulsants
• Fluid management and electrolyte balance
• Fever management

**Investigational Treatments:**
• **Ribavirin**: Antiviral drug that showed some benefit in the Malaysia outbreak (reduced mortality by ~36% in one study), but results are not conclusive
• **Monoclonal antibody m102.4**: A human monoclonal antibody targeting the NiV G glycoprotein; showed promise in animal studies and has been used on compassionate-use basis
• **Remdesivir**: Has shown activity against NiV in vitro and in animal models
• **Favipiravir**: Being investigated for potential efficacy

**Recovery:**
• Survivors may experience long-term neurological effects
• Relapse encephalitis can occur months after initial recovery
• Long-term follow-up is recommended for all survivors

⚠️ This information is for educational purposes only. Always seek professional medical care for any health concerns.""",

    "outbreak": """Nipah virus outbreaks have occurred in several countries:

**Malaysia & Singapore (1998-1999):**
• First identified outbreak
• 265 cases, 105 deaths (40% fatality)
• Spread through infected pigs to pig farmers
• Led to culling of over 1 million pigs

**Bangladesh (2001-present, recurring):**
• Nearly annual outbreaks, primarily in winter months (Dec-May)
• Linked to consumption of raw date palm sap contaminated by bats
• Human-to-human transmission documented
• Fatality rate: 70-75%

**India - Kerala:**
• **2018 Outbreak**: 23 cases, 21 deaths (91% fatality) in Kozhikode district
• **2019**: 1 confirmed case, recovered
• **2021**: 1 confirmed case, died
• **2023**: 6 confirmed cases, 2 deaths in Kozhikode

**Philippines (2014):**
• 17 cases identified retrospectively
• Linked to horse slaughter and consumption

The World Health Organization (WHO) lists Nipah virus as a priority pathogen with epidemic/pandemic potential.

⚠️ This information is for educational purposes only. Please consult healthcare professionals for medical concerns.""",

    "diagnos": """Nipah virus diagnosis requires specialized laboratory testing:

**Laboratory Tests:**
• **RT-PCR (Real-Time Polymerase Chain Reaction)**: Primary diagnostic method; detects viral RNA from throat swabs, cerebrospinal fluid, urine, or blood
• **ELISA (Enzyme-Linked Immunosorbent Assay)**: Detects IgM and IgG antibodies
• **Virus Isolation**: Cell culture in BSL-4 laboratory
• **Immunohistochemistry**: On tissue samples from autopsy
• **Serum Neutralization Test**: Confirmatory antibody test

**Important Notes:**
• Testing must be done in BSL-4 facilities due to the extreme danger of the virus
• Early samples may be negative — repeat testing is important
• Samples should be collected with full PPE
• Contact your national health authority for guidance on sample collection and transport

**When to Suspect Nipah:**
• Acute febrile illness with encephalitis
• History of exposure in endemic areas
• Contact with bats, pigs, or confirmed cases
• Cluster of encephalitis cases in a community

⚠️ This information is for educational purposes only. Diagnosis should only be made by qualified healthcare professionals.""",

    "default": """Nipah virus (NiV) is a serious zoonotic pathogen that can cause severe illness in humans. Here are the key facts:

• **What**: A paramyxovirus first identified in Malaysia in 1999; BSL-4 pathogen
• **Hosts**: Fruit bats (Pteropus) are natural reservoirs; pigs can be intermediate hosts
• **Transmission**: Contaminated food (date palm sap, fruits), direct contact with infected animals/humans, respiratory droplets
• **Symptoms**: Fever, headache, drowsiness → encephalitis, respiratory illness, coma
• **Fatality Rate**: 40-75% depending on the outbreak
• **Treatment**: No approved vaccine or antiviral — supportive care is the mainstay
• **Prevention**: Avoid raw date palm sap, wash fruits, avoid contact with bats/sick pigs, use PPE in healthcare

Feel free to ask me specific questions about Nipah virus — I can provide detailed information about symptoms, transmission, prevention, treatment, outbreaks, and more.

⚠️ All information is for educational purposes only. Please consult healthcare professionals for any medical concerns.""",
}


def _get_fallback_response(message: str) -> str:
    """Match user message to knowledge base entries using keyword matching."""
    msg = message.lower()

    keyword_map = [
        (["what is", "what's", "about nipah", "tell me about", "explain", "define", "overview"], "what"),
        (["symptom", "sign", "feel", "sick", "illness", "clinical"], "symptom"),
        (["spread", "transmit", "transmission", "catch", "infect", "contagious", "how does it spread", "contract"], "transmis"),
        (["prevent", "avoid", "protect", "safe", "precaution", "measure", "ppe", "hygiene"], "prevent"),
        (["treat", "cure", "medicine", "drug", "therapy", "ribavirin", "hospital", "recover"], "treatment"),
        (["outbreak", "epidemic", "where", "country", "malaysia", "bangladesh", "india", "kerala", "history"], "outbreak"),
        (["diagnos", "test", "detect", "pcr", "elisa", "lab", "confirm"], "diagnos"),
    ]

    for keywords, category in keyword_map:
        if any(kw in msg for kw in keywords):
            return KNOWLEDGE_BASE[category]

    return KNOWLEDGE_BASE["default"]


async def get_chat_response(message: str, conversation_history: list[dict] | None = None) -> str:
    """Get a response from the LLM or fallback knowledge base."""
    # If neither API key nor Local Base URL is provided, fallback to knowledge base
    if not settings.OPENAI_API_KEY and not settings.LLM_BASE_URL:
        return _get_fallback_response(message)

    try:
        # Provide a dummy key if using a local model without an API key
        api_key = settings.OPENAI_API_KEY or "local-model-dummy-key"
        
        client_kwargs = {"api_key": api_key}
        if settings.LLM_BASE_URL:
            client_kwargs["base_url"] = settings.LLM_BASE_URL
            
        client = AsyncOpenAI(**client_kwargs)

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if conversation_history:
            # Limit history to last 10 exchanges to manage token usage
            for entry in conversation_history[-10:]:
                messages.append({"role": entry["role"], "content": entry["content"]})

        messages.append({"role": "user", "content": message})

        response = await client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=messages,
            max_tokens=800,
            temperature=0.7,
        )

        return response.choices[0].message.content or _get_fallback_response(message)

    except Exception:
        # Fall back to knowledge base on any API error
        return _get_fallback_response(message)
