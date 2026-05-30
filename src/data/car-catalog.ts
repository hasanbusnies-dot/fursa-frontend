// AUTO-GENERATED car make/model catalog. CARS ONLY.
// Merged from: https://raw.githubusercontent.com/matthlavacka/car-list/master/car-list.json
// + existing curated brands (CAR_BRANDS in FilterSidebar.tsx, VEHICLE_MAKES in wizard/schema.ts).
// Brands deduped by normalized key (lowercase, accent-stripped, separators removed),
// existing curated spelling preferred. Models deduped case-insensitively.
// Data-quality cleanup applied: BMW "Rad N" -> "Series N"; removed stray "Plymouth" from
// Chrysler; model labels de-accented (Coupé -> Coupe, Mégane -> Megane, etc.).
// The "أخرى" (Other) sentinel is intentionally NOT included here — it is a UI-only concern.

export interface CarCatalogEntry {
  brand: string;
  models: string[];
}

export const CAR_CATALOG: CarCatalogEntry[] = [
  { brand: "Alfa Romeo", models: ["145", "146", "147", "155", "156", "156 Sportwagon", "159", "159 Sportwagon", "164", "166", "4C", "Brera", "GTV", "MiTo", "Crosswagon", "Spider", "GT", "Giulietta", "Giulia"] },
  { brand: "Aston Martin", models: [] },
  { brand: "Audi", models: ["100", "100 Avant", "80", "80 Avant", "80 Cabrio", "90", "A1", "A2", "A3", "A3 Cabriolet", "A3 Limuzina", "A3 Sportback", "A4", "A4 Allroad", "A4 Avant", "A4 Cabriolet", "A5", "A5 Cabriolet", "A5 Sportback", "A6", "A6 Allroad", "A6 Avant", "A7", "A8", "A8 Long", "Q3", "Q5", "Q7", "R8", "RS4 Cabriolet", "RS4/RS4 Avant", "RS5", "RS6 Avant", "RS7", "S3/S3 Sportback", "S4 Cabriolet", "S4/S4 Avant", "S5/S5 Cabriolet", "S6/RS6", "S7", "S8", "SQ5", "TT Coupe", "TT Roadster", "TTS"] },
  { brand: "Bentley", models: [] },
  { brand: "BMW", models: ["i3", "i8", "M3", "M4", "M5", "M6", "Series 1", "Series 1 Cabrio", "Series 1 Coupe", "Series 2", "Series 2 Active Tourer", "Series 2 Coupe", "Series 2 Gran Tourer", "Series 3", "Series 3 Cabrio", "Series 3 Compact", "Series 3 Coupe", "Series 3 GT", "Series 3 Touring", "Series 4", "Series 4 Cabrio", "Series 4 Gran Coupe", "Series 5", "Series 5 GT", "Series 5 Touring", "Series 6", "Series 6 Cabrio", "Series 6 Coupe", "Series 6 Gran Coupe", "Series 7", "Series 8 Coupe", "X1", "X3", "X4", "X5", "X6", "Z3", "Z3 Coupe", "Z3 Roadster", "Z4", "Z4 Roadster"] },
  { brand: "BYD", models: [] },
  { brand: "Chery", models: [] },
  { brand: "Chevrolet", models: ["Alero", "Aveo", "Camaro", "Captiva", "Corvette", "Cruze", "Cruze SW", "Epica", "Equinox", "Evanda", "HHR", "Kalos", "Lacetti", "Lacetti SW", "Lumina", "Malibu", "Matiz", "Monte Carlo", "Nubira", "Orlando", "Spark", "Suburban", "Tacuma", "Tahoe", "Trax"] },
  { brand: "Chrysler", models: ["300 C", "300 C Touring", "300 M", "Crossfire", "Grand Voyager", "LHS", "Neon", "Pacifica", "PT Cruiser", "Sebring", "Sebring Convertible", "Stratus", "Stratus Cabrio", "Town & Country", "Voyager"] },
  { brand: "Citroën", models: ["Berlingo", "C-Crosser", "C-Elissee", "C-Zero", "C1", "C2", "C3", "C3 Picasso", "C4", "C4 Aircross", "C4 Cactus", "C4 Coupe", "C4 Grand Picasso", "C4 Sedan", "C5", "C5 Break", "C5 Tourer", "C6", "C8", "DS3", "DS4", "DS5", "Evasion", "Jumper", "Jumpy", "Saxo", "Nemo", "Xantia", "Xsara"] },
  { brand: "Dacia", models: ["Dokker", "Duster", "Lodgy", "Logan", "Logan MCV", "Logan Van", "Sandero", "Solenza"] },
  { brand: "Daewoo", models: ["Espero", "Kalos", "Lacetti", "Lanos", "Leganza", "Lublin", "Matiz", "Nexia", "Nubira", "Nubira kombi", "Racer", "Tacuma", "Tico"] },
  { brand: "Dodge", models: ["Avenger", "Caliber", "Challenger", "Charger", "Grand Caravan", "Journey", "Magnum", "Nitro", "RAM", "Stealth", "Viper"] },
  { brand: "Ferrari", models: [] },
  { brand: "Fiat", models: ["1100", "126", "500", "500L", "500X", "850", "Barchetta", "Brava", "Cinquecento", "Coupe", "Croma", "Doblo", "Doblo Cargo", "Doblo Cargo Combi", "Ducato", "Ducato Van", "Ducato Kombi", "Ducato Podvozok", "Florino", "Florino Combi", "Freemont", "Grande Punto", "Idea", "Linea", "Marea", "Marea Weekend", "Multipla", "Palio Weekend", "Panda", "Panda Van", "Punto", "Punto Cabriolet", "Punto Evo", "Punto Van", "Qubo", "Scudo", "Scudo Van", "Scudo Kombi", "Sedici", "Seicento", "Stilo", "Stilo Multiwagon", "Strada", "Talento", "Tipo", "Ulysse", "Uno", "X1/9"] },
  { brand: "Ford", models: ["Aerostar", "B-Max", "C-Max", "Cortina", "Cougar", "Edge", "Escort", "Escort Cabrio", "Escort kombi", "Explorer", "F-150", "F-250", "Fiesta", "Focus", "Focus C-Max", "Focus CC", "Focus kombi", "Fusion", "Galaxy", "Grand C-Max", "Ka", "Kuga", "Maverick", "Mondeo", "Mondeo Combi", "Mustang", "Orion", "Puma", "Ranger", "S-Max", "Sierra", "Street Ka", "Tourneo Connect", "Tourneo Custom", "Transit", "Transit Bus", "Transit Connect LWB", "Transit Courier", "Transit Custom", "Transit kombi", "Transit Tourneo", "Transit Valnik", "Transit Van", "Transit Van 350", "Windstar"] },
  { brand: "GAC", models: [] },
  { brand: "Geely", models: [] },
  { brand: "GMC", models: [] },
  { brand: "Honda", models: ["Accord", "Accord Coupe", "Accord Tourer", "City", "Civic", "Civic Aerodeck", "Civic Coupe", "Civic Tourer", "Civic Type R", "CR-V", "CR-X", "CR-Z", "FR-V", "HR-V", "Insight", "Integra", "Jazz", "Legend", "Prelude"] },
  { brand: "Hummer", models: ["H2", "H3"] },
  { brand: "Hyundai", models: ["Accent", "Atos", "Atos Prime", "Coupe", "Elantra", "Galloper", "Genesis", "Getz", "Grandeur", "H 350", "H1", "H1 Bus", "H1 Van", "H200", "i10", "i20", "i30", "i30 CW", "i40", "i40 CW", "ix20", "ix35", "ix55", "Lantra", "Matrix", "Santa Fe", "Sonata", "Terracan", "Trajet", "Tucson", "Veloster"] },
  { brand: "Infiniti", models: ["EX", "FX", "G", "G Coupe", "M", "Q", "QX"] },
  { brand: "Isuzu", models: [] },
  { brand: "Jaguar", models: ["Daimler", "F-Pace", "F-Type", "S-Type", "Sovereign", "X-Type", "X-type Estate", "XE", "XF", "XJ", "XJ12", "XJ6", "XJ8", "XJR", "XK", "XK8 Convertible", "XKR", "XKR Convertible"] },
  { brand: "Jeep", models: ["Cherokee", "Commander", "Compass", "Grand Cherokee", "Patriot", "Renegade", "Wrangler"] },
  { brand: "Kia", models: ["Avella", "Besta", "Carens", "Carnival", "Cee`d", "Cee`d SW", "Cerato", "K 2500", "Magentis", "Opirus", "Optima", "Picanto", "Pregio", "Pride", "Pro Cee`d", "Rio", "Rio Combi", "Rio sedan", "Sephia", "Shuma", "Sorento", "Soul", "Sportage", "Venga"] },
  { brand: "Lamborghini", models: [] },
  { brand: "Land Rover", models: ["109", "Defender", "Discovery", "Discovery Sport", "Freelander", "Range Rover", "Range Rover Evoque", "Range Rover Sport"] },
  { brand: "Lexus", models: ["CT", "GS", "GS 300", "GX", "IS", "IS 200", "IS 250 C", "IS-F", "LS", "LX", "NX", "RC F", "RX", "RX 300", "RX 400h", "RX 450h", "SC 430"] },
  { brand: "Maserati", models: [] },
  { brand: "Mazda", models: ["121", "2", "3", "323", "323 Combi", "323 Coupe", "323 F", "5", "6", "6 Combi", "626", "626 Combi", "B-Fighter", "B2500", "BT", "CX-3", "CX-5", "CX-7", "CX-9", "Demio", "MPV", "MX-3", "MX-5", "MX-6", "Premacy", "RX-7", "RX-8", "Xedox 6"] },
  { brand: "Mercedes-Benz", models: ["100 D", "115", "124", "126", "190", "190 D", "190 E", "200 - 300", "200 D", "200 E", "210 Van", "210 kombi", "310 Van", "310 kombi", "230 - 300 CE Coupe", "260 - 560 SE", "260 - 560 SEL", "500 - 600 SEC Coupe", "Trieda A", "A", "A L", "AMG GT", "Trieda B", "Trieda C", "C", "C Sportcoupe", "C T", "Citan", "CL", "CLA", "CLC", "CLK Cabrio", "CLK Coupe", "CLS", "Trieda E", "E", "E Cabrio", "E Coupe", "E T", "Trieda G", "G Cabrio", "GL", "GLA", "GLC", "GLE", "GLK", "Trieda M", "MB 100", "Trieda R", "Trieda S", "S", "S Coupe", "SL", "SLC", "SLK", "SLR", "Sprinter"] },
  { brand: "MG", models: [] },
  { brand: "Mini", models: ["Cooper", "Cooper Cabrio", "Cooper Clubman", "Cooper D", "Cooper D Clubman", "Cooper S", "Cooper S Cabrio", "Cooper S Clubman", "Countryman", "Mini One", "One D"] },
  { brand: "Mitsubishi", models: ["3000 GT", "ASX", "Carisma", "Colt", "Colt CC", "Eclipse", "Fuso canter", "Galant", "Galant Combi", "Grandis", "L200", "L200 Pick up", "L200 Pick up Allrad", "L300", "Lancer", "Lancer Combi", "Lancer Evo", "Lancer Sportback", "Outlander", "Pajero", "Pajeto Pinin", "Pajero Pinin Wagon", "Pajero Sport", "Pajero Wagon", "Space Star"] },
  { brand: "Nissan", models: ["100 NX", "200 SX", "350 Z", "350 Z Roadster", "370 Z", "Almera", "Almera Tino", "Cabstar E - T", "Cabstar TL2 Valnik", "e-NV200", "GT-R", "Insterstar", "Juke", "King Cab", "Leaf", "Maxima", "Maxima QX", "Micra", "Murano", "Navara", "Note", "NP300 Pickup", "NV200", "NV400", "Pathfinder", "Patrol", "Patrol GR", "Pickup", "Pixo", "Primastar", "Primastar Combi", "Primera", "Primera Combi", "Pulsar", "Qashqai", "Serena", "Sunny", "Terrano", "Tiida", "Trade", "Vanette Cargo", "X-Trail"] },
  { brand: "Opel", models: ["Agila", "Ampera", "Antara", "Astra", "Astra cabrio", "Astra caravan", "Astra coupe", "Calibra", "Campo", "Cascada", "Corsa", "Frontera", "Insignia", "Insignia kombi", "Kadett", "Meriva", "Mokka", "Movano", "Omega", "Signum", "Vectra", "Vectra Caravan", "Vivaro", "Vivaro Kombi", "Zafira"] },
  { brand: "Peugeot", models: ["1007", "107", "106", "108", "2008", "205", "205 Cabrio", "206", "206 CC", "206 SW", "207", "207 CC", "207 SW", "306", "307", "307 CC", "307 SW", "308", "308 CC", "308 SW", "309", "4007", "4008", "405", "406", "407", "407 SW", "5008", "508", "508 SW", "605", "806", "607", "807", "Bipper", "RCZ"] },
  { brand: "Porsche", models: ["911 Carrera", "911 Carrera Cabrio", "911 Targa", "911 Turbo", "924", "944", "997", "Boxster", "Cayenne", "Cayman", "Macan", "Panamera"] },
  { brand: "Renault", models: ["Captur", "Clio", "Clio Grandtour", "Espace", "Express", "Fluence", "Grand Espace", "Grand Modus", "Grand Scenic", "Kadjar", "Kangoo", "Kangoo Express", "Koleos", "Laguna", "Laguna Grandtour", "Latitude", "Mascott", "Megane", "Megane CC", "Megane Combi", "Megane Grandtour", "Megane Coupe", "Megane Scenic", "Scenic", "Talisman", "Talisman Grandtour", "Thalia", "Twingo", "Wind", "Zoe"] },
  { brand: "Rolls-Royce", models: [] },
  { brand: "Rover", models: ["200", "214", "218", "25", "400", "414", "416", "620", "75"] },
  { brand: "Saab", models: ["9-3", "9-3 Cabriolet", "9-3 Coupe", "9-3 SportCombi", "9-5", "9-5 SportCombi", "900", "900 C", "900 C Turbo", "9000"] },
  { brand: "Seat", models: ["Alhambra", "Altea", "Altea XL", "Arosa", "Cordoba", "Cordoba Vario", "Exeo", "Ibiza", "Ibiza ST", "Exeo ST", "Leon", "Leon ST", "Inca", "Mii", "Toledo"] },
  { brand: "Skoda", models: ["Favorit", "Felicia", "Citigo", "Fabia", "Fabia Combi", "Fabia Sedan", "Felicia Combi", "Octavia", "Octavia Combi", "Roomster", "Yeti", "Rapid", "Rapid Spaceback", "Superb", "Superb Combi"] },
  { brand: "Smart", models: ["Cabrio", "City-Coupe", "Compact Pulse", "Forfour", "Fortwo cabrio", "Fortwo coupe", "Roadster"] },
  { brand: "Subaru", models: ["BRZ", "Forester", "Impreza", "Impreza Wagon", "Justy", "Legacy", "Legacy Wagon", "Legacy Outback", "Levorg", "Outback", "SVX", "Tribeca", "Tribeca B9", "XV"] },
  { brand: "Suzuki", models: ["Alto", "Baleno", "Baleno kombi", "Grand Vitara", "Grand Vitara XL-7", "Ignis", "Jimny", "Kizashi", "Liana", "Samurai", "Splash", "Swift", "SX4", "SX4 Sedan", "Vitara", "Wagon R+"] },
  { brand: "Tesla", models: [] },
  { brand: "Toyota", models: ["4-Runner", "Auris", "Avensis", "Avensis Combi", "Avensis Van Verso", "Aygo", "Camry", "Carina", "Celica", "Corolla", "Corolla Combi", "Corolla sedan", "Corolla Verso", "FJ Cruiser", "GT86", "Hiace", "Hiace Van", "Highlander", "Hilux", "Land Cruiser", "MR2", "Paseo", "Picnic", "Prius", "RAV4", "Sequoia", "Starlet", "Supra", "Tundra", "Urban Cruiser", "Verso", "Yaris", "Yaris Verso"] },
  { brand: "Volkswagen", models: ["Amarok", "Beetle", "Bora", "Bora Variant", "Caddy", "Caddy Van", "Life", "California", "Caravelle", "CC", "Crafter", "Crafter Van", "Crafter Kombi", "CrossTouran", "Eos", "Fox", "Golf", "Golf Cabrio", "Golf Plus", "Golf Sportvan", "Golf Variant", "Jetta", "LT", "Lupo", "Multivan", "New Beetle", "New Beetle Cabrio", "Passat", "Passat Alltrack", "Passat CC", "Passat Variant", "Passat Variant Van", "Phaeton", "Polo", "Polo Van", "Polo Variant", "Scirocco", "Sharan", "T4", "T4 Caravelle", "T4 Multivan", "T5", "T5 Caravelle", "T5 Multivan", "T5 Transporter Shuttle", "Tiguan", "Touareg", "Touran"] },
  { brand: "Volvo", models: ["240", "340", "360", "460", "850", "850 kombi", "C30", "C70", "C70 Cabrio", "C70 Coupe", "S40", "S60", "S70", "S80", "S90", "V40", "V50", "V60", "V70", "V90", "XC60", "XC70", "XC90"] },
];
