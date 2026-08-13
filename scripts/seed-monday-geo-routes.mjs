/**
 * Demo: activa Lunes y crea 2 subrutas geográficas con cobertura por ciudad.
 * - Ruta norte → Santa Clarita
 * - Ruta sur → varias zonas del sur de LA (para ver mapa con varias piezas)
 *
 * Uso: node scripts/seed-monday-geo-routes.mjs
 */
import { connectPg, loadEnvLocal } from "./lib/db-connection.mjs";

const ORG_ID = process.env.SCGS_ORG_ID || "5f17cfa1-055e-4226-99e8-e934d6c80169";
const WEEKDAY = 0; // Lunes
const ROUTES = [
  {
    name: "Ruta norte",
    zoneName: "Santa Clarita",
    color: "#10b981",
    queries: ["Santa Clarita, CA, USA"],
  },
  {
    name: "Ruta sur",
    zoneName: "Sur de LA",
    color: "#38bdf8",
    queries: [
      "Los Angeles, CA, USA",
      "Beverly Hills, CA, USA",
      "Santa Monica, CA, USA",
      "Culver City, CA, USA",
      "Inglewood, CA, USA",
      "Torrance, CA, USA",
      "Gardena, CA, USA",
      "Hawthorne, CA, USA",
    ],
  },
];

const PLACE_COLORS = [
  "#38bdf8",
  "#22d3ee",
  "#60a5fa",
  "#818cf8",
  "#a78bfa",
  "#f472b6",
  "#fb7185",
  "#fbbf24",
];

function requireGoogleKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("Falta GOOGLE_MAPS_API_KEY en .env.local");
  return key;
}

async function resolvePlace(query, apiKey) {
  const textParams = new URLSearchParams({
    query,
    key: apiKey,
    region: "us",
  });
  const textResponse = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${textParams}`,
  );
  const textData = await textResponse.json();
  const first = textData.results?.[0];
  if (!textResponse.ok || textData.status !== "OK" || !first?.place_id) {
    throw new Error(`No se encontró lugar para "${query}": ${textData.status || textResponse.status}`);
  }

  const detailsParams = new URLSearchParams({
    place_id: first.place_id,
    key: apiKey,
    fields: "place_id,name,geometry,types,address_component,formatted_address",
  });
  const detailsResponse = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams}`,
  );
  const detailsData = await detailsResponse.json();
  const result = detailsData.result;
  if (!detailsResponse.ok || detailsData.status !== "OK" || !result?.place_id) {
    throw new Error(`No se pudieron leer detalles de "${query}"`);
  }

  const northeast = result.geometry?.viewport?.northeast;
  const southwest = result.geometry?.viewport?.southwest;
  const bounds =
    northeast && southwest
      ? {
          north: northeast.lat,
          south: southwest.lat,
          east: northeast.lng,
          west: southwest.lng,
        }
      : {};

  return {
    placeId: result.place_id,
    displayName: result.name || first.name || query.split(",")[0],
    kind: "locality",
    lat: result.geometry?.location?.lat ?? null,
    lng: result.geometry?.location?.lng ?? null,
    bounds,
  };
}

