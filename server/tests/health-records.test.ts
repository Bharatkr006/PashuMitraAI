import { describe, it, expect, beforeEach } from "vitest";
import {
  addAnimal,
  getAnimals,
  addObservation,
  getAnimalHistory,
  deleteAnimal,
  getRecentObservations,
} from "../src/core/health-records.js";

describe("Health Records", () => {
  it("add animal and retrieve it", () => {
    const id = addAnimal("Ganga", "cattle", "3 years", "Healthy cow");
    expect(id).toBeGreaterThan(0);

    const animals = getAnimals();
    const found = animals.find((a) => a.id === id);
    expect(found).toBeDefined();
    expect(found?.nickname).toBe("Ganga");
    expect(found?.species).toBe("cattle");
  });

  it("add observation and get history", () => {
    const animalId = addAnimal("Surti", "buffalo", "4 years");
    const obsId = addObservation(
      animalId,
      "Bloat symptoms",
      "भैंस का पेट फूला है",
      "Recommended immediate vet",
      "emergency"
    );
    expect(obsId).toBeGreaterThan(0);

    const history = getAnimalHistory(animalId);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].symptoms).toBe("Bloat symptoms");
    expect(history[0].urgency_level).toBe("emergency");
  });

  it("delete animal and cascade observations", () => {
    const animalId = addAnimal("Ramu", "goat");
    addObservation(animalId, "fever", "बकरी को बुखार है", "Keep warm", "prompt");

    const deleted = deleteAnimal(animalId);
    expect(deleted).toBe(true);

    const animals = getAnimals();
    expect(animals.find((a) => a.id === animalId)).toBeUndefined();

    const history = getAnimalHistory(animalId);
    expect(history.length).toBe(0);
  });
});
