/**
 * Append TotalEnergies-insider-informed questions to technical-questions.json
 * Covers gaps: P-T tracking, pumps, compressors, engineering fundamentals
 * Run: node scripts/append_total_insider_questions.cjs
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'data', 'technical-questions.json');
const existing = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const startId = existing.length + 1;

const NEW_QUESTIONS = [

  // ══════════════════════════════════════════════════════════════
  //  P-T TRACKING ON VLE CURVE  (5 questions)
  // ══════════════════════════════════════════════════════════════
  {
    section: "vle",
    question: "A reservoir fluid at 250°F and 4000 psia lies to the right of the critical point but inside the phase envelope. What region is this?",
    options: [
      "Single-phase liquid",
      "Two-phase (retrograde condensation) region",
      "Single-phase gas",
      "Supercritical region"
    ],
    correctAnswer: 1,
    explanation: "Inside the phase envelope but to the right of the critical point is the retrograde (dew-point) side. At this P-T, gas condensate drops out — this is the two-phase retrograde condensation region. Left of the critical point inside the envelope would be the bubble-point (oil) side."
  },
  {
    section: "vle",
    question: "Starting at point A in the single-phase gas region, you decrease temperature at constant pressure until you cross the dew-point curve. What happens first?",
    options: [
      "All gas condenses to liquid at once",
      "The first tiny droplet of liquid appears",
      "The fluid reaches the bubble point",
      "The fluid enters the supercritical zone"
    ],
    correctAnswer: 1,
    explanation: "Crossing the dew-point curve from the gas side means the first infinitesimal drop of liquid condenses. This is the definition of dew point — the condition where the first liquid appears in an otherwise all-gas system. You would need to keep cooling further to reach the bubble point where only a tiny amount of gas remains."
  },
  {
    section: "vle",
    question: "For a dry gas reservoir, as pressure depletes isothermally during production, the P-T path:",
    options: [
      "Crosses both dew-point and bubble-point curves",
      "Enters the two-phase region causing liquid dropout in the reservoir",
      "Never enters the phase envelope — remains single-phase gas throughout",
      "Crosses the bubble-point curve only"
    ],
    correctAnswer: 2,
    explanation: "A dry gas has a phase envelope that lies entirely to the left of the reservoir temperature. As reservoir pressure drops (isothermal depletion), the P-T path moves straight down and never intersects the phase envelope. No liquid drops out in the reservoir or at surface conditions. This is what distinguishes dry gas from wet gas (which stays single-phase in reservoir but enters two-phase at surface conditions)."
  },
  {
    section: "vle",
    question: "A wet gas reservoir depletes isothermally. Where does liquid first appear?",
    options: [
      "Inside the reservoir as pressure drops below cricondenbar",
      "At the surface separator when the fluid cools below the dew-point curve",
      "In the wellbore due to hydrostatic head",
      "Liquid never appears for wet gas"
    ],
    correctAnswer: 1,
    explanation: "For wet gas, the reservoir temperature is higher than the cricondentherm — so isothermal depletion in the reservoir never enters the phase envelope. However, when the fluid travels to surface (temperature AND pressure drop), the P-T path crosses the dew-point curve at separator conditions, producing condensate at the surface. This distinguishes wet gas from dry gas (no surface liquids) and gas condensate (retrograde liquid in reservoir)."
  },
  {
    section: "vle",
    question: "On a phase envelope, if you increase pressure at constant temperature starting from the two-phase region on the right side of the critical point, you will:",
    options: [
      "Cross the dew-point curve and enter single-phase gas",
      "Cross the bubble-point curve and enter single-phase liquid",
      "Remain in the two-phase region indefinitely",
      "Cross the dew-point curve and enter single-phase liquid — retrograde behavior"
    ],
    correctAnswer: 0,
    explanation: "On the right (dew-point) side of the critical point, the upper boundary is the dew-point curve. Increasing pressure moves you upward out of the two-phase region through the dew-point curve into single-phase gas. This is counter-intuitive (higher pressure → gas, not liquid) and is classic retrograde behavior — at these conditions, increasing pressure actually re-vaporizes the condensed liquid."
  },

  // ══════════════════════════════════════════════════════════════
  //  PUMPS  (7 questions)
  // ══════════════════════════════════════════════════════════════
  {
    section: "equipment",
    question: "What is the primary difference between a centrifugal pump and a positive displacement pump?",
    options: [
      "Centrifugal pumps use pistons; PD pumps use impellers",
      "Centrifugal pumps add energy via velocity (impeller); PD pumps trap and push a fixed volume per stroke/revolution",
      "PD pumps are only for gas; centrifugal pumps are only for liquids",
      "There is no practical difference"
    ],
    correctAnswer: 1,
    explanation: "Centrifugal pumps convert kinetic energy (impeller velocity) to pressure via a volute/diffuser. Positive displacement (PD) pumps (piston, diaphragm, gear, screw) physically trap a fixed fluid volume and push it forward each cycle. Centrifugals give variable flow at fixed speed; PD pumps give near-constant flow regardless of discharge pressure."
  },
  {
    section: "equipment",
    question: "When would you install a pump in an upstream oil & gas process?",
    options: [
      "Only to move gas through pipelines",
      "When liquid needs to be moved to a higher pressure or elevation that gravity or reservoir pressure cannot achieve",
      "Only at the wellhead to boost reservoir pressure",
      "Pumps are never used in upstream operations"
    ],
    correctAnswer: 1,
    explanation: "Pumps are installed whenever liquid must be transferred against pressure drop (friction, elevation, or process requirements) that natural driving forces (reservoir pressure, gravity) cannot overcome — e.g., crude oil export pumps, produced water injection pumps, chemical injection pumps, and artificial lift (ESPs downhole). Compressors, not pumps, handle gas."
  },
  {
    section: "equipment",
    question: "A pump's performance curve shows head (y-axis) vs. flow rate (x-axis). For a centrifugal pump, as flow increases:",
    options: [
      "Head increases proportionally",
      "Head remains constant at all flow rates",
      "Head decreases — there is a trade-off between flow and head",
      "Head first doubles then drops to zero"
    ],
    correctAnswer: 2,
    explanation: "A centrifugal pump curve slopes downward: at zero flow (shut-off), head is maximum; as flow increases, head decreases because more energy is consumed overcoming internal friction and turbulence. The intersection of the pump curve with the system resistance curve determines the operating point. This is a fundamental concept in pump selection and operation."
  },
  {
    section: "equipment",
    question: "NPSH stands for Net Positive Suction Head. If available NPSH (NPSHa) drops below required NPSH (NPSHr), what occurs?",
    options: [
      "The pump efficiency improves",
      "Cavitation — vapor bubbles form and implode, damaging the impeller",
      "The pump speed doubles automatically",
      "The discharge pressure increases"
    ],
    correctAnswer: 1,
    explanation: "When NPSHa < NPSHr, the suction pressure drops below the fluid's vapor pressure, causing local boiling (vapor bubbles). These bubbles collapse violently when they reach higher-pressure zones in the impeller — this is cavitation. It causes noise, vibration, pitting of impeller surfaces, and reduced pump performance. Always ensure NPSHa exceeds NPSHr by a safety margin."
  },
  {
    section: "equipment",
    question: "For a booster pump installed on a long crude oil export pipeline, the primary purpose is to:",
    options: [
      "Cool the crude oil",
      "Overcome friction losses and maintain flow over the pipeline distance",
      "Separate gas from liquid",
      "Measure flow rate"
    ],
    correctAnswer: 1,
    explanation: "Long pipelines suffer significant friction (pressure) losses. A booster pump at an intermediate station adds energy (pressure) to the fluid to compensate for these losses and maintain the required flow rate. Without booster pumps, a single pump at the origin would need impractically high discharge pressure. The pump overcomes the Darcy-Weisbach friction head loss across pipeline segments."
  },
  {
    section: "equipment",
    question: "In an offshore production facility, which pump type is most commonly used downhole in an Electric Submersible Pump (ESP) system?",
    options: [
      "Reciprocating piston pump",
      "Multi-stage centrifugal pump",
      "Gear pump",
      "Diaphragm pump"
    ],
    correctAnswer: 1,
    explanation: "ESP systems use a multi-stage centrifugal pump driven by a downhole electric motor. Multiple impeller stages in series build up sufficient head to lift fluid from the reservoir depth to surface. ESPs are preferred for high-volume wells (hundreds to thousands of bbl/day) and are the most common form of artificial lift in offshore operations."
  },
  {
    section: "equipment",
    question: "A sucker rod pump (beam pump) is classified as which type of pump?",
    options: [
      "Centrifugal pump",
      "Positive displacement pump",
      "Axial flow pump",
      "Jet pump"
    ],
    correctAnswer: 1,
    explanation: "A sucker rod (beam) pump uses a plunger moving inside a barrel with check valves — on each upstroke it lifts a fixed volume of fluid. This is classic positive displacement action. The 'nodding donkey' beam unit at surface drives the rod string up and down. It is most common in onshore low-rate wells. ESPs (centrifugal) dominate offshore, while rod pumps dominate onshore."
  },

  // ══════════════════════════════════════════════════════════════
  //  COMPRESSORS  (5 questions)
  // ══════════════════════════════════════════════════════════════
  {
    section: "equipment",
    question: "Why is multi-stage compression with intercooling used instead of a single compression stage for high compression ratios?",
    options: [
      "It makes the compressor smaller in size",
      "Single-stage compression to high ratios causes excessive outlet temperature, reduces efficiency, and risks mechanical failure",
      "Intercooling increases the gas temperature between stages",
      "Multi-stage compression is cheaper to build but less efficient"
    ],
    correctAnswer: 1,
    explanation: "Compressing gas raises its temperature (adiabatic heating). A single stage compressing to a very high ratio would produce extremely high discharge temperatures — risking lubricant breakdown, seal damage, and high energy waste. Multi-stage compression with intercooling (cooling the gas between stages) keeps temperatures manageable, improves thermodynamic efficiency (approaches isothermal compression), and reduces compressor power requirements."
  },
  {
    section: "equipment",
    question: "What is compressor surge and which type of compressor is susceptible to it?",
    options: [
      "Overspeed in a reciprocating compressor",
      "Flow reversal in a centrifugal compressor when flow drops below minimum — causes violent vibration",
      "Excessive lubrication in a screw compressor",
      "Normal operating behavior in all compressor types"
    ],
    correctAnswer: 1,
    explanation: "Surge occurs in centrifugal (dynamic) compressors when the flow rate falls below a minimum threshold. The compressor cannot maintain the pressure ratio, causing momentary flow reversal — gas rushes backward through the impeller. This creates severe vibration, noise, and can destroy the compressor. Anti-surge control systems (recycle valves) maintain minimum flow to prevent this. Reciprocating compressors (positive displacement) do not experience surge."
  },
  {
    section: "equipment",
    question: "The compression ratio of a compressor is defined as:",
    options: [
      "Suction pressure divided by discharge pressure",
      "Discharge pressure (absolute) divided by suction pressure (absolute)",
      "Discharge temperature minus suction temperature",
      "Flow rate divided by RPM"
    ],
    correctAnswer: 1,
    explanation: "Compression ratio r = P₂/P₁, where P₂ is absolute discharge pressure and P₁ is absolute suction pressure. A ratio of 3:1 means the gas exits at 3 times its inlet absolute pressure. Typical per-stage ratios are 2:1 to 4:1. Higher ratios require more stages with intercooling. Always use absolute pressures (not gauge) to calculate compression ratio."
  },
  {
    section: "equipment",
    question: "In upstream gas processing, compressors are primarily installed to:",
    options: [
      "Separate oil from water",
      "Boost gas pressure for pipeline transport, gas lift injection, or reinjection into the reservoir",
      "Heat the gas for hydrate prevention",
      "Measure gas flow rate"
    ],
    correctAnswer: 1,
    explanation: "Compressors raise gas pressure for: (1) export pipeline specifications (must meet minimum pipeline pressure), (2) gas lift — high-pressure gas injected into the well tubing-casing annulus to lighten the fluid column and aid production, (3) gas reinjection for pressure maintenance or enhanced recovery, (4) flare gas recovery (capturing low-pressure gas that would otherwise be flared). They are critical equipment in any gas-handling facility."
  },
  {
    section: "equipment",
    question: "A reciprocating compressor is generally preferred over centrifugal when:",
    options: [
      "You need very high flow rates at low compression ratios",
      "You need high compression ratios at relatively low to moderate flow rates",
      "The gas contains no moisture",
      "The compressor must run at constant speed"
    ],
    correctAnswer: 1,
    explanation: "Reciprocating compressors excel at high compression ratios and low-to-moderate flow rates — they can achieve single-stage ratios up to ~6:1. Centrifugal compressors are preferred for high flow rates at moderate ratios (pipeline boosting, large gas plants). Selection rule of thumb: high-ratio/low-flow → reciprocating; low-ratio/high-flow → centrifugal. This shows up frequently in process design decisions."
  },

  // ══════════════════════════════════════════════════════════════
  //  ENGINEERING FUNDAMENTALS  (15 questions)
  // ══════════════════════════════════════════════════════════════
  {
    section: "fundamentals",
    question: "Bernoulli's equation (for steady, incompressible, inviscid flow) relates which three quantities along a streamline?",
    options: [
      "Temperature, entropy, and enthalpy",
      "Static pressure, velocity (kinetic energy), and elevation (potential energy)",
      "Viscosity, density, and thermal conductivity",
      "Mass flow rate, pipe diameter, and roughness"
    ],
    correctAnswer: 1,
    explanation: "Bernoulli's equation: P + ½ρv² + ρgh = constant along a streamline. It states that as fluid speeds up (higher v), its static pressure P drops, and vice versa. This is the basis for understanding venturi meters, pitot tubes, and why narrowing a pipe increases velocity but decreases pressure. Key assumptions: steady flow, incompressible fluid, no friction (inviscid) along the streamline."
  },
  {
    section: "fundamentals",
    question: "The Reynolds number (Re) determines:",
    options: [
      "The temperature of the fluid",
      "Whether flow is laminar (Re < ~2100) or turbulent (Re > ~4000)",
      "The chemical composition of the fluid",
      "The color of the fluid"
    ],
    correctAnswer: 1,
    explanation: "Re = ρvD/μ (density × velocity × diameter / viscosity). It's a dimensionless ratio of inertial forces to viscous forces. For pipe flow: Re < ~2100 → laminar (smooth, orderly layers), Re > ~4000 → turbulent (chaotic mixing), 2100–4000 → transitional. Turbulent flow has higher friction losses but better mixing and heat transfer. This is foundational for calculating pressure drops and sizing pipes."
  },
  {
    section: "fundamentals",
    question: "The ideal gas law PV = nRT applies best to:",
    options: [
      "Liquids at high pressure",
      "Gases at low pressure and high temperature (far from condensation)",
      "Solids at any condition",
      "Gases at extremely high pressure near the critical point"
    ],
    correctAnswer: 1,
    explanation: "PV = nRT assumes gas molecules don't interact and have negligible volume — this holds well at low pressures and high temperatures where molecules are far apart. Near the critical point or at high pressures, real gas effects (intermolecular forces, molecular volume) become significant, requiring corrections like the compressibility factor Z: PV = ZnRT. In oil & gas, Z-factor corrections are always applied."
  },
  {
    section: "fundamentals",
    question: "The First Law of Thermodynamics states:",
    options: [
      "Energy cannot be created or destroyed, only converted from one form to another",
      "Entropy of an isolated system always increases",
      "Heat flows from cold to hot spontaneously",
      "All gases behave ideally"
    ],
    correctAnswer: 0,
    explanation: "The First Law is conservation of energy: ΔU = Q − W (change in internal energy = heat added − work done by system). In oil & gas, it underpins energy balances around heat exchangers, separators, compressors, and turbines. For a compressor: work input increases gas enthalpy (temperature rises). For a valve (throttling): enthalpy stays constant but pressure drops (Joule-Thomson effect)."
  },
  {
    section: "fundamentals",
    question: "The Second Law of Thermodynamics implies that:",
    options: [
      "A heat engine can convert 100% of heat into work",
      "Heat spontaneously flows from hot to cold, never the reverse without external work",
      "Entropy of the universe can decrease",
      "Perpetual motion machines are practical"
    ],
    correctAnswer: 1,
    explanation: "The Second Law states that natural (spontaneous) processes increase the total entropy of an isolated system. Practically: heat flows from hot to cold naturally; reversing this requires work input (refrigeration/heat pump). No engine can be 100% efficient. This governs why we need compressor power to move gas against a pressure gradient, and why real processes always have irreversibilities (friction, mixing)."
  },
  {
    section: "fundamentals",
    question: "The Darcy-Weisbach equation calculates:",
    options: [
      "The chemical reaction rate in a pipe",
      "Pressure drop (head loss) due to friction in a pipe",
      "The speed of sound in a fluid",
      "The boiling point of a mixture"
    ],
    correctAnswer: 1,
    explanation: "hf = f·(L/D)·(v²/2g), where f = Darcy friction factor, L = pipe length, D = pipe diameter, v = flow velocity, g = gravitational acceleration. This gives the head loss (pressure loss) due to pipe wall friction. The friction factor f depends on Reynolds number and pipe roughness (read from the Moody chart). This is the basis for pipeline sizing — larger diameter = lower velocity = less friction loss."
  },
  {
    section: "fundamentals",
    question: "The three modes of heat transfer are:",
    options: [
      "Compression, expansion, and throttling",
      "Conduction, convection, and radiation",
      "Distillation, absorption, and extraction",
      "Laminar, transitional, and turbulent"
    ],
    correctAnswer: 1,
    explanation: "Conduction: heat transfer through a solid or stationary fluid by molecular vibration (Fourier's law, Q = kA·dT/dx). Convection: heat transfer between a surface and a moving fluid (Newton's law of cooling, Q = hA·ΔT). Radiation: heat transfer by electromagnetic waves — no medium needed (Stefan-Boltzmann law). In process engineering, shell-and-tube heat exchangers primarily use convection; furnaces use radiation; pipe insulation resists conduction."
  },
  {
    section: "fundamentals",
    question: "A steady-state mass balance for a simple process unit (one inlet, one outlet, no accumulation) states:",
    options: [
      "Mass in > Mass out always",
      "Mass in = Mass out",
      "Mass out = 2 × Mass in",
      "Mass balance only applies to gas systems"
    ],
    correctAnswer: 1,
    explanation: "At steady state with no accumulation and no chemical reaction changing species: mass in = mass out (ṁ_in = ṁ_out). For a separator: mass in (mixed feed) = mass of oil out + mass of water out + mass of gas out. This is the starting point for all process design calculations. If there is reaction, you track individual species balances, but total mass is still conserved."
  },
  {
    section: "fundamentals",
    question: "A pipe narrows from 8 inches to 4 inches diameter. If the fluid is incompressible, by the continuity equation, the velocity in the 4-inch section is:",
    options: [
      "Half the velocity in the 8-inch section",
      "The same as the 8-inch section",
      "Four times the velocity in the 8-inch section",
      "Double the velocity"
    ],
    correctAnswer: 2,
    explanation: "Continuity equation: A₁v₁ = A₂v₂. Area is proportional to diameter squared: A = π(D/2)². If D halves (8→4), area becomes (4/8)² = 1/4 of original. So v₂ = A₁/A₂ × v₁ = 4 × v₁. The fluid speeds up 4× through the restriction. Combined with Bernoulli's equation, this also means the static pressure drops in the narrower section — the principle behind venturi meters."
  },
  {
    section: "fundamentals",
    question: "When a high-pressure gas flows through a valve (throttling process) with no heat exchange, which property remains constant?",
    options: [
      "Temperature",
      "Pressure",
      "Enthalpy",
      "Entropy"
    ],
    correctAnswer: 2,
    explanation: "Throttling (flow through a restriction like a valve or orifice) is an isenthalpic process — enthalpy in = enthalpy out (h₁ = h₂). Pressure drops significantly, but no work is done and no heat is exchanged. For ideal gases, temperature stays constant. For real gases (especially near saturation), temperature usually drops — this is the Joule-Thomson effect, which is used in refrigeration and can cause hydrates in gas pipelines."
  },
  {
    section: "fundamentals",
    question: "The hydraulic power of a pump is calculated as:",
    options: [
      "P = ρgQH (density × gravity × volumetric flow × head)",
      "P = mv (mass × velocity)",
      "P = IT (current × time)",
      "P = F/A (force / area)"
    ],
    correctAnswer: 0,
    explanation: "Hydraulic power P_hyd = ρgQH, where ρ = fluid density, g = 9.81 m/s², Q = volumetric flow rate, and H = total dynamic head (meters). This gives power in watts. Actual shaft power is higher: P_shaft = P_hyd / η, where η is pump efficiency (typically 60–85%). This formula is essential for pump selection and motor sizing in any process facility."
  },
  {
    section: "fundamentals",
    question: "1 bar is approximately equal to:",
    options: [
      "14.5 psi",
      "100 psi",
      "1 psi",
      "50 psi"
    ],
    correctAnswer: 0,
    explanation: "1 bar ≈ 14.504 psi ≈ 100 kPa ≈ 0.987 atm. Conversely, 1 atm = 14.696 psi = 101.325 kPa. Standard oilfield pressure is often reported in psig (gauge) while thermodynamic calculations require psia (absolute = gauge + atmospheric). Knowing these conversions quickly is essential in process engineering — especially when reading equipment datasheets that may use different unit systems."
  },
  {
    section: "fundamentals",
    question: "In a shell-and-tube heat exchanger, the 'LMTD' (Log Mean Temperature Difference) is used to:",
    options: [
      "Measure the flow rate through the exchanger",
      "Calculate the mean driving force for heat transfer between the hot and cold fluids",
      "Determine the chemical composition of the fluids",
      "Measure the tube wall thickness"
    ],
    correctAnswer: 1,
    explanation: "LMTD = (ΔT₁ − ΔT₂) / ln(ΔT₁/ΔT₂), where ΔT₁ and ΔT₂ are the temperature differences at each end of the exchanger. The heat duty Q = U × A × LMTD (overall heat transfer coefficient × area × LMTD). LMTD accounts for the fact that the temperature difference between hot and cold streams varies along the exchanger length. It's the standard method for exchanger sizing."
  },
  {
    section: "fundamentals",
    question: "What does the compressibility factor Z in the equation PV = ZnRT account for?",
    options: [
      "The pipe roughness factor",
      "Deviation of real gas behavior from ideal gas behavior",
      "The pump efficiency",
      "The heat transfer coefficient"
    ],
    correctAnswer: 1,
    explanation: "Z (compressibility factor) corrects PV = nRT for real gas effects: intermolecular attractions and finite molecular volume. Z = 1 for an ideal gas. At high pressures or near the critical point, Z deviates significantly from 1. In petroleum engineering, Z-factor is crucial for gas volume calculations, reserve estimation (gas-initially-in-place = GIIP formula uses Bg which depends on Z), and compressor design."
  },
  {
    section: "fundamentals",
    question: "Poiseuille's law describes laminar flow pressure drop in a pipe. If pipe diameter is doubled (all else equal), the flow rate:",
    options: [
      "Doubles",
      "Increases by 4×",
      "Increases by 16×",
      "Stays the same"
    ],
    correctAnswer: 2,
    explanation: "Poiseuille's law for laminar flow: Q = (πD⁴ΔP)/(128μL). Flow rate is proportional to D⁴ — doubling the diameter increases flow by 2⁴ = 16 times! This dramatic sensitivity to diameter is why even small pipe sizing changes significantly affect pressure drop. For turbulent flow (Darcy-Weisbach), the relationship is closer to D⁵, still very sensitive. This is a classic interview question for entry-level engineers."
  }
];

// Assign IDs
const questions = NEW_QUESTIONS.map((q, i) => ({ id: startId + i, ...q }));
const merged = [...existing, ...questions];

fs.writeFileSync(FILE, JSON.stringify(merged, null, 4), 'utf8');
console.log(`Added ${questions.length} questions (IDs ${startId}–${startId + questions.length - 1})`);
console.log(`Total questions now: ${merged.length}`);
console.log('\nBreakdown of new questions:');
console.log('  P-T tracking on VLE: 5');
console.log('  Pumps: 7');
console.log('  Compressors: 5');
console.log('  Engineering fundamentals: 15');
