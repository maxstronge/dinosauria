import type { Dinosaur, Taxon, TreeNode } from '../types';

export function buildTaxonomyTree(dinosaurs: Dinosaur[], taxa: Taxon[]): TreeNode {
    const taxaMap = new Map<string, TreeNode>();
    
    // Create nodes for all taxa
    taxa.forEach(taxon => {
        taxaMap.set(taxon.id, {
            id: taxon.id,
            name: taxon.name,
            children: [],
            type: 'taxon'
        });
    });

    // Build the taxonomy tree
    taxa.forEach(taxon => {
        if (taxon.parent && taxon.parent.id) {
            const parentNode = taxaMap.get(taxon.parent.id);
            const currentNode = taxaMap.get(taxon.id);
            if (parentNode && currentNode) {
                parentNode.children = parentNode.children || [];
                parentNode.children.push(currentNode);
            }
        }
    });

    // Add dinosaur species to the tree
    dinosaurs.forEach(dinosaur => {
        const speciesNode: TreeNode = {
            id: dinosaur.id,
            name: dinosaur.name,
            type: 'species'
        };

        let currentNode: TreeNode | undefined;

        for (let i = 0; i < dinosaur.lineage.length - 1; i++) {  // Stop at genus level
            const taxonId = dinosaur.lineage[i];
            const taxonNode = taxaMap.get(taxonId);

            if (taxonNode) {
                if (!currentNode) {
                    currentNode = taxonNode;
                } else {
                    if (!currentNode.children) currentNode.children = [];
                    const existingChild = currentNode.children.find(child => child.id === taxonNode.id);
                    if (!existingChild) {
                        currentNode.children.push(taxonNode);
                    }
                    currentNode = taxonNode;
                }
            }
        }

        // Add the species to the genus node
        if (currentNode) {
            if (!currentNode.children) currentNode.children = [];
            currentNode.children.push(speciesNode);
        } else {
            console.warn(`Could not place ${dinosaur.name} in the taxonomy tree`);
        }
    });

    // Find the root node (Dinosauria)
    const root = Array.from(taxaMap.values()).find(node => node.name === 'Dinosauria');
    if (!root) throw new Error("Root taxon (Dinosauria) not found");

    return root;
}