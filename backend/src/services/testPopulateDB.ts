import { fetchAllDinosaurSpecies, fetchSpecificDinosaurSpecies, fetchTaxonInfo, getLineage, TaxonNode, DinosaurSpecies } from './pbdbScraper';
import fs from 'fs';
import path from 'path';


const taxonInfoMap = new Map<string, any>();

interface TreeNode {
  id: string;
  name: string;
  rank: number;
  children: TreeNode[];
}


// Read dinosaur_measurements.json
const measurementsPath = path.join(__dirname, '..', '..', 'dinosaur_measurements.json');
const dinosaurMeasurements = JSON.parse(fs.readFileSync(measurementsPath, 'utf-8'));

function buildTree(lineages: string[][], taxonInfoMap: Map<string, any>): TreeNode {
  const root: TreeNode = { id: '', name: 'Root', rank: 0, children: [] };

  for (const lineage of lineages) {
    let currentNode = root;
    for (const taxonId of lineage) {
      let child = currentNode.children.find(c => c.id === taxonId);
      if (!child) {
        const taxonInfo = taxonInfoMap.get(taxonId);
        child = {
          id: taxonId,
          name: taxonInfo ? taxonInfo.nam : 'Unknown',
          rank: taxonInfo ? taxonInfo.rnk : 0,
          children: []
        };
        currentNode.children.push(child);
      }
      currentNode = child;
    }
  }

  return root;
}

function printTree(node: TreeNode, depth: number = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${node.name} (Rank: ${node.rank}, ID: ${node.id})`);
  for (const child of node.children) {
    printTree(child, depth + 1);
  }
}

async function logSpeciesInfo(speciesInfo: any, lineage: string[]): Promise<void> {
  if (!speciesInfo) {
    console.log('No species information available.');
    return;
  }

  console.log('\n--- Species Information ---');
  console.log(`Name: ${speciesInfo.nam}`);
  console.log(`ID: ${speciesInfo.oid}`);
  console.log(`Rank: ${speciesInfo.rnk}`);
  console.log(`Parent ID: ${speciesInfo.par}`);
  console.log(`Time Range: ${speciesInfo.tei || 'N/A'} - ${speciesInfo.tli || 'N/A'}`);
  console.log(`First Appearance: ${speciesInfo.fea || 'N/A'} Ma`);
  console.log(`Last Appearance: ${speciesInfo.lla || 'N/A'} Ma`);
  console.log('Lineage:');
  for (const taxonId of lineage) {
    const taxonInfo = await fetchTaxonInfo(taxonId);
    if (taxonInfo) {
      console.log(`  ${taxonInfo.rnk}: ${taxonInfo.nam} (${taxonInfo.oid})`);
    } else {
      console.log(`  Unable to fetch info for taxon ID: ${taxonId}`);
    }
  }
}
async function testPopulateDatabase() {
  let allSpecies = await fetchAllDinosaurSpecies();
  console.log(`Fetched ${allSpecies.length} dinosaur species from PBDB.`);

  // Sort the species alphabetically by name
  allSpecies.sort((a, b) => a.name.localeCompare(b.name));
  console.log("Species sorted alphabetically.");

  const exampleSpecies = ['Tyrannosaurus rex', 'Spinosaurus aegyptiacus'];
  
  for (const speciesName of exampleSpecies) {
    const species = allSpecies.find(s => s.name === speciesName);
    if (species) {
      await processSpecies(species);
    } else {
      console.log(`Species ${speciesName} not found in PBDB data.`);
    }
  }

  console.log('\nProcessing all species...');
  let processedCount = 0;
  const totalSpecies = allSpecies.length;

  for (const species of allSpecies) {
    await processSpecies(species);
    processedCount++;
    
    // Calculate and log the percentage
    const percentage = ((processedCount / totalSpecies) * 100).toFixed(2);
    console.log(`Processed ${processedCount} out of ${totalSpecies} species (${percentage}%)`);
  }

  console.log('\nTest database population complete.');
}



async function processSpecies(species: DinosaurSpecies) {
  const speciesNodes = await fetchSpecificDinosaurSpecies([species.name]);
  if (speciesNodes.length === 0) {
    console.log(`No specific data found for species: ${species.name}`);
    return;
  }

  const speciesNode = speciesNodes[0];
  const lineage = await getLineage(speciesNode.id);
  const taxonInfoMap = new Map<string, any>();

  for (const taxonId of lineage) {
    const taxonInfo = await fetchTaxonInfo(taxonId);
    if (taxonInfo) {
      taxonInfoMap.set(taxonId, taxonInfo);
    }
  }

  const measurement = dinosaurMeasurements.find((m: any) => m.name === species.name);

  console.log('\n--- Species Information ---');
  console.log(`Name: ${species.name}`);
  console.log(`Rank: ${species.rank}`);
  console.log(`Parent: ${species.parent}`);
  console.log(`Order: ${species.order}`);
  console.log(`Family: ${species.family || 'N/A'}`);
  console.log(`First Appearance: ${species.max_ma || 'N/A'} Ma`);
  console.log(`Last Appearance: ${species.min_ma || 'N/A'} Ma`);
  console.log(`Length: ${measurement ? measurement.length : 'N/A'}`);
  console.log(`Weight: ${measurement ? measurement.weight : 'N/A'}`);
  console.log('Lineage:');
  for (const taxonId of lineage) {
    const taxonInfo = taxonInfoMap.get(taxonId);
    if (taxonInfo) {
      console.log(`  ${taxonInfo.rnk}: ${taxonInfo.nam} (${taxonInfo.oid})`);
    } else {
      console.log(`  Unable to fetch info for taxon ID: ${taxonId}`);
    }
  }

  // Here you would typically insert or update the database
  // For now, we'll just log that we would do so
  console.log(`Would update/insert ${species.name} in the database with all fetched information.`);
}


testPopulateDatabase()
  .catch((e) => {
    console.error('An error occurred during the test:', e.message);
    process.exit(1);
  });