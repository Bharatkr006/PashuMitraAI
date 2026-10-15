import { Router, Request, Response } from "express";
import {
  getAnimals,
  addAnimal,
  deleteAnimal,
  getAnimalHistory,
  addObservation,
  getRecentObservations,
} from "../core/health-records.js";

const router = Router();

router.get("/animals", (req: Request, res: Response) => {
  try {
    const animals = getAnimals();
    res.json(animals);
  } catch (err: any) {
    console.error("Error fetching animals:", err);
    res.status(500).json({ error: "Failed to fetch animals" });
  }
});

router.post("/animals", (req: Request, res: Response) => {
  try {
    const { nickname, species, age, notes, consent } = req.body;
    if (!species) {
      res.status(400).json({ error: "Species is required" });
      return;
    }
    if (consent === false) {
      res.status(400).json({ error: "Consent is required for local storage" });
      return;
    }

    const id = addAnimal(nickname, species, age || "", notes || "");
    res.status(201).json({ id, message: "Animal created successfully" });
  } catch (err: any) {
    console.error("Error adding animal:", err);
    res.status(500).json({ error: "Failed to add animal" });
  }
});

router.delete("/animals/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid animal ID" });
      return;
    }
    deleteAnimal(id);
    res.json({ success: true, message: "Animal deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting animal:", err);
    res.status(500).json({ error: "Failed to delete animal" });
  }
});

router.get("/animals/:id/history", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid animal ID" });
      return;
    }
    const history = getAnimalHistory(id);
    res.json(history);
  } catch (err: any) {
    console.error("Error fetching animal history:", err);
    res.status(500).json({ error: "Failed to fetch animal history" });
  }
});

router.post("/observations", (req: Request, res: Response) => {
  try {
    const { animalId, symptoms, query, responseSummary, urgencyLevel, observationDate } = req.body;
    if (!animalId) {
      res.status(400).json({ error: "Animal ID is required" });
      return;
    }

    const id = addObservation(
      Number(animalId),
      symptoms || "",
      query || "",
      responseSummary || "",
      urgencyLevel || "general",
      observationDate
    );
    res.status(201).json({ id, message: "Observation recorded successfully" });
  } catch (err: any) {
    console.error("Error adding observation:", err);
    res.status(500).json({ error: "Failed to add observation" });
  }
});

router.get("/observations/recent", (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const recent = getRecentObservations(limit);
    res.json(recent);
  } catch (err: any) {
    console.error("Error fetching recent observations:", err);
    res.status(500).json({ error: "Failed to fetch recent observations" });
  }
});

export default router;
