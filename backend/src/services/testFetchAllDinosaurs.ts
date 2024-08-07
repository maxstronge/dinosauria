import { DinosaurSpecies, fetchAllDinosaurSpecies } from './pbdbScraper';

async function testFetchAllDinosaurSpecies() {
  try {
    console.log('Fetching all dinosaur species from PBDB...');
    const species = await fetchAllDinosaurSpecies();
    
    console.log(`Found ${species.length} dinosaur species.`);
    
    // Print the first 10 species
    console.log('\nFirst 10 species:');
    species.slice(0, 10).forEach(s => {
      console.log(`- ${s.name} (Rank: ${s.rank}, Parent: ${s.parent}, Order: ${s.order}, Time: ${s.max_ma} - ${s.min_ma} Ma)`);
    });

    // Count species per genus
    const genusCount: { [key: string]: number } = {};
    species.forEach(s => {
      const genus = s.parent;
      genusCount[genus] = (genusCount[genus] || 0) + 1;
    });

    // Print top 10 genera by species count
    const topGenera = Object.entries(genusCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    console.log('\nTop 10 genera by species count:');
    topGenera.forEach(([genus, count]) => {
      console.log(`- ${genus}: ${count} species`);
    });

    // Count species per order
    const orderCount: { [key: string]: number } = {};
    species.forEach(s => {
      orderCount[s.order] = (orderCount[s.order] || 0) + 1;
    });

    console.log('\nSpecies count per order:');
    Object.entries(orderCount).forEach(([order, count]) => {
      console.log(`- ${order}: ${count} species`);
    });

    // Verify all are species rank
    const nonSpecies = species.filter(s => s.rank !== 'species');
    if (nonSpecies.length > 0) {
      console.log('\nWarning: Found non-species ranks:');
      nonSpecies.forEach(s => {
        console.log(`- ${s.name} (Rank: ${s.rank})`);
      });
    } else {
      console.log('\nAll records are of species rank.');
    }


  } catch (error) {
    console.error('Error in testFetchAllDinosaurSpecies:', error);
  }
}

testFetchAllDinosaurSpecies().catch(console.error);