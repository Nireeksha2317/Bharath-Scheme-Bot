import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { InsertScheme } from "@shared/schema";
import { extractIntentAndParams, generateResponse } from "./ai";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

// --- SEED DATA ---
const SEED_SCHEMES: InsertScheme[] = [
  // Existing Central Schemes
  {
    name: "PM Kisan Samman Nidhi",
    source: "Central",
    category: "Agriculture & Farmers",
    description: "Income support of ₹6,000 per year to all landholding farmer families.",
    beneficiaries: "All landholding farmers families",
    eligibility: "Landholding farmers families with cultivable land.",
    benefits: "₹6,000 per year in 3 equal installments.",
    documents: "Aadhaar Card, Land Ownership Papers, Bank Account Details",
    applicationProcess: "Register online at pmkisan.gov.in or via CSCs.",
    officialLink: "https://pmkisan.gov.in",
    state: "Pan India",
    keywords: ["kisan", "farmer", "income", "6000"]
  },
  {
    name: "PM Fasal Bima Yojana",
    source: "Central",
    category: "Agriculture & Farmers",
    description: "Crop insurance scheme to provide financial support to farmers suffering crop loss/damage.",
    beneficiaries: "Farmers growing notified crops",
    eligibility: "Farmers with insurable interest in the crop.",
    benefits: "Insurance coverage against crop loss due to non-preventable natural risks.",
    documents: "Land Possession Certificate, Aadhaar, Bank Details, Sowing Certificate",
    applicationProcess: "Apply through banks, CSCs, or PMFBY Portal.",
    officialLink: "https://pmfby.gov.in",
    state: "Pan India",
    keywords: ["insurance", "crop", "loss", "farmer"]
  },
  // NEW Schemes from expansion
  {
    name: "National Mission on Sustainable Agriculture (NMSA)",
    source: "Central",
    category: "Agriculture & Farmers",
    description: "Promotes sustainable agricultural practices to enhance productivity, particularly in rainfed regions.",
    beneficiaries: "Rainfed region farmers, small & marginal farmers",
    eligibility: "Farmers with cultivable land; focus on rainfed areas.",
    benefits: "Financial assistance for soil health management, water-use efficiency, and climate-resilient practices.",
    documents: "Aadhaar, Land Records, Bank Account Details",
    applicationProcess: "Apply through State Agriculture Department or local RSKs.",
    officialLink: "https://nmsa.dac.gov.in",
    state: "Pan India",
    keywords: ["sustainable", "climate", "soil", "agriculture", "nmsa"],
  },
  {
    name: "Sub-Mission on Agricultural Mechanization (SMAM)",
    source: "Central",
    category: "Agriculture & Farmers",
    description: "Promotes adoption of cost-effective and eco-friendly mechanization technologies in farming.",
    beneficiaries: "Small and marginal farmers, SC/ST, and women farmers",
    eligibility: "Small & marginal farmers; priority to SC/ST/Women.",
    benefits: "40-50% subsidy on purchase of agricultural machinery; support for Custom Hiring Centres.",
    documents: "Aadhaar, Land Records, Caste Certificate (if applicable), Bank Details",
    applicationProcess: "Apply via SMAM portal or local Agriculture Office.",
    officialLink: "https://farmech.dac.gov.in/smam",
    state: "Pan India",
    keywords: ["machinery", "tractor", "mechanization", "subsidy", "smam"],
  },
  {
    name: "National Beekeeping & Honey Mission (NBHM)",
    source: "Central",
    category: "Agriculture & Farmers",
    description: "Holistic growth of beekeeping industry to boost rural livelihoods and horticulture production.",
    beneficiaries: "Beekeepers, rural entrepreneurs, cooperatives",
    eligibility: "Individuals or groups interested in beekeeping; registered with National Bee Board.",
    benefits: "Financial assistance for honey production, testing labs, and processing units; traceability support.",
    documents: "Aadhaar, Bank Details, NBB Registration Number",
    applicationProcess: "Online application via National Bee Board portal.",
    officialLink: "https://nbb.gov.in",
    state: "Pan India",
    keywords: ["honey", "beekeeping", "bees", "rural", "nbhm"],
  },
  {
    name: "PM Matsya Sampada Yojana (PMMSY)",
    source: "Central",
    category: "Agriculture & Farmers",
    description: "Flagship scheme for sustainable development of the fisheries sector and doubling fishers' income.",
    beneficiaries: "Fishers, fish farmers, fish workers, SHGs",
    eligibility: "Individuals or groups engaged in fisheries/aquaculture.",
    benefits: "Assistance for new fishing vessels, cold storage, hatcheries, and fish processing units; training support.",
    documents: "Identity Proof, Fishers Identity Card, Bank Passbook, Land/Water lease docs",
    applicationProcess: "Apply through District Fisheries Department.",
    officialLink: "https://pmmsy.dof.gov.in",
    state: "Pan India",
    keywords: ["fish", "fisheries", "aquaculture", "matsya", "pmmsy"],
  },
  {
    name: "National Bamboo Mission (NBM)",
    source: "Central",
    category: "Agriculture & Farmers",
    description: "Promotes holistic growth of the bamboo sector to supplement farm income and ensure raw material availability.",
    beneficiaries: "Bamboo growers, artisans, rural entrepreneurs",
    eligibility: "Farmers with non-forest private lands.",
    benefits: "Grant for bamboo plantation, nurseries, incubation centers, and handicraft units.",
    documents: "Aadhaar, Land Possession records, Bank Account",
    applicationProcess: "Apply via NBM portal or State Bamboo Mission office.",
    officialLink: "https://nbm.nic.in",
    state: "Pan India",
    keywords: ["bamboo", "plantation", "handicraft", "nbm"],
  },
  {
    name: "National Mission on Edible Oil-Oil Palm (NMEO-OP)",
    source: "Central",
    category: "Agriculture & Farmers",
    description: "Focuses on achieving self-reliance in edible oils by increasing oil palm cultivation and productivity.",
    beneficiaries: "Farmers in selected districts, particularly in NER and A&N Islands",
    eligibility: "Farmers willing to grow oil palm on their land.",
    benefits: "Support for quality planting material, nutrient management, and viability pricing for fresh fruit bunches.",
    documents: "Aadhaar, Land Ownership Records, Bank Details",
    applicationProcess: "Registration via State Agriculture Department/District Horticulture Office.",
    officialLink: "https://nmeoop.dac.gov.in",
    state: "Pan India",
    keywords: ["edible oil", "oil palm", "palm oil", "nmeoop"],
  },
  {
    name: "PM Uchchatar Shiksha Abhiyan (PM-USHA)",
    source: "Central",
    category: "Education & Students",
    description: "Strengthening and transforming state higher education institutions to align with NEP 2020.",
    beneficiaries: "Students and faculty in state universities and colleges",
    eligibility: "Institutions must sign MoU with Ministry of Education.",
    benefits: "Modernized labs, infrastructure development, and research & innovation facilities.",
    documents: "Institutional enrollment details (beneficiary students)",
    applicationProcess: "Direct benefit through government institution selection.",
    officialLink: "https://pmshrischools.education.gov.in",
    state: "Pan India",
    keywords: ["higher education", "university", "college", "nep", "usha"],
  },
  {
    name: "National Overseas Scholarship (NOS) Scheme",
    source: "Central",
    category: "Education & Students",
    description: "Financial assistance for meritorious students from SC, DNT, and landless labourers to study abroad.",
    beneficiaries: "Students from SC, DNT, Landless Agricultural Labourers, Traditional Artisans",
    eligibility: "Family income < ₹8 lakh/annum; Master's or Ph.D. level; < 35 years old.",
    benefits: "Full tuition coverage, maintenance allowance (approx. $15,400/yr), airfare, and visa fees.",
    documents: "Caste Certificate, Income Certificate, Passport, Admission Offer from Abroad, Marksheets",
    applicationProcess: "Online application via NOS portal (nosmsje.gov.in).",
    officialLink: "https://nosmsje.gov.in",
    state: "Pan India",
    keywords: ["abroad", "scholarship", "overseas", "sc", "noss"],
  },
  {
    name: "Padhe Bharat Badhe Bharat (PBBB)",
    source: "Central",
    category: "Education & Students",
    description: "A sub-programme of SSA to improve basic literacy and numeracy in primary school children.",
    beneficiaries: "Children in Classes I and II",
    eligibility: "All students in government primary schools.",
    benefits: "Activity-based learning, story-telling, picture reading, and library access; focus on mother tongue instruction.",
    documents: "School enrollment details",
    applicationProcess: "Implementation within government primary schools.",
    officialLink: "https://education.gov.in",
    state: "Pan India",
    keywords: ["literacy", "primary school", "numeracy", "pbbb"],
  },
  {
    name: "SWAYAM & SWAYAM Prabha",
    source: "Central",
    category: "Education & Students",
    description: "Online education platform (SWAYAM) and high-quality educational DTH channels (SWAYAM Prabha).",
    beneficiaries: "Students from Class 9 to Post-graduation",
    eligibility: "Free access for all Indian residents.",
    benefits: "Interactive video lectures, credit transfer capability for degrees, and 24/7 educational broadcasts.",
    documents: "Online registration for SWAYAM",
    applicationProcess: "Register at swayam.gov.in; DTH channels are Free-to-Air.",
    officialLink: "https://swayam.gov.in",
    state: "Pan India",
    keywords: ["online courses", "mooc", "dth", "tv education", "swayam"],
  },
  {
    name: "CBSE Udaan Scheme",
    source: "Central",
    category: "Education & Students",
    description: "Empowers girl students in STEM fields by providing free coaching for engineering entrance exams.",
    beneficiaries: "Meritorious girl students of Class 11 and 12",
    eligibility: "Female students; Class 10th marks > 70%; PCM stream; family income < ₹6 lakh.",
    benefits: "Free online/offline coaching, recorded lectures, study material, and tablet for learners.",
    documents: "Class 10 Marksheet, Income Certificate, School ID",
    applicationProcess: "Apply online through CBSE official website.",
    officialLink: "https://cbse.nic.in",
    state: "Pan India",
    keywords: ["girls", "engineering", "coaching", "stem", "udaan"],
  },
  {
    name: "Nirbhaya Fund Initiatives",
    source: "Central",
    category: "Women & Child Welfare",
    description: "A dedicated fund for projects enhancing safety and security of women, including emergency systems and centers.",
    beneficiaries: "Women and children in distress",
    eligibility: "Any woman needing safety, medical, legal, or counseling support.",
    benefits: "Access to One-Stop Centers (Sakhi), 181 Women Helpline, and 112 Emergency Response Support System (ERSS).",
    documents: "None required for emergency assistance",
    applicationProcess: "Call 181, 112, or visit the nearest One-Stop Center.",
    officialLink: "https://wcd.gov.in",
    state: "Pan India",
    keywords: ["safety", "emergency", "helpline", "women safety", "nirbhaya"],
  },
  {
    name: "Support to Training and Employment Programme (STEP)",
    source: "Central",
    category: "Women & Child Welfare",
    description: "Provides skill training and employment opportunities to women to make them self-reliant.",
    beneficiaries: "Women aged 16 years and above",
    eligibility: "Women from marginalized backgrounds; focus on rural areas.",
    benefits: "Training in various crafts, stipend during training, and micro-credit support for SHGs.",
    documents: "Aadhaar, BPL Card (optional), Bank Details",
    applicationProcess: "Apply through State Department of Women & Child Development.",
    officialLink: "https://wcd.gov.in",
    state: "Pan India",
    keywords: ["skill training", "employment", "women empowerment", "step"],
  },
  {
    name: "PM-CARES for Children",
    source: "Central",
    category: "Women & Child Welfare",
    description: "Comprehensive care for children who lost both parents to the COVID-19 pandemic.",
    beneficiaries: "Orphaned children (due to COVID-19)",
    eligibility: "Lost both/surviving/legal parents between Mar 2020 and Feb 2022.",
    benefits: "₹10 lakh corpus, monthly stipend, health insurance, and education support.",
    documents: "Death Certificates of Parents, Child's Identity Proof",
    applicationProcess: "Register via local Child Welfare Committee (CWC).",
    officialLink: "https://pmcaresforchildren.in",
    state: "Pan India",
    keywords: ["orphan", "covid", "child welfare", "pmcares"],
  },
  {
    name: "National Adoption Programme",
    source: "Central",
    category: "Women & Child Welfare",
    description: "Regulates and monitors adoption services to provide permanent families for children in need.",
    beneficiaries: "Destitute, abandoned, or orphaned children",
    eligibility: "Prospective parents must meet CARA guidelines; child must be legally free for adoption.",
    benefits: "Legal transfer of parental rights; permanent care and protection for the child.",
    documents: "Identity Proof, Financial records, Home Study Report (for parents)",
    applicationProcess: "Registration on CARINGS portal (cara.nic.in).",
    officialLink: "https://cara.nic.in",
    state: "Pan India",
    keywords: ["adoption", "child", "parents", "cara"],
  },
  {
    name: "Rashtriya Mahila Kosh (RMK)",
    source: "Central",
    category: "Women & Child Welfare",
    description: "National credit fund providing micro-finance for socio-economic empowerment of women.",
    beneficiaries: "Poor women, Self-Help Groups (SHGs)",
    eligibility: "Women entrepreneurs or women-led SHGs.",
    benefits: "Easy micro-credit for income-generating activities without collateral.",
    documents: "Identity Proof, SHG Registration details (if applicable), Bank Account",
    applicationProcess: "Apply through NGOs/IMOs registered with RMK.",
    officialLink: "https://rmk.nic.in",
    state: "Pan India",
    keywords: ["micro-finance", "loan", "women business", "rmk"],
  },
  {
    name: "ASPIRE Scheme",
    source: "Central",
    category: "Employment & Skill Development",
    description: "Promotion of innovation, rural industries and entrepreneurship to create jobs in rural areas.",
    beneficiaries: "Rural entrepreneurs, NGOs, Technical Institutes",
    eligibility: "Registered NGOs, Trusts, Technical Institutes, Universities.",
    benefits: "Financial support up to ₹1 crore for Technology Business Incubators (TBIs) and ₹75 lakh for Livelihood Business Incubators (LBIs).",
    documents: "Society Registration, Project Proposal, IT Returns",
    applicationProcess: "Online application via MSME ASPIRE portal.",
    officialLink: "https://aspire.msme.gov.in",
    state: "Pan India",
    keywords: ["innovation", "rural industry", "entrepreneurship", "startup", "aspire"],
  },
  {
    name: "Prime Minister’s Employment Generation Programme (PMEGP)",
    source: "Central",
    category: "Employment & Skill Development",
    description: "Credit-linked subsidy program to help individuals set up micro-enterprises and create jobs.",
    beneficiaries: "Individuals above 18, SHGs, Charitable Trusts",
    eligibility: "At least 8th std pass for large projects (> ₹10 lakh mfg/₹5 lakh svc).",
    benefits: "15-35% subsidy on project costs up to ₹50 lakh (manufacturing).",
    documents: "Aadhaar, Caste Certificate, Project Report, Educational Certificates",
    applicationProcess: "Apply online at kviconline.gov.in.",
    officialLink: "https://kviconline.gov.in",
    state: "Pan India",
    keywords: ["micro-enterprise", "jobs", "subsidy", "kvic", "pmegp"],
  },
  {
    name: "ZED Certification Scheme for MSMEs",
    source: "Central",
    category: "Employment & Skill Development",
    description: "Incentivizes MSMEs to adopt 'Zero Defect, Zero Effect' practices to improve quality and environment sustainability.",
    beneficiaries: "MSMEs with Udyam Registration",
    eligibility: "Registered MSMEs; valid Udyam number.",
    benefits: "Up to 80% subsidy on certification fees; recognition for product quality and sustainable practices.",
    documents: "Udyam Registration, Self-declaration",
    applicationProcess: "Apply via ZED portal (zed.msme.gov.in).",
    officialLink: "https://zed.msme.gov.in",
    state: "Pan India",
    keywords: ["quality", "sustainability", "msme", "zed certification"],
  },
  {
    name: "National SC-ST Hub (NSSH)",
    source: "Central",
    category: "Employment & Skill Development",
    description: "Provides professional support to SC/ST entrepreneurs for participation in public procurement.",
    beneficiaries: "SC/ST Entrepreneurs",
    eligibility: "Entrepreneurs belonging to SC/ST community; valid Udyam Registration.",
    benefits: "Capacity building, vendor development, participation in exhibitions, and facilitation of bank loans.",
    documents: "Caste Certificate, Udyam Registration, PAN Card",
    applicationProcess: "Contact local NSSH center or register at scsthub.in.",
    officialLink: "https://www.scsthub.in",
    state: "Pan India",
    keywords: ["sc", "st", "entrepreneur", "procurement", "hub"],
  },
  {
    name: "Credit Linked Capital Subsidy Scheme (CLCSS)",
    source: "Central",
    category: "Employment & Skill Development",
    description: "Financial assistance to MSMEs for technology upgradation and modern machinery induction.",
    beneficiaries: "Registered Micro and Small Enterprises",
    eligibility: "Engaged in approved 51 sub-sectors.",
    benefits: "15% capital subsidy on institutional finance up to ₹1 crore (max subsidy ₹15 lakh).",
    documents: "Loan application, Identity Proof, Udyam Registration, IT Returns",
    applicationProcess: "Apply through Nodal Banks to Office of DC (MSME).",
    officialLink: "https://msme.gov.in",
    state: "Pan India",
    keywords: ["technology", "machinery", "subsidy", "msme", "clcss"],
  },
  {
    name: "National TB Elimination Programme (NTEP)",
    source: "Central",
    category: "Health & Insurance",
    description: "Public health initiative providing free diagnosis and treatment for Tuberculosis with nutritional support.",
    beneficiaries: "Tuberculosis patients",
    eligibility: "Any person diagnosed with TB.",
    benefits: "Free drugs and diagnosis; monthly ₹500 incentive (Nikshay Poshan Yojana) for nutrition via DBT.",
    documents: "Aadhaar, Bank Account Details, TB Diagnosis report",
    applicationProcess: "Visit nearest Government Health Centre or DOTS clinic.",
    officialLink: "https://tbcindia.gov.in",
    state: "Pan India",
    keywords: ["tb", "tuberculosis", "medical", "free drugs", "nikshay"],
  },
  {
    name: "National Programme for Prevention of Cancer, Diabetes, CVD & Stroke (NPCDCS)",
    source: "Central",
    category: "Health & Insurance",
    description: "Aims for early diagnosis, health promotion and management of non-communicable diseases.",
    beneficiaries: "General public, specifically those at risk of NCDs",
    eligibility: "Any citizen seeking screening for NCDs.",
    benefits: "Free screening, cost-effective treatment support, and health promotion guidance at NCD clinics.",
    documents: "None required for screening",
    applicationProcess: "Visit NCD clinics at district hospitals or CHCs.",
    officialLink: "https://nhm.gov.in",
    state: "Pan India",
    keywords: ["cancer", "diabetes", "heart disease", "health checkup", "npcdcs"],
  },
  {
    name: "National Programme for Health Care of the Elderly (NPHCE)",
    source: "Central",
    category: "Health & Insurance",
    description: "Provides dedicated health care services to elderly citizens through specialized geriatric clinics.",
    beneficiaries: "Senior citizens aged 60 and above",
    eligibility: "Citizens aged 60 years or more.",
    benefits: "Dedicated OPD, 10-bed geriatric ward in hospitals, and home-based care services.",
    documents: "Age Proof (Aadhaar/Senior Citizen card)",
    applicationProcess: "Register at the Geriatric clinic in Government District Hospitals.",
    officialLink: "https://nhm.gov.in",
    state: "Pan India",
    keywords: ["geriatric", "elderly", "senior citizen", "health center", "nphce"],
  },
  {
    name: "National Leprosy Eradication Programme (NLEP)",
    source: "Central",
    category: "Health & Insurance",
    description: "Goal to eliminate leprosy through early detection and free Multi-Drug Therapy (MDT) for all.",
    beneficiaries: "Persons affected by leprosy",
    eligibility: "Any person showing signs of leprosy.",
    benefits: "Free diagnostic services and MDT drugs; financial assistance for reconstructive surgery (RCS).",
    documents: "None required for treatment",
    applicationProcess: "Integrated primary healthcare centers have NLEP services.",
    officialLink: "https://nlep.nic.in",
    state: "Pan India",
    keywords: ["leprosy", "mdt", "medical", "free treatment", "nlep"],
  },
  {
    name: "PM Ujjwala Yojana 2.0",
    source: "Central",
    category: "Housing & Urban",
    description: "Provides free LPG connections to women from BPL households and migrant families.",
    beneficiaries: "Adult women from BPL/low-income households",
    eligibility: "Female member of household; No other LPG connection; self-declaration for migrants.",
    benefits: "First refill and stove free; ₹1,600 subsidy for LPG connection.",
    documents: "Aadhaar, Ration Card, Bank Account, Mobile Number",
    applicationProcess: "Apply online at pmuy.gov.in or via nearest LPG distributor.",
    officialLink: "https://www.pmuy.gov.in",
    state: "Pan India",
    keywords: ["gas", "lpg", "cooking", "free cylinder", "ujjwala"],
  },
  {
    name: "Saubhagya Scheme",
    source: "Central",
    category: "Housing & Urban",
    description: "Achieving universal household electrification by providing last-mile connectivity to all un-electrified households.",
    beneficiaries: "All un-electrified households in rural areas and poor urban households",
    eligibility: "Households without electricity; identified via SECC data.",
    benefits: "Free electricity connection; standalone solar packs for remote areas.",
    documents: "Aadhaar, Address Proof, Identity Proof",
    applicationProcess: "On-spot registration is done by DISCOMs in camps.",
    officialLink: "https://saubhagya.gov.in",
    state: "Pan India",
    keywords: ["electricity", "power", "light", "saubhagya"],
  },
  {
    name: "PM-KUSUM Yojana",
    source: "Central",
    category: "Agriculture & Farmers",
    description: "Supports installation of solar pumps and grid-connected solar power plants for farmers.",
    beneficiaries: "Farmers, cooperatives, groups of farmers",
    eligibility: "Farmers with cultivable land; focus on reducing diesel usage.",
    benefits: "Up to 60-90% subsidy for solar pumps; additional income from selling surplus power.",
    documents: "Aadhaar, Land Records, Bank Account",
    applicationProcess: "Apply via State Renewable Energy Agency.",
    officialLink: "https://pmkusum.mnre.gov.in",
    state: "Pan India",
    keywords: ["solar pump", "irrigation", "renewable", "farmer", "kusum"],
  },
  {
    name: "National Solar Mission (NSM)",
    source: "Central",
    category: "Housing & Urban",
    description: "Promotes solar energy deployment to make India a leader in solar energy; includes rooftop solar support.",
    beneficiaries: "Citizens, industries, commercial establishments",
    eligibility: "Varies by sub-scheme (e.g., Rooftop Solar for households).",
    benefits: "Subsidy for rooftop solar installation; long-term financial incentives for solar power generation.",
    documents: "Electricity Bill, Property tax receipt, Aadhaar",
    applicationProcess: "Apply via National Portal for Rooftop Solar.",
    officialLink: "https://mnre.gov.in",
    state: "Pan India",
    keywords: ["solar energy", "rooftop solar", "panel", "green energy"],
  },
  {
    name: "Atal Pension Yojana (APY)",
    source: "Central",
    category: "Senior Citizens & Pension",
    description: "Pension scheme for unorganized sector workers with a fixed monthly pension after 60 years.",
    beneficiaries: "Unorganized sector workers, citizens aged 18-40",
    eligibility: "Indian citizen aged 18-40; must have a savings bank account; not an income-tax payer.",
    benefits: "Monthly pension of ₹1,000 to ₹5,000 after 60 years; spouse receives pension if subscriber dies.",
    documents: "Aadhaar Card, Mobile Number, Bank Account linking",
    applicationProcess: "Apply through local bank branch or online via bank portal.",
    officialLink: "https://npscra.nsdl.co.in/scheme-atal-pension-yojana.php",
    state: "Pan India",
    keywords: ["pension", "old age", "savings", "apy", "atal"],
  },
  {
    name: "National Pension System – Lite (Swavalamban)",
    source: "Central",
    category: "Senior Citizens & Pension",
    description: "Low-cost pension system for economically disadvantaged people in the unorganized sector.",
    beneficiaries: "Workers in the unorganized sector aged 18-60",
    eligibility: "Non-income tax payers; not covered under any other social security scheme.",
    benefits: "Retirement corpus and monthly pension through small periodic contributions; low management fees.",
    documents: "Aadhaar, Bank Account, Address Proof",
    applicationProcess: "Contact registered Aggregators/Point of Presence (PoP).",
    officialLink: "https://npscra.nsdl.co.in",
    state: "Pan India",
    keywords: ["pension", "swavalamban", "nps", "savings", "unorganized"],
  },
  {
    name: "Pradhan Mantri Vaya Vandana Yojana (PMVVY)",
    source: "Central",
    category: "Senior Citizens & Pension",
    description: "An insurance-cum-pension scheme for senior citizens providing immediate retirement income.",
    beneficiaries: "Senior citizens aged 60 and above",
    eligibility: "Must be 60 years or older.",
    benefits: "Guaranteed annual return of approx 7.4%; monthly/quarterly/yearly pension payouts for 10 years.",
    documents: "Aadhaar, Senior Citizen ID (if available), Bank Details",
    applicationProcess: "Apply via LIC of India (online or offline).",
    officialLink: "https://licindia.in",
    state: "Pan India",
    keywords: ["senior citizen", "pension", "guaranteed return", "lic", "pmvvy"],
  },
  {
    name: "Stand-Up India Loan Scheme",
    source: "Central",
    category: "Employment & Skill Development",
    description: "Facilitates bank loans to SC/ST and women entrepreneurs for setting up greenfield enterprises.",
    beneficiaries: "Women, SC, and ST entrepreneurs",
    eligibility: "18+ years; SC/ST or Women; 51% stake in non-individual entities; Greenfield projects only.",
    benefits: "Bank loans between ₹10 lakh and ₹1 crore; composite loan covering 75% of project cost.",
    documents: "Identify Proof, Caste Certificate (if applicable), Business Plan, Bank statements",
    applicationProcess: "Apply at any bank branch or through Stand-Up India portal.",
    officialLink: "https://www.standupmitra.in",
    state: "Pan India",
    keywords: ["loan", "women business", "startup", "sc", "st", "greenfield"],
  },
  {
    name: "Raitha Samparka Kendras (RSK)",
    source: "Karnataka",
    category: "Agriculture & Farmers",
    description: "Integrated service delivery centers for farmers providing inputs, technical guidance, and testing.",
    beneficiaries: "Farmers in Karnataka hobli levels",
    eligibility: "All farmers in Karnataka.",
    benefits: "Technical advice on crops, soil testing, distribution of seeds/fertilizers at subsidy.",
    documents: "Farmer ID (FRUITS), Land Records",
    applicationProcess: "Visit local RSK at Hobli level.",
    officialLink: "https://raitamitra.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["guidance", "seeds", "fertilizer", "soil test", "farmer help"],
  },
  {
    name: "KNNL Neeravari Nigam Irrigation Support",
    source: "Karnataka",
    category: "Agriculture & Farmers",
    description: "Implementation and maintenance of major and medium irrigation projects to ensure farm water supply.",
    beneficiaries: "Farmers in the command areas of the projects",
    eligibility: "Farmers with land in basin area (Krishna, Godavari, etc.).",
    benefits: "Reliable canal water supply for agriculture; protection against drought.",
    documents: "Land Possession certificate",
    applicationProcess: "Handled by Command Area Development Authority (CADA).",
    officialLink: "https://knnlindia.com",
    state: "Karnataka",
    keywords: ["irrigation", "canal", "water", "dam", "farming"],
  },
  {
    name: "Ksheerdhare Milk Incentive",
    source: "Karnataka",
    category: "Agriculture & Farmers",
    description: "Special incentive for dairy farmers to encourage milk production and promote cattle rearing.",
    beneficiaries: "Dairy farmers supplying milk to KMF societies",
    eligibility: "Farmer supplying milk to Karnataka Milk Federation (KMF) cooperative.",
    benefits: "₹5 per liter of milk added to the cooperative price; direct bank transfer to farmers.",
    documents: "Membership Card of Cooperative, Aadhaar, Bank Details",
    applicationProcess: "Automatic benefit via milk supply records at KMF society.",
    officialLink: "https://kmfnandini.coop",
    state: "Karnataka",
    keywords: ["milk", "dairy", "cow", "incentives", "kmf"],
  },
  {
    name: "Raitha Siri Scheme",
    source: "Karnataka",
    category: "Agriculture & Farmers",
    description: "Welfare scheme to support farmers growing minor millets like Ragi, Jowar, and Bajra.",
    beneficiaries: "Farmers cultivating minor millets",
    eligibility: "Karnataka residents; minor millet cultivation on own land.",
    benefits: "Incentive of ₹10,000 per hectare (up to 2 ha).",
    documents: "Aadhaar, FRUITS ID, Land Records",
    applicationProcess: "Register on FRUITS portal and declare crops at RSK.",
    officialLink: "https://raitamitra.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["millets", "ragi", "jowar", "minor crops", "riri"],
  },
  {
    name: "Kittur Rani Chennamma Residential Schools",
    source: "Karnataka",
    category: "Education & Students",
    description: "Provides free residential education of high quality for girls to reduce gender disparity.",
    beneficiaries: "Girls from minority/SC/ST communities",
    eligibility: "Karnataka resident; girl child; income guidelines apply.",
    benefits: "Free education, boarding, uniforms, textbooks and stationary from 6th to 10th std.",
    documents: "Caste Certificate, Income Certificate, Previous school reports",
    applicationProcess: "Apply through KREIS or Directorate of Minorities.",
    officialLink: "https://dom.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["school", "girls", "hostel", "free education", "rani chennamma"],
  },
  {
    name: "Udyogini (Mahila Udyamita) Scheme",
    source: "Karnataka",
    category: "Women & Child Welfare",
    description: "Empowers women to start or expand business ventures through subsidized loans and training.",
    beneficiaries: "Women entrepreneurs aged 18-55",
    eligibility: "Resident of Karnataka; Family income < ₹1.5 lakh (gen) or < ₹2 lakh (SC/ST).",
    benefits: "Loans up to ₹3 lakh; 30% to 50% subsidy on loan amount; collateral-free.",
    documents: "Aadhaar, Caste Certificate, Income Certificate, Project Report, Photo",
    applicationProcess: "Apply via Karnataka State Women's Development Corporation.",
    officialLink: "https://kswdc.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["business loan", "women entrepreneur", "startup", "subsidy", "udyogini"],
  },
  {
    name: "Stree Shakti Loan Scheme",
    source: "Karnataka",
    category: "Women & Child Welfare",
    description: "Incentivizes women's groups (SHGs) to take up income-generating activities with financial support.",
    beneficiaries: "Members of Stree Shakti Self Help Groups",
    eligibility: "Active member of a registered Stree Shakti SHG.",
    benefits: "Interest-free loans of ₹1-2 lakh for the group's internal lending or joint activities.",
    documents: "SHG records, Aadhaar, Bank Linkage details",
    applicationProcess: "Apply through Department of Women & Child Development via the SHG federation.",
    officialLink: "https://dwcd.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["shg", "women group", "loan", "group lending", "stree shakti"],
  },
  {
    name: "Mahila Kisan Sashaktikaran Scheme",
    source: "Karnataka",
    category: "Women & Child Welfare",
    description: "Improves the status of women in agriculture by building their capacity and agrarian skills.",
    beneficiaries: "Women farmers, small & marginal farmers",
    eligibility: "Rural women engaged in agriculture.",
    benefits: "Training in sustainable agriculture, access to credit, and support for group farming.",
    documents: "Aadhaar, Land Records, SHG Membership",
    applicationProcess: "Apply via local NRLM (Sanjeevini) project office.",
    officialLink: "https://sanjeevini.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["women farmer", "training", "agriculture skills", "sashaktikaran"],
  },
  {
    name: "Minority National Overseas Scholarship",
    source: "Karnataka",
    category: "Education & Students",
    description: "Financial grant for minority students to pursue higher studies (Master's/PhD) in foreign universities.",
    beneficiaries: "Students from Muslims, Christians, Jains, Buddhists, Sikhs, Parsis",
    eligibility: "Resident of Karnataka; Marks > 60%; Family income < ₹15 lakh; Admission offer from top 500 univ.",
    benefits: "Full tuition coverage (max ₹20-30 lakh for course duration) and airfare.",
    documents: "Minority Certificate, Passport, Marks cards, Admission Letter",
    applicationProcess: "Apply online at Directorate of Minorities (dom.karnataka.gov.in).",
    officialLink: "https://dom.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["abroad", "minority", "scholarship", "masters", "phd"],
  },
  {
    name: "Free Uniform, Textbook & Stationary",
    source: "Karnataka",
    category: "Education & Students",
    description: "Ensures no child is deprived of education by providing essential learning materials for free.",
    beneficiaries: "Students in Govt and Aided schools (LKG to 12th)",
    eligibility: "Enrolled in Govt/Aided school in Karnataka.",
    benefits: "Free textbooks, 2 pairs of uniforms, notebooks, shoes, and socks.",
    documents: "Proof of school enrollment",
    applicationProcess: "Direct distribution through schools at the start of academic year.",
    officialLink: "https://schooleducation.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["uniform", "books", "shoes", "free school", "stationary"],
  },
  {
    name: "Laptop Bhagya Scheme",
    source: "Karnataka",
    category: "Education & Students",
    description: "Digital empowerment of students by providing free laptops for collegiate education.",
    beneficiaries: "First-year Degree/Diploma/Engineering students",
    eligibility: "Karnataka Govt college students; preference to SC/ST; EWS families.",
    benefits: "Free brand-name laptop for studies.",
    documents: "College Admission card, Aadhaar, Caste/Income Certificate",
    applicationProcess: "Apply through the Principal of the respective Government College.",
    officialLink: "https://dce.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["laptop", "computer", "college student", "digital", "bhagya"],
  },
  {
    name: "Morarji Desai Residential Schools",
    source: "Karnataka",
    category: "Education & Students",
    description: "State-of-the-art residential schools for rural and minority children providing free quality education.",
    beneficiaries: "Rural students from SC/ST/OBC/Minorities",
    eligibility: "Passed 5th standard; resident of the respective taluk/district.",
    benefits: "Free residential education from 6th to 10th (or PUC) with high-quality boarding.",
    documents: "Transfer Certificate, Caste/Income Proof, Entrance Exam result",
    applicationProcess: "Entrance exam managed by Karnataka Residential Educational Institutions Society (KREIS).",
    officialLink: "https://kreis.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["residential school", "hostel", "free coaching", "kreis", "morarji"],
  },
  {
    name: "Arogya Karnataka (Ayushman Bharat)",
    source: "Karnataka",
    category: "Health & Insurance",
    description: "Universal health coverage for all residents of Karnataka for secondary and tertiary care.",
    beneficiaries: "All residents of Karnataka",
    eligibility: "Valid identity proof / Ration card.",
    benefits: "Cashless treatment up to ₹5 lakh/yr for BPL; 30% co-payment for APL families.",
    documents: "Aadhar, Ration Card (Pavitra card)",
    applicationProcess: "Carry Arka ID or Ration card to Govt hospital or SAST empanelled hospital.",
    officialLink: "https://arogya.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["hospital", "surgery", "insurance", "ayushman", "arogya"],
  },
  {
    name: "SAST Cashless Health for Contract Staff",
    source: "Karnataka",
    category: "Health & Insurance",
    description: "Specific health insurance coverage for all contractual and outsourced government staff.",
    beneficiaries: "Contractual and outsourced govt employees and dependents",
    eligibility: "Currently working under Govt of Karnataka on contract.",
    benefits: "Cashless health coverage up to ₹5 lakh per year for specified procedures.",
    documents: "Departmental ID, Aadhaar, Dependent details",
    applicationProcess: "Registration through the respective administrative department with SAST.",
    officialLink: "https://arogya.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["contract employee", "health cover", "cashless", "sast", "staff"],
  },
  {
    name: "Sandhya Suraksha Pension",
    source: "Karnataka",
    category: "Senior Citizens & Pension",
    description: "Social security pension for elderly citizens to help them lead a dignified life.",
    beneficiaries: "Senior citizens aged 65 and above",
    eligibility: "Age > 65; Annual income < ₹20,000; Resident of Karnataka.",
    benefits: "Monthly pension of ₹1,000 to ₹1,200 transferred to bank account.",
    documents: "Age Proof, Income Certificate, Resident Certificate, Bank Passbook",
    applicationProcess: "Apply via Nadakacheri (AJSK) or Seva Sindhu portal.",
    officialLink: "https://nadakacheri.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["old age pension", "senior citizen", "monthly income", "suraksha"],
  },
  {
    name: "Manasadhara Scheme",
    source: "Karnataka",
    category: "Health & Insurance",
    description: "Rehabilitation and daycare centers for individuals with chronic mental illnesses.",
    beneficiaries: "Persons with chronic mental disorders and their caregivers",
    eligibility: "Diagnosis of chronic mental illness; needing rehabilitation.",
    benefits: "Vocational training, expert counseling, psychiatric treatment, and daycare support at dedicated centers.",
    documents: "Medical Certificate from Psychiatrist, Family ID",
    applicationProcess: "Visit designated Manasadhara day-care centers in districts.",
    officialLink: "https://hfw.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["mental health", "rehabilitation", "daycare", "psychiatry", "manasadhara"],
  },
  {
    name: "ELEVATE (Idea2PoC) Startup Grant",
    source: "Karnataka",
    category: "Employment & Skill Development",
    description: "Grant-in-aid support for innovative startups to build prototypes and scale their products.",
    beneficiaries: "Early stage startups in Karnataka",
    eligibility: "Karnataka based; < 10 years old; Innovative/scalable product.",
    benefits: "Grant up to ₹50 lakh; mentoring; coworking space access; networking.",
    documents: "Company Registration, Project Proposal, Pitch deck",
    applicationProcess: "Apply through Startup Karnataka portal when calls are open.",
    officialLink: "https://startup.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["startup grant", "innovation", "elevate", "entrepreneur", "funding"],
  },
  {
    name: "Udyoga Lakshmi Scheme",
    source: "Karnataka",
    category: "Women & Child Welfare",
    description: "Financial assistance and training for women specifically in small scale industries and trade.",
    beneficiaries: "Women starting micro-enterprises",
    eligibility: "Resident of Karnataka; aged 18-50; annual income limits apply.",
    benefits: "Subsidy of up to ₹90,000 or 50% for SC/ST for unit costs up to ₹3 lakh.",
    documents: "Aadhaar, Project Profile, Income/Caste Certificate",
    applicationProcess: "Apply through District Office of Women & Child Development.",
    officialLink: "https://kswdc.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["women business", "micro enterprise", "industrial loan", "udyoga lakshmi"],
  },
  {
    name: "Self Employment for SC/ST (Direct Loan)",
    source: "Karnataka",
    category: "Employment & Skill Development",
    description: "Direct loan scheme for unemployed SC/ST youth to start self-employment ventures.",
    beneficiaries: "Unemployed SC/ST youth",
    eligibility: "Aged 18-50; resident for 15+ years; family income within limits.",
    benefits: "Direct loans at low interest with a substantial subsidy component (up to 50%).",
    documents: "Caste, Income, Residence Certificates, Project Plan",
    applicationProcess: "Apply via Dr. B.R. Ambedkar Development Corporation.",
    officialLink: "https://adcl.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["sc st loan", "self employment", "youth jobs", "ambेडकर"],
  },
  {
    name: "Yuva Nidhi Scheme",
    source: "Karnataka",
    category: "Employment & Skill Development",
    description: "Unemployment allowance for recent graduates and diploma holders to support them while seeking jobs.",
    beneficiaries: "Unemployed Graduates and Diploma holders (2022-23 batches onwards)",
    eligibility: "Unemployed for 180 days after graduation; Karnataka resident.",
    benefits: "₹3,000/month for graduates; ₹1,500/month for diploma holders (max 2 years).",
    documents: "Degree/Diploma Certificate, Aadhaar, Bank Details with seeding",
    applicationProcess: "Apply through Seva Sindhu portal (yuvanidhi.karnataka.gov.in).",
    officialLink: "https://sevasindhu.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["unemployment", "youth", "graduates", "allowance", "yuvanidhi"],
  },
  {
    name: "Basava Vasathi (Ashraya) Yojana",
    source: "Karnataka",
    category: "Housing & Urban",
    description: "Affordable housing for homeless and EWS families in rural and urban areas.",
    beneficiaries: "Homeless, EWS families, SC/ST/OBC",
    eligibility: "Annual income < ₹32,000; homeless resident of Karnataka.",
    benefits: "Financial aid of ₹1.2 lakh to ₹2 lakh for house construction.",
    documents: "Ration Card, Income Certificate, Caste Certificate, Site documents",
    applicationProcess: "Apply through Rajiv Gandhi Housing Corporation (RGHCL).",
    officialLink: "https://ashraya.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["house", "housing", "poor families", "homeless", "ashraya"],
  },
  {
    name: "Dr. Ambedkar Nivasa Yojana",
    source: "Karnataka",
    category: "Housing & Urban",
    description: "Specialized housing assistance for SC/ST families to ensure roof for every underprivileged household.",
    beneficiaries: "SC/ST homeless families",
    eligibility: "Belong to SC/ST; Karnataka resident; homeless.",
    benefits: "Subsidy of ₹1.75 lakh (rural) to ₹2 lakh (urban) plus PMAY convergence.",
    documents: "Caste Certificate, Income Certificate, Aadhaar, Photo",
    applicationProcess: "Apply through local Gram Panchayat or RGHCL portal.",
    officialLink: "https://ashraya.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["sc st house", "housing", "ambेडकर निवासा", "home"],
  },
  {
    name: "Ganga Kalyana Scheme",
    source: "Karnataka",
    category: "Agriculture & Farmers",
    description: "Provides free irrigation facilities by drilling borewells and providing pump sets for small farmers.",
    beneficiaries: "Small and marginal farmers from SC/ST/Minorities",
    eligibility: "Minority/SC/ST community; small farmer (owning 2-5 acres).",
    benefits: "Free borewell drilling, pump set, and electrification worth up to ₹3.5 lakh.",
    documents: "Land records (Pahani/RTC), Caste/Income certificate, Minority certificate",
    applicationProcess: "Apply through various State Corporations (e.g., KMDC, Ambedkar Corp).",
    officialLink: "https://kmdc.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["borewell", "pump", "irrigation", "water for farm", "ganga kalyana"],
  },
  {
    name: "Jaladhare (Sustainable Rural Water Supply)",
    source: "Karnataka",
    category: "Housing & Urban",
    description: "Aims to provide safe and sustainable pipe drinking water connection to every rural household.",
    beneficiaries: "Rural households in Karnataka",
    eligibility: "All rural residents.",
    benefits: "Functional Household Tap Connection (FHTC) with 55 LPCD safe drinking water.",
    documents: "None required for public supply",
    applicationProcess: "Implementation via Gram Panchayat and RDPR department.",
    officialLink: "https://rdpr.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["drinking water", "tap", "rural water", "jaladhare", "pipeline"],
  },
  {
    name: "Jalamrutha",
    source: "Karnataka",
    category: "Housing & Urban",
    description: "A community-driven water conservation and rejuvenation of water bodies scheme.",
    beneficiaries: "Farmers and local communities",
    eligibility: "Focus on drought-prone areas; whole community participation.",
    benefits: "Protection and rejuvenation of traditional water bodies; increased ground water levels; water literacy.",
    documents: "None required",
    applicationProcess: "Community participation through local PRIs.",
    officialLink: "https://rdpr.karnataka.gov.in",
    state: "Karnataka",
    keywords: ["water conservation", "rejuvenation", "river", "drought", "jalamrutha"],
  },
];

