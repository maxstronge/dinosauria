import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { setTimeout } from 'timers/promises';
import { fetchAllDinosaurSpecies, DinosaurSpecies } from './pbdbScraper';

// Wolfram Alpha API credentials
const apiKey = 'H7KPYE-ARVY55QQ95';



interface Measurement {
  min: number;
  max: number;
  unit: string;
}

interface DinosaurMeasurements {
  name: string;
  length: string;
  weight: string;
  source: 'species' | 'genus' | 'accepted_name';
}

function readWolframSpecies(): Set<string> {
  const filePath = path.join(__dirname, '..', '..', 'wolfram_species.txt');
  const content = fs.readFileSync(filePath, 'utf-8');
  const species = content.split('|').map(s => s.trim());
  return new Set(species);
}

// Function to query Wolfram Alpha API
async function queryWolframAlpha(dinosaur: string, isGenus: boolean = false) {
  const query = isGenus ? `${dinosaur} dinosaur genus length and weight` : `${dinosaur} dinosaur length and weight`;
  const url = 'https://api.wolframalpha.com/v2/query';
  try {
    const response = await axios.get(url, {
      params: {
        input: query,
        format: 'plaintext',
        output: 'JSON',
        appid: apiKey
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Error fetching data for ${dinosaur}: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
    } else {
      console.error(`Unexpected error for ${dinosaur}: ${error}`);
    }
    return null;
  }
}


// Function to get all dinosaur species from PBDB
async function getAllDinosaurs(): Promise<string[]> {
  const dinosaurs = await fetchAllDinosaurSpecies();
  const dinosaurNames = dinosaurs.map((dinosaur: { name: any; }) => dinosaur.name);
  console.log(`Found ${dinosaurNames.length} dinosaur species from PBDB.`);
  return dinosaurNames;
}


// Function to extract length and weight data from Wolfram Alpha response

function extractData(response: any) {
  const pods = response?.queryresult?.pods || [];
  let length: Measurement | null = null;
  let weight: Measurement | null = null;

  for (const pod of pods) {
    if (pod.title === 'Results' && pod.subpods && pod.subpods.length > 0) {
      const plaintext = pod.subpods[0].plaintext;
      const lines = plaintext.split('\n');
      
      for (const line of lines) {
        if (line.includes('full length')) {
          length = extractMeasurement(line);
        }
        if (line.includes('weight')) {
          weight = extractMeasurement(line);
        }
      }
    }
  }

  return { length, weight };
}function extractMeasurement(line: string): Measurement | null {
  const parts = line.split('|');
  if (parts.length > 1) {
    const measurementPart = parts[1].trim();
    return parseMeasurement(measurementPart);
  }
  return null;
}

function parseMeasurement(text: string): Measurement | null {
  // Handle ranges like "(8 to 9.3) meters"
  const rangeMatch = text.match(/\(([\d\.]+)\s*to\s*([\d\.]+)\)\s*(\w+)/);
  if (rangeMatch) {
    const [, min, max, unit] = rangeMatch;
    return {
      min: parseFloat(min),
      max: parseFloat(max),
      unit: unit
    };
  }

  // Handle single values like "12 meters"
  const singleMatch = text.match(/([\d\.]+)\s*(\w+)/);
  if (singleMatch) {
    const [, value, unit] = singleMatch;
    const numValue = parseFloat(value);
    return {
      min: numValue,
      max: numValue,
      unit: unit
    };
  }

  return null;
}

function formatMeasurement(measurement: Measurement | null): string {
  if (!measurement) return 'N/A';

  let { min, max, unit } = measurement;

  // Convert to standard units
  if (unit.toLowerCase() === 't' || unit.toLowerCase() === 'tons' || unit.toLowerCase() === 'metric tons') {
    min *= 1000;
    max *= 1000;
    unit = 'kg';
  }

  if (min === max) {
    return `${min.toFixed(2)} ${unit}`;
  } else {
    return `${min.toFixed(2)} - ${max.toFixed(2)} ${unit}`;
  }
}

async function loadExistingMeasurements(): Promise<DinosaurMeasurements[]> {
  const filePath = path.join(__dirname, '..', '..', 'dinosaur_measurements.json');
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
  return [];
}


// Main function to query all dinosaurs and log the results

async function main() {
  const existingMeasurements = await loadExistingMeasurements();
  const existingNames = new Set(existingMeasurements.map(m => m.name));

  const allDinosaurs = await fetchAllDinosaurSpecies();
  const newDinosaurs = allDinosaurs.filter(d => !existingNames.has(d.name));

  console.log(`Found ${newDinosaurs.length} new dinosaurs to query.`);

  const wolframSpecies = readWolframSpecies();
  console.log(`Loaded ${wolframSpecies.size} species from Wolfram data file.`);

  const newMeasurements: DinosaurMeasurements[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const dinosaur of newDinosaurs) {
    if (wolframSpecies.has(dinosaur.name)) {
      console.log(`Querying data for: ${dinosaur.name} (${successCount + failureCount + 1}/${newDinosaurs.length})`);
      
      try {
        const response = await queryWolframAlpha(dinosaur.name);
        
        if (response && response.queryresult && response.queryresult.success) {
          const data = extractData(response);
          const measurement: DinosaurMeasurements = {
            name: dinosaur.name,
            length: formatMeasurement(data.length),
            weight: formatMeasurement(data.weight),
            source: 'species'
          };
          newMeasurements.push(measurement);
          console.log(`  Length: ${measurement.length}`);
          console.log(`  Weight: ${measurement.weight}`);
          successCount++;
        } else {
          console.log(`No data found for ${dinosaur.name}`);
          failureCount++;
        }
      } catch (error) {
        console.error(`Error processing ${dinosaur.name}:`, error);
        failureCount++;
      }
      
      console.log(`Current tally: ${successCount} successes, ${failureCount} failures`);
      console.log(`Success rate: ${((successCount / (successCount + failureCount)) * 100).toFixed(2)}%`);
      console.log('-'.repeat(40));
      await setTimeout(2000); // Wait for 2 seconds between requests to avoid rate limiting
    } else {
      console.log(`Skipping ${dinosaur.name} - not found in Wolfram species list`);
    }
  }

  console.log(`Processed ${successCount + failureCount} new dinosaurs.`);
  console.log(`Successful queries: ${successCount}`);
  console.log(`Failed queries: ${failureCount}`);

  // Merge new measurements with existing ones
  const updatedMeasurements = [...existingMeasurements, ...newMeasurements];

  // Save updated results to a file
  const outputPath = path.join(__dirname, '..', '..', 'dinosaur_measurements.json');
  fs.writeFileSync(outputPath, JSON.stringify(updatedMeasurements, null, 2));
  console.log(`Updated measurements saved to ${outputPath}`);
  console.log(`Total measurements: ${updatedMeasurements.length}`);
}
// Run the main function
main().catch(console.error);