async function main() {
  loadEnvLocal();
  const apiKey = requireGoogleKey();
  const { client } = await connectPg();

  try {
    const userRes = await client.query(
      `select id from profiles where organization_id = $1 order by created_at asc nulls last limit 1`,
      [ORG_ID],
    );
    const userId = userRes.rows[0]?.id || null;

    const resolved = [];
    for (const route of ROUTES) {
      const places = [];
      for (const query of route.queries) {
        const place = await resolvePlace(query, apiKey);
        places.push(place);
        console.log(`Lugar OK: ${place.displayName} (${place.placeId})`);
      }
      resolved.push({ route, places });
    }

    await client.query("begin");

    await client.query(
      `
      insert into organization_route_settings (organization_id, delivery_days, pickup_days)
      values ($1, array['Lun']::text[], array['Lun']::text[])
      on conflict (organization_id) do update
        set delivery_days = (
              select array_agg(distinct day order by day)
              from unnest(coalesce(organization_route_settings.delivery_days, '{}'::text[]) || array['Lun']::text[]) as day
            ),
            pickup_days = (
              select array_agg(distinct day order by day)
              from unnest(coalesce(organization_route_settings.pickup_days, '{}'::text[]) || array['Lun']::text[]) as day
            ),
            updated_at = now()
      `,
      [ORG_ID],
    );

    await client.query(
      `
      insert into logistics_weekday_defaults (organization_id, weekday, start_time, estimated_end_time, max_stops, max_boxes)
      values ($1, $2, '10:00', null, null, null)
      on conflict (organization_id, weekday) do update
        set start_time = excluded.start_time,
            updated_at = now()
      `,
      [ORG_ID, WEEKDAY],
    );

    for (const { route, places } of resolved) {
      const existing = await client.query(
        `
        select d.id
        from logistics_route_definitions d
        join logistics_route_schedules s on s.route_definition_id = d.id
        where d.organization_id = $1
          and d.is_system_general = false
          and d.status is distinct from 'archived'
          and d.name = $2
          and s.weekday = $3
        limit 1
        `,
        [ORG_ID, route.name, WEEKDAY],
      );

      let routeDefinitionId = existing.rows[0]?.id || null;
      if (routeDefinitionId) {
        await client.query(
          `
          update logistics_route_definitions
          set zone_name = $2,
              color = $3,
              coverage_mode = 'places',
              updated_at = now()
          where id = $1
          `,
          [routeDefinitionId, route.zoneName, route.color],
        );
        console.log(`Actualiza subruta existente: ${route.name}`);
      } else {
        const inserted = await client.query(
          `
          insert into logistics_route_definitions (
            organization_id, name, zone_name, color, coverage_mode, status, is_system_general, created_by
          ) values ($1, $2, $3, $4, 'places', 'active', false, $5)
          returning id
          `,
          [ORG_ID, route.name, route.zoneName, route.color, userId],
        );
        routeDefinitionId = inserted.rows[0].id;
        console.log(`Crea subruta: ${route.name}`);
      }

      await client.query(
        `
        delete from logistics_route_schedules
        where organization_id = $1 and route_definition_id = $2
        `,
        [ORG_ID, routeDefinitionId],
      );
      await client.query(
        `
        insert into logistics_route_schedules (
          organization_id, route_definition_id, weekday, start_time, estimated_end_time,
          max_stops, max_boxes, is_active, created_by
        ) values ($1, $2, $3, '10:00', null, null, null, true, $4)
        `,
        [ORG_ID, routeDefinitionId, WEEKDAY, userId],
      );

      await client.query(
        `
        delete from logistics_route_coverage_places
        where organization_id = $1 and route_definition_id = $2
        `,
        [ORG_ID, routeDefinitionId],
      );

      for (let index = 0; index < places.length; index += 1) {
        const place = places[index];
        const placeColor =
          places.length === 1 ? route.color : PLACE_COLORS[index % PLACE_COLORS.length];
        await client.query(
          `
          insert into logistics_route_coverage_places (
            organization_id, route_definition_id, place_id, display_name, kind,
            parent_place_id, selection_role, lat, lng, bounds, color, created_by
          ) values ($1, $2, $3, $4, $5, null, 'root_whole', $6, $7, $8::jsonb, $9, $10)
          `,
          [
            ORG_ID,
            routeDefinitionId,
            place.placeId,
            place.displayName,
            place.kind,
            place.lat,
            place.lng,
            JSON.stringify(place.bounds || {}),
            placeColor,
            userId,
          ],
        );
      }
      console.log(`Cobertura ${route.name}: ${places.length} zona(s)`);
    }

    await client.query(
      `
      update logistics_route_schedules s
      set is_active = false, updated_at = now()
      from logistics_route_definitions d
      where s.route_definition_id = d.id
        and d.organization_id = $1
        and d.is_system_general = true
        and d.system_weekday = $2
        and s.weekday = $2
      `,
      [ORG_ID, WEEKDAY],
    );

    await client.query("commit");
    console.log("Listo: Lunes con Ruta norte + Ruta sur (varias zonas).");
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // ignore
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
