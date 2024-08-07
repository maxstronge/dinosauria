import axios from 'axios';
import type { Dinosaur, Taxon } from '$lib/types';

const API_URL = 'http://localhost:3000/api'; // Make sure this matches your backend URL

export const fetchDinosaurAndTaxaData = async (species: string[] = []): Promise<{ dinosaurs: Dinosaur[], taxa: Taxon[] }> => {
  try {
    let dinosaurUrl = `${API_URL}/dinosaurs`;
    if (species.length > 0) {
      dinosaurUrl += `?species=${species.join(',')}`;
    }
    const [dinosaurResponse, taxaResponse] = await Promise.all([
      axios.get<Dinosaur[]>(dinosaurUrl),
      axios.get<Taxon[]>(`${API_URL}/taxa`)
    ]);
    return {
      dinosaurs: dinosaurResponse.data,
      taxa: taxaResponse.data
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}


function buildTaxonomyTree(taxa: Taxon[]): TreeNode {
  
  // initialize a map between taxon IDs and their corresponding tree nodes
  const taxaMap = new Map<string, TreeNode>();

  // First pass - create a tree node for each taxon
  taxa.forEach((taxon) => {
    taxaMap.set(taxon.id, {
      id: taxon.id,
      name: taxon.name,
      children: []
    });
  });

  // Second pass - assign children to each tree node
  taxa.forEach(taxon => {
    if (taxon.parent && taxon.parent.id) {
      const parentNode = taxaMap.get(taxon.parent.id);
      const currentNode = taxaMap.get(taxon.id);
      if (parentNode && currentNode) {
        if (parentNode && parentNode.children) {
          parentNode.children = parentNode.children || [];
          parentNode.children.push(currentNode);
        }
      }
    }
  });

  // Find the root node (Dinosauria)
  const root = Array.from(taxaMap.values()).find((taxon) => taxon.id === 'Dinosauria');
  if (!root) throw new Error("Root taxon (Dinosauria) not found");
  
  return root;

}

export { buildTaxonomyTree };