import fs from 'fs';
import path from 'path';

interface DinosaurMeasurement {
  name: string;
  length: string;
  weight: string;
  source: string;
}

// Popular dinosaurs to check
const popularDinosaurs = [
  "Tyrannosaurus rex", "Velociraptor", "Triceratops", "Stegosaurus", "Brachiosaurus",
  "Diplodocus", "Allosaurus", "Spinosaurus", "Ankylosaurus", "Parasaurolophus",
  "Pteranodon", "Iguanodon", "Brontosaurus", "Carnotaurus", "Dilophosaurus",
  "Gallimimus", "Compsognathus", "Pachycephalosaurus", "Deinonychus", "Archaeopteryx",
  "Giganotosaurus", "Therizinosaurus", "Utahraptor", "Protoceratops", "Styracosaurus",
  "Dimetrodon", "Microraptor", "Argentinosaurus", "Oviraptor", "Edmontosaurus",
  "Maiasaura", "Coelophysis", "Plateosaurus", "Psittacosaurus", "Dreadnoughtus",
  "Carcharodontosaurus", "Kentrosaurus", "Corythosaurus", "Acrocanthosaurus", "Yutyrannus",
  "Sinosauropteryx", "Deinocheirus", "Pachyrhinosaurus", "Amargasaurus",  "Herrerasaurus", 
  "Chasmosaurus", "Ceratosaurus", "Mamenchisaurus", "Megalosaurus",
  "Sauroposeidon", "Albertosaurus", "Dracorex",
  "Irritator", "Lambeosaurus", "Ouranosaurus", "Torosaurus",
  "Zuniceratops", "Apatosaurus", "Baryonyx", "Centrosaurus",
  "Daspletosaurus", "Euoplocephalus", "Fukuiraptor", "Gastonia", "Anatotitan",
  "Lesothosaurus",  "Neovenator", "Ornithomimus", "Pentaceratops",
  "Camarasaurus", "Giraffatitan",  "Hypsilophodon"
];

function reviewResults() {
  // Read the JSON file
  const jsonPath = path.join(__dirname, '..', '..', 'dinosaur_measurements.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const measurements: DinosaurMeasurement[] = JSON.parse(jsonData);

  // Create a map of genus to species
  const genusToSpecies = new Map<string, string[]>();
  measurements.forEach(d => {
    const [genus, species] = d.name.split(' ');
    if (!genusToSpecies.has(genus)) {
      genusToSpecies.set(genus, []);
    }
    genusToSpecies.get(genus)!.push(d.name);
  });

  // Check which popular dinosaurs are missing or partially present
  const missingDinosaurs: string[] = [];
  const partiallyPresentDinosaurs: { name: string, species: string[] }[] = [];
  const presentDinosaurs: string[] = [];

  popularDinosaurs.forEach(d => {
    const [genus, species] = d.split(' ');
    if (species) {
      // It's a full species name
      if (measurements.some(m => m.name === d)) {
        presentDinosaurs.push(d);
      } else {
        missingDinosaurs.push(d);
      }
    } else {
      // It's just a genus name
      if (genusToSpecies.has(genus)) {
        partiallyPresentDinosaurs.push({ name: genus, species: genusToSpecies.get(genus)! });
      } else {
        missingDinosaurs.push(genus);
      }
    }
  });

  // Print results
  console.log(`Total dinosaurs in measurements: ${measurements.length}`);
  console.log(`Popular dinosaurs fully present: ${presentDinosaurs.length}`);
  console.log(`Popular dinosaurs partially present: ${partiallyPresentDinosaurs.length}`);
  console.log(`Popular dinosaurs missing: ${missingDinosaurs.length}`);
  
  console.log("\nMissing popular dinosaurs:");
  missingDinosaurs.forEach(d => console.log(`- ${d}`));

  console.log("\nPartially present popular dinosaurs:");
  partiallyPresentDinosaurs.forEach(d => {
    console.log(`- ${d.name}:`);
    d.species.forEach(s => console.log(`  - ${s}`));
  });

  // Analyze sources
  const sourceCounts = measurements.reduce((acc, m) => {
    acc[m.source] = (acc[m.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\nMeasurement sources:");
  Object.entries(sourceCounts).forEach(([source, count]) => {
    console.log(`- ${source}: ${count} (${((count / measurements.length) * 100).toFixed(2)}%)`);
  });

  // Find dinosaurs with extreme measurements
  const lengthSorted = measurements
    .filter(m => m.length !== 'N/A')
    .sort((a, b) => {
      const aLength = parseFloat(a.length.split(' - ')[1] || a.length.split(' - ')[0]);
      const bLength = parseFloat(b.length.split(' - ')[1] || b.length.split(' - ')[0]);
      return bLength - aLength;
    });
  const weightSorted = measurements
    .filter(m => m.weight !== 'N/A')
    .sort((a, b) => {
      const aWeight = parseFloat(a.weight.split(' - ')[1] || a.weight.split(' - ')[0]);
      const bWeight = parseFloat(b.weight.split(' - ')[1] || b.weight.split(' - ')[0]);
      return bWeight - aWeight;
    });

  console.log("\nTop 5 longest dinosaurs:");
  lengthSorted.slice(0, 5).forEach(d => console.log(`- ${d.name}: ${d.length}`));

  console.log("\nTop 5 heaviest dinosaurs:");
  weightSorted.slice(0, 5).forEach(d => console.log(`- ${d.name}: ${d.weight}`));
}

reviewResults();