import { PrismaClient } from '@prisma/client';
import { fetchAllDinosaurSpecies, fetchSpecificDinosaurSpecies, fetchTaxonInfo, getLineage, DinosaurSpecies } from './pbdbScraper';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const prisma = new PrismaClient();

// Read dinosaur_measurements.json
const measurementsPath = path.join(__dirname, '..', 'dinosaur_measurements.json');
const dinosaurMeasurements = JSON.parse(fs.readFileSync(measurementsPath, 'utf-8'));



// function t
async function processSpecies(species: DinosaurSpecies) {
  const speciesNodes = await fetchSpecificDinosaurSpecies([species.name]);
  if (speciesNodes.length === 0) {
    console.log(`No specific data found for species: ${species.name}`);
    return;
  }

  const speciesNode = speciesNodes[0];
  const lineage = await getLineage(speciesNode.id);
  const measurement = dinosaurMeasurements.find((m: any) => m.name === species.name);

  // Process all taxa in the lineage
  let parentId: string | null = null;
  for (const taxonId of lineage) {
    const taxonInfo = await fetchTaxonInfo(taxonId);
    if (taxonInfo) {
      await prisma.taxon.upsert({
        where: { id: taxonId },
        update: {
          name: taxonInfo.nam,
          rank: taxonInfo.rnk,
          parentId: parentId,
        },
        create: {
          id: taxonId,
          name: taxonInfo.nam,
          rank: taxonInfo.rnk,
          parentId: parentId,
        },
      });
      parentId = taxonId;
    }
  }

  // Now create or update the species
  try {
    await prisma.species.upsert({
      where: { id: speciesNode.id },
      update: {
        name: species.name,
        taxonId: speciesNode.id,
        lineage: lineage,
        description: `Order: ${species.order}, Family: ${species.family || 'N/A'}`,
        timeRange: `${species.max_ma || 'N/A'} - ${species.min_ma || 'N/A'} Ma`,
        firstAppearance: species.max_ma || null,
        lastAppearance: species.min_ma || null,
        length: measurement ? parseFloat(measurement.length) : null,
        weight: measurement ? parseFloat(measurement.weight) : null,
        updatedAt: new Date(),
      },
      create: {
        id: speciesNode.id,
        name: species.name,
        taxonId: speciesNode.id,
        lineage: lineage,
        description: `Order: ${species.order}, Family: ${species.family || 'N/A'}`,
        timeRange: `${species.max_ma || 'N/A'} - ${species.min_ma || 'N/A'} Ma`,
        firstAppearance: species.max_ma || null,
        lastAppearance: species.min_ma || null,
        length: measurement ? parseFloat(measurement.length) : null,
        weight: measurement ? parseFloat(measurement.weight) : null,
      },
    });
    console.log(`Successfully processed ${species.name}`);
  } catch (error) {
    console.error(`Error processing ${species.name}:`, error);
  }
}

async function populateDatabase() {
  try {
    let allSpecies = await fetchAllDinosaurSpecies();
    console.log(`Fetched ${allSpecies.length} dinosaur species from PBDB.`);

    // Sort the species alphabetically by name
    allSpecies.sort((a, b) => a.name.localeCompare(b.name));
    console.log("Species sorted alphabetically.");

    let processedCount = 0;
    const totalSpecies = allSpecies.length;

    for (const species of allSpecies) {
      await processSpecies(species);
      processedCount++;
      
      // Calculate and log the percentage
      const percentage = ((processedCount / totalSpecies) * 100).toFixed(2);
      console.log(`Processed ${processedCount} out of ${totalSpecies} species (${percentage}%)`);
    }

    console.log('\nDatabase population complete.');
  } catch (error) {
    console.error('An error occurred during database population:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateDatabase()
  .catch((e) => {
    console.error('An error occurred during database population:', e);
    process.exit(1);
  });