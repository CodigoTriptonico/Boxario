import assert from "node:assert/strict";
import test from "node:test";
import {
  BOX_SIZES,
  COUNTRIES,
  boxPricingForCountry,
  isSameCountry,
  normalizeCountryName,
  pickRandomRecipientCountries,
  recipientForSenderRandom,
  shuffle,
} from "./scgs-demo-recipients.mjs";

test("normalizeCountryName ignora acentos", () => {
  assert.equal(normalizeCountryName("México"), normalizeCountryName("Mexico"));
});

test("isSameCountry compara países con y sin acento", () => {
  assert.equal(isSameCountry("México", "Mexico"), true);
  assert.equal(isSameCountry("Colombia", "Guatemala"), false);
});

test("shuffle conserva elementos", () => {
  const input = [1, 2, 3, 4, 5];
  const output = shuffle(input, () => 0.1);
  assert.deepEqual([...output].sort(), input);
});

test("pickRandomRecipientCountries devuelve países únicos dentro del catálogo", () => {
  let sequence = 0;
  const random = () => {
    sequence += 1;
    return (sequence % 97) / 97;
  };

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const picked = pickRandomRecipientCountries(random);
    assert.ok(picked.length >= 2);
    assert.ok(picked.length <= COUNTRIES.length);
    assert.equal(new Set(picked.map((country) => country.code)).size, picked.length);
  }
});

test("cada país del catálogo tiene destinatarios de ejemplo", () => {
  for (const country of COUNTRIES) {
    const recipient = recipientForSenderRandom({ last_name: "Demo" }, country.name, () => 0);
    assert.ok(recipient, `sin plantillas para ${country.name}`);
  }
});

test("las medidas de caja son únicas", () => {
  const names = BOX_SIZES.map((box) => box.name);
  assert.equal(new Set(names).size, names.length);
});

test("boxPricingForCountry aplica el factor del país", () => {
  const box = { name: "14x14x14", price: 100, cost: 60 };

  assert.deepEqual(boxPricingForCountry(box, { priceFactor: 1 }), {
    price: "$100",
    cost: "$60",
  });
  assert.deepEqual(boxPricingForCountry(box, { priceFactor: 1.35 }), {
    price: "$135",
    cost: "$81",
  });
  assert.deepEqual(boxPricingForCountry(box, {}), { price: "$100", cost: "$60" });
});

test("recipientForSenderRandom usa apellido del remitente", () => {
  const sender = { first_name: "Demo", last_name: "Castillo" };
  const recipient = recipientForSenderRandom(sender, "México", () => 0);
  assert.ok(recipient);
  assert.equal(recipient.last_name, "Castillo");
  assert.ok(recipient.first_name);
  assert.ok(recipient.phone);
});
