/**
 * Limpia datos operativos/configuracion demo de rutas para Scgs.
 * Conserva unicamente la ruta general y el horario del domingo activos.
 * No toca shipments, clientes, destinatarios, inventario, precios ni paises.
 */
import { connectPg } from "./lib/db-connection.mjs";
import { resolveScgsOrgId } from "./lib/scgs-demo-recipients.mjs";

async function main() {
  const { client, label } = await connectPg();
  try {
    const org = await resolveScgsOrgId(client);
    await client.query("begin");

    const requests = await client.query(
      `delete from public.customer_route_assignment_requests
        where organization_id = $1`,
      [org.id],
    );
    const routes = await client.query(
      `delete from public.logistics_routes
        where organization_id = $1`,
      [org.id],
    );
    const inactiveSchedules = await client.query(
      `delete from public.logistics_route_schedules
        where organization_id = $1 and weekday <> 6`,
      [org.id],
    );
    const inactiveDefinitions = await client.query(
      `delete from public.logistics_route_definitions d
        where d.organization_id = $1
          and not exists (
            select 1
              from public.logistics_route_schedules s
             where s.organization_id = d.organization_id
               and s.route_definition_id = d.id
               and s.weekday = 6
          )`,
      [org.id],
    );
    const settings = await client.query(
      `update public.organization_route_settings
          set delivery_days = array['Dom']::text[],
              pickup_days = array['Dom']::text[],
              updated_at = now()
        where organization_id = $1`,
      [org.id],
    );
    const sunday = await client.query(
      `update public.logistics_route_schedules s
          set is_active = true, updated_at = now()
        where s.organization_id = $1 and s.weekday = 6
        returning s.id`,
      [org.id],
    );
    await client.query(
      `update public.logistics_route_definitions d
          set status = 'active', updated_at = now()
        where d.organization_id = $1
          and exists (
            select 1 from public.logistics_route_schedules s
             where s.organization_id = d.organization_id
               and s.route_definition_id = d.id
               and s.weekday = 6
          )`,
      [org.id],
    );

    if (settings.rowCount !== 1 || sunday.rowCount !== 1) {
      throw new Error("No se pudo dejar exactamente una configuracion de domingo.");
    }
    await client.query("commit");
    console.log(`OK: ${label}`);
    console.log(`- Solicitudes eliminadas: ${requests.rowCount}`);
    console.log(`- Rutas operativas eliminadas: ${routes.rowCount}`);
    console.log(`- Horarios de dias no domingo eliminados: ${inactiveSchedules.rowCount}`);
    console.log(`- Definiciones de dias no domingo eliminadas: ${inactiveDefinitions.rowCount}`);
    console.log("- Domingo queda activo para entregas y recogidas.");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
