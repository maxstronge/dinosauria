import fs from 'fs';
import path from 'path';
import { fetchAllDinosaurSpecies, DinosaurSpecies } from './pbdbScraper';

const popularGenera = [
  "Tyrannosaurus", "Velociraptor", "Triceratops", "Stegosaurus", "Brachiosaurus",
  "Diplodocus", "Allosaurus", "Spinosaurus", "Ankylosaurus", "Parasaurolophus",
  "Iguanodon", "Brontosaurus", "Carnotaurus", "Dilophosaurus",
  "Gallimimus", "Compsognathus", "Pachycephalosaurus", "Deinonychus", "Archaeopteryx",
  "Giganotosaurus", "Therizinosaurus", "Utahraptor", "Protoceratops", "Styracosaurus",
  "Microraptor", "Argentinosaurus", "Oviraptor", "Edmontosaurus",
  "Maiasaura", "Coelophysis", "Plateosaurus", "Psittacosaurus", "Dreadnoughtus",
  "Carcharodontosaurus", "Kentrosaurus", "Corythosaurus", "Acrocanthosaurus", "Yutyrannus",
  "Sinosauropteryx", "Deinocheirus", "Pachyrhinosaurus", "Amargasaurus", "Herrerasaurus", 
  "Chasmosaurus", "Ceratosaurus", "Mamenchisaurus", "Megalosaurus",
  "Sauroposeidon", "Albertosaurus", "Dracorex",
  "Irritator", "Lambeosaurus", "Ouranosaurus", "Torosaurus",
  "Zuniceratops", "Apatosaurus", "Baryonyx", "Centrosaurus",
  "Daspletosaurus",  "Lesothosaurus", "Neovenator", "Ornithomimus", "Pentaceratops",
  "Camarasaurus", "Giraffatitan", "Hypsilophodon"
];
async function reviewFetchedDinosaurs() {
    console.log("Starting to fetch dinosaur species...");
    
    let dinosaurs: DinosaurSpecies[];
    try {
      dinosaurs = await fetchAllDinosaurSpecies();
      console.log(`Fetched ${dinosaurs.length} dinosaur species.`);
    } catch (error) {
      console.error("Error fetching dinosaur species:", error);
      return;
    }
  
    if (!dinosaurs || dinosaurs.length === 0) {
      console.log("No dinosaurs were fetched. Check the fetchAllDinosaurSpecies function.");
      return;
    }
  
    console.log(`Total dinosaur species fetched: ${dinosaurs.length}`);
  
    const genusMap = new Map<string, string[]>();
    dinosaurs.forEach(dino => {
      const genus = dino.name.split(' ')[0];
      if (!genusMap.has(genus)) {
        genusMap.set(genus, []);
      }
      genusMap.get(genus)!.push(dino.name);
    });
  
    console.log('\nChecking for popular genera:');
    popularGenera.forEach(genus => {
      if (genusMap.has(genus)) {
        console.log(`${genus}: ${genusMap.get(genus)!.length} species`);
        genusMap.get(genus)!.forEach(species => console.log(`  - ${species}`));
      } else {
        console.log(`${genus}: Not found`);
      }
    });
  
    const missingGenera = popularGenera.filter(genus => !genusMap.has(genus));
    console.log(`\nMissing popular genera: ${missingGenera.length}`);
    missingGenera.forEach(genus => console.log(`- ${genus}`));
  
    // Save the full list of fetched dinosaurs to a file for reference
    const outputPath = path.join(__dirname, '..', '..', 'fetched_dinosaurs.json');
    fs.writeFileSync(outputPath, JSON.stringify(dinosaurs, null, 2));
    console.log(`\nFull list of fetched dinosaurs saved to ${outputPath}`);

  }
  


  reviewFetchedDinosaurs().catch(error => {
    console.error("An error occurred in reviewFetchedDinosaurs:", error);
  });