// --- INTENT LOGIC & TRANSLATIONS ---
const TRANSLATIONS: Record<string, any> = {
  en: {
    greeting: "Namaste! I am Bharat Scheme Bot. I can help you find Central and Karnataka State government schemes. How can I assist you today?",
    unknown: "I'm not sure which schemes you are looking for. You can ask me about Central or Karnataka schemes for Farmers, Students, Women, etc.",
    found: (count: number, desc: string) => `I found ${count} ${desc} schemes. Here are the top results:`,
    notFound: (desc: string) => `I couldn't find any specific ${desc} schemes. Try asking about a different category or state.`
  },
  kn: {
    greeting: "ನಮಸ್ಕಾರ! ನಾನು ಭಾರತ್ ಯೋಜನೆ ಬಾಟ್. ಕೇಂದ್ರ ಮತ್ತು ಕರ್ನಾಟಕ ರಾಜ್ಯ ಸರ್ಕಾರದ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಲು ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
    unknown: "ನೀವು ಯಾವ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕುತ್ತಿದ್ದೀರಿ ಎಂದು ನನಗೆ ಖಚಿತವಿಲ್ಲ. ರೈತರು, ವಿದ್ಯಾರ್ಥಿಗಳು, ಮಹಿಳೆಯರು ಇತ್ಯಾದಿಗಳಿಗೆ ಸಂಬಂಧಿಸಿದ ಕೇಂದ್ರ ಅಥವಾ ಕರ್ನಾಟಕ ಯೋಜನೆಗಳ ಬಗ್ಗೆ ನೀವು ನನ್ನನ್ನು ಕೇಳಬಹುದು.",
    found: (count: number, desc: string) => `ನಾನು ${count} ${desc} ಯೋಜನೆಗಳನ್ನು ಕಂಡುಕೊಂಡಿದ್ದೇನೆ. ಪ್ರಮುಖ ಫಲಿತಾಂಶಗಳು ಇಲ್ಲಿವೆ:`,
    notFound: (desc: string) => `ಯಾವುದೇ ನಿರ್ದಿಷ್ಟ ${desc} ಯೋಜನೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಬೇರೆ ವರ್ಗ ಅಥವಾ ರಾಜ್ಯದ ಬಗ್ಗೆ ಕೇಳಿ.`
  },
  hi: {
    greeting: "नमस्ते! मैं भारत योजना बॉट हूँ। मैं आपको केंद्र और कर्नाटक राज्य सरकार की योजनाओं को खोजने में मदद कर सकता हूँ। मैं आपकी कैसे सहायता कर सकता हूँ?",
    unknown: "मुझे यकीन नहीं है कि आप किन योजनाओं की तलाश कर रहे हैं। आप मुझसे किसानों, छात्रों, महिलाओं आदि के लिए केंद्र या कर्नाटक योजनाओं के बारे में पूछ सकते हैं।",
    found: (count: number, desc: string) => `मुझे ${count} ${desc} योजनाएं मिली हैं। यहाँ शीर्ष परिणाम दिए गए हैं:`,
    notFound: (desc: string) => `कोई विशिष्ट ${desc} योजना नहीं मिली। कृपया किसी अन्य श्रेणी या राज्य के बारे में पूछें।`
  }
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- HEALTH & READINESS ENDPOINTS ---
  app.get("/health", (req, res) => {
    res.json({ status: "ok", version: "1.0.0" });
  });

  app.get("/ready", async (req, res) => {
    try {
      // Fast database ping without complex queries
      await db.run(sql`SELECT 1`);
      res.json({ status: "ok", database: "connected", ai: !!process.env.GEMINI_API_KEY });
    } catch (error) {
      logger.error("Readiness check failed:", { error });
      res.status(503).json({ status: "error", database: "disconnected" });
    }
  });

  await storage.seedSchemes(SEED_SCHEMES);

  app.get(api.schemes.list.path, async (req, res) => {
    try {
      const input = api.schemes.list.input?.parse(req.query) || {};
      let schemes = await storage.getAllSchemes(input.category, input.state, input.search, input.source);

      if (input.deviceId) {
        const user = await storage.getUserByDeviceId(input.deviceId);
        if (user) {
          const profile = await storage.getUserProfile(user.id);
          if (profile) {
            const { rankSchemes } = await import('./engine');
            schemes = rankSchemes(schemes, profile, input.category, input.state) as any;
          }
        }
      }

      res.setHeader("Cache-Control", "public, max-age=300");
      res.json(schemes);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch schemes" });
    }
  });

  app.post(api.profile.update.path, async (req, res) => {
    try {
      const { deviceId, profile } = api.profile.update.input.parse(req.body);
      
      let user = await storage.getUserByDeviceId(deviceId);
      if (!user) {
        user = await storage.createUser({ deviceId, role: "citizen" });
      }

      const updatedProfile = await storage.upsertUserProfile(user.id, profile);
      res.json(updatedProfile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Saved Schemes Routes
  app.get(api.savedSchemes.list.path, async (req, res) => {
    try {
      const { deviceId } = req.query;
      if (!deviceId || typeof deviceId !== 'string') {
        return res.status(400).json({ message: "deviceId is required" });
      }
      const user = await storage.getUserByDeviceId(deviceId);
      if (!user) return res.json([]);
      const saved = await storage.getSavedSchemes(user.id);
      res.json(saved);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.savedSchemes.create.path, async (req, res) => {
    try {
      const { deviceId, schemeId } = api.savedSchemes.create.input.parse(req.body);
      let user = await storage.getUserByDeviceId(deviceId);
      if (!user) {
        user = await storage.createUser({ deviceId, role: "citizen" });
      }
      const saved = await storage.saveScheme({ userId: user.id, schemeId });
      res.json(saved);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.savedSchemes.remove.path, async (req, res) => {
    try {
      const { deviceId } = req.query;
      if (!deviceId || typeof deviceId !== 'string') {
        return res.status(400).json({ message: "deviceId is required" });
      }
      const user = await storage.getUserByDeviceId(deviceId);
      if (!user) return res.status(404).json({ message: "User not found" });
      await storage.removeSavedScheme(user.id, Number(req.params.schemeId));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Applications Routes
  app.get(api.applications.list.path, async (req, res) => {
    try {
      const { deviceId } = req.query;
      if (!deviceId || typeof deviceId !== 'string') {
        return res.status(400).json({ message: "deviceId is required" });
      }
      const user = await storage.getUserByDeviceId(deviceId);
      if (!user) return res.json([]);
      const apps = await storage.getApplications(user.id);
      res.json(apps);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.applications.create.path, async (req, res) => {
    try {
      const { deviceId, schemeId } = api.applications.create.input.parse(req.body);
      let user = await storage.getUserByDeviceId(deviceId);
      if (!user) {
        user = await storage.createUser({ deviceId, role: "citizen" });
      }
      const app = await storage.createApplication({ 
        userId: user.id, 
        schemeId,
        status: "Interested" 
      });
      res.json(app);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.applications.updateStatus.path, async (req, res) => {
    try {
      const { deviceId, status } = api.applications.updateStatus.input.parse(req.body);
      const user = await storage.getUserByDeviceId(deviceId);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      const app = await storage.updateApplicationStatus(Number(req.params.id), status);
      res.json(app);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.schemes.get.path, async (req, res) => {
    const scheme = await storage.getSchemeById(Number(req.params.id));
    if (!scheme) return res.status(404).json({ message: "Scheme not found" });
    res.json(scheme);
  });

  app.post(api.chat.send.path, async (req, res) => {
    try {
      const { message, language = "en", deviceId } = api.chat.send.input.parse(req.body);
      
      // 1. Use Gemini to extract intent
      const intentData = await extractIntentAndParams(message);
      const { intent, category, state, source } = intentData;

      // Select translation set for fallback
      const t = TRANSLATIONS[language] || TRANSLATIONS["en"];

      let responseText = "";
      let schemesResult: any[] | undefined = undefined;
      let suggestedQuestions: string[] = [];

      if (intent === "greeting") {
        const aiResponse = await generateResponse(message, language, []);
        responseText = aiResponse.response || t.greeting;
        suggestedQuestions = aiResponse.suggestedQuestions.length > 0 ? aiResponse.suggestedQuestions : ["Karnataka student schemes", "Central farmer schemes", "Women welfare schemes"];
      } else if (intent === "scheme_query") {
        // 2. Query Database with AI-extracted params
        schemesResult = await storage.getAllSchemes(category || undefined, state || undefined, undefined, source || undefined);
        
        // 3. Rank with profile context
        if (deviceId) {
          const user = await storage.getUserByDeviceId(deviceId);
          if (user) {
            const profile = await storage.getUserProfile(user.id);
            if (profile) {
              const { rankSchemes } = await import('./engine');
              schemesResult = rankSchemes(schemesResult, profile, category || undefined, state || undefined) as any;
            }
          }
        }
        
        // 4. Synthesize Human-Readable Response using Gemini
        const count = schemesResult?.length || 0;
        const aiResponse = await generateResponse(message, language, schemesResult || []);

        if (aiResponse.response) {
          responseText = aiResponse.response;
          suggestedQuestions = aiResponse.suggestedQuestions;
        } else {
          // Fallback logic
          let desc = category || "government";
          if (state) desc = `${state} ${desc}`;
          if (source) desc = `${source} ${desc}`;

          if (count > 0) {
            responseText = t.found(count, desc);
            if (count > 3) {
              suggestedQuestions = ["Show all matched schemes"];
            }
          } else {
            responseText = t.notFound(desc);
          }
        }
      } else {
        const aiResponse = await generateResponse(message, language, []);
        responseText = aiResponse.response || t.unknown;
        suggestedQuestions = aiResponse.suggestedQuestions.length > 0 ? aiResponse.suggestedQuestions : ["Karnataka schemes", "PM Kisan scheme", "Scholarships"];
      }

      await storage.logChat({
        userMessage: message,
        botResponse: responseText,
        intent: intent,
        language: language
      });

      res.json({
        response: responseText,
        intent: intent,
        schemes: schemesResult?.slice(0, 3), // Show top 3 in chat
        suggestedQuestions
      });

    } catch (err) {
      logger.error("Chat Endpoint Error:", { error: err });
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // --- ADMIN METRICS ---
  app.get("/api/admin/metrics", async (req, res) => {
    try {
      const metrics = await storage.getMetrics();
      res.json(metrics);
    } catch (err) {
      logger.error("Failed to fetch metrics", { error: err });
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  return httpServer;
}
