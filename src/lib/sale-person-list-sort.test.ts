import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareSalePersonsBySortMode,
  isSalePersonSortMode,
  sortSalePersons,
} from "./sale-person-list-sort";

const people = [
  {
    id: "1",
    firstName: "Ana",
    lastName: "Zamora",
    createdAt: "2026-01-01T00:00:00.000Z",
    country: "México",
  },
  {
    id: "2",
    firstName: "Bruno",
    lastName: "Alvarez",
    createdAt: "2026-03-01T00:00:00.000Z",
    country: "Colombia",
  },
  {
    id: "3",
    firstName: "Carla",
    lastName: "Mendez",
    createdAt: "2026-02-01T00:00:00.000Z",
    country: "México",
  },
];

describe("sale-person-list-sort", () => {
  it("valida modos conocidos", () => {
    assert.equal(isSalePersonSortMode("recent"), true);
    assert.equal(isSalePersonSortMode("country"), true);
    assert.equal(isSalePersonSortMode("foo"), false);
  });

  it("ordena por más recientes", () => {
    assert.deepEqual(
      sortSalePersons(people, "recent").map((person) => person.id),
      ["2", "3", "1"],
    );
  });

  it("ordena A → Z por apellido", () => {
    assert.deepEqual(
      sortSalePersons(people, "name-asc").map((person) => person.lastName),
      ["Alvarez", "Mendez", "Zamora"],
    );
  });

  it("ordena Z → A por apellido", () => {
    assert.deepEqual(
      sortSalePersons(people, "name-desc").map((person) => person.lastName),
      ["Zamora", "Mendez", "Alvarez"],
    );
  });

  it("ordena por país y luego nombre", () => {
    assert.deepEqual(
      sortSalePersons(people, "country").map((person) => person.id),
      ["2", "3", "1"],
    );
  });

  it("compare es estable con ids", () => {
    assert.equal(
      compareSalePersonsBySortMode(
        { id: "a", firstName: "A", lastName: "A", createdAt: "2026-01-01" },
        { id: "b", firstName: "A", lastName: "A", createdAt: "2026-01-01" },
        "recent",
      ),
      "a".localeCompare("b"),
    );
  });
});
