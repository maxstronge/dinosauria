import axios from 'axios';

/* 
Taxon Response Field Guide:

oid: Object ID - Unique identifier for the taxon (prefixed with "txn:")
flg: Flag - Indicates special status (e.g., "B" might mean "base taxon")
rnk: Rank - Taxonomic rank (e.g., 3 for species, 5 for genus, etc.)
nam: Name - Scientific name of the taxon
att: Attribution - Author and year of the taxon's description
par: Parent - ID of the parent taxon (prefixed with "txn:")
prl: Parent Name - Name of the parent taxon
rid: Reference ID - Unique identifier for the reference (prefixed with "ref:")
ext: Extant - Whether the taxon is extant (0 for extinct, 1 for extant)
noc: Number of Occurrences - Number of fossil occurrences in the database
fea: First Appearance (Early) - Earliest possible first appearance in millions of years ago
fla: First Appearance (Late) - Latest possible first appearance in millions of years ago
lea: Last Appearance (Early) - Earliest possible last appearance in millions of years ago
lla: Last Appearance (Late) - Latest possible last appearance in millions of years ago
tei: Time Early Interval - Name of the earliest geologic interval in which the taxon appears
tli: Time Late Interval - Name of the latest geologic interval in which the taxon appears


Species Response Field Guide (including fields not present in the taxon response):

orig_no: Original Number - Unique identifier for the taxon (without "txn:" prefix)
taxon_no: Taxon Number - Another identifier, sometimes different from orig_no
record_type: Record Type - Type of record (e.g., "txn" for taxon)
taxon_rank: Taxon Rank - Rank of the taxon (e.g., "species")
taxon_name: Taxon Name - Scientific name of the taxon
taxon_attr: Taxon Attribution - Author and year of the taxon's description
accepted_no: Accepted Number - ID of the accepted name (if this is a synonym)
accepted_rank: Accepted Rank - Rank of the accepted name
accepted_name: Accepted Name - Scientific name of the accepted taxon
parent_no: Parent Number - ID of the parent taxon (without "txn:" prefix)
parent_name: Parent Name - Name of the parent taxon
reference_no: Reference Number - ID of the reference (without "ref:" prefix)
is_extant: Is Extant - Whether the taxon is extant ("extinct" or "extant")
n_occs: Number of Occurrences - Number of fossil occurrences in the database
firstapp_max_ma: First Appearance Maximum - Earliest possible first appearance in millions of years ago
firstapp_min_ma: First Appearance Minimum - Latest possible first appearance in millions of years ago
lastapp_max_ma: Last Appearance Maximum - Earliest possible last appearance in millions of years ago
lastapp_min_ma: Last Appearance Minimum - Latest possible last appearance in millions of years ago
early_interval: Early Interval - Name of the earliest geologic interval in which the taxon appears
late_interval: Late Interval - Name of the latest geologic interval in which the taxon appears
 */


export interface TaxonNode {
  id: string;
  name: string;
  rank: number;
  parent_id: string | null;
}


export interface TaxonData {
  name: string;
  rank: string;
  parent: string;
}


export interface DinosaurSpecies {
  name: string;
  rank: string;
  parent: string;
  order: string;
  family?: string;
  max_ma?: number;
  min_ma?: number;
  accepted_name?: string;
}


    // Exclude known ichnogenera
    const ichnogenera = [
      'Grallator', 'Eubrontes', 'Anomoepus', 'Argoides', 'Platypterna', 'Brontopodus', 'Megalosauripus',
      'Therangospodus', 'Parabrontopodus', 'Caririchnium', 'Iguanodontipus', 'Amblydactylus',
      'Anchisauripus', 'Asianopodus', 'Breviparopus', 'Caririchnium', 'Ceratopsipes',
      'Chirotherium', 'Deltapodus', 'Dinosauropodus', 'Dinosauropodes', 'Eosauropus', 'Evazoum', 'Gigandipus',
      'Gypsichnites', 'Hadrosaurichnus', 'Irenesauripus', 'Jiayinosauripus', 'Kayentapus',
      'Lavinipes', 'Magnoavipes', 'Moyenisauropus', 'Otozoum', 'Parabrontopodus', 
      'Rotundichnus', 'Sauropodichnus', 'Siamopodus', 'Stegopodus', 'Tetrapodosaurus', 'Tetrasauropus',
      'Therangospodus', 'Tyrannosauripus', 'Wintonopus', 'Brontopus', 'Limnopus', 'Thinopus','Trihamus', 'Anatopus', 'Argozoum'
    ];

    const modernBirdFamilies = [
      'Accipitridae', 'Aegithalidae', 'Alaudidae', 'Alcedinidae', 'Alcidae', 'Anatidae',
      'Anhingidae', 'Apodidae', 'Ardeidae', 'Artamidae', 'Bombycillidae', 'Bucerotidae',
      'Burhinidae', 'Caprimulgidae', 'Cardinalidae', 'Certhiidae', 'Charadriidae', 'Ciconiidae',
      'Cinclidae', 'Columbidae', 'Coraciidae', 'Corvidae', 'Cuculidae', 'Diomedeidae',
      'Emberizidae', 'Falconidae', 'Fringillidae', 'Gaviidae', 'Glareolidae', 'Gruidae',
      'Haematopodidae', 'Hirundinidae', 'Hydrobatidae', 'Icteridae', 'Indicatoridae',
      'Laniidae', 'Laridae', 'Maluridae', 'Meropidae', 'Mimidae', 'Motacillidae', 'Muscicapidae',
      'Nectariniidae', 'Oriolidae', 'Paridae', 'Parulidae', 'Pelecanidae', 'Phalacrocoracidae',
      'Phasianidae', 'Phoenicopteridae', 'Picidae', 'Podicipedidae', 'Procellariidae', 'Psittacidae',
      'Ptilonorhynchidae', 'Rallidae', 'Recurvirostridae', 'Regulidae', 'Remizidae', 'Scolopacidae',
      'Sittidae', 'Stercorariidae', 'Strigidae', 'Sturnidae', 'Sulidae', 'Sylviidae',
      'Threskiornithidae', 'Timaliidae', 'Trochilidae', 'Troglodytidae', 'Turdidae', 'Tytonidae',
      'Upupidae', 'Vireonidae', 'Zosteropidae', 'Cathartidae',' Pandionidae', 'Sagittariidae','Anhimidae', 'Arpterygidae'
    ];
    

