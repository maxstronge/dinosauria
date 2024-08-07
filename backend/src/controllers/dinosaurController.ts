import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllDinosaurs = async (req: Request, res: Response) => {
  try {
    const species = req.query.species as string | undefined;
    let dinosaurs;

    if (species) {
      const speciesList = species.split(',');
      dinosaurs = await prisma.species.findMany({
        where: {
          name: {
            in: speciesList
          }
        },
        include: {
          taxon: true
        }
      });
    } else {
      dinosaurs = await prisma.species.findMany({
        include: {
          taxon: true
        }
      });
    }

    res.json(dinosaurs);
  } catch (error) {
    console.error('Error fetching dinosaurs:', error);
    res.status(500).json({ error: 'An error occurred while fetching dinosaurs' });
  }
};

export const getAllTaxa = async (req: Request, res: Response) => {
  try {
    const taxa = await prisma.taxon.findMany();
    res.json(taxa);
  } catch (error) {
    console.error('Error fetching taxa:', error);
    res.status(500).json({ error: 'An error occurred while fetching taxa' });
  }
};