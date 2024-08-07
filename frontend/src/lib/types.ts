export interface Dinosaur {
    id: string;
    name: string;
    taxon: {
      id: string;
      name: string;
    };
    lineage: string[];
    description?: string;
    timeRange: string;
    firstAppearance?: number;
    lastAppearance?: number;
    diet?: string;
    length?: number;
    weight?: number;
    fossilLocations?: string[];
    nameMeaning?: string;
    discoveryYear?: number;
    discoveredBy?: string;
  }

  export interface Taxon {
    id: string;
    name: string;
    rank: number;
    parent?: Taxon;
    children?: Taxon[];
    species?: Dinosaur[];
  }

  export interface TreeNode {
    id: string;
    name: string;
    children?: TreeNode[];
    type: 'taxon' | 'species';
}