//  check if a name is an ichnogenus or ichnospecies
function isIchnofossil(name: string): boolean {
  const genus = name.split(' ')[0];
  if (ichnogenera.includes(genus)) return true;
  
  // Check for common ichnospecies suffixes
  const ichnoSuffixes = ['pes', 'manus', 'podus', 'ichnites', 'ichnus'];
  return ichnoSuffixes.some(suffix => name.toLowerCase().endsWith(suffix));
}


export async function fetchAllDinosaurSpecies(): Promise<DinosaurSpecies[]> {
  const taxa = ['Saurischia', 'Ornithischia', 'Theropoda', 'Sauropodomorpha', 'Ceratopsia', 'Ornithopoda', 'Thyreophora'];
  let allSpecies: DinosaurSpecies[] = [];

  for (const taxon of taxa) {
    try {
      console.log(`Fetching species for taxon: ${taxon}`);
      const response = await axios.get('https://paleobiodb.org/data1.2/taxa/list.json', {
        params: {
          base_name: taxon,
          rank: 'species',
          status: 'accepted',
          vocab: 'pbdb',
          show: 'attr,parent,app,family',
          pres: 'regular', // This excludes ichnofossils and form taxa
          extant: 'no',    // This excludes extant species
          limit: 'all',
          min_ma: 66,      // This excludes species younger than the K-Pg boundary
        }
      });


      if (response.data.records && response.data.records.length > 0) {
        const taxonSpecies = response.data.records.map((record: any) => ({
          name: record.taxon_name,
          rank: record.taxon_rank,
          parent: record.parent_name,
          order: taxon,
          family: record.family,
          max_ma: record.firstapp_max_ma,
          min_ma: record.lastapp_min_ma
        }));

        console.log(`Found ${taxonSpecies.length} species for ${taxon}`);
        allSpecies = allSpecies.concat(taxonSpecies);
      } else {
        console.log(`No species found for ${taxon}`);
      }
    } catch (error) {
      console.error(`Error fetching ${taxon} species:`, error);
    }
  }

  console.log(`Total species before filtering: ${allSpecies.length}`);

  // Additional filtering if needed
  const dinosaurSpecies = allSpecies.filter(species => {
    // Exclude species with 'oolithus' in their name or parent name (egg fossils)
    if (/oolithus/i.test(species.name) || /oolithus/i.test(species.parent)) return false;

    // Exclude modern bird families
    if (species.family && modernBirdFamilies.includes(species.family)) return false;

    return true;
  });


  console.log(`Filtered ${dinosaurSpecies.length} dinosaur species from ${allSpecies.length} total species.`);

  // Remove duplicates
  const uniqueSpecies = Array.from(new Set(dinosaurSpecies.map(s => s.name))).map(name => {
    return dinosaurSpecies.find(s => s.name === name)!;
  });

  console.log(`Unique species after removing duplicates: ${uniqueSpecies.length}`);

  return uniqueSpecies;
}


// fetch data for specific dinosaur species
export async function fetchSpecificDinosaurSpecies(speciesNames: string[]): Promise<TaxonNode[]> {
  const species: TaxonNode[] = [];

  for (const speciesName of speciesNames) {
    try {
      const response = await axios.get('https://paleobiodb.org/data1.2/taxa/list.json', {
        params: {
          name: speciesName,
          rank: 'species',
          status: 'valid',
          vocab: 'pbdb',
          show: 'attr,app,parent'
        }
      });

      if (response.data.records && response.data.records.length > 0) {
        const record = response.data.records[0];
        const taxonNode: TaxonNode = {
          id: record.orig_no,
          name: record.taxon_name,
          rank: record.taxon_rank === 'species' ? 3 : parseInt(record.taxon_rank),
          parent_id: record.parent_no
        };
        species.push(taxonNode);
      } else {
        console.log(`No data found for species: ${speciesName}`);
      }
    } catch (error) {
      console.error(`Error fetching species ${speciesName}:`, error);
    }
  }

  return species;
}


// fetch taxon info for a specific taxon ID
export async function fetchTaxonInfo(taxonId: string): Promise<any> {
  try {
    const response = await axios.get(`https://paleobiodb.org/data1.2/taxa/single.json`, {
      params: {
        id: taxonId,
        show: 'attr,app,parent'
      }
    });

    if (response.data.records && response.data.records.length > 0) {
      return response.data.records[0];
    } else {
      console.log(`No data found for taxon ID: ${taxonId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching taxon info for ${taxonId}:`, error);
    return null;
  }
}



// generate lineage for a specific species ID
export async function getLineage(speciesId: string): Promise<string[]> {
  const lineage: string[] = [];
  let currentTaxonId = speciesId;

  while (currentTaxonId) {
    const taxonInfo = await fetchTaxonInfo(currentTaxonId);
    if (!taxonInfo) break;

    lineage.unshift(currentTaxonId);

    if (taxonInfo.nam === 'Dinosauria') break;

    currentTaxonId = taxonInfo.par ? taxonInfo.par.replace('txn:', '') : null;
  }

  return lineage;
}